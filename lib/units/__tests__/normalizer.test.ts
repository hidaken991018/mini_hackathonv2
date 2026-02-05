/**
 * 正規化ロジックのテスト
 */

import {
  normalizeUnit,
  parseQuantityWithFraction,
  normalizeQuantity,
  getUnitCategory,
  isSameCategory,
} from '../normalizer';

describe('normalizeUnit', () => {
  describe('重量系の正規化', () => {
    test('gはそのまま', () => {
      const result = normalizeUnit('g');
      expect(result.normalized).toBe('g');
      expect(result.category).toBe('MASS');
    });

    test('グラムはgに正規化', () => {
      const result = normalizeUnit('グラム');
      expect(result.normalized).toBe('g');
      expect(result.category).toBe('MASS');
    });

    test('kgはMASSカテゴリ', () => {
      const result = normalizeUnit('kg');
      expect(result.normalized).toBe('kg');
      expect(result.category).toBe('MASS');
    });
  });

  describe('容量系の正規化', () => {
    test('mlはそのまま', () => {
      const result = normalizeUnit('ml');
      expect(result.normalized).toBe('ml');
      expect(result.category).toBe('VOLUME');
    });

    test('ミリリットルはmlに正規化', () => {
      const result = normalizeUnit('ミリリットル');
      expect(result.normalized).toBe('ml');
      expect(result.category).toBe('VOLUME');
    });

    test('ccはVOLUMEカテゴリ', () => {
      const result = normalizeUnit('cc');
      expect(result.normalized).toBe('cc');
      expect(result.category).toBe('VOLUME');
    });
  });

  describe('計量スプーン系の正規化', () => {
    test('大さじはそのまま', () => {
      const result = normalizeUnit('大さじ');
      expect(result.normalized).toBe('大さじ');
      expect(result.category).toBe('SPOON');
    });

    test('大匙は大さじに正規化', () => {
      const result = normalizeUnit('大匙');
      expect(result.normalized).toBe('大さじ');
      expect(result.category).toBe('SPOON');
    });

    test('tbspは大さじに正規化', () => {
      const result = normalizeUnit('tbsp');
      expect(result.normalized).toBe('大さじ');
      expect(result.category).toBe('SPOON');
    });

    test('小さじはSPOONカテゴリ', () => {
      const result = normalizeUnit('小さじ');
      expect(result.normalized).toBe('小さじ');
      expect(result.category).toBe('SPOON');
    });
  });

  describe('個数系の正規化', () => {
    test('個はCOUNTカテゴリ', () => {
      const result = normalizeUnit('個');
      expect(result.normalized).toBe('個');
      expect(result.category).toBe('COUNT');
    });

    test('本はCOUNTカテゴリ', () => {
      const result = normalizeUnit('本');
      expect(result.normalized).toBe('本');
      expect(result.category).toBe('COUNT');
    });

    test('コは個に正規化', () => {
      const result = normalizeUnit('コ');
      expect(result.normalized).toBe('個');
      expect(result.category).toBe('COUNT');
    });
  });

  describe('曖昧表現の正規化', () => {
    test('少々はIMPRECISEカテゴリ', () => {
      const result = normalizeUnit('少々');
      expect(result.normalized).toBe('少々');
      expect(result.category).toBe('IMPRECISE');
    });

    test('適量はIMPRECISEカテゴリ', () => {
      const result = normalizeUnit('適量');
      expect(result.normalized).toBe('適量');
      expect(result.category).toBe('IMPRECISE');
    });
  });

  describe('不明な単位', () => {
    test('空文字はUNKNOWN', () => {
      const result = normalizeUnit('');
      expect(result.normalized).toBe('');
      expect(result.category).toBe('UNKNOWN');
    });

    test('未知の単位はUNKNOWN', () => {
      const result = normalizeUnit('ダース');
      expect(result.normalized).toBe('ダース');
      expect(result.category).toBe('UNKNOWN');
    });
  });
});

