import { prisma } from '@/lib/prisma';
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
        note: inventory.note,
        imageUrl: inventory.imageUrl,
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

    const updatedInventory = await prisma.inventory.update({
      where: { id },
      data: {
        name: body.name,
        quantityValue: body.quantityValue,
        quantityUnit: body.quantityUnit,
        expireDate: body.expireDate ? new Date(body.expireDate) : null,
        consumeBy: body.consumeBy ? new Date(body.consumeBy) : null,
        note: body.note,
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
        note: updatedInventory.note,
        imageUrl: updatedInventory.imageUrl,
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
    const { id } = await params;

    // 在庫の存在確認
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '在庫が見つかりません' },
        { status: 404 }
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
