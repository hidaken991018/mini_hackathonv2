/**
 * 換算ロジックのテスト
 */

import {
  convertWithinCategory,
  convertSpoonToVolume,
  convertSpoonToMass,
  convertBetweenMassAndVolume,
  findIngredientDensity,
  convert,
  canConvert,
} from '../converter';

describe('convertWithinCategory', () => {
  describe('重量系の換算', () => {
    test('kg から g への換算', () => {
      expect(convertWithinCategory(1, 'kg', 'g')).toBe(1000);
    });

    test('g から kg への換算', () => {
      expect(convertWithinCategory(500, 'g', 'kg')).toBe(0.5);
    });

    test('mg から g への換算', () => {
      expect(convertWithinCategory(1000, 'mg', 'g')).toBe(1);
    });

    test('同じ単位なら変換不要', () => {
      expect(convertWithinCategory(100, 'g', 'g')).toBe(100);
    });
  });

  describe('容量系の換算', () => {
    test('L から ml への換算', () => {
      expect(convertWithinCategory(1, 'L', 'ml')).toBe(1000);
    });

    test('ml から L への換算', () => {
      expect(convertWithinCategory(500, 'ml', 'L')).toBe(0.5);
    });

    test('cc から ml への換算', () => {
      expect(convertWithinCategory(100, 'cc', 'ml')).toBe(100);
    });
  });

  describe('計量スプーン系の換算', () => {
    test('大さじ から 小さじ への換算', () => {
      expect(convertWithinCategory(1, '大さじ', '小さじ')).toBe(3);
    });

    test('小さじ から 大さじ への換算', () => {
      expect(convertWithinCategory(6, '小さじ', '大さじ')).toBe(2);
    });

    test('カップ から 大さじ への換算', () => {
      const result = convertWithinCategory(1, 'カップ', '大さじ');
      expect(result).toBeCloseTo(13.33, 1); // 200ml / 15ml ≒ 13.33
    });
  });

  describe('計量スプーン ⇔ 容量の換算', () => {
    test('大さじ から ml への換算', () => {
      expect(convertWithinCategory(1, '大さじ', 'ml')).toBe(15);
    });

    test('ml から 大さじ への換算', () => {
      expect(convertWithinCategory(30, 'ml', '大さじ')).toBe(2);
    });

    test('小さじ から ml への換算', () => {
      expect(convertWithinCategory(1, '小さじ', 'ml')).toBe(5);
    });

    test('カップ から L への換算', () => {
      expect(convertWithinCategory(1, 'カップ', 'L')).toBe(0.2);
    });
  });

  describe('異なるカテゴリ間（変換不可）', () => {
    test('g から ml への変換は不可', () => {
      expect(convertWithinCategory(100, 'g', 'ml')).toBeNull();
    });

    test('個 から g への変換は不可', () => {
      expect(convertWithinCategory(1, '個', 'g')).toBeNull();
    });
  });
});

describe('convertSpoonToVolume', () => {
  test('大さじ1 → 15ml', () => {
    expect(convertSpoonToVolume(1, '大さじ')).toBe(15);
  });

  test('大さじ2 → 30ml', () => {
    expect(convertSpoonToVolume(2, '大さじ')).toBe(30);
  });

  test('小さじ1 → 5ml', () => {
    expect(convertSpoonToVolume(1, '小さじ')).toBe(5);
  });

  test('カップ1 → 200ml', () => {
    expect(convertSpoonToVolume(1, 'カップ')).toBe(200);
  });

  test('大さじ0.5 → 7.5ml', () => {
    expect(convertSpoonToVolume(0.5, '大さじ')).toBe(7.5);
  });

  test('不明な単位はnull', () => {
    expect(convertSpoonToVolume(1, 'ダース')).toBeNull();
  });
});

describe('findIngredientDensity', () => {
  test('醤油の密度を取得', () => {
    expect(findIngredientDensity('醤油')).toBe(1.15);
  });

  test('しょうゆ（別名）の密度を取得', () => {
    expect(findIngredientDensity('しょうゆ')).toBe(1.15);
  });

  test('味噌の密度を取得', () => {
    expect(findIngredientDensity('味噌')).toBe(1.1);
  });

  test('砂糖の密度を取得', () => {
    expect(findIngredientDensity('砂糖')).toBe(0.6);
  });

  test('サラダ油の密度を取得', () => {
    expect(findIngredientDensity('サラダ油')).toBe(0.9);
  });

  test('オリーブオイルの密度を取得', () => {
    expect(findIngredientDensity('オリーブオイル')).toBe(0.9);
  });

  test('不明な食材はnull', () => {
    expect(findIngredientDensity('にんじん')).toBeNull();
  });
});

