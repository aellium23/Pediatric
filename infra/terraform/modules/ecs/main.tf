variable "environment" { type = string }
variable "region" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "ecr_repository_url" { type = string }
variable "rds_security_group_id" { type = string }
variable "kms_key_arn" { type = string }
variable "bucket_arn" { type = string }
variable "container_port" {
  type    = number
  default = 3000
}
variable "desired_count" {
  type    = number
  default = 2
}
variable "certificate_arn" {
  type    = string
  default = ""
}

locals {
  name  = "pedia-${var.environment}"
  image = "${var.ecr_repository_url}:${var.environment}"
}

# ── Logs ──
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name}"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn
}

# ── Secrets (values populated out-of-band by ops; never in Terraform) ──
resource "aws_secretsmanager_secret" "app" {
  name       = "${local.name}-app"
  kms_key_id = var.kms_key_arn
}

# ── Security groups ──
resource "aws_security_group" "alb" {
  name_prefix = "${local.name}-alb-"
  vpc_id      = var.vpc_id
  description = "ALB ingress from the internet"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name_prefix = "${local.name}-ecs-"
  vpc_id      = var.vpc_id
  description = "ECS tasks ingress from ALB only"

  ingress {
    description     = "From ALB"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Allow ECS tasks to reach the database.
resource "aws_security_group_rule" "rds_from_ecs" {
  description              = "Postgres from ECS tasks"
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = var.rds_security_group_id
  source_security_group_id = aws_security_group.ecs.id
}

# ── IAM ──
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${local.name}-exec"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.app.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role" "task" {
  name               = "${local.name}-task"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy" "task_s3" {
  name = "s3-clinical-files"
  role = aws_iam_role.task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = ["${var.bucket_arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [var.kms_key_arn]
      }
    ]
  })
}

# ── ECS cluster, task, service ──
resource "aws_ecs_cluster" "this" {
  name = local.name
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = local.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = local.image
      essential = true
      portMappings = [
        { containerPort = var.container_port, protocol = "tcp" }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = tostring(var.container_port) },
        { name = "AWS_REGION", value = var.region }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${aws_secretsmanager_secret.app.arn}:DATABASE_URL::" },
        { name = "JWT_ACCESS_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_ACCESS_SECRET::" },
        { name = "JWT_REFRESH_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_REFRESH_SECRET::" },
        { name = "FIELD_ENCRYPTION_KEY", valueFrom = "${aws_secretsmanager_secret.app.arn}:FIELD_ENCRYPTION_KEY::" },
        { name = "STRIPE_SECRET_KEY", valueFrom = "${aws_secretsmanager_secret.app.arn}:STRIPE_SECRET_KEY::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])
}

# ── Load balancer ──
resource "aws_lb" "this" {
  name                       = local.name
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = var.public_subnet_ids
  drop_invalid_header_fields = true
  enable_deletion_protection = var.environment == "prod"
}

resource "aws_lb_target_group" "this" {
  name        = local.name
  port        = var.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    matcher             = "200"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

resource "aws_lb_listener" "https" {
  count             = var.certificate_arn == "" ? 0 : 1
  load_balancer_arn = aws_lb.this.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

resource "aws_ecs_service" "this" {
  name            = local.name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = "backend"
    container_port   = var.container_port
  }

  depends_on = [aws_lb_listener.http]
}

# ── WAF (regional, associated with the ALB) ──
resource "aws_wafv2_web_acl" "this" {
  name  = local.name
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-acl"
    sampled_requests_enabled   = true
  }

  rule {
    name     = "common-rules"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "common-rules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "rate-limit"
    priority = 2
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = true
    }
  }
}

resource "aws_wafv2_web_acl_association" "this" {
  resource_arn = aws_lb.this.arn
  web_acl_arn  = aws_wafv2_web_acl.this.arn
}

output "alb_dns_name" { value = aws_lb.this.dns_name }
output "cluster_name" { value = aws_ecs_cluster.this.name }
output "service_name" { value = aws_ecs_service.this.name }
output "app_secret_arn" { value = aws_secretsmanager_secret.app.arn }
