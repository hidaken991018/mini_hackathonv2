/**
 * 単位正規化・換算の定数定義
 */

import type { UnitCategory, IngredientDensity } from './types';

/**
 * 単位の正規化マッピング（表記ゆれ対応）
 * キー: 入力パターン、値: 正規化後の単位
 */
export const UNIT_NORMALIZATION: Record<string, string> = {
  // 重量
  グラム: 'g',
  ｇ: 'g',
  G: 'g',
  キロ: 'kg',
  キログラム: 'kg',
  '㎏': 'kg',
  KG: 'kg',
  ミリグラム: 'mg',
  MG: 'mg',

  // 容量
  ミリリットル: 'ml',
  ｍｌ: 'ml',
  ML: 'ml',
  mL: 'ml',
  リットル: 'L',
  Ｌ: 'L',
  l: 'L',
  シーシー: 'cc',
  ｃｃ: 'cc',
  CC: 'cc',

  // 計量スプーン
  大匙: '大さじ',
  大サジ: '大さじ',
  おおさじ: '大さじ',
  オオサジ: '大さじ',
  tbsp: '大さじ',
  Tbsp: '大さじ',
  TBSP: '大さじ',
  小匙: '小さじ',
  小サジ: '小さじ',
  こさじ: '小さじ',
  コサジ: '小さじ',
  tsp: '小さじ',
  Tsp: '小さじ',
  TSP: '小さじ',
  cup: 'カップ',
  Cup: 'カップ',
  CUP: 'カップ',

  // 個数系
  こ: '個',
  コ: '個',
  ケ: '個',
  ぽん: '本',
  ホン: '本',
  まい: '枚',
  マイ: '枚',
  たば: '束',
  タバ: '束',
  ぱっく: 'パック',
  パツク: 'パック',
  pack: 'パック',
  PACK: 'パック',
  たま: '玉',
  タマ: '玉',
  かぶ: '株',
  カブ: '株',
  ふさ: '房',
  フサ: '房',
  きれ: '切れ',
  キレ: '切れ',
  かけ: '片',
  カケ: '片',
  かけら: '片',
  ふくろ: '袋',
  フクロ: '袋',

  // 曖昧表現
  しょうしょう: '少々',
  ショウショウ: '少々',
  一つまみ: 'ひとつまみ',
  '1つまみ': 'ひとつまみ',
  ヒトツマミ: 'ひとつまみ',
  てきりょう: '適量',
  テキリョウ: '適量',
  おこのみで: 'お好みで',
  オコノミデ: 'お好みで',
};

/**
 * 単位カテゴリマッピング
 * キー: 正規化後の単位、値: カテゴリ
 */
export const UNIT_CATEGORIES: Record<string, UnitCategory> = {
  // MASS (重量)
  g: 'MASS',
  kg: 'MASS',
  mg: 'MASS',

  // VOLUME (容量)
  ml: 'VOLUME',
  L: 'VOLUME',
  cc: 'VOLUME',

  // SPOON (計量スプーン)
  大さじ: 'SPOON',
  小さじ: 'SPOON',
  カップ: 'SPOON',

  // COUNT (個数)
  個: 'COUNT',
  本: 'COUNT',
  枚: 'COUNT',
  束: 'COUNT',
  パック: 'COUNT',
  袋: 'COUNT',
  玉: 'COUNT',
  株: 'COUNT',
  房: 'COUNT',
  切れ: 'COUNT',
  片: 'COUNT',

  // IMPRECISE (曖昧表現)
  少々: 'IMPRECISE',
  ひとつまみ: 'IMPRECISE',
  適量: 'IMPRECISE',
  お好みで: 'IMPRECISE',
};

/**
 * 計量スプーンからmlへの換算
 */
export const SPOON_TO_ML: Record<string, number> = {
  小さじ: 5,
  大さじ: 15,
  カップ: 200,
};

/**
 * 重量系の基準単位(g)への換算係数
 */
export const MASS_TO_GRAM: Record<string, number> = {
  g: 1,
  kg: 1000,
  mg: 0.001,
};

/**
 * 容量系の基準単位(ml)への換算係数
 */
export const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  L: 1000,
  cc: 1,
};

/**
 * 食材密度テーブル（調味料・液体）
 * 重量(g) ⇔ 容量(ml) の変換に使用
 */
