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
  image?: string;
  createdAt: Date;
  readAt: Date | null;
  recipe?: {
    ingredients: string[];
    steps: RecipeStep[];
    cookingTime?: string;
    servings?: string;
  };
};

// レシート解析結果の型
export type ReceiptAnalysisResult = {
  ingredients: string[];  // 抽出された食材リスト
};
