#!/bin/bash

# Deploy BioMasters TCG Server to Google Cloud Run
# This script deploys the server with Memorystore Redis access

set -e

# Configuration
PROJECT_ID="biomasters-tcg"
SERVICE_NAME="biomasters-api"
REGION="us-east1"  # Same region as your Redis instance
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying BioMasters TCG API to Cloud Run..."
echo "📍 Project: $PROJECT_ID"
echo "📍 Service: $SERVICE_NAME"
echo "📍 Region: $REGION"

# Create VPC connector if it doesn't exist
echo "🔧 Creating VPC connector for Memorystore access..."
gcloud compute networks vpc-access connectors create redis-connector \
  --region=$REGION \
  --subnet=redis-connector-subnet \
  --subnet-project=$PROJECT_ID \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro \
  --quiet 2>/dev/null || echo "VPC connector already exists or failed to create"

# Set the project
echo "🔧 Setting project..."
gcloud config set project $PROJECT_ID

# Build and push the container image
echo "🔨 Building container image..."
gcloud builds submit --tag $IMAGE_NAME --project $PROJECT_ID

# Deploy to Cloud Run with environment variables
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3001 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "PORT=3001" \
  --set-env-vars "REDIS_HOST=10.36.239.107" \
  --set-env-vars "REDIS_PORT=6378" \
  --set-env-vars "REDIS_PASSWORD=657fc2af-f410-4b45-9b8a-2a54fe7e60d5" \
  --set-env-vars "REDIS_TLS=true" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT_ID=biomasters-tcg" \
  --set-env-vars "DATABASE_URL=postgresql://postgres:QZOlYJcxSYezlaeOGjOPPeZqDEWGhSDJ@shuttle.proxy.rlwy.net:27035/railway" \
  --set-env-vars "FIREBASE_PROJECT_ID=biomasters-tcg" \
  --set-env-vars "FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@biomasters-tcg.iam.gserviceaccount.com" \
  --vpc-connector projects/$PROJECT_ID/locations/$REGION/connectors/redis-connector \
  --vpc-egress private-ranges-only

echo "✅ Deployment complete!"
echo "🌐 Your API is now available at the Cloud Run URL"
echo ""
echo "📋 Next steps:"
echo "1. Test the worker endpoints:"
echo "   curl https://your-cloud-run-url/health/worker"
echo "2. Update your frontend VITE_API_BASE_URL to point to the Cloud Run URL"
