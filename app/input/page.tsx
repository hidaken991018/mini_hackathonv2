'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';
import ScreenHeader from '@/components/ScreenHeader';
import { InventoryItem } from '@/types';

// デフォルトユーザーID（認証実装前の暫定対応）
const DEFAULT_USER_ID = 'mock-user-001';

export default function InputPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingCount, setAnalyzingCount] = useState(0);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<InventoryItem[]>([]);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // レシート読み取り
  const handleReceiptClick = () => {
    if (isAnalyzing) return;
    receiptInputRef.current?.click();
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);
    setAnalyzingCount(files.length);
    setAnalyzedCount(0);

    const allItems: InventoryItem[] = [];
    const allIngredients: string[] = [];
    const allImageUrls: string[] = [];

    // 各ファイルを順次処理
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

        if (data.success) {
          if (data.data.items) {
            allItems.push(...data.data.items);
          }
          if (data.data.ingredients) {
            allIngredients.push(...data.data.ingredients);
          }
        }

        setAnalyzedCount(i + 1);
      } catch (error) {
        console.error(`Receipt analysis error for file ${i + 1}:`, error);
      }
    }

    // 全ての結果をまとめて表示
    if (allItems.length > 0 || allIngredients.length > 0) {
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

  // 在庫に登録
  const handleRegisterInventory = async () => {
    if (previewItems.length === 0) return;

    setIsRegistering(true);

    try {
      const response = await axios.post('/api/inventories/bulk', {
        userId: DEFAULT_USER_ID,
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
    value: string | number | undefined
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ScreenHeader title="Input" />

      {/* メイン入力エリア */}
      <div className="flex-1 overflow-y-auto pb-20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            レシートをアップロード
          </h2>
          <p className="text-gray-500 mb-8">
            レシート画像を選択して食材を読み取ります<br />
            複数のレシートを同時に選択できます
          </p>
          <button
            onClick={handleReceiptClick}
            disabled={isAnalyzing}
            className={`px-8 py-4 rounded-xl transition-all ${
              isAnalyzing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-3">
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
                <span className="font-medium">
                  読み取り中... {analyzedCount}/{analyzingCount}
                </span>
              </span>
            ) : (
              <span className="font-medium text-lg">レシートを選択</span>
            )}
          </button>
        </div>
      </div>

      <BottomNav />

      {/* hidden input for receipt upload (multiple) */}
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleReceiptChange}
      />

      {/* 在庫登録プレビューモーダル */}
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
            {/* ヘッダー */}
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

            {/* レシート画像 */}
            {previewImageUrls.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className={`grid gap-2 ${previewImageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
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

            {/* 食材リスト */}
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
                          <input
                            type="text"
                            value={item.quantityUnit || ''}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                'quantityUnit',
                                e.target.value || undefined
                              )
                            }
                            placeholder="単位"
                            className="w-16 px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex-1">
                          <label className="block text-gray-500 mb-1">賞味期限</label>
                          <input
                            type="date"
                            value={formatDateForInput(item.expireDate)}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                'expireDate',
                                e.target.value || undefined
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-500 mb-1">消費期限</label>
                          <input
                            type="date"
                            value={formatDateForInput(item.consumeBy)}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                'consumeBy',
                                e.target.value || undefined
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>
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

            {/* フッターボタン */}
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
    </div>
  );
}
