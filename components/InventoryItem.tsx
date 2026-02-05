'use client';

import { InventoryItemWithId } from '@/types';

interface InventoryItemProps {
  item: InventoryItemWithId;
  onConsume: (id: string) => void;
  onClick: (item: InventoryItemWithId) => void;
  isConsuming?: boolean;
}

export default function InventoryItem({
  item,
  onConsume,
  onClick,
  isConsuming,
}: InventoryItemProps) {
  // 期限警告の判定（3日以内）
  const isExpiringSoon = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 3 && days >= 0;
  };

  // 期限切れの判定
  const isExpired = (dateStr?: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const expireWarning =
    isExpired(item.expireDate) || isExpired(item.consumeBy);
  const expiringSoon =
    isExpiringSoon(item.expireDate) || isExpiringSoon(item.consumeBy);

  // 背景色の決定
  const getBgColor = () => {
    if (expireWarning) return 'bg-red-50';
    if (expiringSoon) return 'bg-yellow-50';
    return 'bg-white';
  };

  // 期限テキストの色
  const getDateColor = () => {
    if (expireWarning) return 'text-red-600';
    if (expiringSoon) return 'text-yellow-600';
    return 'text-gray-400';
  };

  return (
    <div
      onClick={() => onClick(item)}
      className={`${getBgColor()} border-b border-gray-100 py-4 px-4 hover:bg-gray-50/50 transition-colors cursor-pointer`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 truncate">
            {item.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.quantityValue !== undefined && item.quantityValue !== null && (
              <span className="text-sm text-gray-600">
                {item.quantityValue}
                {item.quantityUnit || '個'}
              </span>
            )}
            {item.expireDate && (
              <span className={`text-xs ${getDateColor()}`}>
                賞味: {item.expireDate}
              </span>
            )}
            {item.consumeBy && (
              <span className={`text-xs ${getDateColor()}`}>
                消費: {item.consumeBy}
              </span>
            )}
          </div>
        </div>

        {/* 消費ボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConsume(item.id);
          }}
          disabled={isConsuming}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50"
          aria-label="1つ消費"
        >
          {isConsuming ? (
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <span className="text-lg font-bold">-1</span>
          )}
        </button>
      </div>
    </div>
  );
}
