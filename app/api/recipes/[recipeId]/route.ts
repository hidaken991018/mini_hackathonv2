import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { RecipeSourceType } from '@/types';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ recipeId: string }>;
};

// レシピ詳細取得
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const { recipeId } = await context.params;

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: { orderBy: { sortOrder: 'asc' } },
        steps: { orderBy: { stepNumber: 'asc' } },
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'レシピが見つかりません' },
        { status: 404 }
      );
    }

    // 所有者チェック（自分のレシピのみ取得可能）
    if (recipe.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    const data = {
      id: recipe.id,
      userId: recipe.userId,
      sourceType: recipe.sourceType as RecipeSourceType,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      cookingTime: recipe.cookingTime,
      servings: recipe.servings,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
      ingredients: recipe.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        quantityValue: ing.quantityValue,
        quantityUnit: ing.quantityUnit,
        sortOrder: ing.sortOrder,
      })),
      steps: recipe.steps.map((step) => ({
        step: step.stepNumber,
        instruction: step.instruction,
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Recipe fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'レシピの取得中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : '不明なエラー' }),
      },
      { status: 500 }
    );
  }
}

// レシピ更新
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const { recipeId } = await context.params;

    // レシピを取得して権限チェック
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!existingRecipe) {
      return NextResponse.json(
        { success: false, error: 'レシピが見つかりません' },
        { status: 404 }
      );
    }

    if (existingRecipe.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    // AI生成レシピは編集不可
    if (existingRecipe.sourceType === 'ai_generated') {
      return NextResponse.json(
        { success: false, error: 'AI生成レシピは編集できません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, cookingTime, servings, ingredients, steps } = body;

    // バリデーション
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'タイトルは空にできません' },
        { status: 400 }
      );
    }

    if (ingredients !== undefined && (!Array.isArray(ingredients) || ingredients.length === 0)) {
      return NextResponse.json(
        { success: false, error: '材料は1つ以上必要です' },
        { status: 400 }
      );
    }

    if (steps !== undefined && (!Array.isArray(steps) || steps.length === 0)) {
      return NextResponse.json(
        { success: false, error: '手順は1つ以上必要です' },
        { status: 400 }
      );
    }

    // トランザクションで更新
    const recipe = await prisma.$transaction(async (tx) => {
      // レシピ本体を更新
      await tx.recipe.update({
        where: { id: recipeId },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(cookingTime !== undefined && { cookingTime: cookingTime?.trim() || null }),
          ...(servings !== undefined && { servings: servings?.trim() || null }),
        },
      });

      // 材料を更新（指定された場合のみ）
      if (ingredients !== undefined) {
        // 既存の材料を削除
        await tx.recipeIngredient.deleteMany({
          where: { recipeId },
        });

        // 新しい材料を作成
        for (let i = 0; i < ingredients.length; i++) {
          const ing = ingredients[i];
          await tx.recipeIngredient.create({
            data: {
              recipeId,
              name: ing.name.trim(),
              quantityValue: ing.quantityValue ?? null,
              quantityUnit: ing.quantityUnit?.trim() || null,
              sortOrder: i + 1,
            },
          });
        }
      }

      // 手順を更新（指定された場合のみ）
      if (steps !== undefined) {
        // 既存の手順を削除
        await tx.recipeStep.deleteMany({
          where: { recipeId },
        });

        // 新しい手順を作成
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await tx.recipeStep.create({
            data: {
              recipeId,
              stepNumber: step.step || i + 1,
              instruction: step.instruction.trim(),
            },
          });
        }
      }

      // 更新したレシピを取得
      return tx.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: { orderBy: { sortOrder: 'asc' } },
          steps: { orderBy: { stepNumber: 'asc' } },
        },
      });
    });

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'レシピの更新に失敗しました' },
        { status: 500 }
      );
    }

    const data = {
      id: recipe.id,
      userId: recipe.userId,
      sourceType: recipe.sourceType as RecipeSourceType,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      cookingTime: recipe.cookingTime,
      servings: recipe.servings,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
      ingredients: recipe.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        quantityValue: ing.quantityValue,
        quantityUnit: ing.quantityUnit,
        sortOrder: ing.sortOrder,
      })),
      steps: recipe.steps.map((step) => ({
        step: step.stepNumber,
        instruction: step.instruction,
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Recipe update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'レシピの更新中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : '不明なエラー' }),
      },
      { status: 500 }
    );
  }
}

// レシピ削除
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const { recipeId } = await context.params;

    // レシピを取得して権限チェック
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!existingRecipe) {
      return NextResponse.json(
        { success: false, error: 'レシピが見つかりません' },
        { status: 404 }
      );
    }

    if (existingRecipe.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    // AI生成レシピは削除不可
    if (existingRecipe.sourceType === 'ai_generated') {
      return NextResponse.json(
        { success: false, error: 'AI生成レシピは削除できません' },
        { status: 400 }
      );
    }

    // レシピを削除（Cascade削除で材料・手順も削除される）
    await prisma.recipe.delete({
      where: { id: recipeId },
    });

    return NextResponse.json({
      success: true,
      data: { id: recipeId },
    });
  } catch (error) {
    console.error('Recipe delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'レシピの削除中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : '不明なエラー' }),
      },
      { status: 500 }
    );
  }
}
