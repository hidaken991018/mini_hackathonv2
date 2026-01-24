'use client';

import { Notification, Message } from '@/types';
import { useEffect, useState, useRef } from 'react';

interface RecipeSlideModalProps {
  notification: Notification | null;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}

export default function RecipeSlideModal({
  notification,
  onClose,
  onMarkAsRead,
}: RecipeSlideModalProps) {
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notification) {
      document.body.style.overflow = 'hidden';
      // 既読にする
      if (notification.readAt === null) {
        onMarkAsRead(notification.id);
      }
      // レシピ用の初期メッセージを設定
      if (notification.recipe && chatMessages.length === 0) {
        setChatMessages([
          {
            id: '1',
            role: 'assistant',
            content: `「${notification.title}」のレシピについて、何か質問や相談があればお気軽にどうぞ！\n\n例えば：\n- 材料の代用について\n- 調理のコツ\n- アレンジ方法\nなど、お手伝いします。`,
          },
        ]);
      }
    } else {
      document.body.style.overflow = 'unset';
      setShowChat(false);
      setChatMessages([]);
      setChatInput('');
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [notification, onMarkAsRead]);

  useEffect(() => {
    if (showChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  const handleSendMessage = () => {
    if (!chatInput.trim() || !notification) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');

    // 0.6秒後にダミーAI返信
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'なるほど、その質問についてお答えしますね。このレシピでは、特に火加減に注意するとより美味しく作れます。具体的には、弱火でじっくり炒めることで、食材の旨味が引き立ちます。',
      };
      setChatMessages((prev) => [...prev, aiMessage]);
    }, 600);
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
        className={`relative bg-white overflow-hidden shadow-2xl ${
          showChat
            ? 'w-full h-full flex rounded-none'
            : 'w-full max-h-[90vh] rounded-t-3xl animate-slide-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* レシピパネル */}
        <div className={showChat ? 'w-1/2 flex flex-col' : 'w-full'}>
          {/* ヘッダー画像 */}
          {notification.image && (
            <div className="relative h-64 bg-gray-100 flex-shrink-0">
              <img
                src={notification.image}
                alt={notification.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {!showChat && (
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
              )}
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {notification.title}
                </h2>
                <p className="text-white/90 text-sm">{notification.body}</p>
              </div>
            </div>
          )}

          {/* チャット表示時の閉じるボタン */}
          {showChat && (
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end flex-shrink-0">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
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
          )}

          {/* レシピコンテンツ */}
          <div
            className={`overflow-y-auto px-6 py-6 flex-1 ${
              showChat ? 'border-r border-gray-200' : 'max-h-[calc(90vh-256px)]'
            }`}
          >
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

        {/* AIチャットパネル */}
        {showChat && (
          <div className="w-1/2 flex flex-col bg-gray-50 h-full">
            {/* チャットヘッダー */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">AI レシピアシスタント</h3>
              <button
                onClick={() => setShowChat(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                aria-label="チャットを閉じる"
              >
                <svg
                  className="w-4 h-4 text-gray-600"
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

            {/* メッセージリスト */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-900 border border-gray-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* チャット入力 */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="レシピについて質問..."
                  className="flex-1 min-h-[44px] max-h-32 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl resize-none outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 text-gray-900 placeholder-gray-400 text-sm"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                  aria-label="送信"
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
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AIチャットボタン（右下） */}
        {!showChat && notification.recipe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowChat(true);
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
      </div>
    </div>
  );
}
