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

# ---- Firebase (server-side) ----
variable "firebase_client_email" {
  description = "Firebase Admin SDK client email"
  type        = string
}

variable "firebase_private_key" {
  description = "Firebase Admin SDK private key"
  type        = string
  sensitive   = true
}

# ---- Firebase (client-side / NEXT_PUBLIC_*) ----
variable "firebase_api_key" {
  description = "Firebase API key"
  type        = string
}

variable "firebase_auth_domain" {
  description = "Firebase auth domain"
  type        = string
}

variable "firebase_project_id" {
  description = "Firebase project ID"
  type        = string
}

variable "firebase_storage_bucket" {
  description = "Firebase storage bucket"
  type        = string
}

variable "firebase_messaging_sender_id" {
  description = "Firebase messaging sender ID"
  type        = string
}

variable "firebase_app_id" {
  description = "Firebase app ID"
  type        = string
}

# ---- AI / Misc ----
variable "gemini_api_key" {
  description = "Google Gemini API key"
  type        = string
  sensitive   = true
}

variable "notify_secret" {
  description = "Secret for expiry notification API"
  type        = string
  default     = ""
  sensitive   = true
}
