# ---- Artifact Registry ----
resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = "syufy"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry]
}

# ---- Service Account for Cloud Run ----
resource "google_service_account" "cloudrun" {
  account_id   = "cloudrun-mini-hackathon"
  display_name = "Cloud Run - mini-hackathon"
}

resource "google_project_iam_member" "cloudrun_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# ---- Cloud Run Service ----
resource "google_cloud_run_v2_service" "app" {
  name     = "mini-hackathon"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}/mini-hackathon:latest"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # Database (via Cloud SQL Unix socket)
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_user}:${var.db_password}@localhost/${var.db_name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
      }

      # Firebase server-side
      env {
        name  = "FIREBASE_CLIENT_EMAIL"
        value = var.firebase_client_email
      }
      env {
        name  = "FIREBASE_PRIVATE_KEY"
        value = var.firebase_private_key
      }

      # Gemini AI
      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }

      # Notify secret
      env {
        name  = "NOTIFY_SECRET"
        value = var.notify_secret
      }

      # GCS bucket for generated images
      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.images.name
      }

      # Base URL for image serving
      env {
        name  = "IMAGE_BASE_URL"
        value = "https://storage.googleapis.com/${google_storage_bucket.images.name}"
      }

      # NEXT_PUBLIC_* (needed at runtime for client hydration)
      env {
        name  = "NEXT_PUBLIC_FIREBASE_API_KEY"
        value = var.firebase_api_key
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
        value = var.firebase_auth_domain
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
        value = var.firebase_project_id
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
        value = var.firebase_storage_bucket
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
        value = var.firebase_messaging_sender_id
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_APP_ID"
        value = var.firebase_app_id
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }

  depends_on = [
    google_project_service.run,
    google_project_service.sqladmin,
  ]
}

# ---- Public access ----
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
