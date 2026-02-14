# Security修正（#54 / #35 / #36）手動テスト手順書

作成日: 2026-02-13  
対象イシュー: #54, #35, #36  
対象ブランチ: `fix/security-54-35-36`

## 前提条件

- [ ] 開発サーバーが起動していること（`npm run dev`）
- [ ] ブラウザで `http://localhost:3000` を開けること
- [ ] テスト用ユーザーA/Bの2アカウントでログインできること
- [ ] PowerShellでAPIを実行できること

## 事前準備（トークン取得）

1. ユーザーAでログインし、DevToolsのNetworkで任意APIを1回実行する
2. `Authorization: Bearer <token>` を取得する
3. 同様にユーザーBのトークンも取得する
4. PowerShellで次を設定する

```powershell
$BASE = "http://localhost:3000"
$TOKEN_A = "user-a-token"
$TOKEN_B = "user-b-token"

$HEAD_A = @{ Authorization = "Bearer $TOKEN_A"; "Content-Type" = "application/json" }
$HEAD_B = @{ Authorization = "Bearer $TOKEN_B"; "Content-Type" = "application/json" }
```

---

## テストケース

### TC-54-01: 自分のレシピはcook実行できる

**目的:** 自分のレシピで `POST /api/recipes/{recipeId}/cook` が成功することを確認

**手順:**
1. ユーザーAでレシピIDを1件取得する
2. ユーザーAトークンで `cook` を実行する

```powershell
$recipeRes = Invoke-RestMethod -Uri "$BASE/api/recipes?limit=1" -Headers $HEAD_A -Method GET
$RECIPE_ID_A = $recipeRes.data.recipes[0].id

$res = Invoke-WebRequest -Uri "$BASE/api/recipes/$RECIPE_ID_A/cook" -Method POST -Headers $HEAD_A -Body '{}' -ContentType "application/json" -SkipHttpErrorCheck
$res.StatusCode
$res.Content
```

**期待結果:**
- ステータスコード `200`
- `success: true`

---

### TC-54-02: 他人のレシピはcook実行できない

**目的:** オーナーシップチェックで不正実行が拒否されることを確認

**手順:**
1. TC-54-01で取得した `RECIPE_ID_A` を使う
2. ユーザーBトークンで `cook` を実行する

```powershell
$res = Invoke-WebRequest -Uri "$BASE/api/recipes/$RECIPE_ID_A/cook" -Method POST -Headers $HEAD_B -Body '{}' -ContentType "application/json" -SkipHttpErrorCheck
$res.StatusCode
$res.Content
```

**期待結果:**
- ステータスコード `403`
- 権限エラーメッセージが返る

---

### TC-36-01: 在庫更新APIの不正型入力を拒否する

**目的:** `PUT /api/inventories/{id}` が型不正を `400` で返すことを確認

**手順:**
1. ユーザーAの在庫IDを1件取得する
2. `quantityValue` に文字列を送る

```powershell
$invRes = Invoke-RestMethod -Uri "$BASE/api/inventories" -Headers $HEAD_A -Method GET
$INV_ID = $invRes.data[0].id

$res = Invoke-WebRequest -Uri "$BASE/api/inventories/$INV_ID" -Method PUT -Headers $HEAD_A -Body '{"quantityValue":"not-a-number"}' -ContentType "application/json" -SkipHttpErrorCheck
$res.StatusCode
$res.Content
```

**期待結果:**
- ステータスコード `400`
- `details` に `quantityValue` 関連の検証エラー

---

### TC-36-02: 在庫一括登録APIの不正要素を拒否する

**目的:** `POST /api/inventories/bulk` が不正型要素を `400` で返すことを確認

**手順:**
```powershell
$res = Invoke-WebRequest -Uri "$BASE/api/inventories/bulk" -Method POST -Headers $HEAD_A -Body '{"items":[{"name":"卵","quantityValue":"x"}]}' -ContentType "application/json" -SkipHttpErrorCheck
$res.StatusCode
$res.Content
```

**期待結果:**
- ステータスコード `400`
- `details` が返る

---

### TC-36-03: レシート解析APIの10MB超payloadを拒否する

**目的:** `POST /api/analyze-receipt` がサイズ超過を `400` で返すことを確認

**手順:**
```powershell
$oversized = "data:image/jpeg;base64," + ("A" * 13981016)
$body = @{ imageData = $oversized } | ConvertTo-Json -Compress

$res = Invoke-WebRequest -Uri "$BASE/api/analyze-receipt" -Method POST -Headers $HEAD_A -Body $body -ContentType "application/json" -SkipHttpErrorCheck
$res.StatusCode
$res.Content
```

**期待結果:**
- ステータスコード `400`
- `details` にサイズ超過エラー

---

### TC-35-01: Gemini系APIが10req/minを超えると429になる

**目的:** `/api/analyze-receipt` のレート制限を確認

**手順:**
1. 60秒待機してカウンターをリセット
2. 同一トークン/同一路線で連続送信

```powershell
$body = '{"imageData":"not-base64"}'
1..12 | ForEach-Object {
  $r = Invoke-WebRequest -Uri "$BASE/api/analyze-receipt" -Method POST -Headers $HEAD_A -Body $body -ContentType "application/json" -SkipHttpErrorCheck
  Write-Host "$_ : $($r.StatusCode)"
}
```

**期待結果:**
- 10回までは `400`（payload不正のため）
- 11回目以降で `429`

---

### TC-35-02: 429レスポンスにretryAfterが含まれる

**目的:** レート制限超過時の再試行情報を確認

**手順:**
```powershell
$body = '{"imageData":"not-base64"}'
$r = Invoke-WebRequest -Uri "$BASE/api/analyze-receipt" -Method POST -Headers $HEAD_A -Body $body -ContentType "application/json" -SkipHttpErrorCheck
$r.StatusCode
$r.Content
$r.Headers["Retry-After"]
```

**期待結果:**
- ステータスコード `429`
- Bodyに `retryAfter`
- Headerに `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## API確認一覧

| エンドポイント | メソッド | 期待ステータス | 確認項目 |
| --- | --- | --- | --- |
| `/api/recipes/{recipeId}/cook` | POST | 200/403 | レシピオーナーシップ |
| `/api/inventories/{id}` | PUT | 400 | バリデーション詳細 |
| `/api/inventories/bulk` | POST | 400 | バリデーション詳細 |
| `/api/analyze-receipt` | POST | 400/429 | サイズ検証とレート制限 |

## テスト結果記録

| TC | 結果 (PASS/FAIL) | 確認者 | 日時 | 備考 |
| --- | --- | --- | --- | --- |
| TC-54-01 | PASS | Antigravity | 2026-02-13 | 自分のレシピを調理可能 |
| TC-54-02 | PASS | Antigravity | 2026-02-13 | 他人のレシピで403エラー |
| TC-36-01 | PASS | Antigravity | 2026-02-13 | 不正な型入力を400で拒否 |
| TC-36-02 | PASS | Antigravity | 2026-02-13 | bulk登録時の不正要素を400で拒否 |
| TC-36-03 | PASS | Antigravity | 2026-02-13 | 10MB超のペイロードを400で拒否 |
| TC-35-01 | - | - | - | ユーザー指示により除外 |
| TC-35-02 | - | - | - | ユーザー指示により除外 |

