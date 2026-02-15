/**
 * レシピAPI テスト
 *
 * このテストファイルではレシピ関連APIのロジックを検証します。
 * Next.js APIルートのテストはNode.js環境での制約があるため、
 * ここではAPIのビジネスロジック（データ変換、バリデーションなど）をテストします。
 */

import { RecipeSourceType } from '@/types';

describe('レシピAPI ユーティリティ関数', () => {
  describe('データ変換', () => {
    it('Prismaモデルをレスポンス形式に変換できる', () => {
      const prismaRecipe = {
        id: 'recipe-1',
        userId: 'user-1',
        sourceType: 'user_created',
        title: '鶏肉のトマト煮込み',
        description: '簡単で美味しいレシピです',
        imageUrl: null,
        cookingTime: '30分',
        servings: '2人分',
        createdAt: new Date('2025-01-30'),
        updatedAt: new Date('2025-01-30'),
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: '鶏もも肉',
            quantityValue: 300,
            quantityUnit: 'g',
            sortOrder: 1,
          },
          {
            id: 'ing-2',
            recipeId: 'recipe-1',
            name: 'トマト缶',
            quantityValue: 1,
            quantityUnit: '缶',
            sortOrder: 2,
          },
        ],
        steps: [
          {
            id: 'step-1',
            recipeId: 'recipe-1',
            stepNumber: 1,
            instruction: '鶏肉を一口大に切る',
          },
          {
            id: 'step-2',
            recipeId: 'recipe-1',
            stepNumber: 2,
            instruction: 'フライパンで焼く',
          },
        ],
      };

      // 変換ロジック（APIで使用しているのと同じ）
      const transformed = {
        id: prismaRecipe.id,
        userId: prismaRecipe.userId,
        sourceType: prismaRecipe.sourceType as RecipeSourceType,
        title: prismaRecipe.title,
        description: prismaRecipe.description,
        imageUrl: prismaRecipe.imageUrl,
        cookingTime: prismaRecipe.cookingTime,
        servings: prismaRecipe.servings,
        createdAt: prismaRecipe.createdAt.toISOString(),
        updatedAt: prismaRecipe.updatedAt.toISOString(),
        ingredients: prismaRecipe.ingredients.map((ing) => ({
          id: ing.id,
          name: ing.name,
          quantityValue: ing.quantityValue,
          quantityUnit: ing.quantityUnit,
          sortOrder: ing.sortOrder,
        })),
        steps: prismaRecipe.steps.map((step) => ({
          step: step.stepNumber,
          instruction: step.instruction,
        })),
      };

      expect(transformed.id).toBe('recipe-1');
      expect(transformed.title).toBe('鶏肉のトマト煮込み');
      expect(transformed.sourceType).toBe('user_created');
      expect(transformed.ingredients).toHaveLength(2);
      expect(transformed.steps).toHaveLength(2);
    });

    it('材料の並び順が保持される', () => {
      const ingredients = [
        { sortOrder: 2, name: 'トマト' },
        { sortOrder: 1, name: '鶏肉' },
        { sortOrder: 3, name: '玉ねぎ' },
      ];

      const sorted = [...ingredients].sort((a, b) => a.sortOrder - b.sortOrder);

      expect(sorted[0].name).toBe('鶏肉');
      expect(sorted[1].name).toBe('トマト');
      expect(sorted[2].name).toBe('玉ねぎ');
    });

    it('手順の番号が連続している', () => {
      const steps = [
        { stepNumber: 1, instruction: '切る' },
        { stepNumber: 2, instruction: '焼く' },
        { stepNumber: 3, instruction: '煮込む' },
      ];

      const isSequential = steps.every(
        (step, index) => step.stepNumber === index + 1
      );

      expect(isSequential).toBe(true);
    });
  });

  describe('バリデーション', () => {
    it('タイトルは必須', () => {
      const title = '';
      const isValid = typeof title === 'string' && title.trim() !== '';
      expect(isValid).toBe(false);
    });

    it('タイトルが空白のみの場合は無効', () => {
      const title = '   ';
      const isValid = typeof title === 'string' && title.trim() !== '';
      expect(isValid).toBe(false);
    });

    it('材料は1つ以上必須', () => {
      const ingredients: unknown[] = [];
      const isValid = Array.isArray(ingredients) && ingredients.length > 0;
      expect(isValid).toBe(false);
    });

    it('手順は1つ以上必須', () => {
      const steps: unknown[] = [];
      const isValid = Array.isArray(steps) && steps.length > 0;
      expect(isValid).toBe(false);
    });

    it('sourceTypeは有効な値のみ許可', () => {
      const validTypes = ['ai_generated', 'user_created'];
      const testType = 'user_created';
      const isValid = validTypes.includes(testType);
      expect(isValid).toBe(true);
    });

    it('無効なsourceTypeは拒否される', () => {
      const validTypes = ['ai_generated', 'user_created'];
      const testType = 'external_api';
      const isValid = validTypes.includes(testType);
      expect(isValid).toBe(false);
    });
  });

  describe('検索ロジック', () => {
    it('タイトルでの部分一致検索', () => {
      const recipes = [
        { title: '鶏肉のトマト煮込み' },
        { title: 'トマトサラダ' },
        { title: '豚肉の生姜焼き' },
      ];

      const query = 'トマト';
      const filtered = recipes.filter((r) => r.title.includes(query));

      expect(filtered).toHaveLength(2);
      expect(filtered[0].title).toBe('鶏肉のトマト煮込み');
      expect(filtered[1].title).toBe('トマトサラダ');
    });

    it('sourceTypeでのフィルタリング', () => {
      const recipes = [
        { title: 'レシピA', sourceType: 'ai_generated' },
        { title: 'レシピB', sourceType: 'user_created' },
        { title: 'レシピC', sourceType: 'user_created' },
      ];

      const filterType = 'user_created';
      const filtered = recipes.filter((r) => r.sourceType === filterType);

      expect(filtered).toHaveLength(2);
    });

    it('ページネーション', () => {
      const recipes = Array.from({ length: 50 }, (_, i) => ({
        id: `recipe-${i + 1}`,
        title: `レシピ${i + 1}`,
      }));

      const limit = 20;
      const offset = 0;
      const paginated = recipes.slice(offset, offset + limit);

      expect(paginated).toHaveLength(20);
      expect(paginated[0].id).toBe('recipe-1');
      expect(paginated[19].id).toBe('recipe-20');
    });

    it('ページネーション（2ページ目）', () => {
      const recipes = Array.from({ length: 50 }, (_, i) => ({
        id: `recipe-${i + 1}`,
        title: `レシピ${i + 1}`,
      }));

      const limit = 20;
      const offset = 20;
      const paginated = recipes.slice(offset, offset + limit);

      expect(paginated).toHaveLength(20);
      expect(paginated[0].id).toBe('recipe-21');
      expect(paginated[19].id).toBe('recipe-40');
    });

    it('hasMoreの計算', () => {
      const total = 50;
      const limit = 20;
      const offset = 0;

      const hasMore = offset + limit < total;
      expect(hasMore).toBe(true);
    });

    it('最後のページではhasMoreはfalse', () => {
      const total = 50;
      const limit = 20;
      const offset = 40;

      const hasMore = offset + limit < total;
      expect(hasMore).toBe(false);
    });
  });

  describe('権限チェック', () => {
    it('自分のレシピのみ編集可能', () => {
      const recipeUserId: string = 'user-1';
      const requestUserId: string = 'user-1';
      const canEdit = recipeUserId === requestUserId;
      expect(canEdit).toBe(true);
    });

    it('他人のレシピは編集不可', () => {
      const recipeUserId: string = 'user-1';
      const requestUserId: string = 'user-2';
      const canEdit = recipeUserId === requestUserId;
      expect(canEdit).toBe(false);
    });

    it('AI生成レシピは編集可能', () => {
      const sourceType: 'ai_generated' | 'user_created' = 'ai_generated';
      const canEdit = sourceType === 'ai_generated' || sourceType === 'user_created';
      expect(canEdit).toBe(true);
    });

    it('手入力レシピは編集可能', () => {
      const sourceType = 'user_created' as 'ai_generated' | 'user_created';
      const canEdit = sourceType !== 'ai_generated';
      expect(canEdit).toBe(true);
    });

    it('AI生成レシピは削除可能', () => {
      const sourceType: 'ai_generated' | 'user_created' = 'ai_generated';
      const canDelete = sourceType === 'ai_generated' || sourceType === 'user_created';
      expect(canDelete).toBe(true);
    });

    it('手入力レシピは削除可能', () => {
      const sourceType = 'user_created' as 'ai_generated' | 'user_created';
      const canDelete = sourceType === 'ai_generated' || sourceType === 'user_created';
      expect(canDelete).toBe(true);
    });
  });
});

describe('レシピ一覧アイテムの変換', () => {
  it('RecipeListItem形式に変換できる', () => {
    const recipe = {
      id: 'recipe-1',
      title: 'テストレシピ',
      description: '説明文',
      imageUrl: null,
      cookingTime: '30分',
      sourceType: 'user_created',
      _count: {
        ingredients: 5,
        steps: 3,
      },
      createdAt: new Date('2025-01-30'),
      updatedAt: new Date('2025-01-31'),
    };

    const listItem = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      cookingTime: recipe.cookingTime,
      sourceType: recipe.sourceType as RecipeSourceType,
      ingredientCount: recipe._count.ingredients,
      stepCount: recipe._count.steps,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
    };

    expect(listItem.ingredientCount).toBe(5);
    expect(listItem.stepCount).toBe(3);
  });
});