export const INGREDIENT_DENSITIES: IngredientDensity[] = [
  // 基本調味料
  { name: '水', densityGPerMl: 1.0 },
  { name: '醤油', densityGPerMl: 1.15, aliases: ['しょうゆ', 'しょう油', '薄口醤油', '濃口醤油'] },
  { name: 'みりん', densityGPerMl: 1.13, aliases: ['味醂', 'ミリン', '本みりん'] },
  { name: '酒', densityGPerMl: 1.0, aliases: ['料理酒', '日本酒', '清酒'] },
  { name: '酢', densityGPerMl: 1.0, aliases: ['米酢', '穀物酢', '黒酢', 'りんご酢'] },
  { name: '味噌', densityGPerMl: 1.1, aliases: ['みそ', '白味噌', '赤味噌', '合わせ味噌'] },
  { name: '砂糖', densityGPerMl: 0.6, aliases: ['上白糖', 'グラニュー糖', '三温糖'] },
  { name: '塩', densityGPerMl: 1.2, aliases: ['食塩', '粗塩', '岩塩'] },
  { name: '油', densityGPerMl: 0.9, aliases: ['サラダ油', 'ごま油', 'オリーブオイル', '植物油'] },
  { name: 'オリーブオイル', densityGPerMl: 0.9, aliases: ['オリーブ油'] },
  { name: 'ごま油', densityGPerMl: 0.9, aliases: ['胡麻油'] },
  { name: 'はちみつ', densityGPerMl: 1.4, aliases: ['蜂蜜', 'ハチミツ'] },
  { name: 'マヨネーズ', densityGPerMl: 0.9 },
  { name: 'ケチャップ', densityGPerMl: 1.15, aliases: ['トマトケチャップ'] },
  { name: 'ソース', densityGPerMl: 1.2, aliases: ['ウスターソース', '中濃ソース', 'とんかつソース'] },
  { name: '牛乳', densityGPerMl: 1.03, aliases: ['ミルク'] },
  { name: '生クリーム', densityGPerMl: 1.0, aliases: ['クリーム', 'ホイップクリーム'] },

  // 粉類
  { name: '小麦粉', densityGPerMl: 0.55, aliases: ['薄力粉', '強力粉', '中力粉'] },
  { name: '片栗粉', densityGPerMl: 0.65, aliases: ['かたくり粉'] },
  { name: 'パン粉', densityGPerMl: 0.25, aliases: ['ぱん粉'] },
  { name: 'ベーキングパウダー', densityGPerMl: 0.8, aliases: ['BP'] },

  // その他
  { name: 'バター', densityGPerMl: 0.95, aliases: ['無塩バター', '有塩バター', 'マーガリン'] },
  { name: 'ヨーグルト', densityGPerMl: 1.05, aliases: ['プレーンヨーグルト'] },
];

/**
 * 類似食材グループ（ファジーマッチング用）
 * 同グループ内の食材は調理時に代替マッチの対象となる
 */
export const SIMILAR_FOOD_GROUPS: string[][] = [
  ['豆腐', '絹豆腐', '木綿豆腐', '絹ごし豆腐', '充填豆腐'],
  ['鶏肉', '鶏もも肉', '鶏むね肉', '鶏ひき肉', '鶏もも', '鶏むね', '鶏胸肉'],
  ['豚肉', '豚バラ', '豚バラ肉', '豚ロース', '豚ひき肉', '豚もも肉', '豚こま', '豚こま肉'],
  ['牛肉', '牛バラ', '牛ロース', '牛ひき肉', '牛もも肉', '牛こま', '牛こま肉'],
  ['ひき肉', '合いびき肉', '合挽き肉', '合い挽き肉'],
  ['ねぎ', '長ねぎ', '長ネギ', 'ネギ', '白ねぎ'],
  ['大根', 'だいこん', 'ダイコン'],
  ['にんじん', '人参', 'ニンジン'],
  ['たまねぎ', '玉ねぎ', '玉ネギ', 'タマネギ'],
  ['じゃがいも', 'ジャガイモ', 'じゃが芋', 'メークイン', '男爵'],
  ['キャベツ', 'きゃべつ'],
  ['白菜', 'はくさい', 'ハクサイ'],
  ['ほうれん草', 'ほうれんそう', 'ホウレンソウ'],
  ['もやし', 'モヤシ'],
  ['しいたけ', 'シイタケ', '椎茸'],
  ['しめじ', 'シメジ'],
  ['えのき', 'エノキ', 'えのきだけ', 'えのき茸'],
  ['チーズ', 'とろけるチーズ', 'ピザ用チーズ', 'スライスチーズ', 'シュレッドチーズ'],
];

/**
 * 基準単位
 */
export const BASE_UNITS: Record<UnitCategory, string> = {
  MASS: 'g',
  VOLUME: 'ml',
  SPOON: 'ml', // SPOONはVOLUMEの一種として扱う
  COUNT: '個',
  IMPRECISE: '',
  UNKNOWN: '',
};

/**
 * 単位ごとの消費量マッピング
 * COUNT系単位 → 1, MASS系 → 100 (g基準), VOLUME系 → 100 (ml基準)
 */
export const CONSUME_AMOUNTS: Record<string, { amount: number; label: string }> = {
  // COUNT系 → -1
  個: { amount: 1, label: '-1' },
  本: { amount: 1, label: '-1' },
  パック: { amount: 1, label: '-1' },
  袋: { amount: 1, label: '-1' },
  房: { amount: 1, label: '-1' },
  束: { amount: 1, label: '-1' },
  枚: { amount: 1, label: '-1' },
  玉: { amount: 1, label: '-1' },
  株: { amount: 1, label: '-1' },
  切れ: { amount: 1, label: '-1' },
  片: { amount: 1, label: '-1' },
  // MASS系 → -100g
  g: { amount: 100, label: '-100g' },
  kg: { amount: 0.1, label: '-100g' },
  // VOLUME系 → -100ml
  ml: { amount: 100, label: '-100ml' },
  L: { amount: 0.1, label: '-100ml' },
  cc: { amount: 100, label: '-100ml' },
};

/**
 * 分数表現のパターン
 */
export const FRACTION_PATTERNS = {
  // 1/2, 3/4 などの分数
  slash: /^(\d+)\/(\d+)(.*)$/,
  // 半分、半個 などの「半」表現
  half: /^半(.*)$/,
  // 2個半 などの「n個半」表現
  countHalf: /^(\d+(?:\.\d+)?)(.+)半$/,
  // 小数点付き数値 1.5本 など
  decimal: /^(\d+\.\d+)(.*)$/,
  // 整数と単位 2本 など
  integer: /^(\d+)(.*)$/,
};
