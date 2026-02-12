import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - 在庫詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inventory = await prisma.inventory.findUnique({ where: { id } });

    if (!inventory) {
      return NextResponse.json(
        { success: false, error: '在庫が見つかりません' },
        { status: 404 }
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
        details: error instanceof Error ? error.message : '不明なエラー',
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
    const body = await request.json();

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

    // 数量バリデーション: 1未満の値を拒否
    if (body.quantityValue !== undefined && body.quantityValue < 1) {
      return NextResponse.json(
        { success: false, error: '数量は1以上で入力してください' },
        { status: 400 }
      );
    }

    const updatedInventory = await prisma.inventory.update({
      where: { id },
      data: {
        name: body.name,
        quantityValue: body.quantityValue,
        quantityUnit: body.quantityUnit,
        expireDate: body.expireDate ? new Date(body.expireDate) : null,
        consumeBy: body.consumeBy ? new Date(body.consumeBy) : null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        note: body.note,
        ...(body.isStaple !== undefined && { isStaple: body.isStaple }),
      },
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
        details: error instanceof Error ? error.message : '不明なエラー',
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
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
