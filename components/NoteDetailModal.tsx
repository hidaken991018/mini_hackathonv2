'use client';

import { Note } from '@/types';
import { useEffect } from 'react';
import Image from 'next/image';

interface NoteDetailModalProps {
  note: Note | null;
  onClose: () => void;
  onUpdate: (id: string, text: string) => void;
}

export default function NoteDetailModal({
  note,
  onClose,
  onUpdate,
}: NoteDetailModalProps) {
  useEffect(() => {
    if (note) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [note]);

  if (!note) return null;

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(note.id, e.target.value);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-black/50 absolute inset-0"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">ノート詳細</h2>
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

        {/* コンテンツ */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-6 py-6">
          {/* 画像 */}
          {note.images.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                画像 ({note.images.length}枚)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {note.images.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="aspect-video rounded-xl overflow-hidden bg-gray-100 shadow-sm relative"
                    >
                      <Image
                        src={imageUrl}
                        alt={`ノート画像 ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* テキスト */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              内容
            </label>
            <textarea
              value={note.text}
              onChange={handleTextChange}
              placeholder="ノートを入力..."
              className="w-full min-h-[200px] px-4 py-3 border border-gray-200 rounded-xl resize-none outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 text-gray-900 placeholder-gray-400 bg-white"
              rows={8}
            />
          </div>

          {/* メタ情報 */}
          <div className="pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400">
              更新日時: {formatDate(note.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
