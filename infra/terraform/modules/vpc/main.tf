variable "environment" { type = string }
variable "cidr" { type = string }

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "pedia-${var.environment}" }
}

# Two private subnets (app + data) and two public (ALB/NAT) across AZs.
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr, 4, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "pedia-${var.environment}-private-${count.index}", Tier = "private" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.cidr, 4, count.index + 8)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "pedia-${var.environment}-public-${count.index}", Tier = "public" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
}

output "vpc_id" { value = aws_vpc.this.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
