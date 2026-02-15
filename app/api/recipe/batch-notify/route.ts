import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  NoInventoryError,
  generateRecipeForUser,
} from '@/lib/recipe-generator';

export const dynamic = 'force-dynamic';

type UserResult =
  | { userId: string; status: 'success'; recipeId: string; notificationId: string }
  | { userId: string; status: 'skipped'; reason: string }
  | { userId: string; status: 'error'; reason: string };

export async function POST(request: NextRequest) {
  try {
    // --- Authentication ---
    const expectedSecret = process.env.NOTIFY_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'NOTIFY_SECRET が設定されていません' },
        { status: 500 },
      );
    }

    const providedSecret = request.headers.get('x-notify-secret');
    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 },
      );
    }

    // --- Fail fast: check GEMINI_API_KEY before processing any users ---
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY が設定されていません' },
        { status: 500 },
      );
    }

    // --- Determine target users ---
    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    let targetUserIds: string[];
    if (userId && typeof userId === 'string') {
      targetUserIds = [userId];
    } else {
      const users = await prisma.user.findMany({ select: { id: true } });
      targetUserIds = users.map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          processedUsers: 0,
          successCount: 0,
          skippedCount: 0,
          errorCount: 0,
          results: [],
        },
      });
    }

    // --- Duplicate prevention: find users who already received a recipe notification today (UTC-based) ---
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const alreadyNotified = await prisma.notification.findMany({
      where: {
        userId: { in: targetUserIds },
        type: 'recipe',
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
      select: { userId: true },
    });

    const alreadyNotifiedSet = new Set(alreadyNotified.map((n) => n.userId));

    // --- Process each user ---
    const results: UserResult[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const uid of targetUserIds) {
      // Skip users who already have a recipe notification today
      if (alreadyNotifiedSet.has(uid)) {
        results.push({ userId: uid, status: 'skipped', reason: 'already_notified_today' });
        skippedCount++;
        continue;
      }

      try {
        const result = await generateRecipeForUser({ userId: uid, servings: 2 });
        results.push({
          userId: uid,
          status: 'success',
          recipeId: result.recipeId,
          notificationId: result.notificationId ?? '',
        });
        successCount++;
      } catch (error) {
        if (error instanceof NoInventoryError) {
          results.push({ userId: uid, status: 'skipped', reason: 'no_inventory' });
          skippedCount++;
        } else {
          const message = error instanceof Error ? error.message : '不明なエラー';
          console.error(`Batch recipe generation failed for user ${uid}:`, error);
          results.push({ userId: uid, status: 'error', reason: message });
          errorCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processedUsers: targetUserIds.length,
        successCount,
        skippedCount,
        errorCount,
        results,
      },
    });
  } catch (error) {
    console.error('Batch recipe notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'バッチレシピ通知の生成中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : '不明なエラー',
        }),
      },
      { status: 500 },
    );
  }
}
