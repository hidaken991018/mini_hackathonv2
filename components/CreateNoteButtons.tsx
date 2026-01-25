'use client';

import { useRef, useState } from 'react';
import { ReceiptAnalysisResult } from '@/types';

interface CreateNoteButtonsProps {
  onImageSelect: (imageUrl: string) => void;
  onTextNoteCreate: () => void;
  onReceiptAnalysis: (result: ReceiptAnalysisResult, imageUrl: string) => void;
}

export default function CreateNoteButtons({
  onImageSelect,
  onTextNoteCreate,
  onReceiptAnalysis,
}: CreateNoteButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleReceiptClick = () => {
    if (isAnalyzing) return; // 解析中は無効
    receiptInputRef.current?.click();
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

  // レシート画像を選択したときの処理
  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageUrl = reader.result as string;
      
      // 解析開始
      setIsAnalyzing(true);
      
      try {
        // API呼び出し
        const response = await fetch('/api/analyze-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageData: imageUrl }),
        });

        const data = await response.json();

        if (data.success) {
          // 解析成功：結果を親コンポーネントに渡す
          onReceiptAnalysis(data.data, imageUrl);
        } else {
          // エラー表示
          alert(`レシート解析に失敗しました: ${data.error || '不明なエラー'}`);
        }
      } catch (error) {
        console.error('Receipt analysis error:', error);
        alert('レシート解析中にエラーが発生しました');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);

    // 同じファイルを再度選択できるようにリセット
    if (receiptInputRef.current) {
      receiptInputRef.current.value = '';
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

      {/* レシート読み取りボタン */}
      <button
        onClick={handleReceiptClick}
        disabled={isAnalyzing}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border transition-all duration-200 ${
          isAnalyzing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 hover:scale-105 active:scale-95'
        }`}
        aria-label="レシートを読み取り"
      >
        {isAnalyzing ? (
          // ローディングスピナー
          <svg
            className="w-6 h-6 animate-spin"
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
        ) : (
          // レシートアイコン
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        )}
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

      {/* 通常の画像選択用input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* レシート読み取り用input */}
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReceiptChange}
      />
    </div>
  );
}
