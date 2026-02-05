/**
 * 単位正規化・換算モジュール
 *
 * 在庫とレシピ材料の数量比較を可能にするための
 * 単位の正規化、換算、比較機能を提供する。
 */

// 型のエクスポート
export type {
  UnitCategory,
  NormalizedUnit,
  NormalizedQuantity,
  IngredientDensity,
  QuantityComparisonResult,
  ConversionRule,
  ParsedQuantity,
  IngredientAvailability,
} from './types';

// 定数のエクスポート
export {
  UNIT_NORMALIZATION,
  UNIT_CATEGORIES,
  SPOON_TO_ML,
  MASS_TO_GRAM,
  VOLUME_TO_ML,
  INGREDIENT_DENSITIES,
  BASE_UNITS,
  FRACTION_PATTERNS,
} from './constants';

// 正規化関数のエクスポート
export {
  normalizeUnit,
  parseQuantityWithFraction,
  normalizeQuantity,
  getUnitCategory,
  isSameCategory,
} from './normalizer';

// 換算関数のエクスポート
export {
  convertWithinCategory,
  convertSpoonToVolume,
  convertSpoonToMass,
  convertBetweenMassAndVolume,
  findIngredientDensity,
  convertToMl,
  canConvert,
  convert,
} from './converter';

// 比較関数のエクスポート
export {
  compareQuantities,
  checkRecipeAvailability,
  calculateRemainingQuantity,
} from './comparator';
