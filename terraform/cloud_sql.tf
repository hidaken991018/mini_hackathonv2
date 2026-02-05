# Cloud SQL PostgreSQL インスタンス
resource "google_sql_database_instance" "main" {
  name             = var.db_instance_name
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    tier = "db-f1-micro" # 最小インスタンス（開発/デモ用）

    ip_configuration {
      ipv4_enabled = true  # Cloud Run経由の接続を許可
    }

    backup_configuration {
      enabled = false # 開発環境では無効
    }
  }

  deletion_protection = false # 開発環境では削除可能に

  depends_on = [google_project_service.apis]
}

# データベース作成
resource "google_sql_database" "hackathon" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

# データベースユーザー作成
resource "google_sql_user" "dbuser" {
  name     = var.db_user
  instance = google_sql_database_instance.main.name
  password = var.db_password
  project  = var.project_id
}
