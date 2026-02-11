/**
 * 単位の正規化ロジック
 */

import type { NormalizedUnit, NormalizedQuantity, ParsedQuantity, UnitCategory } from './types';
import {
  UNIT_NORMALIZATION,
  UNIT_CATEGORIES,
  FRACTION_PATTERNS,
  SPOON_TO_ML,
  MASS_TO_GRAM,
  VOLUME_TO_ML,
  BASE_UNITS,
} from './constants';

/**
 * 単位を正規化する
 * @param unit 入力単位文字列
 * @returns 正規化された単位情報
 */
export function normalizeUnit(unit: string): NormalizedUnit {
  const trimmed = unit.trim();

  // 空文字の場合はUNKNOWN
  if (!trimmed) {
    return {
      original: unit,
      normalized: '',
      category: 'UNKNOWN',
    };
  }

  // 正規化マップで変換を試みる
  const normalized = UNIT_NORMALIZATION[trimmed] ?? trimmed;

  // カテゴリを取得
  const category: UnitCategory = UNIT_CATEGORIES[normalized] ?? 'UNKNOWN';

  return {
    original: unit,
    normalized,
    category,
  };
}

/**
 * 分数表現を含む数量文字列をパースする
 * 例: "1/2本" → { value: 0.5, unit: "本" }
 * 例: "半分" → { value: 0.5, unit: "" }
 * 例: "2個半" → { value: 2.5, unit: "個" }
 * @param input 入力文字列
 * @returns パース結果
 */
export function parseQuantityWithFraction(input: string): ParsedQuantity {
  const trimmed = input.trim();

  if (!trimmed) {
    return { value: 0, unit: '', success: false, original: input };
  }

  // パターン1: 分数 (1/2本, 3/4カップ)
  const slashMatch = trimmed.match(FRACTION_PATTERNS.slash);
  if (slashMatch) {
    const numerator = parseInt(slashMatch[1], 10);
    const denominator = parseInt(slashMatch[2], 10);
    if (denominator !== 0) {
      return {
        value: numerator / denominator,
        unit: slashMatch[3].trim(),
        success: true,
        original: input,
      };
    }
  }

  // パターン2: n個半 (2個半, 1.5本半)
  const countHalfMatch = trimmed.match(FRACTION_PATTERNS.countHalf);
  if (countHalfMatch) {
    const baseValue = parseFloat(countHalfMatch[1]);
    return {
      value: baseValue + 0.5,
      unit: countHalfMatch[2].trim(),
      success: true,
      original: input,
    };
  }

  // パターン3: 半○ (半分, 半個)
  const halfMatch = trimmed.match(FRACTION_PATTERNS.half);
  if (halfMatch) {
    const unit = halfMatch[1].trim();
    // 「半分」の場合は単位なし
    if (unit === '分') {
      return { value: 0.5, unit: '', success: true, original: input };
    }
    return { value: 0.5, unit, success: true, original: input };
  }

  // パターン4: 小数点付き (1.5本)
  const decimalMatch = trimmed.match(FRACTION_PATTERNS.decimal);
  if (decimalMatch) {
    return {
      value: parseFloat(decimalMatch[1]),
      unit: decimalMatch[2].trim(),
      success: true,
      original: input,
    };
  }

  // パターン5: 整数と単位 (2本)
  const integerMatch = trimmed.match(FRACTION_PATTERNS.integer);
  if (integerMatch) {
    return {
      value: parseInt(integerMatch[1], 10),
      unit: integerMatch[2].trim(),
      success: true,
      original: input,
    };
  }

  // 数値がない場合は単位のみ
  return { value: 1, unit: trimmed, success: true, original: input };
}

/**
 * 数量を正規化する（基準単位への変換含む）
 * @param value 数値
 * @param unit 単位文字列
 * @param ingredientName 食材名（密度変換が必要な場合に使用、省略可）
 * @returns 正規化された数量
 */
export function normalizeQuantity(
  value: number,
  unit: string,
  ingredientName?: string
): NormalizedQuantity {
  const normalizedUnit = normalizeUnit(unit);

  const result: NormalizedQuantity = {
    value,
    unit: normalizedUnit,
  };

  // 基準単位への変換を試みる
  const { baseValue, baseUnit } = convertToBaseUnit(
    value,
    normalizedUnit.normalized,
    normalizedUnit.category
  );

  if (baseValue !== null && baseUnit) {
    result.baseValue = baseValue;
    result.baseUnit = baseUnit;
  }

  return result;
}

/**
 * 基準単位に変換する
 * @param value 数値
 * @param unit 正規化済み単位
 * @param category 単位カテゴリ
 * @returns 基準単位での値と単位名
 */
function convertToBaseUnit(
  value: number,
  unit: string,
  category: UnitCategory
): { baseValue: number | null; baseUnit: string | null } {
  switch (category) {
    case 'MASS': {
      const factor = MASS_TO_GRAM[unit];
      if (factor !== undefined) {
        return { baseValue: value * factor, baseUnit: BASE_UNITS.MASS };
      }
      break;
    }
    case 'VOLUME': {
      const factor = VOLUME_TO_ML[unit];
      if (factor !== undefined) {
        return { baseValue: value * factor, baseUnit: BASE_UNITS.VOLUME };
      }
      break;
    }
    case 'SPOON': {
      const mlValue = SPOON_TO_ML[unit];
      if (mlValue !== undefined) {
        return { baseValue: value * mlValue, baseUnit: BASE_UNITS.VOLUME };
      }
      break;
    }
    case 'COUNT':
      // 個数系は単位がそのまま基準単位
      return { baseValue: value, baseUnit: unit };
    case 'IMPRECISE':
    case 'UNKNOWN':
      // 曖昧表現・不明は基準単位への変換不可
      return { baseValue: null, baseUnit: null };
  }

  return { baseValue: null, baseUnit: null };
}

/**
 * 単位カテゴリを取得する
 * @param unit 単位文字列
 * @returns 単位カテゴリ
 */
export function getUnitCategory(unit: string): UnitCategory {
  return normalizeUnit(unit).category;
}

/**
 * 単位が同じカテゴリかどうかを判定する
 * @param unit1 単位1
 * @param unit2 単位2
 * @returns 同じカテゴリならtrue
 */
export function isSameCategory(unit1: string, unit2: string): boolean {
  const cat1 = getUnitCategory(unit1);
  const cat2 = getUnitCategory(unit2);

  // SPOON は VOLUME と同系統として扱う
  if ((cat1 === 'SPOON' && cat2 === 'VOLUME') || (cat1 === 'VOLUME' && cat2 === 'SPOON')) {
    return true;
  }

  return cat1 === cat2;
}
