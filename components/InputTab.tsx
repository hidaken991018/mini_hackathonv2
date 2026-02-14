'use client';

import { useState, useEffect, useRef } from 'react';
import { Note, ReceiptAnalysisResult, InventoryItem } from '@/types';
import CreateNoteModal from '@/components/CreateNoteModal';
import axios from 'axios';
import Image from 'next/image';

// デフォルトユーザーID（認証実装前の暫定対応）
const DEFAULT_USER_ID = 'mock-user-001';

// ローカル在庫型
type LocalInventory = {
  id: string;
  name: string;
  quantityValue?: number;
  quantityUnit?: string;
};

interface InputTabProps {
  notes: Note[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (id: string, text: string, images?: string[]) => void;
  onInventoryRegistered?: (items: LocalInventory[]) => void;
}

export default function InputTab({
  notes,
  onAddNote,
  onUpdateNote,
  onInventoryRegistered,
}: InputTabProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    notes.length > 0 ? notes[0].id : null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);

  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;

  // 選択したノートが変更されたら編集フィールドを更新
  useEffect(() => {
    if (selectedNote) {
      const lines = selectedNote.text.split('\n');
      setEditTitle(lines[0] || '');
      setEditBody(lines.slice(1).join('\n').trimStart());
      setEditImages(selectedNote.images);
    } else {
      setEditTitle('');
      setEditBody('');
      setEditImages([]);
    }
  }, [selectedNote]);

  // notesが変更されたら最初のノートを選択
  useEffect(() => {
    if (notes.length > 0 && !notes.find((n) => n.id === selectedNoteId)) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId]);

  // 日時フォーマット
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  // タイトル取得（1行目）
  const getTitle = (text: string) => {
    const firstLine = text.split('\n')[0];
    return firstLine || '新規ノート';
  };

  // プレビュー取得（2行目以降）
  const getPreview = (text: string) => {
    const lines = text.split('\n').slice(1);
    const preview = lines.join(' ').trim();
    if (preview.length > 60) {
      return preview.substring(0, 60) + '...';
    }
    return preview || '追加テキストなし';
  };

  // 編集内容を保存
  const handleSaveEdit = () => {
    if (!selectedNote) return;
    const fullText = editTitle + (editBody ? '\n' + editBody : '');
    onUpdateNote(selectedNote.id, fullText, editImages);
  };

  // タイトル変更時
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditTitle(e.target.value);
  };

  // 本文変更時
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditBody(e.target.value);
  };

  // フォーカスが外れたら保存
  const handleBlur = () => {
    handleSaveEdit();
  };

  // 画像削除
  const handleRemoveImage = (index: number) => {
    const newImages = editImages.filter((_, i) => i !== index);
    setEditImages(newImages);
    if (selectedNote) {
      const fullText = editTitle + (editBody ? '\n' + editBody : '');
      onUpdateNote(selectedNote.id, fullText, newImages);
    }
  };

  // 新規ノート作成
  const handleCreateNote = (text: string, images: string[]) => {
    const newNote: Note = {
      id: Date.now().toString(),
      text,
      images,
      updatedAt: new Date(),
    };
    onAddNote(newNote);
    setSelectedNoteId(newNote.id);
    setShowCreateModal(false);
  };

  return (
    <div className="flex h-full bg-white">
      {/* 左ペイン（サイドバー） */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50/50">
        {/* サイドバーヘッダー */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">ノート</h2>
          <p className="text-xs text-gray-500 mt-0.5">{notes.length}件</p>
        </div>

        {/* ノート一覧 */}
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-400 text-sm">ノートがありません</p>
              <p className="text-gray-300 text-xs mt-1">
                右下のボタンから作成
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                  selectedNoteId === note.id
                    ? 'bg-amber-50 border-l-4 border-l-amber-400'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* サムネイル */}
                  {note.images.length > 0 && (
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 relative">
                      <Image
                        src={note.images[0]}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate text-sm">
                      {getTitle(note.text)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(note.updatedAt)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {getPreview(note.text)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右ペイン（詳細・編集エリア） */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedNote ? (
          <>
            {/* 編集ヘッダー */}
            <div className="px-6 py-3 border-b border-gray-100 bg-white">
              <span className="text-xs text-gray-400">
                更新: {formatDate(selectedNote.updatedAt)}
              </span>
            </div>

            {/* 編集エリア */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* タイトル入力 */}
              <input
                type="text"
                value={editTitle}
                onChange={handleTitleChange}
                onBlur={handleBlur}
                placeholder="タイトル"
                className="w-full text-2xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent mb-4"
              />

              {/* 画像表示 */}
              {editImages.length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {editImages.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 group"
                    >
                      <Image
                        src={imageUrl}
                        alt={`添付画像 ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        aria-label="画像を削除"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 本文入力 */}
              <textarea
                value={editBody}
                onChange={handleBodyChange}
                onBlur={handleBlur}
                placeholder="本文を入力..."
                className="w-full min-h-[300px] text-gray-700 placeholder-gray-300 border-none outline-none bg-transparent resize-none leading-relaxed"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">ノートを選択してください</p>
              <p className="text-gray-300 text-xs mt-1">
                または右下のボタンから新規作成
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 新規作成ボタン */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xl hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all duration-200 z-20"
        aria-label="新規ノートを作成"
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

      {/* 新規作成モーダル */}
      <CreateNoteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateNote}
        onInventoryRegistered={onInventoryRegistered}
      />
    </div>
  );
}
