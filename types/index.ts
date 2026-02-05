export type Note = {
  id: string;
  text: string;
  images: string[];
  updatedAt: Date;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type RecipeStep = {
  step: number;
  instruction: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type?: string; 
  image?: string;
  createdAt: Date;
  readAt: Date | null;
  recipeId?: string; // DB参照用レシピID
  recipe?: {
    ingredients: string[];
    steps: RecipeStep[];
    cookingTime?: string;
    servings?: string;
    imageUrl?: string;
  };
};

// 在庫アイテムの型（登録前）
export type InventoryItem = {
  name: string;
  quantityValue?: number;
  quantityUnit?: string;
  expireDate?: string;
  consumeBy?: string;
  note?: string;
};

// 在庫アイテムの型（ID付き、API レスポンス用）
export type InventoryItemWithId = {
  id: string;
  name: string;
  quantityValue?: number;
  quantityUnit?: string;
  expireDate?: string;
  consumeBy?: string;
  note?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

// レシート解析結果の型（拡張版）
export type ReceiptAnalysisResult = {
  ingredients: string[];  // 抽出された食材リスト（後方互換性のため維持）
  items: InventoryItem[]; // 構造化された在庫アイテム
};
