terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}
provider "aws" { region = "af-south-1" } # Le Cap, latence min depuis Lomé
# VPC 10.0.0.0/16, ALB public, ECS Fargate, RDS PostgreSQL15+PostGIS, ElastiCache Redis7, S3 agropulse-data, Cloudflare DNS+WAF
# TODO: compléter avec modules VPC/ECS/RDS réels avant prod
