import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import {
  generateRecipeForUser,
  NoInventoryError,
} from '@/lib/recipe-generator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEYが設定されていません' },
        { status: 500 },
      );
    }

    const requestBody = await request.json().catch(() => ({}));
    const servings: number =
      typeof requestBody.servings === 'number' && requestBody.servings >= 1
        ? Math.min(Math.floor(requestBody.servings), 10)
        : 2;
    const excludeIngredients: string[] = Array.isArray(requestBody.excludeIngredients)
      ? requestBody.excludeIngredients
          .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => s.trim())
          .slice(0, 20)
      : [];

    const result = await generateRecipeForUser({
      userId: userId!,
      servings,
      excludeIngredients,
      skipNotification: true,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof NoInventoryError) {
      return NextResponse.json(
        { success: false, error: '在庫がありません' },
        { status: 200 },
      );
    }

    console.error('Recipe generate error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'レシピ生成中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && {
          details: err instanceof Error ? err.message : '不明なエラー',
        }),
      },
      { status: 500 },
    );
  }
}
