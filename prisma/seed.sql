PRAGMA foreign_keys=ON;

INSERT INTO "users" ("id", "name", "created_at", "updated_at")
VALUES ('mock-user-001', 'テストユーザー', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "inventories" (
  "id",
  "user_id",
  "name",
  "quantity_value",
  "quantity_unit",
  "consume_by",
  "created_at",
  "updated_at"
) VALUES
  ('inv-tomato-001', 'mock-user-001', 'トマト', 2, '個', datetime('now', '+2 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv-egg-001', 'mock-user-001', '卵', 6, '個', datetime('now', '+5 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv-chicken-001', 'mock-user-001', '鶏むね肉', 1, '枚', datetime('now', '+3 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv-onion-001', 'mock-user-001', '玉ねぎ', 1, '個', datetime('now', '+7 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv-carrot-001', 'mock-user-001', 'にんじん', 1, '本', datetime('now', '+6 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv-potato-001', 'mock-user-001', 'じゃがいも', 2, '個', datetime('now', '+8 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv-miso-001', 'mock-user-001', '味噌', 300, 'g', datetime('now', '+30 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "recipes" (
  "id",
  "title",
  "cooking_time",
  "servings",
  "created_at",
  "updated_at"
) VALUES
  ('recipe-tomato-egg-001', 'トマトと卵の炒め', '10分', '2人分', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('recipe-chicken-001', '鶏むねのさっぱり煮', '20分', '2人分', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('recipe-miso-soup-001', '野菜たっぷり味噌汁', '15分', '2人分', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "recipe_ingredients" (
  "id",
  "recipe_id",
  "inventory_id",
  "name",
  "quantity_value",
  "quantity_unit",
  "sort_order"
) VALUES
  ('ri-tomato-egg-01', 'recipe-tomato-egg-001', 'inv-tomato-001', 'トマト', 2, '個', 1),
  ('ri-tomato-egg-02', 'recipe-tomato-egg-001', 'inv-egg-001', '卵', 2, '個', 2),
  ('ri-tomato-egg-03', 'recipe-tomato-egg-001', NULL, '砂糖', 1, '小さじ', 3),
  ('ri-tomato-egg-04', 'recipe-tomato-egg-001', NULL, '塩', 1, 'ひとつまみ', 4),
  ('ri-chicken-01', 'recipe-chicken-001', 'inv-chicken-001', '鶏むね肉', 1, '枚', 1),
  ('ri-chicken-02', 'recipe-chicken-001', 'inv-onion-001', '玉ねぎ', 1, '個', 2),
  ('ri-chicken-03', 'recipe-chicken-001', NULL, 'しょうゆ', 2, '大さじ', 3),
  ('ri-chicken-04', 'recipe-chicken-001', NULL, 'みりん', 2, '大さじ', 4),
  ('ri-chicken-05', 'recipe-chicken-001', NULL, 'おろし生姜', 1, '小さじ', 5),
  ('ri-miso-01', 'recipe-miso-soup-001', 'inv-potato-001', 'じゃがいも', 1, '個', 1),
  ('ri-miso-02', 'recipe-miso-soup-001', 'inv-carrot-001', 'にんじん', 1, '1/2本', 2),
  ('ri-miso-03', 'recipe-miso-soup-001', 'inv-onion-001', '玉ねぎ', 1, '1/2個', 3),
  ('ri-miso-04', 'recipe-miso-soup-001', 'inv-miso-001', '味噌', 2, '大さじ', 4),
  ('ri-miso-05', 'recipe-miso-soup-001', NULL, 'だし', 400, 'ml', 5);

INSERT INTO "recipe_steps" (
  "id",
  "recipe_id",
  "step_number",
  "instruction"
) VALUES
  ('rs-tomato-01', 'recipe-tomato-egg-001', 1, 'トマトは一口大に切る。卵を溶いて軽く塩をする。'),
  ('rs-tomato-02', 'recipe-tomato-egg-001', 2, 'フライパンで卵をふんわり炒めて一度取り出す。'),
  ('rs-tomato-03', 'recipe-tomato-egg-001', 3, '同じフライパンでトマトを炒め、砂糖と塩で調味する。'),
  ('rs-tomato-04', 'recipe-tomato-egg-001', 4, '卵を戻してさっと混ぜて完成。'),
  ('rs-chicken-01', 'recipe-chicken-001', 1, '鶏むね肉はそぎ切り、玉ねぎは薄切りにする。'),
  ('rs-chicken-02', 'recipe-chicken-001', 2, '鍋に調味料と玉ねぎを入れて火にかける。'),
  ('rs-chicken-03', 'recipe-chicken-001', 3, '沸いたら鶏むね肉を入れて弱火で10分ほど煮る。'),
  ('rs-chicken-04', 'recipe-chicken-001', 4, '火を止めて味をなじませて完成。'),
  ('rs-miso-01', 'recipe-miso-soup-001', 1, '野菜を食べやすい大きさに切る。'),
  ('rs-miso-02', 'recipe-miso-soup-001', 2, '鍋にだしと野菜を入れ、火が通るまで煮る。'),
  ('rs-miso-03', 'recipe-miso-soup-001', 3, '火を止めて味噌を溶き入れる。'),
  ('rs-miso-04', 'recipe-miso-soup-001', 4, 'ひと煮立ちさせずに温めて完成。');
