'use client';

import { useRef, useState } from 'react';
import axiosInstance from '@/lib/axios';
import { InventoryItem } from '@/types';
import UnitSelector from './UnitSelector';
import ExpiryDateInput from './ExpiryDateInput';
import { ExpiryType, getExpiryType } from '@/lib/expiry-defaults';

export default function ReceiptUploadPanel() {
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingCount, setAnalyzingCount] = useState(0);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<InventoryItem[]>([]);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);

  const handleReceiptClick = () => {
    if (isAnalyzing) return;
    receiptInputRef.current?.click();
  };

  const handleCameraClick = () => {
    if (isAnalyzing) return;
    cameraInputRef.current?.click();
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);
    setAnalyzingCount(files.length);
    setAnalyzedCount(0);

    const allItems: InventoryItem[] = [];
    const allImageUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const imageUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        allImageUrls.push(imageUrl);

        const response = await fetch('/api/analyze-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: imageUrl }),
        });

        const data = await response.json();

        if (data.success && data.data.items) {
          allItems.push(...data.data.items);
        }

        setAnalyzedCount(i + 1);
      } catch (error) {
        console.error(`Receipt analysis error for file ${i + 1}:`, error);
      }
    }

    if (allItems.length > 0) {
      setPreviewItems(allItems);
      setPreviewImageUrls(allImageUrls);
      setShowPreview(true);
    } else {
      alert('レシート解析に失敗しました');
    }

    setIsAnalyzing(false);
    setAnalyzingCount(0);
    setAnalyzedCount(0);

    if (receiptInputRef.current) {
      receiptInputRef.current.value = '';
    }
  };

  const handleRegisterInventory = async () => {
    if (previewItems.length === 0) return;

    setIsRegistering(true);

    try {
      const response = await axiosInstance.post('/api/inventories/bulk', {
        items: previewItems,
      });

      if (response.data.success) {
        setShowPreview(false);
        setPreviewItems([]);
        setPreviewImageUrls([]);

        alert(`${response.data.data.createdCount}件の食材を在庫に登録しました`);
      } else {
        alert(`在庫登録に失敗しました: ${response.data.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Inventory registration error:', error);
      alert('在庫登録中にエラーが発生しました');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewItems([]);
    setPreviewImageUrls([]);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof InventoryItem,
    value: string | number | boolean | undefined
  ) => {
    setPreviewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteItem = (index: number) => {
    setPreviewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setPreviewItems((prev) => [
      ...prev,
      { name: '', quantityValue: undefined, quantityUnit: undefined },
    ]);
  };

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    return dateStr;
  };

  /**
   * アイテムの既存データから期限タイプを推定する
   */
  const getItemExpiryType = (item: InventoryItem): ExpiryType => {
    if (item.consumeBy) return 'consume_by';
    if (item.expireDate) {
      const detected = getExpiryType(item.name);
      return detected === 'freshness' ? 'freshness' : 'best_before';
    }
    return getExpiryType(item.name) ?? 'best_before';
  };

  /**
   * 期限タイプ切り替え時のハンドラ
   * 日付値をもう片方のフィールドに移動する
   */
  const handleExpiryTypeChange = (index: number, item: InventoryItem, newType: ExpiryType) => {
    const currentDate = item.consumeBy || item.expireDate || '';
    setPreviewItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        if (newType === 'consume_by') {
          return { ...it, consumeBy: currentDate, expireDate: undefined };
        } else {
          return { ...it, expireDate: currentDate, consumeBy: undefined };
        }
      })
    );
  };

  /**
   * 期限日付変更時のハンドラ
   * 現在のタイプに応じて適切なフィールドにセット
   */
  const handleExpiryDateChange = (index: number, item: InventoryItem, date: string) => {
    const currentType = getItemExpiryType(item);
    setPreviewItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        if (currentType === 'consume_by') {
          return { ...it, consumeBy: date || undefined, expireDate: undefined };
        } else {
          return { ...it, expireDate: date || undefined, consumeBy: undefined };
        }
      })
    );
  };

  return (
    <>
      <div className="fixed bottom-20 right-4 z-30 flex items-center gap-3">
        <button
          onClick={handleReceiptClick}
          disabled={isAnalyzing}
          aria-label={
            isAnalyzing
              ? `レシートを読み取り中 (${analyzedCount}/${analyzingCount})`
              : 'レシート画像を選択'
          }
          className={`w-14 h-14 rounded-full shadow-xl border transition-all duration-200 flex items-center justify-center ${
            isAnalyzing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
              : 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 hover:scale-105 active:scale-95'
          }`}
        >
          {isAnalyzing ? (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 0 012-2h2a2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          )}
        </button>
        <button
          onClick={handleCameraClick}
          disabled={isAnalyzing}
          aria-label="カメラで撮影"
          className={`w-14 h-14 rounded-full shadow-xl border transition-all duration-200 flex items-center justify-center ${
            isAnalyzing
              ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50 hover:scale-105 active:scale-95'
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleReceiptChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleReceiptChange}
      />

      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handleClosePreview}
        >
          <div className="bg-black/50 absolute inset-0" />
          <div
            className="relative bg-white rounded-2xl max-w-lg w-[95%] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">在庫に登録</h3>
              <button
                onClick={handleClosePreview}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                aria-label="閉じる"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
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

            {previewImageUrls.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div
                  className={`grid gap-2 ${
                    previewImageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}
                >
                  {previewImageUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`レシート ${index + 1}`}
                      className="w-full max-h-32 object-contain rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-4 flex-1 min-h-0 overflow-y-auto">
              {previewItems.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">
                  食材が読み取れませんでした
                </p>
              ) : (
                <div className="space-y-4">
                  {previewItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            handleUpdateItem(index, 'name', e.target.value)
                          }
                          placeholder="食材名"
                          className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => handleDeleteItem(index)}
                          className="w-8 h-8 rounded-full hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors"
                          aria-label="削除"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 flex items-center gap-1">
                          <input
                            type="number"
                            value={item.quantityValue || ''}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                'quantityValue',
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            placeholder="数量"
                            className="w-20 px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                          <UnitSelector
                            value={item.quantityUnit || ''}
                            onChange={(unit) =>
                              handleUpdateItem(
                                index,
                                'quantityUnit',
                                unit || undefined
                              )
                            }
                            placeholder="単位"
                            className="w-20"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItem(index, 'isStaple', !item.isStaple)
                          }
                          className={`flex-shrink-0 px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                            item.isStaple
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                          }`}
                          title={item.isStaple ? '常備品（調理で減らない）' : '使い切り（調理で減る）'}
                        >
                          {item.isStaple ? '常備品' : '使い切り'}
                        </button>
                      </div>

                      <div className="text-xs">
                        <ExpiryDateInput
                          expiryType={getItemExpiryType(item)}
                          date={
                            getItemExpiryType(item) === 'consume_by'
                              ? formatDateForInput(item.consumeBy)
                              : formatDateForInput(item.expireDate)
                          }
                          onTypeChange={(type) => handleExpiryTypeChange(index, item, type)}
                          onDateChange={(date) => handleExpiryDateChange(index, item, date)}
                          foodName={item.name}
                          compact
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleAddItem}
                className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                食材を追加
              </button>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button
                onClick={handleClosePreview}
                className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleRegisterInventory}
                disabled={
                  previewItems.length === 0 ||
                  previewItems.some((item) => !item.name.trim()) ||
                  isRegistering
                }
                className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isRegistering ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    登録中...
                  </span>
                ) : (
                  `在庫に登録 (${previewItems.length}件)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
