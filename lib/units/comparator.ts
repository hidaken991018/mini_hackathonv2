/**
 * 在庫とレシピ材料の比較ロジック
 */

import type { QuantityComparisonResult, NormalizedQuantity, IngredientAvailability } from './types';
import { normalizeQuantity, normalizeUnit, isSameCategory } from './normalizer';
import { convert, canConvert } from './converter';
import { BASE_UNITS, CONSUME_AMOUNTS, SIMILAR_FOOD_GROUPS } from './constants';

/**
 * 2つの数量を比較する
 * @param inventory 在庫の数量情報
 * @param required レシピで必要な数量情報
 * @returns 比較結果
 */
export function compareQuantities(
  inventory: { value: number; unit: string; name: string },
  required: { value: number; unit: string; name: string }
): QuantityComparisonResult {
  // 数量を正規化
  const inventoryQty = normalizeQuantity(inventory.value, inventory.unit, inventory.name);
  const requiredQty = normalizeQuantity(required.value, required.unit, required.name);

  // 基本の結果オブジェクト
  const result: QuantityComparisonResult = {
    canCompare: false,
    isEnough: false,
    inventoryQuantity: inventoryQty,
    requiredQuantity: requiredQty,
  };

  // 在庫または必要量が0以下の場合
  if (inventory.value <= 0) {
    result.reason = '在庫の数量が0以下です';
    return result;
  }

  if (required.value <= 0) {
    // 必要量が0以下の場合は十分とみなす
    result.canCompare = true;
    result.isEnough = true;
    return result;
  }

  // 曖昧表現のチェック
  if (inventoryQty.unit.category === 'IMPRECISE') {
    // 在庫が曖昧表現の場合、存在は認識するが比較不可
    result.reason = '在庫の単位が曖昧表現（少々、適量など）のため、正確な比較ができません';
    return result;
  }

  if (requiredQty.unit.category === 'IMPRECISE') {
    // 必要量が曖昧表現の場合、在庫があれば十分とみなす
    result.canCompare = true;
    result.isEnough = true;
    result.reason = '必要量が曖昧表現のため、在庫があれば十分とみなします';
    return result;
  }

  // 単位が不明な場合
  if (inventoryQty.unit.category === 'UNKNOWN' || requiredQty.unit.category === 'UNKNOWN') {
    result.reason = '単位が認識できないため比較できません';
    return result;
  }

  // 同じ単位の場合は直接比較
  if (inventoryQty.unit.normalized === requiredQty.unit.normalized) {
    result.canCompare = true;
    result.isEnough = inventory.value >= required.value;

    if (!result.isEnough) {
      result.shortage = required.value - inventory.value;
      result.shortageUnit = requiredQty.unit.normalized;
    }

    return result;
  }

  // 変換可能かチェック
  if (!canConvert(inventory.unit, required.unit, inventory.name)) {
    result.reason = `単位「${inventory.unit}」と「${required.unit}」は比較できません`;
    return result;
  }

  // 在庫の数量をレシピの単位に変換して比較
  const convertedInventory = convert(inventory.value, inventory.unit, required.unit, inventory.name);

  if (convertedInventory === null) {
    result.reason = `単位の変換に失敗しました（${inventory.unit} → ${required.unit}）`;
    return result;
  }

  result.canCompare = true;
  result.isEnough = convertedInventory >= required.value;

  if (!result.isEnough) {
    result.shortage = required.value - convertedInventory;
    result.shortageUnit = requiredQty.unit.normalized;
  }

  return result;
}

/**
 * レシピの材料リストに対して在庫をチェックする
 * @param recipeIngredients レシピの材料リスト
 * @param userInventories ユーザーの在庫リスト
 * @returns 各材料の利用可能状況
 */
export function checkRecipeAvailability(
  recipeIngredients: Array<{
    name: string;
    quantityValue: number | null;
    quantityUnit: string | null;
  }>,
  userInventories: Array<{
    name: string;
    quantityValue: number | null;
    quantityUnit: string | null;
  }>
): IngredientAvailability[] {
  return recipeIngredients.map((ingredient) => {
    const result: IngredientAvailability = {
      ingredientName: ingredient.name,
      requiredValue: ingredient.quantityValue ?? 0,
      requiredUnit: ingredient.quantityUnit ?? '',
      status: 'missing',
    };

    // 在庫から食材を検索（部分一致）
    const matchingInventory = findMatchingInventory(ingredient.name, userInventories);

    if (!matchingInventory) {
      result.status = 'missing';
      return result;
    }

    result.inventoryValue = matchingInventory.quantityValue ?? undefined;
    result.inventoryUnit = matchingInventory.quantityUnit ?? undefined;

    // 数量が設定されていない場合
    if (ingredient.quantityValue === null || ingredient.quantityValue === undefined) {
      // 在庫があれば available とみなす
      result.status = matchingInventory ? 'available' : 'missing';
      return result;
    }

    if (matchingInventory.quantityValue === null || matchingInventory.quantityValue === undefined) {
      // 在庫の数量が不明な場合は unknown
      result.status = 'unknown';
      return result;
    }

    // 数量比較
    const comparison = compareQuantities(
      {
        value: matchingInventory.quantityValue,
        unit: matchingInventory.quantityUnit ?? '',
        name: matchingInventory.name,
      },
      {
        value: ingredient.quantityValue,
        unit: ingredient.quantityUnit ?? '',
        name: ingredient.name,
      }
    );

    result.comparison = comparison;

    if (!comparison.canCompare) {
      result.status = 'unknown';
    } else if (comparison.isEnough) {
      result.status = 'available';
    } else {
      result.status = 'partial';
    }

    return result;
  });
}

