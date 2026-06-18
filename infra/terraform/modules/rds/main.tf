variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "kms_key_arn" { type = string }
variable "instance_class" { type = string }
variable "multi_az" { type = bool }

resource "aws_db_subnet_group" "this" {
  name       = "pedia-${var.environment}"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "db" {
  name_prefix = "pedia-${var.environment}-db-"
  vpc_id      = var.vpc_id
  description = "RDS access from app tier only"
  # Ingress is added by the app's security group rule (Increment 2).
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "this" {
  identifier                 = "pedia-${var.environment}"
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = var.instance_class
  allocated_storage          = 50
  max_allocated_storage      = 500
  storage_encrypted          = true
  kms_key_id                 = var.kms_key_arn
  db_name                    = "pedia"
  username                   = "pedia"
  manage_master_user_password = true
  multi_az                   = var.multi_az
  db_subnet_group_name       = aws_db_subnet_group.this.name
  vpc_security_group_ids     = [aws_security_group.db.id]
  backup_retention_period    = var.environment == "prod" ? 14 : 3
  deletion_protection        = var.environment == "prod"
  skip_final_snapshot        = var.environment != "prod"
  performance_insights_enabled = true
  # PITR via automated backups supports RPO < 15 min target.
}

output "endpoint" { value = aws_db_instance.this.endpoint }
output "security_group_id" { value = aws_security_group.db.id }
