import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    const { notificationId } = params;

    if (!notificationId) {
      return NextResponse.json(
        { error: '通知IDが必要です' },
        { status: 400 }
      );
    }

    // 通知を既読に更新
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: updatedNotification,
    });
  } catch (error) {
    console.error('Mark as read error:', error);

    // 通知が見つからない場合
    if (
      error instanceof Error &&
      error.message.includes('Record to update not found')
    ) {
      return NextResponse.json(
        { error: '指定された通知が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '通知の既読処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
