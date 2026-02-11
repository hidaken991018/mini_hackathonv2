# データベース環境構築手順

## 前提条件

| ツール | バージョン | 確認コマンド |
|---|---|---|
| Docker Desktop | 最新版 | `docker --version` |
| Node.js | 18 以上 | `node -v` |
| npm | 9 以上 | `npm -v` |

> Docker Desktop がインストールされていない場合は [公式サイト](https://www.docker.com/products/docker-desktop/) からインストールしてください。

## 構成

- **DBMS:** PostgreSQL 16
- **ORM:** Prisma 5.x
- **コンテナ管理:** Docker Compose
- **接続先:** `localhost:5432`

### デフォルト接続情報

| 項目 | 値 |
|---|---|
| ホスト | `localhost` |
| ポート | `5432` |
| ユーザー名 | `postgres` |
| パスワード | `postgres` |
| データベース名 | `mini_hackathon` |

---

## セットアップ手順

### 1. Docker Desktop を起動

Docker Desktop アプリケーションを起動し、画面左下のステータスが **"Engine running"** になっていることを確認してください。

### 2. ポート 5432 の競合確認

ホストマシンに PostgreSQL がインストールされている場合、ポート 5432 が競合します。

**確認方法:**

```bash
# Windows
netstat -ano | findstr "5432"

# macOS / Linux
lsof -i :5432
```

出力がある場合は、ホスト側の PostgreSQL サービスを停止してください。

```bash
# Windows (管理者権限で実行)
# 1. Win + R → services.msc でサービス管理画面を開く
# 2. 「postgresql-x64-XX」を右クリック → 停止

# macOS (Homebrew)
brew services stop postgresql@16

# Linux (systemd)
sudo systemctl stop postgresql
```

### 3. 環境変数の設定

プロジェクトルートの `.env`（または `.env.local`）に以下を追加してください。

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_hackathon?schema=public"
```

> `.env.example` にテンプレートがあるので、コピーして編集しても構いません。
> ```bash
> cp .env.example .env
> ```

### 4. PostgreSQL コンテナの起動

```bash
docker compose up -d
```

起動確認：

```bash
docker compose ps
```

以下のように `STATUS` が `Up` になっていれば OK です。

```
NAME                IMAGE         STATUS         PORTS
mini_hackathon_db   postgres:16   Up             0.0.0.0:5432->5432/tcp
```

### 5. マイグレーションの実行

```bash
npx prisma migrate dev
```

初回実行時はマイグレーション名を聞かれるので、任意の名前（例: `init`）を入力してください。

> このコマンドは以下を自動的に行います：
> - マイグレーション SQL の生成・適用
> - Prisma Client の再生成

### 6. シードデータの投入（任意）

開発用のテストデータを投入する場合は以下を実行してください。

```bash
npm run db:seed
```

### 7. 動作確認

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスし、アプリケーションが正常に動作することを確認してください。

---

## よく使うコマンド

### Docker Compose

| コマンド | 説明 |
|---|---|
| `docker compose up -d` | コンテナをバックグラウンドで起動 |
| `docker compose down` | コンテナを停止（データは保持） |
| `docker compose down -v` | コンテナを停止しボリュームも削除（データ全消去） |
| `docker compose ps` | コンテナの状態確認 |
| `docker compose logs db` | PostgreSQL のログ表示 |

### Prisma

| コマンド | 説明 |
|---|---|
| `npx prisma migrate dev` | マイグレーション作成・適用 |
| `npx prisma migrate dev --name <名前>` | 名前を指定してマイグレーション作成 |
| `npx prisma generate` | Prisma Client 再生成 |
| `npx prisma studio` | DB 管理 GUI（ブラウザで開く） |
| `npx prisma migrate reset` | DB をリセット（全テーブル削除 → 再マイグレーション → シード実行） |
| `npx prisma db push` | スキーマを直接 DB に反映（マイグレーションファイルなし） |

### DB への直接接続

```bash
# コンテナ内の psql に接続
docker exec -it mini_hackathon_db psql -U postgres -d mini_hackathon

# テーブル一覧
\dt

# 終了
\q
```

---

## トラブルシューティング

### `Error: P1000: Authentication failed`

**原因:** ホスト側の PostgreSQL とポートが競合している。

**対処:** 「2. ポート 5432 の競合確認」の手順でホスト側の PostgreSQL を停止してください。

### `Error: P1001: Can't reach database server`

**原因:** PostgreSQL コンテナが起動していない。

**対処:**
```bash
docker compose up -d
docker compose ps  # STATUS が Up であることを確認
```

### `Error: P1003: Database does not exist`

**原因:** データベースが作成されていない。

**対処:** コンテナを再作成してください。
```bash
docker compose down -v
docker compose up -d
npx prisma migrate dev
```

### マイグレーションの不整合

スキーマ変更後にマイグレーションが適用できない場合：

```bash
# DB を完全リセット（開発環境のみ）
npx prisma migrate reset
```

> **注意:** `migrate reset` はデータベースの全データを削除します。

---

## スキーマ変更時のワークフロー

1. `prisma/schema.prisma` を編集
2. マイグレーション作成・適用：
   ```bash
   npx prisma migrate dev --name <変更内容を表す名前>
   ```
3. 生成されたマイグレーションファイル（`prisma/migrations/`）を Git にコミット

---

## ER 図

スキーマの詳細は `prisma/schema.prisma` を参照してください。

```
users
├── inventories (1:N)
│   ├── notifications (1:N)
│   └── recipe_ingredients (1:N)
├── notifications (1:N)
└── recipes (1:N)
    ├── notifications (1:N)
    ├── recipe_ingredients (1:N)
    └── recipe_steps (1:N)
```

主要テーブル：
- **users** — ユーザー情報（Firebase Auth 連携）
- **inventories** — 食材在庫
- **notifications** — 通知（レシピ提案・賞味期限アラート）
- **recipes** — レシピ
- **recipe_ingredients** — レシピの材料（在庫と紐付け可能）
- **recipe_steps** — レシピの手順
