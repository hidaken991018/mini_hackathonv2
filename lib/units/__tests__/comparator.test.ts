/**
 * 比較ロジックのテスト
 */

import {
  compareQuantities,
  checkRecipeAvailability,
  calculateRemainingQuantity,
  findMatchingInventory,
} from '../comparator';

describe('compareQuantities', () => {
  describe('同じ単位での比較', () => {
    test('在庫が十分な場合', () => {
      const result = compareQuantities(
        { value: 500, unit: 'g', name: '小麦粉' },
        { value: 200, unit: 'g', name: '小麦粉' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(true);
      expect(result.shortage).toBeUndefined();
    });

    test('在庫が不足している場合', () => {
      const result = compareQuantities(
        { value: 100, unit: 'g', name: '小麦粉' },
        { value: 200, unit: 'g', name: '小麦粉' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(false);
      expect(result.shortage).toBe(100);
      expect(result.shortageUnit).toBe('g');
    });

    test('在庫がちょうどの場合', () => {
      const result = compareQuantities(
        { value: 200, unit: 'ml', name: '牛乳' },
        { value: 200, unit: 'ml', name: '牛乳' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(true);
    });
  });

  describe('異なる単位（同カテゴリ）での比較', () => {
    test('kg と g の比較', () => {
      const result = compareQuantities(
        { value: 1, unit: 'kg', name: '砂糖' },
        { value: 500, unit: 'g', name: '砂糖' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(true);
    });

    test('L と ml の比較', () => {
      const result = compareQuantities(
        { value: 0.5, unit: 'L', name: '牛乳' },
        { value: 600, unit: 'ml', name: '牛乳' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(false);
      expect(result.shortage).toBe(100); // 600 - 500 = 100ml
    });
  });

  describe('計量スプーンと容量の比較', () => {
    test('大さじ と ml の比較', () => {
      const result = compareQuantities(
        { value: 3, unit: '大さじ', name: '醤油' },
        { value: 30, unit: 'ml', name: '醤油' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(true); // 3大さじ = 45ml >= 30ml
    });

    test('ml と 大さじ の比較', () => {
      const result = compareQuantities(
        { value: 20, unit: 'ml', name: '醤油' },
        { value: 2, unit: '大さじ', name: '醤油' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(false); // 20ml < 30ml (2大さじ)
    });
  });

  describe('重量と容量の比較（密度変換）', () => {
    test('味噌 g と 大さじ の比較', () => {
      const result = compareQuantities(
        { value: 300, unit: 'g', name: '味噌' },
        { value: 2, unit: '大さじ', name: '味噌' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(true);
      // 2大さじ = 30ml × 1.1 = 33g < 300g
    });

    test('醤油 ml と g の比較', () => {
      const result = compareQuantities(
        { value: 100, unit: 'ml', name: '醤油' },
        { value: 50, unit: 'g', name: '醤油' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(true);
      // 100ml × 1.15 = 115g >= 50g
    });
  });

  describe('比較不可能なケース', () => {
    test('本 と g は比較不可', () => {
      const result = compareQuantities(
        { value: 2, unit: '本', name: 'にんじん' },
        { value: 100, unit: 'g', name: 'にんじん' }
      );
      expect(result.canCompare).toBe(false);
      expect(result.reason).toBeDefined();
    });

    test('個 と ml は比較不可', () => {
      const result = compareQuantities(
        { value: 3, unit: '個', name: '卵' },
        { value: 100, unit: 'ml', name: '卵' }
      );
      expect(result.canCompare).toBe(false);
    });

    test('密度不明な食材の g と ml は比較不可', () => {
      const result = compareQuantities(
        { value: 100, unit: 'g', name: 'にんじん' },
        { value: 100, unit: 'ml', name: 'にんじん' }
      );
      expect(result.canCompare).toBe(false);
    });
  });

  describe('曖昧表現の扱い', () => {
    test('在庫が曖昧表現の場合は比較不可', () => {
      const result = compareQuantities(
        { value: 1, unit: '適量', name: '塩' },
        { value: 1, unit: '小さじ', name: '塩' }
      );
      expect(result.canCompare).toBe(false);
      expect(result.reason).toContain('曖昧表現');
    });

    test('必要量が曖昧表現の場合は十分とみなす', () => {
      const result = compareQuantities(
        { value: 100, unit: 'g', name: '塩' },
        { value: 1, unit: '少々', name: '塩' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(true);
    });
  });

  describe('エッジケース', () => {
    test('在庫が0の場合', () => {
      const result = compareQuantities(
        { value: 0, unit: 'g', name: '小麦粉' },
        { value: 100, unit: 'g', name: '小麦粉' }
      );
      expect(result.canCompare).toBe(false);
      expect(result.reason).toContain('0以下');
    });

    test('必要量が0の場合は十分', () => {
      const result = compareQuantities(
        { value: 100, unit: 'g', name: '小麦粉' },
        { value: 0, unit: 'g', name: '小麦粉' }
      );
      expect(result.canCompare).toBe(true);
      expect(result.isEnough).toBe(true);
    });
  });
});

describe('checkRecipeAvailability', () => {
  const mockInventories = [
    { name: '醤油', quantityValue: 500, quantityUnit: 'ml' },
    { name: '砂糖', quantityValue: 1000, quantityUnit: 'g' },
    { name: 'にんじん', quantityValue: 3, quantityUnit: '本' },
    { name: '卵', quantityValue: 6, quantityUnit: '個' },
  ];

  test('すべての材料が揃っている場合', () => {
    const ingredients = [
      { name: '醤油', quantityValue: 2, quantityUnit: '大さじ' },
      { name: '砂糖', quantityValue: 50, quantityUnit: 'g' },
    ];

    const result = checkRecipeAvailability(ingredients, mockInventories);

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('available');
    expect(result[1].status).toBe('available');
  });

  test('一部の材料が不足している場合', () => {
    const ingredients = [
      { name: '醤油', quantityValue: 1000, quantityUnit: 'ml' }, // 不足
      { name: '砂糖', quantityValue: 50, quantityUnit: 'g' },
    ];

    const result = checkRecipeAvailability(ingredients, mockInventories);

    expect(result[0].status).toBe('partial');
    expect(result[1].status).toBe('available');
  });

  test('在庫にない材料', () => {
    const ingredients = [
      { name: 'バター', quantityValue: 20, quantityUnit: 'g' },
    ];

    const result = checkRecipeAvailability(ingredients, mockInventories);

    expect(result[0].status).toBe('missing');
  });

  test('単位が比較不可の場合はunknown', () => {
    const ingredients = [
      { name: 'にんじん', quantityValue: 100, quantityUnit: 'g' }, // 本 vs g
    ];

    const result = checkRecipeAvailability(ingredients, mockInventories);

    expect(result[0].status).toBe('unknown');
  });

  test('数量が設定されていない材料', () => {
    const ingredients = [
      { name: '卵', quantityValue: null, quantityUnit: null },
    ];

    const result = checkRecipeAvailability(ingredients, mockInventories);

    expect(result[0].status).toBe('available'); // 在庫があればOK
  });
});

describe('calculateRemainingQuantity', () => {
  test('同じ単位での消費', () => {
    const result = calculateRemainingQuantity(
      { value: 500, unit: 'g', name: '小麦粉' },
      { value: 200, unit: 'g', name: '小麦粉' }
    );
    expect(result).toEqual({ value: 300, unit: 'g' });
  });

  test('異なる単位での消費（変換可能）', () => {
    const result = calculateRemainingQuantity(
      { value: 1, unit: 'L', name: '牛乳' },
      { value: 200, unit: 'ml', name: '牛乳' }
    );
    expect(result).toEqual({ value: 0.8, unit: 'L' });
  });

  test('計量スプーンでの消費', () => {
    const result = calculateRemainingQuantity(
      { value: 100, unit: 'ml', name: '醤油' },
      { value: 2, unit: '大さじ', name: '醤油' }
    );
    expect(result).toEqual({ value: 70, unit: 'ml' }); // 100 - 30 = 70
  });

  test('消費量が在庫を超える場合は0', () => {
    const result = calculateRemainingQuantity(
      { value: 100, unit: 'g', name: '砂糖' },
      { value: 200, unit: 'g', name: '砂糖' }
    );
    expect(result).toEqual({ value: 0, unit: 'g' });
  });

  test('変換不可の場合はnull', () => {
    const result = calculateRemainingQuantity(
      { value: 3, unit: '本', name: 'にんじん' },
      { value: 100, unit: 'g', name: 'にんじん' }
    );
    expect(result).toBeNull();
  });
});

describe('findMatchingInventory', () => {
  const inventories = [
    { name: '木綿豆腐', quantityValue: 1, quantityUnit: '丁' },
    { name: '鶏もも肉', quantityValue: 300, quantityUnit: 'g' },
    { name: '長ネギ', quantityValue: 2, quantityUnit: '本' },
    { name: 'にんじん', quantityValue: 3, quantityUnit: '本' },
  ];

  test('完全一致', () => {
    expect(findMatchingInventory('木綿豆腐', inventories)?.name).toBe('木綿豆腐');
  });

  test('双方向部分一致（既存動作）', () => {
    expect(findMatchingInventory('豆腐', inventories)?.name).toBe('木綿豆腐');
  });

  test('類似食材グループマッチ: 絹豆腐→木綿豆腐', () => {
    expect(findMatchingInventory('絹豆腐', inventories)?.name).toBe('木綿豆腐');
  });

  test('類似食材グループマッチ: 鶏むね肉→鶏もも肉', () => {
    expect(findMatchingInventory('鶏むね肉', inventories)?.name).toBe('鶏もも肉');
  });

  test('類似食材グループマッチ: ネギ→長ネギ', () => {
    expect(findMatchingInventory('ねぎ', inventories)?.name).toBe('長ネギ');
  });

  test('類似食材グループマッチ: 人参→にんじん', () => {
    expect(findMatchingInventory('人参', inventories)?.name).toBe('にんじん');
  });

  test('マッチなし', () => {
    expect(findMatchingInventory('りんご', inventories)).toBeUndefined();
  });
});
