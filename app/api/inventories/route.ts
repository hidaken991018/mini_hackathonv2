import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userIdが必要です' },
        { status: 400 }
      );
    }

    const inventories = await prisma.inventory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const data = inventories.map((inv) => ({
      id: inv.id,
      name: inv.name,
      quantityValue: inv.quantityValue,
      quantityUnit: inv.quantityUnit,
      expireDate: inv.expireDate?.toISOString().split('T')[0] ?? null,
      consumeBy: inv.consumeBy?.toISOString().split('T')[0] ?? null,
      note: inv.note,
      imageUrl: inv.imageUrl,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Inventories fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '在庫の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
