/**
 * 単位換算ロジック
 */

import type { UnitCategory } from './types';
import {
  SPOON_TO_ML,
  MASS_TO_GRAM,
  VOLUME_TO_ML,
  INGREDIENT_DENSITIES,
  UNIT_CATEGORIES,
} from './constants';
import { normalizeUnit } from './normalizer';

/**
 * 同カテゴリ内での単位換算
 * @param value 数値
 * @param fromUnit 変換元単位
 * @param toUnit 変換先単位
 * @returns 変換後の数値、変換不可の場合はnull
 */
export function convertWithinCategory(
  value: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const fromNormalized = normalizeUnit(fromUnit);
  const toNormalized = normalizeUnit(toUnit);

  // 同じ単位なら変換不要
  if (fromNormalized.normalized === toNormalized.normalized) {
    return value;
  }

  // カテゴリが異なる場合は変換不可
  if (fromNormalized.category !== toNormalized.category) {
    // ただし、SPOONとVOLUMEは互換性あり
    if (
      !(
        (fromNormalized.category === 'SPOON' && toNormalized.category === 'VOLUME') ||
        (fromNormalized.category === 'VOLUME' && toNormalized.category === 'SPOON')
      )
    ) {
      return null;
    }
  }

  // 重量換算 (g, kg, mg)
  if (fromNormalized.category === 'MASS' && toNormalized.category === 'MASS') {
    const fromFactor = MASS_TO_GRAM[fromNormalized.normalized];
    const toFactor = MASS_TO_GRAM[toNormalized.normalized];
    if (fromFactor !== undefined && toFactor !== undefined) {
      // まずgに変換してから目的の単位に変換
      return (value * fromFactor) / toFactor;
    }
  }

  // 容量換算 (ml, L, cc)
  if (fromNormalized.category === 'VOLUME' && toNormalized.category === 'VOLUME') {
    const fromFactor = VOLUME_TO_ML[fromNormalized.normalized];
    const toFactor = VOLUME_TO_ML[toNormalized.normalized];
    if (fromFactor !== undefined && toFactor !== undefined) {
      return (value * fromFactor) / toFactor;
    }
  }

  // 計量スプーン → 容量
  if (fromNormalized.category === 'SPOON' && toNormalized.category === 'VOLUME') {
    const spoonMl = SPOON_TO_ML[fromNormalized.normalized];
    const toFactor = VOLUME_TO_ML[toNormalized.normalized];
    if (spoonMl !== undefined && toFactor !== undefined) {
      return (value * spoonMl) / toFactor;
    }
  }

  // 容量 → 計量スプーン
  if (fromNormalized.category === 'VOLUME' && toNormalized.category === 'SPOON') {
    const fromFactor = VOLUME_TO_ML[fromNormalized.normalized];
    const spoonMl = SPOON_TO_ML[toNormalized.normalized];
    if (fromFactor !== undefined && spoonMl !== undefined) {
      return (value * fromFactor) / spoonMl;
    }
  }

  // 計量スプーン間の換算
  if (fromNormalized.category === 'SPOON' && toNormalized.category === 'SPOON') {
    const fromMl = SPOON_TO_ML[fromNormalized.normalized];
    const toMl = SPOON_TO_ML[toNormalized.normalized];
    if (fromMl !== undefined && toMl !== undefined) {
      return (value * fromMl) / toMl;
    }
  }

  return null;
}

/**
 * 計量スプーンから容量(ml)への変換
 * @param value 数値
 * @param spoonUnit 計量スプーン単位
 * @returns ml単位の数値、変換不可の場合はnull
 */
export function convertSpoonToVolume(value: number, spoonUnit: string): number | null {
  const normalized = normalizeUnit(spoonUnit);
  const mlValue = SPOON_TO_ML[normalized.normalized];

  if (mlValue !== undefined) {
    return value * mlValue;
  }

  return null;
}

/**
 * 計量スプーンから重量(g)への変換（食材密度を使用）
 * @param value 数値
 * @param spoonUnit 計量スプーン単位
 * @param ingredientName 食材名
 * @returns g単位の数値、変換不可の場合はnull
 */
export function convertSpoonToMass(
  value: number,
  spoonUnit: string,
  ingredientName: string
): number | null {
  // まずmlに変換
  const mlValue = convertSpoonToVolume(value, spoonUnit);
  if (mlValue === null) {
    return null;
  }

  // 密度を取得してgに変換
  const density = findIngredientDensity(ingredientName);
  if (density === null) {
    return null;
  }

  return mlValue * density;
}

/**
 * 重量と容量の相互変換（食材密度を使用）
 * @param value 数値
 * @param fromUnit 変換元単位
 * @param toUnit 変換先単位
 * @param ingredientName 食材名
 * @returns 変換後の数値、変換不可の場合はnull
 */
