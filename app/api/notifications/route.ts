import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const formatIngredient = (
  name: string,
  quantityValue: number | null,
  quantityUnit: string | null,
) => {
  if (quantityValue === null && !quantityUnit) return name;
  if (quantityValue === null && quantityUnit) return `${name} ${quantityUnit}`;
  if (quantityUnit) return `${name} ${quantityValue}${quantityUnit}`;
  return `${name} ${quantityValue}`;
};

export async function GET(request: NextRequest) {
  try {
    // Firebase Auth Tokenから userId を取得
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        recipe: {
          include: {
            ingredients: {
              orderBy: { sortOrder: 'asc' },
            },
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
      },
    })

    const data = notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      image: notification.imageUrl,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      recipeId: notification.recipeId ?? undefined,
      recipe: notification.recipe
        ? {
            ingredients: notification.recipe.ingredients.map((ingredient) =>
              formatIngredient(
                ingredient.name,
                ingredient.quantityValue,
                ingredient.quantityUnit
              )
            ),
            steps: notification.recipe.steps.map((step) => ({
              step: step.stepNumber,
              instruction: step.instruction,
            })),
            cookingTime: notification.recipe.cookingTime ?? undefined,
            servings: notification.recipe.servings ?? undefined,
            imageUrl: notification.recipe.imageUrl ?? undefined,
          }
        : undefined,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '通知の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    )
  }
}
