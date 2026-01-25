# DB_要件定義

## 対象範囲
モック（Input / AI Chat / Notifications）に登場するデータを永続化するためのDB要件を整理する。  
画面に登場しないが運用上必要になる最小限の項目（ユーザー識別、作成日時など）は追加する。

## 画面とデータ対応
- Input画面: ノート一覧/詳細、画像付きノート、更新日時
- AI Chat画面: ユーザーとアシスタントのメッセージ履歴
- Notifications画面: 通知一覧、既読状態、通知に紐づくレシピ情報

## エンティティ一覧
- users
- inventories
- notifications
- recipes
- recipe_ingredients
- recipe_steps

## テーブル定義（案）

### users
| カラム | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | UUID | PK | ユーザーID |
| name | TEXT |  | 表示名 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

### inventories
| カラム | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | UUID | PK | 在庫ID |
| user_id | UUID | FK(users.id) | 所有者 |
| name | TEXT | NOT NULL | 食材名 |
| quantity_value | DECIMAL |  | 数量（数値） |
| quantity_unit | TEXT |  | 単位（例: "個", "g", "ml"） |
| note | TEXT |  | メモ |
| image_url | TEXT |  | 食材画像 |
| expire_date | DATE |  | 賞味期限 |
| consume_by | DATE |  | 消費期限 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

#### インデックス
- inventories_user_updated_at_idx (user_id, updated_at DESC)
- inventories_expire_date_idx (expire_date)
- inventories_consume_by_idx (consume_by)

### notifications
| カラム | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | UUID | PK | 通知ID |
| user_id | UUID | FK(users.id) | 宛先ユーザー |
| type | TEXT | NOT NULL | recipe / expiry / reminder 等 |
| title | TEXT | NOT NULL | タイトル |
| body | TEXT | NOT NULL | 本文 |
| image_url | TEXT |  | サムネイル |
| read_at | TIMESTAMP |  | 既読日時（nullで未読） |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| recipe_id | UUID | FK(recipes.id) | レシピ（任意） |
| inventory_id | UUID | FK(inventories.id) | 在庫アイテム（任意） |
| expiry_kind | TEXT |  | best_before / use_by（type=expiry時） |
| expiry_date | DATE |  | 対象期限（type=expiry時） |

#### インデックス
- notifications_user_created_at_idx (user_id, created_at DESC)
- notifications_user_read_at_idx (user_id, read_at)
- notifications_user_type_idx (user_id, type)

### recipes
| カラム | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | UUID | PK | レシピID |
| title | TEXT | NOT NULL | レシピ名 |
| image_url | TEXT |  | 代表画像 |
| cooking_time | TEXT |  | 調理時間 |
| servings | TEXT |  | 何人分 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

### recipe_ingredients
| カラム | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | UUID | PK | 材料ID |
| recipe_id | UUID | FK(recipes.id) | レシピID |
| inventory_id | UUID | FK(inventories.id) | 在庫参照（比較判定用） |
| name | TEXT | NOT NULL | 材料名 |
| quantity_value | DECIMAL |  | 必要量（数値） |
| quantity_unit | TEXT |  | 単位（例: "個", "g", "ml"） |
| sort_order | INT | NOT NULL | 表示順 |

#### インデックス
- recipe_ingredients_recipe_id_idx (recipe_id, sort_order)

### recipe_steps
| カラム | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | UUID | PK | 手順ID |
| recipe_id | UUID | FK(recipes.id) | レシピID |
| step_number | INT | NOT NULL | 手順番号 |
| instruction | TEXT | NOT NULL | 手順説明 |

#### インデックス
- recipe_steps_recipe_id_idx (recipe_id, step_number)

## リレーション概要
- users 1 - N inventories
- users 1 - N notifications
- notifications N - 1 recipes（任意）
- notifications N - 1 inventories（任意）
- recipes 1 - N recipe_ingredients / recipe_steps

## 想定クエリ
- 在庫一覧: user_idで最新更新順に取得
- 期限が近い在庫: expire_date / consume_by でしきい値検索
- 通知一覧: user_idで最新順取得、未読優先表示
- レシピ表示: notifications.recipe_idから詳細、材料、手順を取得
- 期限通知表示: notifications.inventory_idから食材情報と期限を取得
 - レシピ可否判定: recipe_ingredients.inventory_idの在庫量と必要量を比較

## 仕様メモ（運用・拡張）
- 画像はURL保存（実体はストレージ想定）
- 通知はtypeで用途分離し、expiry系はexpiry_kind/expiry_dateを保持
- 材料の数量比較は、recipe_ingredientsの数量とinventoriesの数量を同一単位で比較
