import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PATCH - 在庫を1単位消費
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 現在の在庫を取得
    const inventory = await prisma.inventory.findUnique({ where: { id } });

    if (!inventory) {
      return NextResponse.json(
        { success: false, error: '在庫が見つかりません' },
        { status: 404 }
      );
    }

    const currentValue = inventory.quantityValue ?? 0;
    const newValue = Math.max(0, currentValue - 1);

    // 0になった場合は削除、それ以外は更新
    if (newValue === 0) {
      await prisma.inventory.delete({ where: { id } });
      return NextResponse.json({
        success: true,
        data: { deleted: true, id },
      });
    }

    const updatedInventory = await prisma.inventory.update({
      where: { id },
      data: { quantityValue: newValue },
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: false,
        inventory: {
          id: updatedInventory.id,
          name: updatedInventory.name,
          quantityValue: updatedInventory.quantityValue,
          quantityUnit: updatedInventory.quantityUnit,
        },
      },
    });
  } catch (error) {
    console.error('Inventory consume error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '消費処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
