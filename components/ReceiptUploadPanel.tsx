'use client';

import { useRef, useState } from 'react';
import axiosInstance from '@/lib/axios';
import { InventoryItem } from '@/types';
import UnitSelector from './UnitSelector';
import ExpiryDateInput from './ExpiryDateInput';
import { ExpiryType, getExpiryType, getFoodCategoryName, FOOD_CATEGORY_NAMES } from '@/lib/expiry-defaults';
import InventoryManualAddModal from './InventoryManualAddModal';
import Portal from './Portal';
import Image from 'next/image';

type ReceiptUploadPanelProps = {
  launcherPositionClassName?: string;
  onInventoryRegistered?: () => void;
};

export default function ReceiptUploadPanel({
  launcherPositionClassName = 'bottom-32 right-4',
  onInventoryRegistered,
}: ReceiptUploadPanelProps) {
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingCount, setAnalyzingCount] = useState(0);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<InventoryItem[]>([]);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [analysisFallbackMessage, setAnalysisFallbackMessage] = useState<string | null>(null);

  const handleReceiptClick = () => {
    if (isAnalyzing) return;
    setAnalysisFallbackMessage(null);
    receiptInputRef.current?.click();
  };

  const handleCameraClick = () => {
    if (isAnalyzing) return;
    setAnalysisFallbackMessage(null);
    cameraInputRef.current?.click();
  };

  const handleOpenManualModal = () => {
    setAnalysisFallbackMessage(null);
    setShowManualModal(true);
  };

  const handleOpenActionSheet = () => {
    setShowActionSheet(true);
  };

  const handleCloseActionSheet = () => {
    setShowActionSheet(false);
  };

  const handleSelectManualOption = () => {
    setShowActionSheet(false);
    handleOpenManualModal();
  };

  const handleSelectReceiptOption = () => {
    setShowActionSheet(false);
    handleReceiptClick();
  };

  const handleSelectCameraOption = () => {
    setShowActionSheet(false);
    handleCameraClick();
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);
    setAnalyzingCount(files.length);
    setAnalyzedCount(0);

    const allItems: InventoryItem[] = [];
    const allImageUrls: string[] = [];
    let hadAnalysisFailure = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const imageUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        allImageUrls.push(imageUrl);

        try {
          const { data } = await axiosInstance.post('/api/analyze-receipt', { imageData: imageUrl });

          if (data.success && Array.isArray(data.data?.items)) {
            allItems.push(...data.data.items);
          } else {
            hadAnalysisFailure = true;
          }
        } catch (error) {
          console.error(`Receipt analysis error for file ${i + 1}:`, error);
          hadAnalysisFailure = true;
        } finally {
          setAnalyzedCount(i + 1);
        }
      } catch (error) {
        console.error(`Receipt analysis error for file ${i + 1}:`, error);
        hadAnalysisFailure = true;
      }
    }

    if (allItems.length > 0) {
      setPreviewItems(allItems);
      setPreviewImageUrls(allImageUrls);
      setShowPreview(true);
      setAnalysisFallbackMessage(null);
    } else {
      const fallbackMessage = hadAnalysisFailure
        ? '文字欠けや読み取り失敗の可能性があります。手動入力してください。'
        : 'レシートから食材を抽出できませんでした。手動入力してください。';
      setAnalysisFallbackMessage(fallbackMessage);
    }

    setIsAnalyzing(false);
    setAnalyzingCount(0);
    setAnalyzedCount(0);

    if (receiptInputRef.current) {
      receiptInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
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
        onInventoryRegistered?.();

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
      {!(showManualModal || showPreview) && (
        <div className={`fixed z-30 flex flex-col items-end gap-2 ${launcherPositionClassName}`}>
          {analysisFallbackMessage && (
          <div className="w-72 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-3 shadow-md">
            <p className="text-sm">{analysisFallbackMessage}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleOpenManualModal}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                手動入力する
              </button>
              <button
                onClick={() => setAnalysisFallbackMessage(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleOpenActionSheet}
          aria-label="在庫入力メニューを開く"
          className="w-14 h-14 rounded-full shadow-xl border transition-all duration-200 flex items-center justify-center bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 hover:scale-105 active:scale-95"
        >
          <svg
            className="w-7 h-7"
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
        </button>
        </div>
      )}

      {showActionSheet && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-end"
            onClick={handleCloseActionSheet}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 p-4 pb-6 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleSelectCameraOption}
                disabled={isAnalyzing}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                <svg
                  className="w-5 h-5"
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
                <span className="text-sm font-medium">カメラで撮影</span>
              </button>

              <button
                onClick={handleSelectReceiptOption}
                disabled={isAnalyzing}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 3h10a2 2 0 012 2v14l-2-1.5L15 19l-2-1.5L11 19l-2-1.5L7 19V5a2 2 0 012-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 8h6M10 11h6M10 14h4"
                  />
                </svg>
                <span className="text-sm font-medium">レシートを読み取る</span>
              </button>

              <button
                onClick={handleSelectManualOption}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 hover:bg-gray-50 flex items-center gap-3"
              >
                <svg
                  className="w-5 h-5"
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
                <span className="text-sm font-medium">手動で追加</span>
              </button>

              <button
                onClick={handleCloseActionSheet}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium mt-2"
              >
                キャンセル
              </button>
            </div>
          </div>
        </Portal>
      )}

      <InventoryManualAddModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onRegistered={() => onInventoryRegistered?.()}
      />

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

      {isAnalyzing && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            aria-live="polite"
            aria-busy="true"
            role="status"
          >
            <div className="bg-black/50 absolute inset-0" />
            <div className="relative flex flex-col items-center gap-4 px-6 py-8 bg-white rounded-2xl shadow-2xl max-w-sm mx-4">
              <svg
                className="w-12 h-12 animate-spin text-emerald-500"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-700 font-medium text-center">
                {analyzingCount > 1
                  ? `読み取り中... ${analyzedCount}/${analyzingCount}`
                  : 'レシートを読み込んでいます...'}
              </p>
            </div>
          </div>
        </Portal>
      )}

      {showPreview && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={handleClosePreview}
          >
            <div className="bg-black/50 absolute inset-0" />
            <div
              className="relative bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
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
                      <div key={index} className="relative w-full h-32">
                        <Image
                          src={url}
                          alt={`レシート ${index + 1}`}
                          fill
                          className="object-contain rounded-lg"
                          unoptimized
                        />
                      </div>
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

                        <div className="mt-2">
                          <label className="block text-gray-500 mb-1 text-xs">カテゴリー</label>
                          <select
                            value={item.category ?? getFoodCategoryName(item.name)}
                            onChange={(e) =>
                              handleUpdateItem(index, 'category', e.target.value || undefined)
                            }
                            className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          >
                            {FOOD_CATEGORY_NAMES.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
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
        </Portal>
      )}
    </>
  );
}
