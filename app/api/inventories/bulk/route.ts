import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { getFoodCategoryName } from '@/lib/expiry-defaults';

export const dynamic = 'force-dynamic'

type InventoryItemInput = {
  name: string;
  category?: string;
  quantityValue?: number;
  quantityUnit?: string;
  expireDate?: string;
  consumeBy?: string;
  purchaseDate?: string;
  note?: string;
  isStaple?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    // Firebase Auth Tokenから userId を取得
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { items } = body as {
      items: InventoryItemInput[];
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: '登録する在庫アイテムが必要です' },
        { status: 400 }
      );
    }

    // SQLiteはcreateManyに対応していないため、$transactionでバルクインサート
    const createdInventories = await prisma.$transaction(
      items.map((item) =>
        prisma.inventory.create({
          data: {
            userId,
            name: item.name,
            category: item.category || getFoodCategoryName(item.name),
            quantityValue: item.quantityValue,
            quantityUnit: item.quantityUnit,
            expireDate: item.expireDate ? new Date(item.expireDate) : null,
            consumeBy: item.consumeBy ? new Date(item.consumeBy) : null,
            purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
            note: item.note,
            isStaple: item.isStaple ?? false,
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
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : '不明なエラー' }),
      },
      { status: 500 }
    );
  }
}
