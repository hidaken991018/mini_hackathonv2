'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import ScreenHeader from '@/components/ScreenHeader';
import RecipeCard from '@/components/RecipeCard';
import RecipeCreateModal from '@/components/RecipeCreateModal';
import { Recipe, RecipeListItem, RecipeSourceType } from '@/types';

type FilterType = 'all' | RecipeSourceType;

export default function RecipesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  const fetchRecipes = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('sourceType', filter);
      }
      if (searchQuery) {
        params.set('query', searchQuery);
      }

      const response = await fetch(`/api/recipes?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'レシピの取得に失敗しました');
        return;
      }

      setRecipes(result.data.recipes);
    } catch (err) {
      console.error('Fetch recipes error:', err);
      setError('レシピの取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [user, filter, searchQuery]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleGenerateAIRecipe = useCallback(async () => {
    if (!user || isGenerating) return;

    setGenerateError(null);
    setGenerateSuccess(null);
    setIsGenerating(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/recipe/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!result.success) {
        setGenerateError(result.error || 'AIレシピの生成に失敗しました');
        return;
      }

      setGenerateSuccess('AIレシピを生成しました');

      const nextFilter = filter === 'user_created' ? 'ai_generated' : filter;
      const nextSearchQuery = searchQuery ? '' : searchQuery;

      if (nextFilter !== filter) {
        setFilter(nextFilter);
      }
      if (nextSearchQuery !== searchQuery) {
        setSearchQuery(nextSearchQuery);
      }

      if (nextFilter === filter && nextSearchQuery === searchQuery) {
        await fetchRecipes();
      }
    } catch (err) {
      console.error('Generate recipe error:', err);
      setGenerateError('AIレシピの生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  }, [user, isGenerating, filter, searchQuery, fetchRecipes]);

  const handleRecipeClick = async (recipeId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/recipes/${recipeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setSelectedRecipe(result.data);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      console.error('Fetch recipe detail error:', err);
    }
  };

  const handleRecipeCreated = (recipe: Recipe) => {
    // 新規作成の場合はリストに追加
    const listItem: RecipeListItem = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      cookingTime: recipe.cookingTime,
      sourceType: recipe.sourceType,
      ingredientCount: recipe.ingredients.length,
      stepCount: recipe.steps.length,
      createdAt: recipe.createdAt,
    };
    setRecipes((prev) => [listItem, ...prev]);
    setIsCreateModalOpen(false);
  };

  const handleRecipeUpdated = (recipe: Recipe) => {
    // 更新の場合はリストを更新
    const listItem: RecipeListItem = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      cookingTime: recipe.cookingTime,
      sourceType: recipe.sourceType,
      ingredientCount: recipe.ingredients.length,
      stepCount: recipe.steps.length,
      createdAt: recipe.createdAt,
    };
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? listItem : r)));
    setSelectedRecipe(recipe);
    setIsEditMode(false);
  };

  const handleDeleteRecipe = async () => {
    if (!user || !selectedRecipe) return;

    if (!confirm('このレシピを削除しますか？')) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/recipes/${selectedRecipe.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setRecipes((prev) => prev.filter((r) => r.id !== selectedRecipe.id));
        setIsDetailModalOpen(false);
        setSelectedRecipe(null);
      }
    } catch (err) {
      console.error('Delete recipe error:', err);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <ScreenHeader
        title="レシピ"
        rightAction={
          <button
            onClick={handleGenerateAIRecipe}
            disabled={isGenerating}
            aria-busy={isGenerating}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isGenerating
                ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {isGenerating ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                生成中
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                AI生成
              </>
            )}
          </button>
        }
      />
      <div className="border-b border-gray-100 bg-white px-4 py-4">
        {/* 検索バー */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="レシピを検索..."
            className="w-full rounded-full border border-gray-200 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* フィルター */}
        <div className="flex gap-2">
          {(['all', 'user_created', 'ai_generated'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'すべて' : f === 'user_created' ? '手入力' : 'AI生成'}
            </button>
          ))}
        </div>
        {(generateError || generateSuccess) && (
          <div className="mt-3 text-sm">
            {generateError ? (
              <p className="text-red-600">{generateError}</p>
            ) : (
              <p className="text-emerald-600">{generateSuccess}</p>
            )}
          </div>
        )}
      </div>

      {/* レシピ一覧 */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            レシピがありません
            <br />
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 text-gray-900 underline"
            >
              新しいレシピを作成
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => handleRecipeClick(recipe.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FABボタン */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors z-20"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* レシピ作成モーダル */}
      <RecipeCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleRecipeCreated}
        mode="create"
      />

      {/* レシピ編集モーダル */}
      {selectedRecipe && isEditMode && (
        <RecipeCreateModal
          isOpen={true}
          onClose={() => setIsEditMode(false)}
          onSave={handleRecipeUpdated}
          initialData={selectedRecipe}
          mode="edit"
        />
      )}

      {/* レシピ詳細モーダル */}
      {selectedRecipe && isDetailModalOpen && !isEditMode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setIsDetailModalOpen(false);
              setSelectedRecipe(null);
            }}
          />
          <div className="relative w-full max-h-[90vh] bg-white rounded-t-3xl animate-slide-up overflow-hidden">
            {/* ヘッダー */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold line-clamp-1">{selectedRecipe.title}</h2>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedRecipe(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-4 space-y-6">
              {/* 画像 */}
              {selectedRecipe.imageUrl && (
                <div className="rounded-2xl overflow-hidden">
                  <img
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.title}
                    className="w-full"
                  />
                </div>
              )}

              {/* メタ情報 */}
              <div className="flex gap-4 text-sm text-gray-500">
                {selectedRecipe.cookingTime && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {selectedRecipe.cookingTime}
                  </span>
                )}
                {selectedRecipe.servings && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedRecipe.servings}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    selectedRecipe.sourceType === 'ai_generated'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {selectedRecipe.sourceType === 'ai_generated' ? 'AI生成' : '手入力'}
                </span>
              </div>

              {/* 説明 */}
              {selectedRecipe.description && (
                <p className="text-gray-600">{selectedRecipe.description}</p>
              )}

              {/* 材料 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">材料</h3>
                <ul className="space-y-2">
                  {selectedRecipe.ingredients.map((ing, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <span className="w-2 h-2 bg-gray-300 rounded-full" />
                      <span>{ing.name}</span>
                      {(ing.quantityValue || ing.quantityUnit) && (
                        <span className="text-gray-400">
                          {ing.quantityValue}
                          {ing.quantityUnit}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 作り方 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">作り方</h3>
                <ol className="space-y-4">
                  {selectedRecipe.steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 pt-0.5">{step.instruction}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* フッター（手入力レシピのみ編集・削除可能） */}
            {selectedRecipe.sourceType === 'user_created' && (
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
                <button
                  onClick={handleDeleteRecipe}
                  className="flex-1 py-3 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex-1 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
                >
                  編集
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
