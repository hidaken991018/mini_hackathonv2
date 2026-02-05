terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # 必要に応じてバックエンドを設定（例: GCS）
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "mini-hackathon"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 必要な Google Cloud API を有効化
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com", # Vertex AI
    "cloudbuild.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}
