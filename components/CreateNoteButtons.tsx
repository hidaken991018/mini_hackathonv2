'use client';

import { useRef } from 'react';

interface CreateNoteButtonsProps {
  onImageSelect: (imageUrl: string) => void;
  onTextNoteCreate: () => void;
}

export default function CreateNoteButtons({
  onImageSelect,
  onTextNoteCreate,
}: CreateNoteButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        onImageSelect(imageUrl);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed bottom-20 right-4 flex flex-col gap-3 z-20">
      {/* テキストノートボタン */}
      <button
        onClick={onTextNoteCreate}
        className="w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg border border-gray-200 hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="テキストノートを作成"
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
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>

      {/* カメラボタン */}
      <button
        onClick={handleCameraClick}
        className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-xl hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="画像を追加"
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