export function convertBetweenMassAndVolume(
  value: number,
  fromUnit: string,
  toUnit: string,
  ingredientName: string
): number | null {
  const fromNormalized = normalizeUnit(fromUnit);
  const toNormalized = normalizeUnit(toUnit);

  const density = findIngredientDensity(ingredientName);
  if (density === null) {
    return null;
  }

  // MASS → VOLUME
  if (
    fromNormalized.category === 'MASS' &&
    (toNormalized.category === 'VOLUME' || toNormalized.category === 'SPOON')
  ) {
    // まずgに変換
    const grams = convertToGrams(value, fromNormalized.normalized);
    if (grams === null) {
      return null;
    }

    // g → ml（密度で割る）
    const ml = grams / density;

    // 目的の単位に変換
    if (toNormalized.category === 'VOLUME') {
      const toFactor = VOLUME_TO_ML[toNormalized.normalized];
      if (toFactor !== undefined) {
        return ml / toFactor;
      }
    } else if (toNormalized.category === 'SPOON') {
      const toMl = SPOON_TO_ML[toNormalized.normalized];
      if (toMl !== undefined) {
        return ml / toMl;
      }
    }
  }

  // VOLUME/SPOON → MASS
  if (
    (fromNormalized.category === 'VOLUME' || fromNormalized.category === 'SPOON') &&
    toNormalized.category === 'MASS'
  ) {
    // まずmlに変換
    let ml: number | null = null;
    if (fromNormalized.category === 'VOLUME') {
      const fromFactor = VOLUME_TO_ML[fromNormalized.normalized];
      if (fromFactor !== undefined) {
        ml = value * fromFactor;
      }
    } else if (fromNormalized.category === 'SPOON') {
      ml = convertSpoonToVolume(value, fromNormalized.normalized);
    }

    if (ml === null) {
      return null;
    }

    // ml → g（密度を掛ける）
    const grams = ml * density;

    // 目的の単位に変換
    const toFactor = MASS_TO_GRAM[toNormalized.normalized];
    if (toFactor !== undefined) {
      return grams / toFactor;
    }
  }

  return null;
}

/**
 * 食材の密度を取得する
 * @param ingredientName 食材名
 * @returns 密度(g/ml)、見つからない場合はnull
 */
export function findIngredientDensity(ingredientName: string): number | null {
  const lowerName = ingredientName.toLowerCase();

  for (const ingredient of INGREDIENT_DENSITIES) {
    // 食材名で完全一致
    if (ingredient.name.toLowerCase() === lowerName) {
      return ingredient.densityGPerMl;
    }

    // 食材名を含む
    if (
      lowerName.includes(ingredient.name.toLowerCase()) ||
      ingredient.name.toLowerCase().includes(lowerName)
    ) {
      return ingredient.densityGPerMl;
    }

    // 別名でマッチ
    if (ingredient.aliases) {
      for (const alias of ingredient.aliases) {
        if (alias.toLowerCase() === lowerName || lowerName.includes(alias.toLowerCase())) {
          return ingredient.densityGPerMl;
        }
      }
    }
  }

  return null;
}

/**
 * 任意の単位をgに変換
 * @param value 数値
 * @param unit 単位（正規化済み）
 * @returns g単位の数値、変換不可の場合はnull
 */
function convertToGrams(value: number, unit: string): number | null {
  const factor = MASS_TO_GRAM[unit];
  if (factor !== undefined) {
    return value * factor;
  }
  return null;
}

/**
 * 任意の単位をmlに変換
 * @param value 数値
 * @param unit 単位（正規化済み）
 * @returns ml単位の数値、変換不可の場合はnull
 */
export function convertToMl(value: number, unit: string): number | null {
  const normalized = normalizeUnit(unit);

  if (normalized.category === 'VOLUME') {
    const factor = VOLUME_TO_ML[normalized.normalized];
    if (factor !== undefined) {
      return value * factor;
    }
  }

  if (normalized.category === 'SPOON') {
    return convertSpoonToVolume(value, normalized.normalized);
  }

  return null;
}

/**
 * 2つの単位間で変換が可能かどうかを判定
 * @param fromUnit 変換元単位
 * @param toUnit 変換先単位
 * @param ingredientName 食材名（省略可、密度変換の判定に使用）
 * @returns 変換可能ならtrue
 */
export function canConvert(fromUnit: string, toUnit: string, ingredientName?: string): boolean {
  const fromNormalized = normalizeUnit(fromUnit);
  const toNormalized = normalizeUnit(toUnit);

  // 同じ単位
  if (fromNormalized.normalized === toNormalized.normalized) {
    return true;
  }

  // 同カテゴリ
  if (fromNormalized.category === toNormalized.category) {
    return true;
  }

  // SPOON ↔ VOLUME
  if (
    (fromNormalized.category === 'SPOON' && toNormalized.category === 'VOLUME') ||
    (fromNormalized.category === 'VOLUME' && toNormalized.category === 'SPOON')
  ) {
    return true;
  }

  // MASS ↔ VOLUME/SPOON（食材名が必要）
  if (ingredientName) {
    const density = findIngredientDensity(ingredientName);
    if (density !== null) {
      if (
        (fromNormalized.category === 'MASS' &&
          (toNormalized.category === 'VOLUME' || toNormalized.category === 'SPOON')) ||
        ((fromNormalized.category === 'VOLUME' || fromNormalized.category === 'SPOON') &&
          toNormalized.category === 'MASS')
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 汎用変換関数
 * @param value 数値
 * @param fromUnit 変換元単位
 * @param toUnit 変換先単位
 * @param ingredientName 食材名（省略可）
 * @returns 変換後の数値、変換不可の場合はnull
 */
export function convert(
  value: number,
  fromUnit: string,
  toUnit: string,
  ingredientName?: string
): number | null {
  const fromNormalized = normalizeUnit(fromUnit);
  const toNormalized = normalizeUnit(toUnit);

  // 同じ単位
  if (fromNormalized.normalized === toNormalized.normalized) {
    return value;
  }

  // 同カテゴリ内変換を試みる
  const withinCategory = convertWithinCategory(value, fromUnit, toUnit);
  if (withinCategory !== null) {
    return withinCategory;
  }

  // カテゴリ間変換（食材名が必要）
  if (ingredientName) {
    return convertBetweenMassAndVolume(value, fromUnit, toUnit, ingredientName);
  }

  return null;
}
