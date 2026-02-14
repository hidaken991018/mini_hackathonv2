'use client';

import { InventoryItemWithId } from '@/types';
import { getConsumeInfo } from '@/lib/units';
import { getExpiryType, EXPIRY_TYPE_SHORT_LABELS } from '@/lib/expiry-defaults';

interface InventoryItemProps {
  item: InventoryItemWithId;
  onConsume: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (item: InventoryItemWithId) => void;
  isConsuming?: boolean;
}

export default function InventoryItem({
  item,
  onConsume,
  onDelete,
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

  // 数量の表示用フォーマット（浮動小数点誤差対策）
  const formatQuantityValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '1';
    const rounded = Math.round(value * 100) / 100;
    return rounded.toString();
  };

  const displayValue = formatQuantityValue(item.quantityValue);
  const displayUnit = item.quantityUnit || '個';
  const { buttonLabel } = getConsumeInfo(item.quantityValue, item.quantityUnit);

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
      className={`${getBgColor()} glass rounded-3xl border border-white/40 p-5 pop-shadow hover:translate-y-[-2px] transition-all duration-300 cursor-pointer active:scale-[0.98]`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 truncate">
            {item.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-gray-600">
              {displayValue}
              {displayUnit}
            </span>
            {item.isStaple && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                常備品
              </span>
            )}
            {/* 期限表示: カテゴリに応じて適切な1つだけを表示 */}
            {(() => {
              // consumeBy が設定されていれば消費期限として表示（ユーザーがトグルで選択した場合を含む）
              if (item.consumeBy) {
                return (
                  <span className={`text-xs ${getDateColor()}`}>
                    消費: {item.consumeBy}
                  </span>
                );
              }
              // expireDate が設定されていれば、カテゴリに応じてラベルを切り替え
              if (item.expireDate) {
                const detectedType = getExpiryType(item.name);
                const label = detectedType && detectedType in EXPIRY_TYPE_SHORT_LABELS
                  ? EXPIRY_TYPE_SHORT_LABELS[detectedType]
                  : EXPIRY_TYPE_SHORT_LABELS['best_before'];
                const suffix = detectedType === 'freshness' ? '頃' : '';
                return (
                  <span className={`text-xs ${getDateColor()}`}>
                    {label}: {item.expireDate}{suffix}
                  </span>
                );
              }
              return null;
            })()}
            {/* 購入日表示: purchaseDateがあればそれを、なければcreatedAtをフォールバック表示 */}
            <span className="text-xs text-gray-400">
              購入: {item.purchaseDate || item.createdAt?.split('T')[0]}
            </span>
          </div>
        </div>

        {/* 削除ボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('この在庫を削除しますか？')) {
              onDelete(item.id);
            }
          }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
          aria-label="削除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {/* 消費ボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConsume(item.id);
          }}
          disabled={isConsuming}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50"
          aria-label={`${buttonLabel}消費`}
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
            <span className="text-lg font-bold">{buttonLabel}</span>
          )}
        </button>
      </div>
    </div>
  );
}
