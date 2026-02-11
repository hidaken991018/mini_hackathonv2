variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "syufy-485423"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast1"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "mini_hackathon"
}

variable "db_user" {
  description = "Database user name"
  type        = string
  default     = "app_user"
}

variable "db_password" {
  description = "Database user password"
  type        = string
  sensitive   = true
}
