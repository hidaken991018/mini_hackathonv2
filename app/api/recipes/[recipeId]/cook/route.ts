import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { calculateRemainingQuantity, canConvert } from '@/lib/units';

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

    const consumedIngredients: {
      name: string;
      quantityValue: number | null;
      quantityUnit: string | null;
    }[] = [];
    const deletedInventoryIds: string[] = [];
    const updatedInventories: { id: string; name: string; remaining: number }[] = [];

    // トランザクション内で在庫を更新
    await prisma.$transaction(async (tx) => {
      for (const ingredient of recipe.ingredients) {
        // inventoryIdが設定されている場合はそれを使用
        let inventory = ingredient.inventoryId
          ? await tx.inventory.findUnique({
              where: { id: ingredient.inventoryId },
            })
          : null;

        // inventoryIdがない場合は名前でマッチング
        if (!inventory) {
          inventory = await tx.inventory.findFirst({
            where: {
              userId,
              name: {
                contains: ingredient.name,
              },
            },
          });
        }

        if (inventory) {
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
            // 単位変換不可の場合は従来の単純減算にフォールバック
            const newQty = currentQty - consumeQty;
            if (newQty <= 0) {
              await tx.inventory.delete({
                where: { id: inventory.id },
              });
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
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
