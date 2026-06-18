# Pédia — AWS infrastructure (skeleton). EU region for GDPR/EHDS residency.
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
  # backend "s3" { ... }  # configure remote state per environment
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = "pedia"
      Environment = var.environment
      ManagedBy   = "terraform"
      DataClass   = "clinical-sensitive"
    }
  }
}

# ── Networking (private subnets for app + data) ──
module "vpc" {
  source      = "./modules/vpc"
  environment = var.environment
  cidr        = var.vpc_cidr
}

# ── KMS (envelope encryption for fields + S3 SSE) ──
resource "aws_kms_key" "files" {
  description             = "pedia-${var.environment}-clinical-files"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_kms_alias" "files" {
  name          = "alias/pedia-${var.environment}-files"
  target_key_id = aws_kms_key.files.key_id
}

# ── S3 (private, encrypted, versioned, object-lock-ready) ──
module "s3_files" {
  source      = "./modules/s3"
  bucket_name = "pedia-${var.environment}-clinical-files"
  kms_key_arn = aws_kms_key.files.arn
}

# ── RDS PostgreSQL (Multi-AZ, encrypted, private) ──
module "rds" {
  source             = "./modules/rds"
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  kms_key_arn        = aws_kms_key.files.arn
  instance_class     = var.db_instance_class
  multi_az           = var.environment == "prod"
}

# ── ECR (container registry for the API) ──
resource "aws_ecr_repository" "backend" {
  name                 = "pedia-backend"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.files.arn
  }
}

# NOTE: ECS Fargate service, ALB, WAF and Secrets Manager are added in
# infra/terraform/modules/ecs (Increment 2) to keep this skeleton reviewable.
