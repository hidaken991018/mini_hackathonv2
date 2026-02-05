variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud region"
  type        = string
  default     = "asia-northeast1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "mini-hackathon"
}

variable "db_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "mini-hackathon-db"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "hackathon"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "dbuser"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "container_image" {
  description = "Container image URL (e.g., asia-northeast1-docker.pkg.dev/PROJECT/REPO/IMAGE:TAG)"
  type        = string
}
