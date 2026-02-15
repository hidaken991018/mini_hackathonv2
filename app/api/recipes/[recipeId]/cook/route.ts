import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { calculateRemainingQuantity, normalizeUnit, findMatchingInventory } from '@/lib/units';
import { canUserCookRecipe } from '@/lib/recipe-cook-ownership';

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { recipeId: string } }
) {
  try {
    // Firebase Auth Tokenから userId を取得
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const { recipeId } = params;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'レシピIDが必要です' },
        { status: 400 }
      );
    }

    // レシピと材料を取得
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: '指定されたレシピが見つかりません' },
        { status: 404 }
      );
    }

    let hasLinkedNotification = false;
    if (!recipe.userId) {
      const linkedNotification = await prisma.notification.findFirst({
        where: {
          recipeId,
          userId,
        },
        select: { id: true },
      });
      hasLinkedNotification = Boolean(linkedNotification);
    }

    const canCook = canUserCookRecipe({
      recipeUserId: recipe.userId,
      requesterUserId: userId!,
      hasLinkedNotification,
    });

    if (!canCook) {
      return NextResponse.json(
        {
          success: false,
          error: 'このレシピを調理する権限がありません',
        },
        { status: 403 },
      );
    }

    const consumedIngredients: {
      name: string;
      quantityValue: number | null;
      quantityUnit: string | null;
    }[] = [];
    const skippedStapleIngredients: {
      name: string;
      reason: string;
    }[] = [];
    const deletedInventoryIds: string[] = [];
    const updatedInventories: { id: string; name: string; remaining: number }[] = [];

    // トランザクション前にユーザーの全在庫を取得（JS側マッチング用）
    const userInventories = await prisma.inventory.findMany({
      where: { userId: userId! },
    });

    // トランザクション内で在庫を更新
    await prisma.$transaction(async (tx) => {
      for (const ingredient of recipe.ingredients) {
        // JS側でマッチング（双方向部分一致 + 類似食材グループ対応）
        const matchedId = ingredient.inventoryId
          ?? findMatchingInventory(ingredient.name, userInventories)?.id
          ?? null;

        // トランザクション内でrow lockを取得して最新状態を確認
        let inventory = matchedId
          ? await tx.inventory.findUnique({
              where: { id: matchedId },
            })
          : null;

        if (inventory) {
          // 常備品（バター、油、調味料等）は調理時に在庫を減らさない
          if (inventory.isStaple) {
            skippedStapleIngredients.push({
              name: ingredient.name,
              reason: '常備品のため在庫を減らしませんでした',
            });
            continue;
          }

          const currentQty = inventory.quantityValue || 0;
          const consumeQty = ingredient.quantityValue || 0;
          const inventoryUnit = inventory.quantityUnit || '';
          const ingredientUnit = ingredient.quantityUnit || '';

          consumedIngredients.push({
            name: ingredient.name,
            quantityValue: ingredient.quantityValue,
            quantityUnit: ingredient.quantityUnit,
          });

          // 単位換算を使用して残量を計算
          const remaining = calculateRemainingQuantity(
            { value: currentQty, unit: inventoryUnit, name: inventory.name },
            { value: consumeQty, unit: ingredientUnit, name: ingredient.name }
          );

          if (remaining === null) {
            // 単位変換不可の場合: 単位カテゴリを確認して安全に処理する
            // 例: 在庫「牛乳 1本」(COUNT) vs レシピ「200ml」(VOLUME) → 換算不可
            // 以前の処理: 1 - 200 = -199 → 不正な全削除（バグ）
            const invCategory = normalizeUnit(inventoryUnit).category;
            const ingCategory = normalizeUnit(ingredientUnit).category;

            if (invCategory === ingCategory) {
              // 同カテゴリだが換算不可（例: 異なるCOUNT単位同士）→ 1つ消費
              const newQty = currentQty - 1;
              if (newQty <= 0) {
                await tx.inventory.delete({ where: { id: inventory.id } });
                deletedInventoryIds.push(inventory.id);
              } else {
                await tx.inventory.update({
                  where: { id: inventory.id },
                  data: { quantityValue: newQty },
                });
                updatedInventories.push({
                  id: inventory.id,
                  name: inventory.name,
                  remaining: newQty,
                });
              }
            } else if (invCategory === 'COUNT') {
              // 在庫がCOUNT（本,パック等）、レシピがMASS/VOLUME（g,ml等）
              // → COUNT在庫を1つ消費する（「牛乳1本を使った」と解釈）
              const newQty = currentQty - 1;
              if (newQty <= 0) {
                await tx.inventory.delete({ where: { id: inventory.id } });
                deletedInventoryIds.push(inventory.id);
              } else {
                await tx.inventory.update({
                  where: { id: inventory.id },
                  data: { quantityValue: newQty },
                });
                updatedInventories.push({
                  id: inventory.id,
                  name: inventory.name,
                  remaining: newQty,
                });
              }
            } else {
              // 在庫がMASS/VOLUME、レシピがCOUNTなど → 換算不可のためスキップ
              // 在庫は変更しない（ユーザーに手動管理を任せる）
            }
          } else if (remaining.value <= 0) {
            // 在庫がなくなったら削除
            await tx.inventory.delete({
              where: { id: inventory.id },
            });
            deletedInventoryIds.push(inventory.id);
          } else {
            // 数量を更新（単位換算後の値）
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantityValue: remaining.value },
            });
            updatedInventories.push({
              id: inventory.id,
              name: inventory.name,
              remaining: remaining.value,
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        recipeId,
        recipeTitle: recipe.title,
        consumedIngredients,
        skippedStapleIngredients,
        deletedInventoryIds,
        updatedInventories,
      },
    });
  } catch (error) {
    console.error('Cook recipe error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'レシピ調理処理中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : '不明なエラー' }),
      },
      { status: 500 }
    );
  }
}
