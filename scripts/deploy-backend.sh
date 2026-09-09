#!/usr/bin/env bash
# Build, push and deploy the backend image to AWS (ECR + ECS Fargate).
# Usage: ENVIRONMENT=staging ./scripts/deploy-backend.sh
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-eu-west-1}"
IMAGE_TAG="${GIT_SHA:-$(git rev-parse --short HEAD)}"

echo "▶ Resolving ECR repository…"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
REPO="${ECR}/pedia-backend"

echo "▶ Logging in to ECR…"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR}"

echo "▶ Building image ${REPO}:${IMAGE_TAG}…"
docker build -t "${REPO}:${IMAGE_TAG}" -t "${REPO}:${ENVIRONMENT}" apps/backend

echo "▶ Pushing image…"
docker push "${REPO}:${IMAGE_TAG}"
docker push "${REPO}:${ENVIRONMENT}"

echo "▶ Forcing ECS service redeploy (pedia-${ENVIRONMENT})…"
aws ecs update-service \
  --cluster "pedia-${ENVIRONMENT}" \
  --service "pedia-${ENVIRONMENT}" \
  --force-new-deployment \
  --region "${AWS_REGION}" >/dev/null

echo "✓ Deploy triggered for ${ENVIRONMENT} (${IMAGE_TAG})."
echo "  Migrations run on container start via 'prisma migrate deploy'."
