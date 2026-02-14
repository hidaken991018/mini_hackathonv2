import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const inventories = await prisma.inventory.findMany({
      where: { userId: userId! },
      orderBy: { updatedAt: 'desc' },
    });

    const data = inventories.map((inv) => ({
      id: inv.id,
      name: inv.name,
      category: inv.category,
      quantityValue: inv.quantityValue,
      quantityUnit: inv.quantityUnit,
      expireDate: inv.expireDate?.toISOString().split('T')[0] ?? null,
      consumeBy: inv.consumeBy?.toISOString().split('T')[0] ?? null,
      purchaseDate: inv.purchaseDate?.toISOString().split('T')[0] ?? null,
      note: inv.note,
      imageUrl: inv.imageUrl,
      isStaple: inv.isStaple,
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
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : '不明なエラー' }),
      },
      { status: 500 }
    );
  }
}
