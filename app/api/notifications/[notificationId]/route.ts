import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ notificationId: string }>;
};

/**
 * 通知を削除する（レシピは残る）
 * DELETE /api/notifications/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const { notificationId } = await context.params;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: '通知IDが必要です' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: '指定された通知が見つかりません' },
        { status: 404 }
      );
    }

    if (notification.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'この通知にアクセスする権限がありません' },
        { status: 403 }
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({
      success: true,
      data: { id: notificationId },
    });
  } catch (error) {
    console.error('Notification delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '通知の削除中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' &&
          error instanceof Error && { details: error.message }),
      },
      { status: 500 }
    );
  }
}
