output "instance_connection_name" {
  description = "Cloud SQL instance connection name for Auth Proxy"
  value       = google_sql_database_instance.main.connection_name
}

output "database_url" {
  description = "Database URL template for Prisma (via Auth Proxy on port 5433)"
  value       = "postgresql://${var.db_user}:PASSWORD@127.0.0.1:5433/${var.db_name}?schema=public"
  sensitive   = true
}
