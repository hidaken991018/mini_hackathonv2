#!/bin/bash
# Cloud Run + Cloud SQL デプロイスクリプト
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

# 設定
PROJECT_ID="syufy-85423"
REGION="asia-northeast1"
SERVICE_NAME="mini-hackathon"
DB_INSTANCE_NAME="mini-hackathon-db"
DB_NAME="hackathon"
DB_USER="dbuser"

# 色付き出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Cloud Run デプロイスクリプト ===${NC}"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Step 1: プロジェクト設定
echo -e "${YELLOW}[1/6] プロジェクトを設定中...${NC}"
gcloud config set project $PROJECT_ID

# Step 2: 必要なAPIを有効化
echo -e "${YELLOW}[2/6] APIを有効化中...${NC}"
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com

# Step 3: Cloud SQLインスタンス作成（存在しない場合のみ）
echo -e "${YELLOW}[3/6] Cloud SQLインスタンスを確認中...${NC}"
if ! gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
  echo "Cloud SQLインスタンスを作成中..."
  gcloud sql instances create $DB_INSTANCE_NAME \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password=$(openssl rand -base64 12)

  # データベース作成
  gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME

  # ユーザー作成（パスワードを生成）
  DB_PASSWORD=$(openssl rand -base64 16)
  gcloud sql users create $DB_USER \
    --instance=$DB_INSTANCE_NAME \
    --password=$DB_PASSWORD
  
  echo -e "${GREEN}Cloud SQLインスタンスを作成しました${NC}"
  echo "DB Password: $DB_PASSWORD (これを安全に保存してください)"
else
  echo "Cloud SQLインスタンスは既に存在します"
fi

# Step 4: Cloud Runにデプロイ
echo -e "${YELLOW}[4/6] Cloud Runにデプロイ中...${NC}"
echo "GEMINI_API_KEYを入力してください:"
read -s GEMINI_API_KEY

# 接続文字列を構築
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"
DATABASE_URL="postgresql://${DB_USER}:PASSWORD@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

echo -e "${YELLOW}NOTE: DATABASE_URLのPASSWORD部分を実際のパスワードに置き換えてください${NC}"

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances $CONNECTION_NAME \
  --set-env-vars "DATABASE_URL=$DATABASE_URL,GEMINI_API_KEY=$GEMINI_API_KEY,NODE_ENV=production"

# Step 5: マイグレーション実行（Cloud Run Jobs または手動）
echo -e "${YELLOW}[5/6] マイグレーション手順${NC}"
echo ""
echo "Cloud SQLへの初回マイグレーションは以下のコマンドで実行してください:"
echo ""
echo "  # Cloud SQL Auth Proxyを使用してローカルから接続"
echo "  cloud-sql-proxy ${CONNECTION_NAME} --port 5432 &"
echo "  DATABASE_URL=\"postgresql://${DB_USER}:PASSWORD@localhost:5432/${DB_NAME}\" npx prisma migrate deploy"
echo "  DATABASE_URL=\"postgresql://${DB_USER}:PASSWORD@localhost:5432/${DB_NAME}\" npm run db:seed"
echo ""

# Step 6: 完了
echo -e "${GREEN}[6/6] デプロイ完了！${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo ""
echo -e "${GREEN}サービスURL: ${SERVICE_URL}${NC}"
echo ""
