'use client';

import { useState, useEffect } from 'react';
import IngredientInput, { IngredientFormItem } from './IngredientInput';
import StepInput, { StepFormItem } from './StepInput';
import { Recipe, RecipeInput } from '@/types';
import Portal from './Portal';

type RecipeCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  initialData?: Partial<Recipe>;
  mode?: 'create' | 'edit';
};

export default function RecipeCreateModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'create',
}: RecipeCreateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cookingTime, setCookingTime] = useState('');
  const [servings, setServings] = useState('');
  const [ingredients, setIngredients] = useState<IngredientFormItem[]>([
    { name: '', quantityValue: '', quantityUnit: '' },
  ]);
  const [steps, setSteps] = useState<StepFormItem[]>([{ instruction: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初期データを設定
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setCookingTime(initialData.cookingTime || '');
      setServings(initialData.servings || '');
      if (initialData.ingredients && initialData.ingredients.length > 0) {
        setIngredients(
          initialData.ingredients.map((ing) => ({
            name: ing.name,
            quantityValue: ing.quantityValue?.toString() || '',
            quantityUnit: ing.quantityUnit || '',
          }))
        );
      }
      if (initialData.steps && initialData.steps.length > 0) {
        setSteps(initialData.steps.map((step) => ({ instruction: step.instruction })));
      }
    }
  }, [initialData, mode]);

  // モーダルを閉じるときにリセット
  useEffect(() => {
    if (!isOpen) {
      if (mode === 'create') {
        setTitle('');
        setDescription('');
        setCookingTime('');
        setServings('');
        setIngredients([{ name: '', quantityValue: '', quantityUnit: '' }]);
        setSteps([{ instruction: '' }]);
      }
      setError(null);
    }
  }, [isOpen, mode]);

  const isValid = () => {
    if (!title.trim()) return false;
    if (!ingredients.some((ing) => ing.name.trim())) return false;
    if (!steps.some((step) => step.instruction.trim())) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setError('ログインが必要です');
        return;
      }

      const token = await user.getIdToken();

      const validIngredients = ingredients
        .filter((ing) => ing.name.trim())
        .map((ing, index) => ({
          name: ing.name.trim(),
          quantityValue: ing.quantityValue ? parseFloat(ing.quantityValue) : undefined,
          quantityUnit: ing.quantityUnit.trim() || undefined,
          sortOrder: index + 1,
        }));

      const validSteps = steps
        .filter((step) => step.instruction.trim())
        .map((step, index) => ({
          step: index + 1,
          instruction: step.instruction.trim(),
        }));

      const body: RecipeInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        cookingTime: cookingTime.trim() || undefined,
        servings: servings.trim() || undefined,
        ingredients: validIngredients,
        steps: validSteps,
      };

      const url = mode === 'edit' && initialData?.id
        ? `/api/recipes/${initialData.id}`
        : '/api/recipes';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'エラーが発生しました');
        return;
      }

      onSave(result.data);
      onClose();
    } catch (err) {
      console.error('Recipe save error:', err);
      setError('保存中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-end justify-center">
        {/* オーバーレイ */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* モーダル本体 */}
        <div className="relative w-full max-h-[90vh] bg-white rounded-t-3xl animate-slide-up overflow-hidden max-w-md mx-auto">
          {/* ヘッダー */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {mode === 'edit' ? 'レシピを編集' : '新しいレシピ'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="px-6 py-4 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  レシピ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 鶏肉のトマト煮込み"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="レシピの説明やポイントなど"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>

              {/* 調理時間・人数 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    調理時間
                  </label>
                  <input
                    type="text"
                    value={cookingTime}
                    onChange={(e) => setCookingTime(e.target.value)}
                    placeholder="例: 30分"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    人数
                  </label>
                  <input
                    type="text"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="例: 2人分"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div>
                <IngredientInput ingredients={ingredients} onChange={setIngredients} />
              </div>

              <div>
                <StepInput steps={steps} onChange={setSteps} />
              </div>
            </div>

            {/* フッター */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
              <button
                type="submit"
                disabled={!isValid() || isSubmitting}
                className="w-full py-3 bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '保存中...' : mode === 'edit' ? '更新する' : '保存する'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
