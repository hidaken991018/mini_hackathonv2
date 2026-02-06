import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { RecipeSourceType } from '@/types';

export const dynamic = 'force-dynamic';

// レシピ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const sourceType = searchParams.get('sourceType') as RecipeSourceType | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 検索条件を構築
    const where: {
      userId?: string;
      sourceType?: string;
      OR?: { title?: { contains: string }; ingredients?: { some: { name: { contains: string } } } }[];
    } = {
      userId: userId!,
    };

    if (sourceType) {
      where.sourceType = sourceType;
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { ingredients: { some: { name: { contains: query } } } },
      ];
    }

    // 総数を取得
    const total = await prisma.recipe.count({ where });

    // レシピ一覧を取得
    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        _count: {
          select: {
            ingredients: true,
            steps: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const data = recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      cookingTime: recipe.cookingTime,
      sourceType: recipe.sourceType as RecipeSourceType,
      ingredientCount: recipe._count.ingredients,
      stepCount: recipe._count.steps,
      createdAt: recipe.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        recipes: data,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Recipes fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'レシピの取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

// レシピ作成
export async function POST(request: NextRequest) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { title, description, cookingTime, servings, ingredients, steps } = body;

    // バリデーション
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'タイトルは必須です' },
        { status: 400 }
      );
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { success: false, error: '材料は1つ以上必要です' },
        { status: 400 }
      );
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { success: false, error: '手順は1つ以上必要です' },
        { status: 400 }
      );
    }

    // トランザクションでレシピを作成
    const recipe = await prisma.$transaction(async (tx) => {
      // レシピ本体を作成
      const newRecipe = await tx.recipe.create({
        data: {
          userId: userId!,
          sourceType: 'user_created',
          title: title.trim(),
          description: description?.trim() || null,
          cookingTime: cookingTime?.trim() || null,
          servings: servings?.trim() || null,
        },
      });

      // 材料を作成
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        await tx.recipeIngredient.create({
          data: {
            recipeId: newRecipe.id,
            name: ing.name.trim(),
            quantityValue: ing.quantityValue ?? null,
            quantityUnit: ing.quantityUnit?.trim() || null,
            sortOrder: i + 1,
          },
        });
      }

      // 手順を作成
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await tx.recipeStep.create({
          data: {
            recipeId: newRecipe.id,
            stepNumber: step.step || i + 1,
            instruction: step.instruction.trim(),
          },
        });
      }

      // 作成したレシピを取得
      return tx.recipe.findUnique({
        where: { id: newRecipe.id },
        include: {
          ingredients: { orderBy: { sortOrder: 'asc' } },
          steps: { orderBy: { stepNumber: 'asc' } },
        },
      });
    });

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'レシピの作成に失敗しました' },
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

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Recipe create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'レシピの作成中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
