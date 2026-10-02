#!/bin/bash
# deploy.sh prod AWS af-south-1
set -e
docker build -t agropulse-api:latest ./backend
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URL
docker tag agropulse-api:latest $ECR_URL/agropulse-api:latest
docker push $ECR_URL/agropulse-api:latest
cd infrastructure/terraform && terraform init && terraform apply -var-file=production.tfvars -auto-approve
curl https://api.agropulse.africa/api/v1/health
