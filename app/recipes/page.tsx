'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import ScreenHeader from '@/components/ScreenHeader';
import RecipeCard from '@/components/RecipeCard';
import RecipeCreateModal from '@/components/RecipeCreateModal';
import AIRecipeGenerateModal from '@/components/AIRecipeGenerateModal';
import RecipeSlideModal from '@/components/RecipeSlideModal';
import MainLayout from '@/components/MainLayout';
import { Recipe, RecipeListItem, RecipeSourceType } from '@/types';

type SortType = 'date' | 'match';

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
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('date');

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
      if (sortBy !== 'date') {
        params.set('sort', sortBy);
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
  }, [user, filter, searchQuery, sortBy]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleGenerateAIRecipe = useCallback(async (
    params: { servings: number; excludeIngredients: string[] }
  ) => {
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
        body: JSON.stringify({
          servings: params.servings,
          excludeIngredients: params.excludeIngredients,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setGenerateError(result.error || 'AIレシピの生成に失敗しました');
        return;
      }

      setGenerateSuccess('AIレシピを生成しました');
      setIsGenerateModalOpen(false);

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
      updatedAt: recipe.updatedAt,
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
      updatedAt: recipe.updatedAt,
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
    <MainLayout>
      <ScreenHeader
        title="レシピ"
        rightAction={
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            disabled={isGenerating}
            aria-busy={isGenerating}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${isGenerating
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

        {/* フィルター・並び替え */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'user_created', 'ai_generated'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {f === 'all' ? 'すべて' : f === 'user_created' ? '自分で作成' : 'AI生成'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label htmlFor="recipe-sort" className="text-xs font-medium text-gray-500">
              並び替え
            </label>
            <select
              id="recipe-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="date">更新日順</option>
              <option value="match">マッチ度順</option>
            </select>
          </div>
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
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-gray-500 mb-6">レシピがありません</p>
            {filter === 'ai_generated' ? (
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                disabled={isGenerating}
                className="w-full max-w-xs py-4 px-6 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                    生成中
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    AIで生成
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full max-w-xs py-4 px-6 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors shadow-md"
              >
                新しいレシピを作成
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        className="absolute bottom-32 md:bottom-8 right-6 w-14 h-14 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-rose-600 transition-colors z-20"
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

      {/* レシピ詳細モーダル (統一コンポーネント) */}
      <RecipeSlideModal
        recipe={selectedRecipe}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRecipe(null);
        }}
        onEdit={() => setIsEditMode(true)}
        onDelete={handleDeleteRecipe}
      />

      {/* AI生成設定モーダル */}
      <AIRecipeGenerateModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={handleGenerateAIRecipe}
        isGenerating={isGenerating}
      />

      <BottomNav />
    </MainLayout >
  );
}
