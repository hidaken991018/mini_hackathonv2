'use client';

/**
 * ExpiryDateInput - 期限タイプ切り替え + 日付入力の共通コンポーネント
 *
 * 食材カテゴリに応じて「消費期限」「賞味期限」「鮮度目安」のうち
 * 適切な1つだけを表示し、トグルで切り替え可能にする。
 *
 * DB上は:
 * - consume_by → consumeBy フィールドに格納
 * - best_before / freshness → expireDate フィールドに格納（ラベルだけ異なる）
 */

import { ExpiryType, EXPIRY_TYPE_LABELS, getExpiryType } from '@/lib/expiry-defaults';

interface ExpiryDateInputProps {
  /** 現在選択されている期限タイプ */
  expiryType: ExpiryType;
  /** 日付値（YYYY-MM-DD形式） */
  date: string;
  /** 期限タイプが変更されたときのコールバック */
  onTypeChange: (type: ExpiryType) => void;
  /** 日付が変更されたときのコールバック */
  onDateChange: (date: string) => void;
  /** 食材名（カテゴリ自動判定でトグルの表示ラベルを決めるため） */
  foodName?: string;
  /** コンパクトモード（レシートプレビュー等の小さいUI用） */
  compact?: boolean;
}

/**
 * トグルで切り替え可能な「消費期限 / 賞味期限(鮮度目安)」の2択を返す
 *
 * 食材名から自動判定し、右側のラベルを「賞味期限」か「鮮度目安」に切り替える
 */
function getAlternativeType(foodName?: string): ExpiryType {
  if (!foodName) return 'best_before';
  const detected = getExpiryType(foodName);
  // 野菜・果物カテゴリの場合はfreshness、それ以外はbest_before
  return detected === 'freshness' ? 'freshness' : 'best_before';
}

export default function ExpiryDateInput({
  expiryType,
  date,
  onTypeChange,
  onDateChange,
  foodName,
  compact = false,
}: ExpiryDateInputProps) {
  // トグルの「もう1つの選択肢」を決定
  const altType = getAlternativeType(foodName);

  // トグルの2つの選択肢: 消費期限 / 賞味期限 or 鮮度目安
  const options: { type: ExpiryType; label: string }[] = [
    { type: 'consume_by', label: EXPIRY_TYPE_LABELS['consume_by'] },
    { type: altType, label: EXPIRY_TYPE_LABELS[altType] },
  ];

  // 現在のタイプがどちら側か（consume_by以外はすべて右側扱い）
  const isConsumeBy = expiryType === 'consume_by';

  if (compact) {
    // コンパクトモード（レシートプレビュー、手動登録用）
    return (
      <div className="flex-1">
        <div className="flex items-center gap-1 mb-1">
          {options.map((opt) => {
            const isActive =
              opt.type === 'consume_by' ? isConsumeBy : !isConsumeBy;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => onTypeChange(opt.type)}
                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-700 font-medium'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
    );
  }

  // 通常モード（編集モーダル用）
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        {options.map((opt) => {
          const isActive =
            opt.type === 'consume_by' ? isConsumeBy : !isConsumeBy;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onTypeChange(opt.type)}
              className={`text-sm px-2.5 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 font-medium'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}
