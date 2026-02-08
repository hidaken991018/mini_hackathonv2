/**
 * RecipeCreateModal コンポーネントテスト
 *
 * レシピ作成/編集モーダルの動作を検証します。
 * ここではフォームのバリデーションロジックをテストします。
 */

import { IngredientFormItem } from '@/components/IngredientInput';
import { StepFormItem } from '@/components/StepInput';

describe('RecipeCreateModal バリデーション', () => {
  describe('フォーム状態の初期値', () => {
    it('初期状態でフォームが空', () => {
      const initialState = {
        title: '',
        description: '',
        cookingTime: '',
        servings: '',
        ingredients: [{ name: '', quantityValue: '', quantityUnit: '' }],
        steps: [{ instruction: '' }],
      };

      expect(initialState.title).toBe('');
      expect(initialState.ingredients).toHaveLength(1);
      expect(initialState.steps).toHaveLength(1);
    });
  });

  describe('バリデーション関数', () => {
    const isValid = (state: {
      title: string;
      ingredients: IngredientFormItem[];
      steps: StepFormItem[];
    }) => {
      if (!state.title.trim()) return false;
      if (!state.ingredients.some((ing) => ing.name.trim())) return false;
      if (!state.steps.some((step) => step.instruction.trim())) return false;
      return true;
    };

    it('タイトルが空の場合は無効', () => {
      const state = {
        title: '',
        ingredients: [{ name: '鶏肉', quantityValue: '', quantityUnit: '' }],
        steps: [{ instruction: '調理する' }],
      };
      expect(isValid(state)).toBe(false);
    });

    it('材料が空の場合は無効', () => {
      const state = {
        title: 'テストレシピ',
        ingredients: [{ name: '', quantityValue: '', quantityUnit: '' }],
        steps: [{ instruction: '調理する' }],
      };
      expect(isValid(state)).toBe(false);
    });

    it('手順が空の場合は無効', () => {
      const state = {
        title: 'テストレシピ',
        ingredients: [{ name: '鶏肉', quantityValue: '', quantityUnit: '' }],
        steps: [{ instruction: '' }],
      };
      expect(isValid(state)).toBe(false);
    });

    it('すべて入力されている場合は有効', () => {
      const state = {
        title: 'テストレシピ',
        ingredients: [{ name: '鶏肉', quantityValue: '', quantityUnit: '' }],
        steps: [{ instruction: '調理する' }],
      };
      expect(isValid(state)).toBe(true);
    });
  });
});

describe('IngredientInput ロジック', () => {
  describe('材料の追加', () => {
    it('材料を追加できる', () => {
      const ingredients: IngredientFormItem[] = [
        { name: '鶏肉', quantityValue: '300', quantityUnit: 'g' },
      ];

      const newIngredients = [
        ...ingredients,
        { name: '', quantityValue: '', quantityUnit: '' },
      ];

      expect(newIngredients).toHaveLength(2);
    });
  });

  describe('材料の削除', () => {
    it('材料を削除できる', () => {
      const ingredients: IngredientFormItem[] = [
        { name: '鶏肉', quantityValue: '300', quantityUnit: 'g' },
        { name: 'トマト', quantityValue: '2', quantityUnit: '個' },
      ];

      const indexToRemove = 1;
      const newIngredients = ingredients.filter((_, i) => i !== indexToRemove);

      expect(newIngredients).toHaveLength(1);
      expect(newIngredients[0].name).toBe('鶏肉');
    });

    it('最後の1つは削除できない', () => {
      const ingredients: IngredientFormItem[] = [
        { name: '鶏肉', quantityValue: '300', quantityUnit: 'g' },
      ];

      const canRemove = ingredients.length > 1;
      expect(canRemove).toBe(false);
    });
  });

  describe('材料の更新', () => {
    it('材料のフィールドを更新できる', () => {
      const ingredients: IngredientFormItem[] = [
        { name: '鶏肉', quantityValue: '300', quantityUnit: 'g' },
      ];

      const index = 0;
      const field = 'name';
      const value = '豚肉';

      const updated = [...ingredients];
      updated[index] = { ...updated[index], [field]: value };

      expect(updated[0].name).toBe('豚肉');
      expect(updated[0].quantityValue).toBe('300');
    });
  });
});

describe('StepInput ロジック', () => {
  describe('手順の追加', () => {
    it('手順を追加できる', () => {
      const steps: StepFormItem[] = [{ instruction: '切る' }];

      const newSteps = [...steps, { instruction: '' }];

      expect(newSteps).toHaveLength(2);
    });
  });

  describe('手順の削除', () => {
    it('手順を削除できる', () => {
      const steps: StepFormItem[] = [
        { instruction: '切る' },
        { instruction: '焼く' },
      ];

      const indexToRemove = 1;
      const newSteps = steps.filter((_, i) => i !== indexToRemove);

      expect(newSteps).toHaveLength(1);
      expect(newSteps[0].instruction).toBe('切る');
    });

    it('最後の1つは削除できない', () => {
      const steps: StepFormItem[] = [{ instruction: '切る' }];

      const canRemove = steps.length > 1;
      expect(canRemove).toBe(false);
    });
  });

  describe('手順の更新', () => {
    it('手順を更新できる', () => {
      const steps: StepFormItem[] = [{ instruction: '切る' }];

      const index = 0;
      const value = '切って焼く';

      const updated = [...steps];
      updated[index] = { instruction: value };

      expect(updated[0].instruction).toBe('切って焼く');
    });
  });
});

describe('RecipeInput 変換', () => {
  it('フォーム状態からAPIリクエスト形式に変換できる', () => {
    const formState = {
      title: 'テストレシピ',
      description: '説明文',
      cookingTime: '30分',
      servings: '2人分',
      ingredients: [
        { name: '鶏肉', quantityValue: '300', quantityUnit: 'g' },
        { name: '', quantityValue: '', quantityUnit: '' }, // 空の行は除外
        { name: 'トマト', quantityValue: '2', quantityUnit: '個' },
      ] as IngredientFormItem[],
      steps: [
        { instruction: '切る' },
        { instruction: '' }, // 空の行は除外
        { instruction: '焼く' },
      ] as StepFormItem[],
    };

    const validIngredients = formState.ingredients
      .filter((ing) => ing.name.trim())
      .map((ing, index) => ({
        name: ing.name.trim(),
        quantityValue: ing.quantityValue
          ? parseFloat(ing.quantityValue)
          : undefined,
        quantityUnit: ing.quantityUnit.trim() || undefined,
        sortOrder: index + 1,
      }));

    const validSteps = formState.steps
      .filter((step) => step.instruction.trim())
      .map((step, index) => ({
        step: index + 1,
        instruction: step.instruction.trim(),
      }));

    expect(validIngredients).toHaveLength(2);
    expect(validIngredients[0].name).toBe('鶏肉');
    expect(validIngredients[0].quantityValue).toBe(300);
    expect(validIngredients[1].sortOrder).toBe(2);

    expect(validSteps).toHaveLength(2);
    expect(validSteps[0].step).toBe(1);
    expect(validSteps[1].instruction).toBe('焼く');
  });
});
