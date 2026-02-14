'use client';

import { Note } from '@/types';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface NoteCardProps {
  note: Note;
  onUpdate: (text: string) => void;
  onClick: () => void;
}

export default function NoteCard({ note, onUpdate, onClick }: NoteCardProps) {
  const [text, setText] = useState(note.text);

  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onUpdate(newText);
  };

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

  return (
    <div
      onClick={onClick}
      className="bg-white border-b border-gray-100 py-4 px-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
    >
      <div className="flex gap-4">
        {note.images.length > 0 && (
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 relative">
              <Image
                src={note.images[0]}
                alt="ノート画像"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full"
          >
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="ノートを入力..."
              className="w-full min-h-[60px] resize-none border-none outline-none bg-white text-gray-900 placeholder-gray-400 text-sm leading-relaxed focus:ring-0"
              rows={3}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {note.images.length > 1 && (
            <div className="mt-2 flex gap-2">
              {note.images.slice(1, 3).map((imageUrl, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 relative"
                  >
                    <Image
                      src={imageUrl}
                      alt={`添付画像 ${index + 2}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-xs text-gray-400">
            {formatDate(note.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