describe('parseQuantityWithFraction', () => {
  describe('分数表現のパース', () => {
    test('1/2本をパース', () => {
      const result = parseQuantityWithFraction('1/2本');
      expect(result.success).toBe(true);
      expect(result.value).toBe(0.5);
      expect(result.unit).toBe('本');
    });

    test('3/4カップをパース', () => {
      const result = parseQuantityWithFraction('3/4カップ');
      expect(result.success).toBe(true);
      expect(result.value).toBe(0.75);
      expect(result.unit).toBe('カップ');
    });

    test('1/4個をパース', () => {
      const result = parseQuantityWithFraction('1/4個');
      expect(result.success).toBe(true);
      expect(result.value).toBe(0.25);
      expect(result.unit).toBe('個');
    });
  });

  describe('「半」表現のパース', () => {
    test('半分をパース', () => {
      const result = parseQuantityWithFraction('半分');
      expect(result.success).toBe(true);
      expect(result.value).toBe(0.5);
      expect(result.unit).toBe('');
    });

    test('半個をパース', () => {
      const result = parseQuantityWithFraction('半個');
      expect(result.success).toBe(true);
      expect(result.value).toBe(0.5);
      expect(result.unit).toBe('個');
    });

    test('2個半をパース', () => {
      const result = parseQuantityWithFraction('2個半');
      expect(result.success).toBe(true);
      expect(result.value).toBe(2.5);
      expect(result.unit).toBe('個');
    });
  });

  describe('小数表現のパース', () => {
    test('1.5本をパース', () => {
      const result = parseQuantityWithFraction('1.5本');
      expect(result.success).toBe(true);
      expect(result.value).toBe(1.5);
      expect(result.unit).toBe('本');
    });

    test('0.5カップをパース', () => {
      const result = parseQuantityWithFraction('0.5カップ');
      expect(result.success).toBe(true);
      expect(result.value).toBe(0.5);
      expect(result.unit).toBe('カップ');
    });
  });

  describe('整数表現のパース', () => {
    test('2本をパース', () => {
      const result = parseQuantityWithFraction('2本');
      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
      expect(result.unit).toBe('本');
    });

    test('10個をパース', () => {
      const result = parseQuantityWithFraction('10個');
      expect(result.success).toBe(true);
      expect(result.value).toBe(10);
      expect(result.unit).toBe('個');
    });
  });

  describe('エッジケース', () => {
    test('空文字の場合', () => {
      const result = parseQuantityWithFraction('');
      expect(result.success).toBe(false);
      expect(result.value).toBe(0);
    });

    test('単位のみの場合', () => {
      const result = parseQuantityWithFraction('本');
      expect(result.success).toBe(true);
      expect(result.value).toBe(1);
      expect(result.unit).toBe('本');
    });
  });
});

describe('normalizeQuantity', () => {
  test('重量の正規化と基準単位への変換', () => {
    const result = normalizeQuantity(1, 'kg');
    expect(result.value).toBe(1);
    expect(result.unit.normalized).toBe('kg');
    expect(result.baseValue).toBe(1000); // g
    expect(result.baseUnit).toBe('g');
  });

  test('容量の正規化と基準単位への変換', () => {
    const result = normalizeQuantity(1, 'L');
    expect(result.value).toBe(1);
    expect(result.unit.normalized).toBe('L');
    expect(result.baseValue).toBe(1000); // ml
    expect(result.baseUnit).toBe('ml');
  });

  test('計量スプーンの正規化と基準単位への変換', () => {
    const result = normalizeQuantity(2, '大さじ');
    expect(result.value).toBe(2);
    expect(result.unit.normalized).toBe('大さじ');
    expect(result.baseValue).toBe(30); // ml
    expect(result.baseUnit).toBe('ml');
  });

  test('個数系の正規化', () => {
    const result = normalizeQuantity(3, '本');
    expect(result.value).toBe(3);
    expect(result.unit.normalized).toBe('本');
    expect(result.baseValue).toBe(3);
    expect(result.baseUnit).toBe('本');
  });
});

describe('getUnitCategory', () => {
  test('gはMASS', () => {
    expect(getUnitCategory('g')).toBe('MASS');
  });

  test('mlはVOLUME', () => {
    expect(getUnitCategory('ml')).toBe('VOLUME');
  });

  test('大さじはSPOON', () => {
    expect(getUnitCategory('大さじ')).toBe('SPOON');
  });

  test('個はCOUNT', () => {
    expect(getUnitCategory('個')).toBe('COUNT');
  });

  test('少々はIMPRECISE', () => {
    expect(getUnitCategory('少々')).toBe('IMPRECISE');
  });
});

describe('isSameCategory', () => {
  test('g と kg は同じカテゴリ', () => {
    expect(isSameCategory('g', 'kg')).toBe(true);
  });

  test('ml と L は同じカテゴリ', () => {
    expect(isSameCategory('ml', 'L')).toBe(true);
  });

  test('大さじ と ml は同じカテゴリ（SPOONとVOLUMEは互換）', () => {
    expect(isSameCategory('大さじ', 'ml')).toBe(true);
  });

  test('g と ml は異なるカテゴリ', () => {
    expect(isSameCategory('g', 'ml')).toBe(false);
  });

  test('個 と 本 は同じカテゴリ', () => {
    expect(isSameCategory('個', '本')).toBe(true);
  });
});
