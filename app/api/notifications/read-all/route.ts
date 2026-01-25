import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // 未読の通知を全て既読に更新
    const result = await prisma.notification.updateMany({
      where: {
        userId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.count,
      },
    });
  } catch (error) {
    console.error('Mark all as read error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '全件既読処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
