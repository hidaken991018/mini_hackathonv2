/**
 * 単位正規化・換算の型定義
 */

/**
 * 単位カテゴリ
 */
export type UnitCategory =
  | 'MASS' // 重量: g, kg, mg
  | 'VOLUME' // 容量: ml, L, cc
  | 'SPOON' // 計量スプーン: 大さじ, 小さじ, カップ
  | 'COUNT' // 個数: 個, 本, 枚 など
  | 'IMPRECISE' // 曖昧: 少々, 適量 など
  | 'UNKNOWN'; // 不明

/**
 * 正規化された単位
 */
export type NormalizedUnit = {
  /** 元の単位文字列 */
  original: string;
  /** 正規化後の単位 */
  normalized: string;
  /** 単位カテゴリ */
  category: UnitCategory;
};

/**
 * 正規化された数量
 */
export type NormalizedQuantity = {
  /** 数値 */
  value: number;
  /** 正規化された単位 */
  unit: NormalizedUnit;
  /** 基準単位での値（換算可能な場合） */
  baseValue?: number;
  /** 基準単位（g, ml, 個 など） */
  baseUnit?: string;
};

/**
 * 食材の密度情報（g/ml変換用）
 */
export type IngredientDensity = {
  /** 食材名 */
  name: string;
  /** 密度 (g/ml) */
  densityGPerMl: number;
  /** 別名（マッチング用） */
  aliases?: string[];
};

/**
 * 数量比較結果
 */
export type QuantityComparisonResult = {
  /** 比較可能か */
  canCompare: boolean;
  /** 十分な量があるか（比較可能な場合のみ有効） */
  isEnough: boolean;
  /** 在庫の数量（正規化後） */
  inventoryQuantity: NormalizedQuantity;
  /** 必要な数量（正規化後） */
  requiredQuantity: NormalizedQuantity;
  /** 不足量（基準単位で、不足がある場合） */
  shortage?: number;
  /** 不足量の単位 */
  shortageUnit?: string;
  /** 比較不可の理由（比較不可の場合） */
  reason?: string;
};

/**
 * 単位換算ルール
 */
export type ConversionRule = {
  /** 変換元単位 */
  fromUnit: string;
  /** 変換先単位 */
  toUnit: string;
  /** 換算係数 (fromUnit * factor = toUnit) */
  factor: number;
};

/**
 * パース結果（分数表現のパース用）
 */
export type ParsedQuantity = {
  /** パースされた数値 */
  value: number;
  /** パースされた単位 */
  unit: string;
  /** パース成功フラグ */
  success: boolean;
  /** 元の入力文字列 */
  original: string;
};

/**
 * 食材の在庫チェック結果
 */
export type IngredientAvailability = {
  /** 食材名 */
  ingredientName: string;
  /** レシピで必要な数量 */
  requiredValue: number;
  /** レシピで必要な単位 */
  requiredUnit: string;
  /** 在庫の数量（在庫がある場合） */
  inventoryValue?: number;
  /** 在庫の単位（在庫がある場合） */
  inventoryUnit?: string;
  /** 比較結果（比較可能な場合） */
  comparison?: QuantityComparisonResult;
  /** ステータス */
  status: 'available' | 'partial' | 'missing' | 'unknown';
};
