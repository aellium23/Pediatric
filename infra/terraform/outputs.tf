output "vpc_id" {
  value = module.vpc.vpc_id
}

output "files_bucket" {
  value = module.s3_files.bucket_name
}

output "kms_key_alias" {
  value = aws_kms_alias.files.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}

output "alb_dns_name" {
  value = module.ecs.alb_dns_name
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "app_secret_arn" {
  value = module.ecs.app_secret_arn
}
