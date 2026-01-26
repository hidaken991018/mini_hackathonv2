# 情報設計ドキュメント

## 1. 画面構成と取扱情報

| 画面 | パス | 主な取扱情報 | 状態管理 |
|------|------|-------------|----------|
| **入力** | `/input` | レシート画像, 食材リスト(InventoryItem[]) | ローカル state |
| **チャット** | `/chat` | メッセージ履歴(Message[]) | ローカル state + localStorage |
| **通知** | `/notifications` | 通知一覧(Notification[]), 在庫状態 | ローカル state + API |

---

## 2. データモデルとCRUD操作

### Inventory（在庫）

| 操作 | API | 画面 | トリガー |
|------|-----|------|----------|
| **Create** | `POST /api/inventories/bulk` | 入力 | レシート解析後の「在庫に登録」ボタン |
| **Read** | （直接なし。通知API経由で参照） | - | - |
| **Update** | `POST /api/recipes/[recipeId]/cook` | 通知 | 「作った！」ボタン（数量減算） |
| **Delete** | `POST /api/recipes/[recipeId]/cook` | 通知 | 数量が0以下になった時自動削除 |

```
フィールド: id, userId, name, quantityValue, quantityUnit,
           expireDate, consumeBy, note, imageUrl
```

### Notification（通知）

| 操作 | API | 画面 | トリガー |
|------|-----|------|----------|
| **Create** | `POST /api/recipe/notify` | （バッチ/外部） | レシピ推薦時 |
| **Read** | `GET /api/notifications?userId=` | 通知 | 画面初期表示 |
| **Update** | `PATCH /api/notifications/[id]/read` | 通知 | カード選択時 |
| **Update** | `PATCH /api/notifications/read-all` | 通知 | 「全て既読」ボタン |
| **Delete** | なし | - | - |

```
フィールド: id, userId, type, title, body, imageUrl,
           readAt, recipeId, inventoryId, expiryKind, expiryDate
```

### Recipe / RecipeIngredient / RecipeStep（レシピ）

| 操作 | API | 備考 |
|------|-----|------|
| **Create** | なし（シードデータ） | prisma/seed で投入 |
| **Read** | `GET /api/notifications` 内で結合取得 | 通知と一緒に取得 |
| **Update** | なし | - |
| **Delete** | なし | - |

### User（ユーザー）

| 操作 | 備考 |
|------|------|
| **CRUD** | 現状なし。`mock-user-001` 固定 |

---

## 3. AIが担うロジックのI/O

### レシート解析 (Gemini)

**エンドポイント:** `POST /api/analyze-receipt`

| 項目 | 内容 |
|------|------|
| **Input** | レシート画像（Base64） |
| **処理** | Gemini 2.0 Flash による画像解析 |
| **Output** | 構造化された食材リスト |

```typescript
// Input
{ imageData: "data:image/jpeg;base64,..." }

// Output (Gemini structured output)
{
  items: [
    {
      name: "卵",
      quantityValue: 6,
      quantityUnit: "個",
      expireDate: "2026-02-10",    // AIが推論
      consumeBy: "2026-02-15"      // AIが推論
    },
    ...
  ]
}
```

**AI責務:**
- 画像からの食材名抽出
- 数量・単位の認識
- 賞味期限・消費期限の推論（記載がない場合も推測）

---

### レシピ推薦 (Gemini)

**エンドポイント:** `POST /api/recipe/notify`

| 項目 | 内容 |
|------|------|
| **Input** | ユーザーの在庫一覧 + 全レシピ候補（上位5件） |
| **処理** | スコアリング → Gemini で最終選定 |
| **Output** | 選定されたレシピID |

```typescript
// Input (Gemini prompt)
候補:
- id: recipe-001
  title: 親子丼
  matchCount: 3
  totalIngredients: 5
  matchedIngredients: 卵・鶏肉・玉ねぎ
  nearestDate: 2026-01-28
...

// Output (Gemini structured output)
{ recipeId: "recipe-001" }
```

