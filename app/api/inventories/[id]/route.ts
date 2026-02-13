import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { createValidationErrorResponse } from '@/lib/validation/error-response';
import { inventoryUpdateRequestSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

// GET - 在庫詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const inventory = await prisma.inventory.findUnique({ where: { id } });

    if (!inventory) {
      return NextResponse.json(
        { success: false, error: '在庫が見つかりません' },
        { status: 404 }
      );
    }

    // 所有者確認
    if (inventory.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'この在庫にアクセスする権限がありません' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: inventory.id,
        name: inventory.name,
        quantityValue: inventory.quantityValue,
        quantityUnit: inventory.quantityUnit,
        expireDate: inventory.expireDate?.toISOString().split('T')[0] ?? null,
        consumeBy: inventory.consumeBy?.toISOString().split('T')[0] ?? null,
        purchaseDate: inventory.purchaseDate?.toISOString().split('T')[0] ?? null,
        note: inventory.note,
        imageUrl: inventory.imageUrl,
        isStaple: inventory.isStaple,
        createdAt: inventory.createdAt.toISOString(),
        updatedAt: inventory.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Inventory fetch error:', error);
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

// PUT - 在庫更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const requestBody = await request.json();
    const validation = inventoryUpdateRequestSchema.safeParse(requestBody);
    if (!validation.success) {
      return createValidationErrorResponse(
        validation.error,
        'リクエストボディの検証に失敗しました',
      );
    }

    const body = validation.data;

    // 在庫の存在確認
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '在庫が見つかりません' },
        { status: 404 }
      );
    }

    // 所有者確認
    if (existing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'この在庫を編集する権限がありません' },
        { status: 403 }
      );
    }

    const updateData = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.quantityValue !== undefined && { quantityValue: body.quantityValue }),
      ...(body.quantityUnit !== undefined && { quantityUnit: body.quantityUnit }),
      ...(body.expireDate !== undefined && {
        expireDate: body.expireDate ? new Date(body.expireDate) : null,
      }),
      ...(body.consumeBy !== undefined && {
        consumeBy: body.consumeBy ? new Date(body.consumeBy) : null,
      }),
      ...(body.purchaseDate !== undefined && {
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      }),
      ...(body.note !== undefined && { note: body.note }),
      ...(body.isStaple !== undefined && { isStaple: body.isStaple }),
    };

    const updatedInventory = await prisma.inventory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedInventory.id,
        name: updatedInventory.name,
        quantityValue: updatedInventory.quantityValue,
        quantityUnit: updatedInventory.quantityUnit,
        expireDate: updatedInventory.expireDate?.toISOString().split('T')[0] ?? null,
        consumeBy: updatedInventory.consumeBy?.toISOString().split('T')[0] ?? null,
        purchaseDate: updatedInventory.purchaseDate?.toISOString().split('T')[0] ?? null,
        note: updatedInventory.note,
        imageUrl: updatedInventory.imageUrl,
        isStaple: updatedInventory.isStaple,
        createdAt: updatedInventory.createdAt.toISOString(),
        updatedAt: updatedInventory.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Inventory update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '在庫の更新中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : '不明なエラー' }),
      },
      { status: 500 }
    );
  }
}

// DELETE - 在庫削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, userId } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // 在庫の存在確認
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '在庫が見つかりません' },
        { status: 404 }
      );
    }

    // 所有者確認
    if (existing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'この在庫を削除する権限がありません' },
        { status: 403 }
      );
    }

    await prisma.inventory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inventory delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '在庫の削除中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : '不明なエラー' }),
      },
      { status: 500 }
    );
  }
}
