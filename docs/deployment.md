# デプロイ手順書

Cloud Run へのデプロイ手順。

## 前提条件

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) インストール済み
- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5
- [Docker](https://docs.docker.com/get-docker/) インストール済み
- GCP プロジェクトのオーナー権限

```bash
gcloud auth login
gcloud config set project syufy-485423
```

## 1. 初回セットアップ（Terraform）

### 1-1. 変数ファイルの作成

```bash
cd cloud
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を編集して全変数を設定する。値は `.env` や Firebase コンソールから取得。

### 1-2. Terraform 実行

```bash
cd cloud
terraform init
terraform plan     # リソースを確認
terraform apply    # インフラ作成
```

作成されるリソース:
- Cloud SQL (PostgreSQL 16)
- Artifact Registry リポジトリ
- Cloud Run サービス
- Cloud Run 用サービスアカウント（Cloud SQL クライアント権限付き）
- 必要な GCP API の有効化

### 1-3. 出力の確認

```bash
terraform output cloud_run_url          # Cloud Run URL
terraform output artifact_registry      # Artifact Registry パス
terraform output instance_connection_name  # Cloud SQL 接続名
```

## 2. DB マイグレーション

Cloud SQL Auth Proxy 経由でマイグレーションを実行する。

```bash
# Auth Proxy 起動（別ターミナル）
cloud-sql-proxy $(terraform -chdir=cloud output -raw instance_connection_name) --port 5433

# マイグレーション実行
DATABASE_URL="postgresql://app_user:PASSWORD@127.0.0.1:5433/mini_hackathon?schema=public" \
  npx prisma migrate deploy
```

## 3. デプロイ

### deploy.sh を使用

```bash
# .env に NEXT_PUBLIC_* 変数が設定されていること
./deploy.sh
```

スクリプトが行うこと:
1. `.env` から `NEXT_PUBLIC_*` を読み込み
2. `docker build` (linux/amd64)
3. Artifact Registry へ `docker push`
4. `gcloud run deploy` で Cloud Run にデプロイ

### 手動デプロイ

```bash
# ビルド
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="..." \
  -t asia-northeast1-docker.pkg.dev/syufy-485423/mini-hackathon/mini-hackathon:latest .

# プッシュ
gcloud auth configure-docker asia-northeast1-docker.pkg.dev --quiet
docker push asia-northeast1-docker.pkg.dev/syufy-485423/mini-hackathon/mini-hackathon:latest

# デプロイ
gcloud run deploy mini-hackathon \
  --image asia-northeast1-docker.pkg.dev/syufy-485423/mini-hackathon/mini-hackathon:latest \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated
```

## 4. Firebase 設定

Cloud Run の URL を Firebase コンソールで承認済みドメインに追加する:

1. [Firebase コンソール](https://console.firebase.google.com/) → Authentication → Settings
2. 「承認済みドメイン」に Cloud Run URL のドメインを追加
   - 例: `mini-hackathon-xxxxx-an.a.run.app`

## トラブルシューティング

### Cloud Run ログの確認

```bash
gcloud run services logs read mini-hackathon --region asia-northeast1 --limit 50
```

### DB 接続エラー

- Cloud Run サービスアカウントに `roles/cloudsql.client` が付与されているか確認
- `DATABASE_URL` の Unix ソケットパスが正しいか確認
- Cloud SQL インスタンスが起動しているか確認

### ビルドエラー

- `NEXT_PUBLIC_*` の build-arg が全て渡されているか確認
- `.env` ファイルに必要な変数が設定されているか確認

### Prisma エラー

- マイグレーションが Cloud SQL に適用されているか確認
- `prisma generate` がビルド時に実行されているか確認（Dockerfile で実施済み）
