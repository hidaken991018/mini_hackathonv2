'use client';

import { Notification, Recipe } from '@/types';
import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axios';
import Portal from '@/components/Portal';
import Image from 'next/image';

interface RecipeSlideModalProps {
  notification?: Notification | null;
  recipe?: Recipe | null;
  onClose: () => void;
  onMarkAsRead?: (id: string) => void;
  onCookComplete?: (deletedInventoryIds: string[]) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipeId: string) => void;
}

export default function RecipeSlideModal({
  notification,
  recipe,
  onClose,
  onMarkAsRead,
  onCookComplete,
  onEdit,
  onDelete,
}: RecipeSlideModalProps) {
  // 調理機能の状態
  const [showCookConfirm, setShowCookConfirm] = useState(false);
  const [isCooking, setIsCooking] = useState(false);

  // 表示用データの統一
  const activeRecipe = recipe || notification?.recipe;
  const recipeId = recipe?.id || notification?.recipeId;
  const title = recipe?.title || notification?.title || '';
  const bodyText = recipe?.description || notification?.body || '';

  useEffect(() => {
    if (notification || recipe) {
      document.body.style.overflow = 'hidden';
      // 既読にする（通知経由の場合のみ）
      if (notification && notification.readAt === null && onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [notification, recipe, onMarkAsRead]);

  // モーダルが閉じられたときに調理確認もリセット
  useEffect(() => {
    if (!notification && !recipe) {
      setShowCookConfirm(false);
      setIsCooking(false);
    }
  }, [notification, recipe]);

  // 調理実行処理
  const handleCook = async () => {
    if (!recipeId) {
      alert('レシピ情報が不足しているため、調理処理を実行できません。');
      setShowCookConfirm(false);
      return;
    }

    setIsCooking(true);

    try {
      const response = await axiosInstance.post(
        `/api/recipes/${recipeId}/cook`,
        {}
      );

      if (response.data.success) {
        const { deletedInventoryIds } = response.data.data;

        // 親コンポーネントに削除された在庫を通知
        onCookComplete?.(deletedInventoryIds || []);

        setShowCookConfirm(false);
        alert('調理を完了しました！在庫が更新されました。');
      } else {
        alert(`調理処理に失敗しました: ${response.data.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Cook error:', error);
      alert('調理処理中にエラーが発生しました');
    } finally {
      setIsCooking(false);
    }
  };

  if (!notification && !recipe) return null;

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6"
        onClick={onClose}
      >
        <div
          className="bg-black/50 absolute inset-0 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          className="relative bg-white overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.3)] w-full max-w-2xl max-h-[90vh] md:max-h-[85vh] rounded-t-3xl md:rounded-3xl animate-slide-up flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダーエリア */}
          <div className="relative bg-gray-50 flex-shrink-0 p-6 min-h-[100px] flex flex-col justify-end border-b border-gray-100">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors shadow-sm z-10"
              aria-label="閉じる"
            >
              <svg
                className="w-5 h-5 text-gray-900"
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
            <div className="relative z-0 pr-12">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 leading-tight">
                {title}
              </h2>
              {bodyText && (
                <p className="text-gray-500 text-sm line-clamp-2 md:line-clamp-none">
                  {bodyText}
                </p>
              )}
            </div>
          </div>

          {/* レシピコンテンツ */}
          <div className="overflow-y-auto px-6 py-6 flex-1">
              {activeRecipe ? (
                <>
                  {/* レシピ情報 */}
                  <div className="mb-6">
                    {activeRecipe.imageUrl && (
                      <div className="mb-6 rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative h-64">
                        <Image
                          src={activeRecipe.imageUrl}
                          alt="Recipe Media"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex gap-4 mb-4">
                      {activeRecipe.cookingTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{activeRecipe.cookingTime}</span>
                        </div>
                      )}
                      {activeRecipe.servings && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span>{activeRecipe.servings}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 材料 */}
                  {activeRecipe.ingredients && activeRecipe.ingredients.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-bold text-gray-900 border-l-4 border-emerald-500 pl-3 mb-4">
                        材料
                      </h3>
                      <ul className="space-y-3">
                        {activeRecipe.ingredients.map((ingredient, index) => {
                          // 通知由来(string)とDB由来(RecipeIngredientItem)の両方をサポート
                          const name = typeof ingredient === 'string' ? ingredient : ingredient.name;
                          const quantity = typeof ingredient === 'string' 
                            ? '' 
                            : `${ingredient.quantityValue || ''}${ingredient.quantityUnit || ''}`;
                          
                          return (
                            <li
                              key={index}
                              className="flex items-center justify-between py-2 border-b border-gray-50 text-gray-700"
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {name}
                              </span>
                              {quantity && (
                                <span className="text-gray-400 text-sm font-medium">
                                  {quantity}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* 作り方 */}
                  {activeRecipe.steps && activeRecipe.steps.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-bold text-gray-900 border-l-4 border-emerald-500 pl-3 mb-4">
                        作り方
                      </h3>
                      <ol className="space-y-6">
                        {activeRecipe.steps.map((step) => (
                          <li
                            key={step.step}
                            className="flex gap-4 group"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                              {step.step}
                            </div>
                            <div className="flex-1 pt-1">
                              <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                                {step.instruction}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* 調理ボタン */}
                  <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                    <button
                      onClick={() => setShowCookConfirm(true)}
                      disabled={!recipeId}
                      className={`w-full py-4 px-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                        recipeId
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] hover:shadow-emerald-200'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      調理を記録する（在庫を減らす）
                    </button>
                    {!recipeId && (
                      <p className="text-xs text-gray-400 text-center italic">
                        ※ このレシピは在庫連動機能に対応していません
                      </p>
                    )}
                  </div>

                  {/* 管理アクション（編集・削除） */}
                  {recipe?.sourceType === 'user_created' && (onEdit || onDelete) && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                      {onDelete && (
                         <button
                         onClick={() => onDelete(recipeId!)}
                         className="flex-1 py-3 border border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors text-sm"
                       >
                         削除
                       </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(recipe as Recipe)}
                          className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors text-sm"
                        >
                          編集
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">レシピ詳細を読み込めませんでした</p>
                </div>
              )}

              {/* メタ情報 */}
              {notification && (
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                  <div className="text-[10px] text-gray-300">
                    受信日時: {formatDate(notification.createdAt)}
                  </div>
                </div>
              )}
            </div>
          
          {/* 調理確認モーダル（入れ子） */}
          {showCookConfirm && activeRecipe && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
              onClick={() => setShowCookConfirm(false)}
            >
              <div
                className="relative bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    調理を完了しますか？
                  </h3>
                  <p className="text-sm text-gray-500 mt-2">
                    お疲れ様です！この料理に使用した材料が在庫リストから自動で差し引かれます。
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCookConfirm(false)}
                    disabled={isCooking}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 disabled:opacity-50 transition-all"
                  >
                    まだ
                  </button>
                  <button
                    onClick={handleCook}
                    disabled={isCooking}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                  >
                    {isCooking ? (
                       <span className="flex items-center justify-center gap-2">
                       <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                       記録中
                     </span>
                    ) : (
                      'できた！'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
