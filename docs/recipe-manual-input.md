# レシピ手入力機能 設計書

## 概要

ユーザーが手動でレシピを作成・編集・削除できる機能。既存のAI生成レシピと共存し、レシピの取得元（sourceType）を記録する。

## 背景

Issue #12: レシピの生成/取得元が未定義だったため、方針を整理し実装した。

### 決定事項
- **主要な取得方式**: 手入力機能を追加
- **共存**: 既存のAI生成（Gemini）と共存
- **取得元の記録**: `sourceType` フィールドで管理

---

## データベーススキーマ

### Recipeモデルの拡張

```prisma
model Recipe {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")           // 新規: レシピ所有者
  sourceType  String   @default("ai_generated") @map("source_type")
  title       String
  description String?                            // 新規: レシピの説明
  imageUrl    String?  @map("image_url")
  cookingTime String?  @map("cooking_time")
  servings    String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user          User?              @relation(fields: [userId], references: [id])
  notifications Notification[]
  ingredients   RecipeIngredient[]
  steps         RecipeStep[]

  @@index([userId, updatedAt(sort: Desc)])
  @@index([sourceType])
  @@map("recipes")
}
```

### sourceType の値

| 値 | 説明 |
|---|---|
| `ai_generated` | AIによる自動生成（デフォルト） |
| `user_created` | ユーザーによる手入力 |

---

## API仕様

### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/recipes` | レシピ一覧取得（検索対応） |
| `POST` | `/api/recipes` | レシピ新規作成 |
| `GET` | `/api/recipes/{id}` | レシピ詳細取得 |
| `PUT` | `/api/recipes/{id}` | レシピ更新 |
| `DELETE` | `/api/recipes/{id}` | レシピ削除 |

### GET /api/recipes

レシピ一覧を取得する。

**クエリパラメータ:**

| 名前 | 型 | 説明 |
|-----|---|------|
| `query` | string | タイトル・材料名での検索 |
| `sourceType` | string | `ai_generated` または `user_created` |
| `limit` | number | 取得件数（デフォルト: 20） |
| `offset` | number | オフセット（デフォルト: 0） |

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "uuid",
        "title": "鶏肉のトマト煮込み",
        "description": "簡単で美味しいレシピ",
        "imageUrl": null,
        "cookingTime": "30分",
        "sourceType": "user_created",
        "ingredientCount": 5,
        "stepCount": 3,
        "createdAt": "2025-01-30T00:00:00.000Z"
      }
    ],
    "total": 50,
    "hasMore": true
  }
}
```

### POST /api/recipes

レシピを新規作成する。

**リクエスト:**

```json
{
  "title": "鶏肉のトマト煮込み",
  "description": "簡単で美味しいレシピ",
  "cookingTime": "30分",
  "servings": "2人分",
  "ingredients": [
    { "name": "鶏もも肉", "quantityValue": 300, "quantityUnit": "g" },
    { "name": "トマト缶", "quantityValue": 1, "quantityUnit": "缶" }
  ],
  "steps": [
    { "step": 1, "instruction": "鶏肉を一口大に切る" },
    { "step": 2, "instruction": "フライパンで焼く" }
  ]
}
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-id",
    "sourceType": "user_created",
    "title": "鶏肉のトマト煮込み",
    "description": "簡単で美味しいレシピ",
    "imageUrl": null,
    "cookingTime": "30分",
    "servings": "2人分",
    "createdAt": "2025-01-30T00:00:00.000Z",
    "updatedAt": "2025-01-30T00:00:00.000Z",
    "ingredients": [...],
    "steps": [...]
  }
}
```

### PUT /api/recipes/{id}

レシピを更新する。手入力レシピ（`sourceType === 'user_created'`）のみ更新可能。

**リクエスト:**

```json
{
  "title": "更新後のタイトル",
  "ingredients": [...],
  "steps": [...]
}
```

### DELETE /api/recipes/{id}

レシピを削除する。手入力レシピのみ削除可能。

---

## 型定義

```typescript
// レシピの取得元
type RecipeSourceType = 'ai_generated' | 'user_created';

// レシピ（フルデータ）
type Recipe = {
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

// レシピ材料アイテム
type RecipeIngredientItem = {
  id?: string;
  name: string;
  quantityValue?: number;
  quantityUnit?: string;
  sortOrder: number;
};

// レシピ一覧アイテム（軽量版）
type RecipeListItem = {
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
```

---

## UI仕様

### レシピ一覧ページ (`/recipes`)

- **ヘッダー**: 検索バー + フィルター（すべて / 手入力 / AI生成）
- **レシピ一覧**: 2列グリッド表示
- **FABボタン**: 右下に「+」ボタンで作成モーダル表示

### RecipeCreateModal

- **タイトル**: 必須
- **説明**: 任意
- **調理時間・人数**: 任意
- **材料**: 動的追加/削除可能、最低1つ必要
- **手順**: 動的追加/削除可能、最低1つ必要

### RecipeCard

- 画像（またはプレースホルダー）
- sourceTypeバッジ（「AI生成」/ 「手入力」）
- タイトル、調理時間、材料数
- 相対日時

---

## 権限ルール

| アクション | AI生成レシピ | 手入力レシピ |
|----------|------------|------------|
| 閲覧 | 所有者のみ | 所有者のみ |
| 編集 | 不可 | 所有者のみ |
| 削除 | 不可 | 所有者のみ |

---

## ファイル構成

```
prisma/
  schema.prisma           # Recipeモデル拡張

types/
  index.ts                # Recipe型定義追加

app/
  api/
    recipes/
      route.ts            # GET/POST
      [recipeId]/
        route.ts          # GET/PUT/DELETE
  recipes/
    page.tsx              # レシピ一覧ページ

components/
  IngredientInput.tsx     # 材料入力コンポーネント
  StepInput.tsx           # 手順入力コンポーネント
  RecipeCreateModal.tsx   # 作成/編集モーダル
  RecipeCard.tsx          # レシピカード
  BottomNav.tsx           # 更新（レシピタブ追加）

__tests__/
  api/
    recipes.test.ts       # APIテスト
  components/
    RecipeCreateModal.test.tsx  # コンポーネントテスト
```

---

## 既存機能との互換性

- `POST /api/recipe/notify` は変更不要（`sourceType` のデフォルト値が `ai_generated`）
- 通知ページの `RecipeSlideModal` はそのまま使用可能
- 既存のレシピデータは `sourceType = 'ai_generated'` として扱われる

---

## テスト

### APIテスト

- データ変換（Prisma → レスポンス形式）
- バリデーション（タイトル必須、材料1つ以上、手順1つ以上）
- 検索ロジック（部分一致、フィルタ、ページネーション）
- 権限チェック（所有者のみ編集可、AI生成は編集不可）

### コンポーネントテスト

- フォームバリデーション
- 材料/手順の追加・削除
- API送信データの変換