/**
 * 在庫から食材を検索する（完全一致 → 双方向部分一致 → 類似食材グループマッチ）
 * @param ingredientName 検索する食材名
 * @param inventories 在庫リスト
 * @returns マッチした在庫、見つからない場合はundefined
 */
export function findMatchingInventory<T extends { name: string }>(
  ingredientName: string,
  inventories: T[]
): T | undefined {
  const lowerIngredient = ingredientName.toLowerCase();

  // 1. 完全一致を優先
  const exactMatch = inventories.find(
    (inv) => inv.name.toLowerCase() === lowerIngredient
  );
  if (exactMatch) {
    return exactMatch;
  }

  // 2. 双方向部分一致
  const partialMatch = inventories.find(
    (inv) =>
      inv.name.toLowerCase().includes(lowerIngredient) ||
      lowerIngredient.includes(inv.name.toLowerCase())
  );
  if (partialMatch) {
    return partialMatch;
  }

  // 3. 類似食材グループマッチ
  const group = SIMILAR_FOOD_GROUPS.find((g) =>
    g.some((name) => name.toLowerCase() === lowerIngredient)
  );
  if (group) {
    for (const synonym of group) {
      const lowerSynonym = synonym.toLowerCase();
      const groupMatch = inventories.find(
        (inv) =>
          inv.name.toLowerCase() === lowerSynonym ||
          inv.name.toLowerCase().includes(lowerSynonym) ||
          lowerSynonym.includes(inv.name.toLowerCase())
      );
      if (groupMatch) {
        return groupMatch;
      }
    }
  }

  return undefined;
}

/**
 * 在庫消費時の残量を計算する
 * @param inventory 現在の在庫
 * @param consumed 消費量
 * @returns 消費後の数量と単位、消費不可の場合はnull
 */
export function calculateRemainingQuantity(
  inventory: { value: number; unit: string; name: string },
  consumed: { value: number; unit: string; name: string }
): { value: number; unit: string } | null {
  // 同じ単位の場合は直接減算
  const invNorm = normalizeUnit(inventory.unit);
  const conNorm = normalizeUnit(consumed.unit);

  if (invNorm.normalized === conNorm.normalized) {
    const remaining = inventory.value - consumed.value;
    return { value: Math.max(0, remaining), unit: inventory.unit };
  }

  // 単位が異なる場合は変換を試みる
  const convertedConsumed = convert(
    consumed.value,
    consumed.unit,
    inventory.unit,
    consumed.name
  );

  if (convertedConsumed === null) {
    // 変換不可の場合はnull
    return null;
  }

  const remaining = inventory.value - convertedConsumed;
  return { value: Math.max(0, remaining), unit: inventory.unit };
}

/**
 * 在庫アイテムのクイック消費情報を取得する
 *
 * 消費量は quantityUnit のカテゴリのみで決定される:
 *   - COUNT系（個、本、パック等）→ 1 消費
 *   - MASS系（g → 100, kg → 0.1）→ 100g相当を消費
 *   - VOLUME系（ml → 100, L → 0.1）→ 100ml相当を消費
 *
 * quantityValue は「残量 ≤ 消費単位」のとき全量消費（→削除）を判定するために使用。
 * 任意の数量変更は編集モーダル（InventoryEditModal）で対応。
 *
 * @param quantityValue 現在の残量（null/undefinedの場合は1として扱う）
 * @param quantityUnit 単位文字列（null/undefinedの場合は「個」として扱う）
 * @returns consumeAmount: 消費する量, buttonLabel: ボタン表示文字列, willDelete: 消費後に削除されるか
 */
export function getConsumeInfo(
  quantityValue: number | null | undefined,
  quantityUnit: string | null | undefined
): { consumeAmount: number; buttonLabel: string; willDelete: boolean } {
  const effectiveValue = quantityValue ?? 1;
  const effectiveUnit = quantityUnit || '個';
  const normalized = normalizeUnit(effectiveUnit);

  const consumeConfig = CONSUME_AMOUNTS[normalized.normalized];

  if (!consumeConfig) {
    // 未知の単位はデフォルト -1
    const consumeAmount = Math.min(1, effectiveValue);
    return {
      consumeAmount,
      buttonLabel: '-1',
      willDelete: effectiveValue <= 1,
    };
  }

  // 残量が消費単位より少ない場合は残り全部消費
  if (effectiveValue <= consumeConfig.amount) {
    return {
      consumeAmount: effectiveValue,
      buttonLabel: consumeConfig.label,
      willDelete: true,
    };
  }

  return {
    consumeAmount: consumeConfig.amount,
    buttonLabel: consumeConfig.label,
    willDelete: false,
  };
}
