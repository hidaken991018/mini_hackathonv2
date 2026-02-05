# Terraform Infrastructure for mini_hackathonv2

## 概要

Cloud Run + Cloud SQL + Vertex AI のインフラを Terraform で管理します。

## 前提条件

- [Terraform](https://www.terraform.io/downloads) v1.0 以上
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- Google Cloud プロジェクト（課金有効化済み）

## セットアップ

### 1. 認証

```bash
gcloud auth login
gcloud auth application-default login
```

### 2. 変数ファイルの作成

```bash
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を編集してパスワード等を設定。

### 3. 初期化

```bash
terraform init
```

### 4. プラン確認

```bash
terraform plan
```

### 5. 適用

```bash
terraform apply
```

## Docker イメージのビルド・プッシュ

Terraform を適用する前に、Docker イメージを Artifact Registry にプッシュする必要があります：

```bash
# 1. Docker 認証
gcloud auth configure-docker asia-northeast1-docker.pkg.dev

# 2. ビルド & プッシュ
docker build -t asia-northeast1-docker.pkg.dev/syufy-85423/mini-hackathon/app:latest ..
docker push asia-northeast1-docker.pkg.dev/syufy-85423/mini-hackathon/app:latest
```

または Cloud Build を使用：

```bash
cd ..  # mini_hackathonv2 に移動
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/syufy-85423/mini-hackathon/app:latest
```

## 出力値

```bash
terraform output
```

| 出力 | 説明 |
|------|------|
| `cloud_run_url` | アプリの公開URL |
| `cloud_sql_connection_name` | Cloud SQL 接続名 |
| `artifact_registry_url` | Docker レジストリURL |
| `service_account_email` | サービスアカウント |

## マイグレーション

デプロイ後、DB マイグレーションを実行：

```bash
# Cloud SQL Proxy を起動
cloud-sql-proxy PROJECT:asia-northeast1:mini-hackathon-db --port 5432 &

# マイグレーション実行
DATABASE_URL="postgresql://dbuser:PASSWORD@localhost:5432/hackathon" npx prisma migrate deploy
```

## 削除

```bash
terraform destroy
```

> ⚠️ これにより全てのリソース（DB含む）が削除されます。
