import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { recipeId: string } }
) {
  try {
    const { recipeId } = params;
    const body = await request.json();
    const { userId } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'レシピIDが必要です' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
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
          const newQty = currentQty - consumeQty;

          consumedIngredients.push({
            name: ingredient.name,
            quantityValue: ingredient.quantityValue,
            quantityUnit: ingredient.quantityUnit,
          });

          if (newQty <= 0) {
            // 在庫がなくなったら削除
            await tx.inventory.delete({
              where: { id: inventory.id },
            });
            deletedInventoryIds.push(inventory.id);
          } else {
            // 数量を減算
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
