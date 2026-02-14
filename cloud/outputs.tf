output "instance_connection_name" {
  description = "Cloud SQL instance connection name for Auth Proxy"
  value       = google_sql_database_instance.main.connection_name
}

output "database_url" {
  description = "Database URL template for Prisma (via Auth Proxy on port 5433)"
  value       = "postgresql://${var.db_user}:PASSWORD@127.0.0.1:5433/${var.db_name}?schema=public"
  sensitive   = true
}

output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.app.uri
}

output "artifact_registry" {
  description = "Artifact Registry repository path"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}"
}
