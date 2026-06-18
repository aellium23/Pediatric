variable "region" {
  type        = string
  default     = "eu-west-1"
  description = "AWS region (EU for data residency)"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Deployment environment (dev|staging|prod)"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.medium"
}
