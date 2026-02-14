#!/usr/bin/env bash
set -euo pipefail

# ==================================================
# deploy.sh — Build, push, and deploy to Cloud Run
# ==================================================

PROJECT_ID="${GCP_PROJECT_ID:-syufy-485423}"
REGION="${GCP_REGION:-asia-northeast1}"
SERVICE_NAME="mini-hackathon"
REPO_NAME="syufy"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"

# ---- Helper: read a value from .env ----
read_env() {
  local key="$1"
  local val
  val=$(grep "^${key}=" .env | sed 's/\r$//' | head -1 | cut -d'=' -f2-)
  # Strip surrounding quotes
  val="${val%\"}"
  val="${val#\"}"
  echo "$val"
}

# ---- Load NEXT_PUBLIC_* from .env ----
if [ -f .env ]; then
  echo "Loading .env ..."
  set -a
  # shellcheck disable=SC1091
  source <(grep '^NEXT_PUBLIC_' .env | sed 's/\r$//')
  set +a
fi

# Verify required NEXT_PUBLIC_ vars
for var in NEXT_PUBLIC_FIREBASE_API_KEY \
           NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
           NEXT_PUBLIC_FIREBASE_PROJECT_ID \
           NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
           NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
           NEXT_PUBLIC_FIREBASE_APP_ID; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: ${var} is not set. Check .env file." >&2
    exit 1
  fi
done

# ---- Load server-side vars from .env ----
FIREBASE_CLIENT_EMAIL="${FIREBASE_CLIENT_EMAIL:-$(read_env FIREBASE_CLIENT_EMAIL)}"
FIREBASE_PRIVATE_KEY="${FIREBASE_PRIVATE_KEY:-$(read_env FIREBASE_PRIVATE_KEY)}"
GEMINI_API_KEY="${GEMINI_API_KEY:-$(read_env GEMINI_API_KEY)}"
NOTIFY_SECRET="${NOTIFY_SECRET:-$(read_env NOTIFY_SECRET)}"
DB_USER="${DB_USER:-$(read_env DB_USER)}"
DB_PASSWORD="${DB_PASSWORD:-$(read_env DB_PASSWORD)}"
DB_NAME="${DB_NAME:-$(read_env DB_NAME)}"

# Defaults
DB_USER="${DB_USER:-app_user}"
DB_NAME="${DB_NAME:-mini_hackathon}"

# Verify required server-side vars
for var in FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY GEMINI_API_KEY DB_PASSWORD; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: ${var} is not set. Check .env file." >&2
    exit 1
  fi
done

# ---- 1. Docker build ----
echo ""
echo "=== Building Docker image ==="
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY}" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID}" \
  -t "${IMAGE}:latest" \
  .

# ---- 2. Authenticate & push ----
echo ""
echo "=== Pushing to Artifact Registry ==="
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
docker push "${IMAGE}:latest"

# ---- 3. Build Cloud SQL DATABASE_URL ----
INSTANCE_CONN="${PROJECT_ID}:${REGION}:mini-hackathon-db"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${INSTANCE_CONN}"

# ---- 4. Deploy to Cloud Run ----
echo ""
echo "=== Deploying to Cloud Run ==="
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}:latest" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --add-cloudsql-instances "${INSTANCE_CONN}" \
  --service-account "cloudrun-mini-hackathon@${PROJECT_ID}.iam.gserviceaccount.com" \
  --set-env-vars "NODE_ENV=production,\
DATABASE_URL=${DATABASE_URL},\
FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL},\
GEMINI_API_KEY=${GEMINI_API_KEY},\
NOTIFY_SECRET=${NOTIFY_SECRET:-},\
NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY},\
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN},\
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID},\
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET},\
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID},\
NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}" \
  --set-env-vars "^##^FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}"

echo ""
echo "=== Deploy complete ==="
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format='value(status.url)'
