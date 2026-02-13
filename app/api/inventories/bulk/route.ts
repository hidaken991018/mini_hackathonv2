import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { createValidationErrorResponse } from '@/lib/validation/error-response';
import { inventoryBulkRequestSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Firebase Auth Tokenから userId を取得
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const validation = inventoryBulkRequestSchema.safeParse(body);
    if (!validation.success) {
      return createValidationErrorResponse(
        validation.error,
        'リクエストボディの検証に失敗しました',
      );
    }

    const { items } = validation.data;

    // SQLiteはcreateManyに対応していないため、$transactionでバルクインサート
    const createdInventories = await prisma.$transaction(
      items.map((item) =>
        prisma.inventory.create({
          data: {
            userId,
            name: item.name,
            quantityValue: item.quantityValue,
            quantityUnit: item.quantityUnit ?? null,
            expireDate: item.expireDate ? new Date(item.expireDate) : null,
            consumeBy: item.consumeBy ? new Date(item.consumeBy) : null,
            purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
            note: item.note ?? null,
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
