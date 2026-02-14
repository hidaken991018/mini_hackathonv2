import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type ExpiryKind = 'use_by' | 'best_before';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const buildTitle = (name: string, kindLabel: string, daysUntil: number) => {
  const daysLabel = daysUntil === 0 ? '当日' : `${daysUntil}日前`;
  return `期限通知: ${name}（${kindLabel} ${daysLabel}）`;
};

const buildBody = (name: string, kindLabel: string, date: Date, daysUntil: number) => {
  const dateText = formatDate(date);
  if (daysUntil === 0) {
    return `「${name}」の${kindLabel}が本日（${dateText}）です。`;
  }
  return `「${name}」の${kindLabel}が${daysUntil}日後（${dateText}）です。`;
};

async function processUserExpiry(userId: string): Promise<number> {
  const inventories = await prisma.inventory.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      quantityValue: true,
      expireDate: true,
      consumeBy: true,
    },
  });

  const today = toStartOfDay(new Date());

  const candidates: {
    inventoryId: string;
    name: string;
    expiryKind: ExpiryKind;
    expiryDate: Date;
    daysUntil: number;
    title: string;
    body: string;
  }[] = [];

  inventories.forEach((item) => {
    if (item.quantityValue !== null && item.quantityValue <= 0) return;

    const configs: { kind: ExpiryKind; date: Date | null; offsets: number[] }[] = [
      { kind: 'use_by', date: item.consumeBy, offsets: [3, 1, 0] },
      { kind: 'best_before', date: item.expireDate, offsets: [7, 3, 0] },
    ];

    configs.forEach((config) => {
      if (!config.date) return;
      const expiryDate = toStartOfDay(config.date);
      const daysUntil = Math.round((expiryDate.getTime() - today.getTime()) / MS_PER_DAY);
      if (!config.offsets.includes(daysUntil)) return;

      const kindLabel = config.kind === 'use_by' ? '消費期限' : '賞味期限';
      const title = buildTitle(item.name, kindLabel, daysUntil);
      const body = buildBody(item.name, kindLabel, expiryDate, daysUntil);

      candidates.push({
        inventoryId: item.id,
        name: item.name,
        expiryKind: config.kind,
        expiryDate,
        daysUntil,
        title,
        body,
      });
    });
  });

  if (candidates.length === 0) return 0;

  const inventoryIds = Array.from(new Set(candidates.map((c) => c.inventoryId)));
  const expiryDates = Array.from(
    new Set(candidates.map((c) => c.expiryDate.toISOString())),
  ).map((iso) => new Date(iso));
  const titles = Array.from(new Set(candidates.map((c) => c.title)));

  const existing = await prisma.notification.findMany({
    where: {
      userId,
      type: 'expiry',
      inventoryId: { in: inventoryIds },
      expiryDate: { in: expiryDates },
      title: { in: titles },
    },
    select: {
      inventoryId: true,
      expiryKind: true,
      expiryDate: true,
      title: true,
    },
  });

  const existingKey = new Set(
    existing.map(
      (item) =>
        `${item.inventoryId ?? ''}|${item.expiryKind ?? ''}|${item.expiryDate?.toISOString() ?? ''}|${item.title}`,
    ),
  );

  const toCreate = candidates.filter((candidate) => {
    const key = `${candidate.inventoryId}|${candidate.expiryKind}|${candidate.expiryDate.toISOString()}|${candidate.title}`;
    return !existingKey.has(key);
  });

  if (toCreate.length === 0) return 0;

  const result = await prisma.notification.createMany({
    data: toCreate.map((candidate) => ({
      userId,
      type: 'expiry',
      title: candidate.title,
      body: candidate.body,
      inventoryId: candidate.inventoryId,
      expiryKind: candidate.expiryKind,
      expiryDate: candidate.expiryDate,
    })),
  });

  return result.count;
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.NOTIFY_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'NOTIFY_SECRET が設定されていません' },
        { status: 500 },
      );
    }

    const providedSecret = request.headers.get('x-notify-secret');
    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    let targetUserIds: string[];
    if (userId && typeof userId === 'string') {
      targetUserIds = [userId];
    } else {
      const users = await prisma.user.findMany({ select: { id: true } });
      targetUserIds = users.map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { createdCount: 0, processedUsers: 0 },
      });
    }

    let totalCreated = 0;

    for (const uid of targetUserIds) {
      const count = await processUserExpiry(uid);
      totalCreated += count;
    }

    return NextResponse.json({
      success: true,
      data: { createdCount: totalCreated, processedUsers: targetUserIds.length },
    });
  } catch (error) {
    console.error('Expiry notification generate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '期限通知の生成中にエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : '不明なエラー' }),
      },
      { status: 500 },
    );
  }
}