**AI責務:**
- 在庫マッチ率と期限切迫度を考慮した最終判断
- 人間的な「今日はこれがいい」という直感的選定

**前処理（非AI）:**
1. レシピ材料と在庫の名前マッチング
2. マッチ率スコア計算
3. 期限日でソート
4. 上位5件に絞り込み

---

### AIチャット（未実装）

**画面:** `/chat`

| 項目 | 想定内容 |
|------|----------|
| **Input** | ユーザーメッセージ + 在庫コンテキスト |
| **処理** | LLMによる対話生成 |
| **Output** | レシピ提案・調理アドバイス等 |

**現状:** UIのみ実装済み。`// TODO: 実際のAI APIと接続` のコメントあり。

---

## 4. データフロー図

```
┌─────────────────────────────────────────────────────────────────┐
│                         入力画面                                 │
│  [レシート画像] ──→ [AI解析] ──→ [プレビュー編集] ──→ [DB登録]  │
└─────────────────────────────────────────────────────────────────┘
        │                                              │
        │ Base64                                       │ Inventory
        ▼                                              ▼
┌───────────────┐                            ┌─────────────────┐
│  Gemini API   │                            │    Database     │
│ (レシート解析) │                            │  - inventories  │
└───────────────┘                            │  - recipes      │
                                             │  - notifications│
        ┌──────────────────────────────────→ │  - users        │
        │                                    └─────────────────┘
        │                                              │
┌───────────────┐                                      │
│  Gemini API   │ ←── 候補5件 ──────────────────────────┤
│ (レシピ推薦)  │                                      │
└───────────────┘                                      │
        │                                              │
        │ 選定recipeId                                 │
        ▼                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        通知画面                                  │
│  [通知カード] ──→ [レシピモーダル] ──→ [作った！] ──→ [在庫減算] │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. API一覧

| メソッド | エンドポイント | 機能 | AI使用 |
|----------|----------------|------|--------|
| POST | `/api/analyze-receipt` | レシート画像解析 | Gemini |
| POST | `/api/inventories/bulk` | 在庫一括登録 | - |
| GET | `/api/notifications` | 通知一覧取得 | - |
| PATCH | `/api/notifications/[id]/read` | 個別既読 | - |
| PATCH | `/api/notifications/read-all` | 全件既読 | - |
| POST | `/api/recipe/notify` | レシピ推薦通知作成 | Gemini |
| POST | `/api/recipes/[recipeId]/cook` | 調理実行（在庫減算） | - |

---

## 6. 型定義

```typescript
// types/index.ts

type Note = {
  id: string;
  text: string;
  images: string[];
  updatedAt: Date;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type RecipeStep = {
  step: number;
  instruction: string;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  image?: string;
  createdAt: Date;
  readAt: Date | null;
  recipeId?: string;
  recipe?: {
    ingredients: string[];
    steps: RecipeStep[];
    cookingTime?: string;
    servings?: string;
  };
};

type InventoryItem = {
  name: string;
  quantityValue?: number;
  quantityUnit?: string;
  expireDate?: string;
  consumeBy?: string;
  note?: string;
};

type ReceiptAnalysisResult = {
  ingredients: string[];
  items: InventoryItem[];
};
```

---

## 7. 未実装・拡張ポイント

| 項目 | 現状 | 想定拡張 |
|------|------|----------|
| 認証 | `mock-user-001` 固定 | OAuth / メール認証 |
| AIチャット | UI のみ | Gemini / Claude 連携 |
| 在庫一覧画面 | なし | CRUD画面追加 |
| 期限アラート通知 | スキーマのみ | バッチ処理で自動生成 |
| 画像ストレージ | Base64 DB保存 | S3 / Cloudinary |
| 在庫編集 | なし | 個別編集・削除機能 |
| レシピ登録 | シードのみ | ユーザー投稿機能 |
