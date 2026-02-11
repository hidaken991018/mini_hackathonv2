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

// レシピの取得元
export type RecipeSourceType = 'ai_generated' | 'user_created';

// レシピ材料アイテム
export type RecipeIngredientItem = {
  id?: string;
  name: string;
  quantityValue?: number;
  quantityUnit?: string;
  sortOrder: number;
};

// レシピ（フルデータ）
export type Recipe = {
  id: string;
  userId?: string;
  sourceType: RecipeSourceType;
  title: string;
  description?: string;
  imageUrl?: string;
  cookingTime?: string;
  servings?: string;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientItem[];
  steps: RecipeStep[];
};

// レシピ作成用入力
export type RecipeInput = {
  title: string;
  description?: string;
  cookingTime?: string;
  servings?: string;
  ingredients: Omit<RecipeIngredientItem, 'id'>[];
  steps: RecipeStep[];
};

// レシピ一覧アイテム（軽量版）
export type RecipeListItem = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  cookingTime?: string;
  sourceType: RecipeSourceType;
  ingredientCount: number;
  stepCount: number;
  createdAt: string;
};
