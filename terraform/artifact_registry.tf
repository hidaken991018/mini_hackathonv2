# Artifact Registry リポジトリ（Docker イメージ保存用）
resource "google_artifact_registry_repository" "main" {
  location      = var.region
  repository_id = var.service_name
  description   = "Docker repository for ${var.service_name}"
  format        = "DOCKER"
  project       = var.project_id

  depends_on = [google_project_service.apis]
}
