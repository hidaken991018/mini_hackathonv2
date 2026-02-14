resource "google_sql_database_instance" "main" {
  name             = "mini-hackathon-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier      = "db-f1-micro"
    edition   = "ENTERPRISE"
    disk_size = 10
    disk_type = "PD_SSD"

    ip_configuration {
      ipv4_enabled = true
    }

    backup_configuration {
      enabled = false
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "app" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = var.db_user
  instance = google_sql_database_instance.main.name
  password = var.db_password
}
