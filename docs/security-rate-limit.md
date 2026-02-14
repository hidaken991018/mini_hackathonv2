# APIレート制限仕様

作成日: 2026-02-13  
対象ブランチ: `fix/security-54-35-36`  
関連イシュー: #35

## 目的

- Gemini APIのコスト急増を防ぐ
- APIへの短時間大量アクセス（DoS的アクセス）を抑制する
- 超過時にクライアントへ明確な再試行情報（`retryAfter`）を返す

## 適用範囲

- `middleware.ts` の `matcher: ["/api/:path*"]`
- すべてのAPIルートに適用

## レート制限ルール

| 対象 | パス | 上限 | ウィンドウ |
| --- | --- | --- | --- |
| Gemini系API | `/api/analyze-receipt`, `/api/recipe/notify` | 10リクエスト | 60秒 |
| その他API | `/api/:path*`（上記2つを除く） | 120リクエスト | 60秒 |

### 超過時の挙動

- 同一ウィンドウ内で上限を超えたリクエストは `429 Too Many Requests`
- レスポンス:
  - Body:
    - `success: false`
    - `error: "リクエスト数が上限を超えました。しばらく待ってから再試行してください。"`
    - `retryAfter: <秒>`
  - Header:
    - `Retry-After`
    - `X-RateLimit-Limit`
    - `X-RateLimit-Remaining`

## カウントキー（誰の何回を数えるか）

制限キーは次で構成する:

- スコープ（`gemini` / `api`）
- リクエストパス（例: `/api/analyze-receipt`）
- ユーザー識別子
  - `Authorization: Bearer ...` がある場合:
    - Bearerトークン先頭16文字 + IP
  - ない場合:
    - IPのみ

実装上の識別情報:

- IP取得優先順:
  1. `x-forwarded-for` の先頭IP
  2. `x-real-ip`
  3. `unknown`

## 実装方式

- `lib/rate-limit.ts` に in-memory の固定ウィンドウ方式を実装
- 各キーごとに以下を保持:
  - `count`
  - `resetAt`

### 注意点（運用上の制約）

- サーバープロセス再起動でカウンターはリセットされる
- 複数インスタンス間でカウントは共有されない
- 本番で分散構成にする場合は Redis など共有ストア方式へ移行が必要

## 参照ファイル

- `middleware.ts`
- `lib/rate-limit.ts`
- `__tests__/lib/rate-limit.test.ts`

