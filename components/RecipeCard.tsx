'use client';

import { RecipeListItem } from '@/types';

type RecipeCardProps = {
  recipe: RecipeListItem;
  onClick: () => void;
};

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今日';
    if (days === 1) return '昨日';
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
    >
      {/* ヘッダー: バッジとタイトル */}
      <div className="flex items-start gap-3 mb-2">
        <span
          className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
            recipe.sourceType === 'ai_generated'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {recipe.sourceType === 'ai_generated' ? 'AI生成' : '手入力'}
        </span>
        <h3 className="font-medium text-gray-900 line-clamp-1">{recipe.title}</h3>
      </div>

      {/* メタ情報 */}
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
        {recipe.cookingTime && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {recipe.cookingTime}
          </span>
        )}
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {recipe.ingredientCount}材料
        </span>
        <span className="ml-auto">{formatDate(recipe.createdAt)}</span>
      </div>

      {/* 説明文 */}
      {recipe.description && (
        <p className="text-sm text-gray-500 line-clamp-2">{recipe.description}</p>
      )}
    </button>
  );
}
