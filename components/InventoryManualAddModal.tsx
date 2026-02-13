'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axios';
import { InventoryItemWithId } from '@/types';
import UnitSelector from './UnitSelector';
import ExpiryDateInput from './ExpiryDateInput';
import { ExpiryType, getExpiryType } from '@/lib/expiry-defaults';

type InventoryManualAddModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRegistered?: (inventory: InventoryItemWithId) => void;
};

type FormState = {
  name: string;
  quantityValue: string;
  quantityUnit: string;
  expireDate: string;
  consumeBy: string;
  purchaseDate: string;
  note: string;
  isStaple: boolean;
  expiryType: ExpiryType;
};

const INITIAL_FORM: FormState = {
  name: '',
  quantityValue: '',
  quantityUnit: '',
  expireDate: '',
  consumeBy: '',
  purchaseDate: '',
  note: '',
  isStaple: false,
  expiryType: 'best_before',
};

export default function InventoryManualAddModal({
  isOpen,
  onClose,
  onRegistered,
}: InventoryManualAddModalProps) {
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setFormData(INITIAL_FORM);
      setIsSaving(false);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || isSaving) return;

    const quantityNumber = formData.quantityValue
      ? Number(formData.quantityValue)
      : undefined;

    const payload = {
      name: formData.name.trim(),
      quantityValue:
        typeof quantityNumber === 'number' && Number.isFinite(quantityNumber) && quantityNumber > 0
          ? quantityNumber
          : undefined,
      quantityUnit: formData.quantityUnit || undefined,
      expireDate:
        formData.expiryType === 'consume_by'
          ? undefined
          : formData.expireDate || undefined,
      consumeBy:
        formData.expiryType === 'consume_by'
          ? formData.consumeBy || undefined
          : undefined,
      purchaseDate: formData.purchaseDate || undefined,
      note: formData.note.trim() || undefined,
      isStaple: formData.isStaple,
    };

    setIsSaving(true);
    try {
      const response = await axiosInstance.post('/api/inventories/bulk', {
        items: [payload],
      });

      if (!response.data?.success) {
        alert(`在庫登録に失敗しました: ${response.data?.error || '不明なエラー'}`);
        return;
      }

      const created = response.data?.data?.inventories?.[0] as InventoryItemWithId | undefined;
      if (created) {
        onRegistered?.(created);
      }

      alert('在庫を手動で追加しました');
      onClose();
    } catch (error) {
      console.error('Manual inventory add error:', error);
      alert('在庫登録中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpiryTypeChange = (type: ExpiryType) => {
    setFormData((prev) => {
      const currentDate =
        prev.expiryType === 'consume_by' ? prev.consumeBy : prev.expireDate;

      if (type === 'consume_by') {
        return {
          ...prev,
          expiryType: type,
          consumeBy: currentDate,
          expireDate: '',
        };
      }

      return {
        ...prev,
        expiryType: type,
        expireDate: currentDate,
        consumeBy: '',
      };
    });
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const hasDate = Boolean(prev.expireDate || prev.consumeBy);
      if (hasDate) {
        return { ...prev, name };
      }

      const detected = getExpiryType(name);
      const nextType: ExpiryType = detected === 'consume_by' ? 'consume_by' : detected === 'freshness' ? 'freshness' : 'best_before';
      return { ...prev, name, expiryType: nextType };
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      onClick={handleClose}
    >
      <div className="bg-black/50 absolute inset-0" />
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">在庫を手動で追加</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="閉じる"
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

        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              食材名
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="例: 卵"
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
                min="0"
                step="1"
                value={formData.quantityValue}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, quantityValue: e.target.value }))
                }
                placeholder="1"
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
                  setFormData((prev) => ({ ...prev, quantityUnit: unit }))
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
                setFormData((prev) => ({ ...prev, isStaple: !prev.isStaple }))
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
                setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))
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
            onTypeChange={handleExpiryTypeChange}
            onDateChange={(date) => {
              if (formData.expiryType === 'consume_by') {
                setFormData((prev) => ({ ...prev, consumeBy: date, expireDate: '' }));
              } else {
                setFormData((prev) => ({ ...prev, expireDate: date, consumeBy: '' }));
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
                setFormData((prev) => ({ ...prev, note: e.target.value }))
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name.trim()}
            className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSaving ? '登録中...' : '在庫に追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
