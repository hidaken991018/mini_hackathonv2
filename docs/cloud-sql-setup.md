# GCP Cloud SQL 環境構築手順

ローカル Docker 環境ではなく、GCP Cloud SQL (PostgreSQL) を使用する場合の手順です。

> ローカル Docker での開発環境構築は [database-setup.md](./database-setup.md) を参照してください。

## 前提条件

| ツール | バージョン | 確認コマンド |
|---|---|---|
| Node.js | 18 以上 | `node -v` |
| npm | 9 以上 | `npm -v` |
| gcloud CLI | 最新版 | `gcloud --version` |
| Terraform | 1.5 以上 | `terraform --version` |

> gcloud CLI がインストールされていない場合は [公式サイト](https://cloud.google.com/sdk/docs/install) からインストールしてください。

## 構成

- **DBMS:** PostgreSQL 16 (Cloud SQL)
- **ORM:** Prisma 5.x
- **インフラ管理:** Terraform (state は GCS バケットに保存)
- **接続方式:** Cloud SQL Auth Proxy 経由 (`localhost:5433`)
- **GCP プロジェクト:** `syufy-485423`
- **リージョン:** `asia-northeast1` (東京)

### 接続情報

| 項目 | 値 |
|---|---|
| ホスト | `127.0.0.1` (Auth Proxy 経由) |
| ポート | `5433` |
| ユーザー名 | `app_user` |
| パスワード | `terraform.tfvars` で設定した値 |
| データベース名 | `mini_hackathon` |

> ポートは `5433` を使用し、ローカル Docker の `5432` と共存可能です。

---

## セットアップ手順

### 1. gcloud CLI の認証

```bash
# ログイン
gcloud auth login

# プロジェクト設定
gcloud config set project syufy-485423

# Terraform 用の Application Default Credentials を取得
gcloud auth application-default login
```

### 2. GCP API の有効化

```bash
gcloud services enable sqladmin.googleapis.com compute.googleapis.com storage.googleapis.com --project=syufy-485423
```

### 3. Terraform state 用 GCS バケットの作成（初回のみ）

```bash
gcloud storage buckets create gs://syufy-terraform-state \
  --project=syufy-485423 \
  --location=asia-northeast1 \
  --uniform-bucket-level-access
```

### 4. Terraform 変数ファイルの作成

```bash
cd cloud
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を開き、`db_password` に安全なパスワードを設定してください。

```hcl
db_password = "your-secure-password-here"
```

> **注意:** `terraform.tfvars` は `.gitignore` に含まれており、Git にコミットされません。

### 5. Terraform の実行

```bash
cd cloud

# 初期化（プロバイダーのダウンロード・バックエンド設定）
terraform init

# 実行計画の確認
terraform plan

# インフラ構築の実行（5〜10分かかります）
terraform apply
```

`apply` 実行後、確認プロンプトで `yes` を入力してください。

### 6. 接続情報の確認

```bash
terraform output instance_connection_name
```

以下のような値が出力されます：

```
"syufy-485423:asia-northeast1:mini-hackathon-db"
```

### 7. Cloud SQL Auth Proxy のインストール

```bash
gcloud components install cloud-sql-proxy
```

> gcloud components でインストールできない場合は、直接ダウンロードも可能です：
> ```bash
> # Windows (PowerShell)
> gcloud storage cp gs://cloud-sql-connectors/cloud-sql-proxy/v2.15.2/cloud-sql-proxy.x64.exe cloud-sql-proxy.exe
> ```

### 8. Cloud SQL Auth Proxy の起動

**別のターミナルで**以下を実行してください（常駐プロセスとして動作します）。

```bash
cloud-sql-proxy syufy-485423:asia-northeast1:mini-hackathon-db --port=5433
```

以下のようなログが表示されれば接続成功です：

```
Authorizing with Application Default Credentials
Listening on 127.0.0.1:5433
```

### 9. 環境変数の設定

`.env.local` の `DATABASE_URL` を Cloud SQL 用に変更してください。

```bash
DATABASE_URL="postgresql://app_user:YOUR_PASSWORD@127.0.0.1:5433/mini_hackathon?schema=public"
```

> `YOUR_PASSWORD` は手順 4 で設定した `db_password` の値に置き換えてください。

### 10. マイグレーションの適用

```bash
npx prisma migrate deploy
```

> **注意:** Cloud SQL 環境では `migrate deploy`（本番用）を使用します。`migrate dev`（開発用）はローカル Docker 環境で使用してください。

### 11. 動作確認

```bash
# Prisma Studio でテーブルを確認
npx prisma studio

# または CLI で確認
npx prisma db execute --stdin <<< "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

アプリケーションの起動：

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスし、正常に動作することを確認してください。

---

## 日常の開発フロー

Cloud SQL に接続して開発する場合、以下の手順で作業を開始します。

```bash
# 1. Auth Proxy を起動（別ターミナル）
cloud-sql-proxy syufy-485423:asia-northeast1:mini-hackathon-db --port=5433

# 2. .env.local の DATABASE_URL が Cloud SQL 向けになっていることを確認

# 3. 開発サーバー起動
npm run dev
```

### ローカル Docker と Cloud SQL の切り替え

`.env.local` の `DATABASE_URL` を書き換えるだけで切り替え可能です。

| 環境 | DATABASE_URL |
|---|---|
| ローカル Docker | `postgresql://postgres:postgres@localhost:5432/mini_hackathon?schema=public` |
| Cloud SQL | `postgresql://app_user:PASSWORD@127.0.0.1:5433/mini_hackathon?schema=public` |

---

## Terraform ファイル構成

```
cloud/
├── main.tf                    # プロバイダー設定・GCS バックエンド
├── variables.tf               # 変数定義
├── cloudsql.tf                # Cloud SQL リソース定義
├── outputs.tf                 # 出力値定義
├── terraform.tfvars.example   # 変数テンプレート（コミット対象）
├── terraform.tfvars           # 実際の変数値（.gitignore 対象）
└── .terraform.lock.hcl        # プロバイダーのロックファイル（コミット対象）
```

---

## よく使うコマンド

### Terraform

| コマンド | 説明 |
|---|---|
| `terraform init` | 初期化（初回・プロバイダー更新時） |
| `terraform plan` | 実行計画の確認 |
| `terraform apply` | インフラ変更の適用 |
| `terraform output` | 出力値の表示 |
| `terraform destroy` | インフラの削除（要確認） |

### gcloud

| コマンド | 説明 |
|---|---|
| `gcloud sql instances describe mini-hackathon-db` | インスタンスの詳細確認 |
| `gcloud sql instances list` | インスタンス一覧 |
| `gcloud auth application-default login` | ADC の再取得 |

---

## トラブルシューティング

### `terraform init` で GCS バックエンドに接続できない

**原因:** Application Default Credentials が未設定、または IPv6 接続の問題。

**対処:**

```bash
# ADC を再取得
gcloud auth application-default login

# IPv6 接続の問題がある場合（PowerShell）
$env:GODEBUG="netdns=go"
terraform init
```

### Auth Proxy で接続できない (`connection refused`)

**原因:** Auth Proxy が起動していない、または接続名が間違っている。

**対処:**

```bash
# 接続名を確認
cd cloud && terraform output instance_connection_name

# Auth Proxy を起動
cloud-sql-proxy syufy-485423:asia-northeast1:mini-hackathon-db --port=5433
```

### `Error: P1000: Authentication failed`

**原因:** `DATABASE_URL` のユーザー名またはパスワードが間違っている。

**対処:** `.env.local` の `DATABASE_URL` が `app_user` と正しいパスワードを使用しているか確認してください。

### `Error: P1001: Can't reach database server`

**原因:** Auth Proxy が起動していない、またはポート番号が間違っている。

**対処:**

1. Auth Proxy が別ターミナルで起動しているか確認
2. `DATABASE_URL` のポートが `5433` であることを確認

### Cloud SQL インスタンスを削除したい

Terraform で `deletion_protection = true` を設定しているため、まず設定を変更する必要があります。

```bash
# 1. cloudsql.tf の deletion_protection を false に変更
# 2. 適用
terraform apply

# 3. 削除
terraform destroy
```
