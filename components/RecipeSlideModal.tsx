'use client';

import { Notification } from '@/types';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// デフォルトユーザーID（認証実装前の暫定対応）
const DEFAULT_USER_ID = 'mock-user-001';

interface RecipeSlideModalProps {
  notification: Notification | null;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onCookComplete?: (deletedInventoryIds: string[]) => void;
}

export default function RecipeSlideModal({
  notification,
  onClose,
  onMarkAsRead,
  onCookComplete,
}: RecipeSlideModalProps) {
  const router = useRouter();

  // 調理機能の状態
  const [showCookConfirm, setShowCookConfirm] = useState(false);
  const [isCooking, setIsCooking] = useState(false);

  useEffect(() => {
    if (notification) {
      document.body.style.overflow = 'hidden';
      // 既読にする
      if (notification.readAt === null) {
        onMarkAsRead(notification.id);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [notification, onMarkAsRead]);

  // モーダルが閉じられたときに調理確認もリセット
  useEffect(() => {
    if (!notification) {
      setShowCookConfirm(false);
      setIsCooking(false);
    }
  }, [notification]);

  // 調理実行処理
  const handleCook = async () => {
    if (!notification || !notification.recipeId) {
      alert('レシピ情報が不足しているため、調理処理を実行できません。');
      setShowCookConfirm(false);
      return;
    }

    setIsCooking(true);

    try {
      const response = await axios.post(
        `/api/recipes/${notification.recipeId}/cook`,
        { userId: DEFAULT_USER_ID }
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

  if (!notification) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-black/50 absolute inset-0"
        onClick={onClose}
      />
      <div
        className="relative bg-white overflow-hidden shadow-2xl w-full max-h-[90vh] rounded-t-3xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* レシピパネル */}
        <div className="w-full">
          {/* ヘッダー画像 */}
          {notification.image && (
            <div className="relative h-64 bg-gray-100 flex-shrink-0">
              <img
                src={notification.image}
                alt={notification.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
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
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {notification.title}
                </h2>
                <p className="text-white/90 text-sm">{notification.body}</p>
              </div>
            </div>
          )}

          {/* レシピコンテンツ */}
          <div className="overflow-y-auto px-6 py-6 flex-1 max-h-[calc(90vh-256px)]">
          {notification.recipe ? (
            <>
              {/* レシピ情報 */}
              <div className="mb-6">
                <div className="flex gap-4 mb-4">
                  {notification.recipe.cookingTime && (
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
                      <span>{notification.recipe.cookingTime}</span>
                    </div>
                  )}
                  {notification.recipe.servings && (
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
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span>{notification.recipe.servings}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 材料 */}
              {notification.recipe.ingredients.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    材料
                  </h3>
                  <ul className="space-y-2">
                    {notification.recipe.ingredients.map((ingredient, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm text-gray-700"
                      >
                        <span className="text-gray-400 mt-1">•</span>
                        <span className="flex-1">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 作り方 */}
              {notification.recipe.steps.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    作り方
                  </h3>
                  <ol className="space-y-4">
                    {notification.recipe.steps.map((step) => (
                      <li
                        key={step.step}
                        className="flex gap-4"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                          {step.step}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {step.instruction}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 調理ボタン */}
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                <button
                  onClick={() => setShowCookConfirm(true)}
                  disabled={!notification.recipeId}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    notification.recipeId
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
                  この料理を作る
                </button>
                {!notification.recipeId && (
                  <p className="text-xs text-gray-400 text-center">
                    このレシピは調理機能に対応していません
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">レシピ情報がありません</p>
            </div>
          )}

            {/* メタ情報 */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="text-xs text-gray-400">
                作成日時: {formatDate(notification.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* AIチャットボタン（右下） */}
        {notification.recipe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // レシピ情報をローカルストレージに保存
              const initialMessage = {
                id: '1',
                role: 'assistant' as const,
                content: `「${notification.title}」のレシピについて、何か質問や相談があればお気軽にどうぞ！\n\n例えば：\n- 材料の代用について\n- 調理のコツ\n- アレンジ方法\nなど、お手伝いします。`,
              };
              localStorage.setItem('chatInitialMessage', JSON.stringify(initialMessage));
              // /chatページに遷移
              router.push('/chat');
            }}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-xl hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all duration-200 z-10"
            aria-label="AIチャットを開く"
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
        )}

        {/* 調理確認モーダル */}
        {showCookConfirm && notification.recipe && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowCookConfirm(false)}
          >
            <div className="bg-black/50 absolute inset-0" />
            <div
              className="relative bg-white rounded-2xl max-w-sm w-[90%] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="px-4 py-4 text-center border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  この料理を作りますか？
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  以下の材料が在庫から消費されます
                </p>
              </div>

              {/* 消費材料リスト */}
              <div className="px-4 py-4 max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {notification.recipe.ingredients.map((ingredient, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <span className="text-emerald-500">-</span>
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* フッターボタン */}
              <div className="px-4 py-3 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowCookConfirm(false)}
                  disabled={isCooking}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCook}
                  disabled={isCooking}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isCooking ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin"
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
                      処理中...
                    </span>
                  ) : (
                    '調理する'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
