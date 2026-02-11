'use client';

import { InventoryItemWithId } from '@/types';
import { useState, useEffect } from 'react';
import UnitSelector from './UnitSelector';
import ExpiryDateInput from './ExpiryDateInput';
import { ExpiryType, getExpiryType } from '@/lib/expiry-defaults';

interface InventoryEditModalProps {
  item: InventoryItemWithId | null;
  onClose: () => void;
  onSave: (id: string, data: Partial<InventoryItemWithId>) => void;
  onDelete: (id: string) => void;
  isSaving?: boolean;
}

export default function InventoryEditModal({
  item,
  onClose,
  onSave,
  onDelete,
  isSaving,
}: InventoryEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    quantityValue: '',
    quantityUnit: '',
    expireDate: '',
    consumeBy: '',
    purchaseDate: '',
    note: '',
    isStaple: false,
    expiryType: 'best_before' as ExpiryType,
  });

  /**
   * 既存データから適切な期限タイプを推定する
   * - consumeBy が設定済み → consume_by
   * - expireDate が設定済み → カテゴリ判定（best_before or freshness）
   * - どちらもない → カテゴリ自動判定（不明なら best_before）
   */
  const detectExpiryType = (itemData: InventoryItemWithId): ExpiryType => {
    if (itemData.consumeBy) return 'consume_by';
    if (itemData.expireDate) {
      const detected = getExpiryType(itemData.name);
      return detected === 'freshness' ? 'freshness' : 'best_before';
    }
    return getExpiryType(itemData.name) ?? 'best_before';
  };

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        quantityValue: item.quantityValue?.toString() || '',
        quantityUnit: item.quantityUnit || '',
        expireDate: item.expireDate || '',
        consumeBy: item.consumeBy || '',
        purchaseDate: item.purchaseDate || '',
        note: item.note || '',
        isStaple: item.isStaple || false,
        expiryType: detectExpiryType(item),
      });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  if (!item) return null;

  const handleSubmit = () => {
    onSave(item.id, {
      name: formData.name,
      quantityValue: formData.quantityValue
        ? Number(formData.quantityValue)
        : undefined,
      quantityUnit: formData.quantityUnit || undefined,
      expireDate: formData.expireDate || undefined,
      consumeBy: formData.consumeBy || undefined,
      purchaseDate: formData.purchaseDate || undefined,
      note: formData.note || undefined,
      isStaple: formData.isStaple,
    });
  };

  const handleDelete = () => {
    if (confirm('この在庫を削除しますか？')) {
      onDelete(item.id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="bg-black/50 absolute inset-0" />
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">在庫を編集</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* フォーム */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              食材名
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantityValue}
                onChange={(e) =>
                  setFormData({ ...formData, quantityValue: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                単位
              </label>
              <UnitSelector
                value={formData.quantityUnit}
                onChange={(unit) =>
                  setFormData({ ...formData, quantityUnit: unit })
                }
                placeholder="個"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              食材タイプ
            </label>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, isStaple: !formData.isStaple })
              }
              className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg transition-colors ${
                formData.isStaple
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm">
                {formData.isStaple ? '常備品' : '使い切り食材'}
              </span>
              <span className="text-xs text-gray-400">
                {formData.isStaple
                  ? '調理しても在庫を減らさない'
                  : '調理すると在庫を減らす'}
              </span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              購入日
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) =>
                setFormData({ ...formData, purchaseDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <ExpiryDateInput
            expiryType={formData.expiryType}
            date={
              formData.expiryType === 'consume_by'
                ? formData.consumeBy
                : formData.expireDate
            }
            onTypeChange={(type) => {
              // タイプ切り替え時: 現在の日付値をもう片方のフィールドに移動
              const currentDate =
                formData.expiryType === 'consume_by'
                  ? formData.consumeBy
                  : formData.expireDate;
              if (type === 'consume_by') {
                setFormData({
                  ...formData,
                  expiryType: type,
                  consumeBy: currentDate,
                  expireDate: '',
                });
              } else {
                setFormData({
                  ...formData,
                  expiryType: type,
                  expireDate: currentDate,
                  consumeBy: '',
                });
              }
            }}
            onDateChange={(date) => {
              if (formData.expiryType === 'consume_by') {
                setFormData({ ...formData, consumeBy: date, expireDate: '' });
              } else {
                setFormData({ ...formData, expireDate: date, consumeBy: '' });
              }
            }}
            foodName={formData.name}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleDelete}
            disabled={isSaving}
            className="py-2.5 px-4 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50"
          >
            削除
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name.trim()}
            className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
