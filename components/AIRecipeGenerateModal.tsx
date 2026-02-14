'use client';

import { useState, useRef, KeyboardEvent } from 'react';

type AIRecipeGenerateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: { servings: number; excludeIngredients: string[] }) => void;
  isGenerating: boolean;
};

const SERVINGS_OPTIONS = [1, 2, 3, 4];

export default function AIRecipeGenerateModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}: AIRecipeGenerateModalProps) {
  const [servings, setServings] = useState(2);
  const [excludeIngredients, setExcludeIngredients] = useState<string[]>([]);
  const [excludeInput, setExcludeInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const addExcludeTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !excludeIngredients.includes(trimmed) && excludeIngredients.length < 20) {
      setExcludeIngredients([...excludeIngredients, trimmed]);
    }
    setExcludeInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addExcludeTag(excludeInput);
    }
    if (e.key === 'Backspace' && excludeInput === '' && excludeIngredients.length > 0) {
      setExcludeIngredients(excludeIngredients.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    setExcludeIngredients(excludeIngredients.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    onGenerate({ servings, excludeIngredients });
  };

  const handleClose = () => {
    if (!isGenerating) {
      setServings(2);
      setExcludeIngredients([]);
      setExcludeInput('');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-2xl max-w-sm w-[90%] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">AIレシピを生成</h3>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="px-5 py-4 space-y-5">
          {/* 人数選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">何人分？</label>
            <div className="flex gap-2">
              {SERVINGS_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setServings(n)}
                  disabled={isGenerating}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    servings === n
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {n}人分
                </button>
              ))}
            </div>
          </div>

          {/* 除外食材 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              除外する食材
              <span className="text-xs text-gray-400 ml-1">（アレルギー・苦手など）</span>
            </label>
            <div
              className="border border-gray-200 rounded-lg p-2 min-h-[42px] flex flex-wrap gap-1.5 cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              {excludeIngredients.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-md text-xs font-medium"
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(index);
                    }}
                    disabled={isGenerating}
                    className="hover:text-red-900 disabled:opacity-50"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="text"
                value={excludeInput}
                onChange={(e) => setExcludeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (excludeInput.trim()) addExcludeTag(excludeInput);
                }}
                disabled={isGenerating}
                placeholder={excludeIngredients.length === 0 ? '食材名を入力...' : ''}
                className="flex-1 min-w-[80px] outline-none text-sm text-gray-700 placeholder-gray-400 disabled:opacity-50"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Enterまたはカンマで追加</p>
          </div>
        </div>

        {/* フッター */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              isGenerating
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]'
            }`}
          >
            {isGenerating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                生成中...
              </>
            ) : (
              'レシピを生成する'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
