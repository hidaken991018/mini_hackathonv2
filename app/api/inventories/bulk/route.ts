import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

type InventoryItemInput = {
  name: string;
  quantityValue?: number;
  quantityUnit?: string;
  expireDate?: string;
  consumeBy?: string;
  note?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, items } = body as {
      userId: string;
      items: InventoryItemInput[];
    };

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: '登録する在庫アイテムが必要です' },
        { status: 400 }
      );
    }

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: '指定されたユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // SQLiteはcreateManyに対応していないため、$transactionでバルクインサート
    const createdInventories = await prisma.$transaction(
      items.map((item) =>
        prisma.inventory.create({
          data: {
            userId,
            name: item.name,
            quantityValue: item.quantityValue,
            quantityUnit: item.quantityUnit,
            expireDate: item.expireDate ? new Date(item.expireDate) : null,
            consumeBy: item.consumeBy ? new Date(item.consumeBy) : null,
            note: item.note,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        createdCount: createdInventories.length,
        inventories: createdInventories,
      },
    });
  } catch (error) {
    console.error('Bulk inventory create error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '在庫の一括登録中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
