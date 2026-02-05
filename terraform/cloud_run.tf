# Cloud Run サービス
resource "google_cloud_run_v2_service" "main" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.container_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # 環境変数
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      # DATABASE_URL（Cloud SQL 接続）
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_user}:${var.db_password}@localhost/${var.db_name}?host=/cloudsql/${var.project_id}:${var.region}:${var.db_instance_name}"
      }
    }

    # Cloud SQL 接続設定
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }
  }

  # 未認証アクセスを許可（公開アプリ用）
  depends_on = [
    google_project_service.apis,
    google_sql_database_instance.main,
    google_service_account.cloud_run,
  ]
}

# 未認証アクセスを許可する IAM ポリシー
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.main.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
