# Cloud Run サービス URL
output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.main.uri
}

# Cloud SQL 接続名
output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.main.connection_name
}

# Artifact Registry リポジトリ URL
output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.repository_id}"
}

# サービスアカウント Email
output "service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run.email
}

# DATABASE_URL (ローカル開発用フォーマット)
output "database_url_local" {
  description = "DATABASE_URL for local development with Cloud SQL Proxy"
  value       = "postgresql://${var.db_user}:PASSWORD@localhost:5432/${var.db_name}"
  sensitive   = true
}