describe('convertSpoonToMass', () => {
  test('醤油 大さじ1 → 約18g', () => {
    const result = convertSpoonToMass(1, '大さじ', '醤油');
    expect(result).toBeCloseTo(17.25, 1); // 15ml * 1.15 = 17.25g
  });

  test('味噌 大さじ2 → 約36g', () => {
    const result = convertSpoonToMass(2, '大さじ', '味噌');
    expect(result).toBeCloseTo(33, 0); // 30ml * 1.1 = 33g
  });

  test('砂糖 大さじ1 → 約9g', () => {
    const result = convertSpoonToMass(1, '大さじ', '砂糖');
    expect(result).toBe(9); // 15ml * 0.6 = 9g
  });

  test('小麦粉 大さじ1 → 約8g', () => {
    const result = convertSpoonToMass(1, '大さじ', '小麦粉');
    expect(result).toBeCloseTo(8.25, 1); // 15ml * 0.55 = 8.25g
  });

  test('不明な食材はnull', () => {
    expect(convertSpoonToMass(1, '大さじ', 'にんじん')).toBeNull();
  });
});

describe('convertBetweenMassAndVolume', () => {
  describe('重量 → 容量', () => {
    test('醤油 100g → ml', () => {
      const result = convertBetweenMassAndVolume(100, 'g', 'ml', '醤油');
      expect(result).toBeCloseTo(86.96, 1); // 100 / 1.15 ≒ 86.96
    });

    test('味噌 50g → 大さじ', () => {
      const result = convertBetweenMassAndVolume(50, 'g', '大さじ', '味噌');
      // 50g / 1.1 = 45.45ml → 45.45 / 15 = 3.03大さじ
      expect(result).toBeCloseTo(3.03, 1);
    });
  });

  describe('容量 → 重量', () => {
    test('醤油 100ml → g', () => {
      const result = convertBetweenMassAndVolume(100, 'ml', 'g', '醤油');
      expect(result).toBeCloseTo(115, 1); // 100 * 1.15 = 115
    });

    test('砂糖 大さじ1 → g', () => {
      const result = convertBetweenMassAndVolume(1, '大さじ', 'g', '砂糖');
      expect(result).toBe(9); // 15ml * 0.6 = 9g
    });
  });

  test('不明な食材はnull', () => {
    expect(convertBetweenMassAndVolume(100, 'g', 'ml', 'にんじん')).toBeNull();
  });
});

describe('canConvert', () => {
  test('同じ単位は変換可能', () => {
    expect(canConvert('g', 'g')).toBe(true);
  });

  test('同カテゴリ内は変換可能', () => {
    expect(canConvert('g', 'kg')).toBe(true);
    expect(canConvert('ml', 'L')).toBe(true);
  });

  test('SPOONとVOLUMEは変換可能', () => {
    expect(canConvert('大さじ', 'ml')).toBe(true);
    expect(canConvert('ml', '大さじ')).toBe(true);
  });

  test('MASSとVOLUME（食材名なし）は変換不可', () => {
    expect(canConvert('g', 'ml')).toBe(false);
  });

  test('MASSとVOLUME（密度が分かる食材）は変換可能', () => {
    expect(canConvert('g', 'ml', '醤油')).toBe(true);
    expect(canConvert('ml', 'g', '味噌')).toBe(true);
  });

  test('MASSとVOLUME（密度が不明な食材）は変換不可', () => {
    expect(canConvert('g', 'ml', 'にんじん')).toBe(false);
  });

  test('COUNTとMASSは変換不可', () => {
    expect(canConvert('個', 'g')).toBe(false);
    expect(canConvert('本', 'g', 'にんじん')).toBe(false);
  });
});

describe('convert（汎用変換）', () => {
  test('同カテゴリ内変換', () => {
    expect(convert(1000, 'g', 'kg')).toBe(1);
    expect(convert(2, 'L', 'ml')).toBe(2000);
  });

  test('SPOON ⇔ VOLUME変換', () => {
    expect(convert(2, '大さじ', 'ml')).toBe(30);
    expect(convert(15, 'ml', '大さじ')).toBe(1);
  });

  test('MASS ⇔ VOLUME変換（食材名あり）', () => {
    const result = convert(100, 'ml', 'g', '醤油');
    expect(result).toBeCloseTo(115, 1);
  });

  test('変換不可の場合はnull', () => {
    expect(convert(1, '個', 'g')).toBeNull();
    expect(convert(100, 'g', 'ml')).toBeNull(); // 食材名なし
  });
});
