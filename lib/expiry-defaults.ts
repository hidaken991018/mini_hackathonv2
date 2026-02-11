/**
 * 食材カテゴリ別デフォルト期限の推定
 *
 * レシート解析後、Geminiが賞味期限/消費期限をnullで返した場合に
 * 食材名からカテゴリを推定し、目安の期限を自動設定する。
 */

type FoodCategory = {
  name: string;
  keywords: string[];
  /** 購入日からの賞味期限（日数） */
  defaultExpireDays: number;
  /** 購入日からの消費期限（日数） */
  defaultConsumeDays: number;
};

/**
 * 食材カテゴリ定義（優先順: 上から順に検索し、最初にマッチしたものを使用）
 * 具体的なキーワードを先に、汎用的なキーワードを後に配置
 *
 * 対象: 生鮮食材のみ（賞味期限が短く自動設定が有用なもの）
 * 対象外: 調味料、飲料、缶詰、冷凍食品など長期保存品（手動入力に任せる）
 */
const FOOD_CATEGORIES: FoodCategory[] = [
  {
    name: '魚介類',
    keywords: ['鮭', 'サーモン', 'マグロ', 'まぐろ', '刺身', 'さしみ', 'エビ', 'えび', '海老', 'イカ', 'いか', 'タコ', 'たこ', 'アジ', 'あじ', 'サバ', 'さば', '鯖', 'サンマ', 'さんま', 'ブリ', 'ぶり', 'カツオ', 'かつお', 'シラス', 'しらす', '魚'],
    defaultExpireDays: 1,
    defaultConsumeDays: 2,
  },
  {
    name: '生鮮肉類',
    keywords: ['鶏', 'チキン', '豚', 'ポーク', '牛', 'ビーフ', 'ひき肉', 'ミンチ', 'ささみ', 'もも肉', 'むね肉', 'バラ肉', 'ロース', 'ハム', 'ベーコン', 'ソーセージ', 'ウインナー', '肉'],
    defaultExpireDays: 2,
    defaultConsumeDays: 3,
  },
  {
    name: '葉物野菜',
    keywords: ['レタス', 'ほうれん草', 'ホウレンソウ', '小松菜', 'こまつな', '水菜', 'みずな', 'もやし', 'モヤシ', '春菊', 'しゅんぎく', 'ニラ', 'にら', '大葉', 'しそ', 'パセリ', 'バジル', 'ミント'],
    defaultExpireDays: 3,
    defaultConsumeDays: 5,
  },
  {
    name: 'パン',
    keywords: ['パン', '食パン', 'ベーグル', 'クロワッサン', 'ロールパン', 'バゲット'],
    defaultExpireDays: 3,
    defaultConsumeDays: 5,
  },
  {
    name: '豆腐・納豆',
    keywords: ['豆腐', 'とうふ', '納豆', 'なっとう', '油揚げ', 'あぶらあげ', '厚揚げ', 'あつあげ', 'こんにゃく', 'コンニャク'],
    defaultExpireDays: 5,
    defaultConsumeDays: 7,
  },
  {
    name: '乳製品',
    keywords: ['牛乳', 'ミルク', 'ヨーグルト', 'チーズ', '生クリーム', 'クリームチーズ', 'バターミルク'],
    defaultExpireDays: 7,
    defaultConsumeDays: 10,
  },
  {
    name: 'キャベツ・白菜',
    keywords: ['キャベツ', 'きゃべつ', '白菜', 'はくさい', 'ブロッコリー', 'カリフラワー', 'セロリ', 'アスパラ'],
    defaultExpireDays: 7,
    defaultConsumeDays: 10,
  },
  {
    name: '果物',
    keywords: ['りんご', 'リンゴ', '林檎', 'バナナ', 'みかん', 'ミカン', 'オレンジ', 'いちご', 'イチゴ', 'ぶどう', 'ブドウ', '梨', 'なし', '桃', 'もも', 'キウイ', 'レモン', 'グレープフルーツ', '柿', 'かき', 'メロン', 'スイカ', 'すいか', 'パイナップル', 'マンゴー'],
    defaultExpireDays: 7,
    defaultConsumeDays: 10,
  },
  {
    name: '根菜類',
    keywords: ['じゃがいも', 'ジャガイモ', '馬鈴薯', '人参', 'にんじん', 'ニンジン', '玉ねぎ', 'たまねぎ', '大根', 'だいこん', 'ごぼう', 'ゴボウ', 'さつまいも', 'サツマイモ', '里芋', 'さといも', 'れんこん', 'レンコン', 'かぼちゃ', 'カボチャ', '長ねぎ', 'ながねぎ', 'ネギ', 'ねぎ', '生姜', 'しょうが', 'にんにく', 'ニンニク'],
    defaultExpireDays: 14,
    defaultConsumeDays: 21,
  },
  {
    name: '卵',
    keywords: ['卵', 'たまご', 'タマゴ', 'エッグ'],
    defaultExpireDays: 14,
    defaultConsumeDays: 21,
  },
];

/**
 * 食材名からカテゴリを検索する
 */
function findCategory(foodName: string): FoodCategory | null {
  const lower = foodName.toLowerCase();
  for (const category of FOOD_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  return null;
}

/**
 * 日付にN日加算してYYYY-MM-DD形式の文字列を返す
 */
function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

/**
 * 食材名からデフォルトの賞味期限・消費期限を推定する
 *
 * 生鮮食材（肉、魚、野菜、乳製品等）のみ自動設定。
 * 調味料、飲料、缶詰、冷凍食品など長期保存品はnullを返す（手動入力に任せる）。
 *
 * @param foodName 食材名
 * @param purchaseDate 購入日（デフォルト: 今日）
 * @returns expireDate/consumeBy: 生鮮食材はYYYY-MM-DD文字列、長期保存品等はnull
 */
export function getDefaultExpiryDates(
  foodName: string,
  purchaseDate?: Date
): { expireDate: string | null; consumeBy: string | null } {
  const category = findCategory(foodName);

  if (!category) {
    return { expireDate: null, consumeBy: null };
  }

  const baseDate = purchaseDate ?? new Date();
  return {
    expireDate: addDays(baseDate, category.defaultExpireDays),
    consumeBy: addDays(baseDate, category.defaultConsumeDays),
  };
}
