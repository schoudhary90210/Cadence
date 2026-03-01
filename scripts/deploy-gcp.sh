#!/bin/bash
set -e

PROJECT_ID="cadence-cheeshacks"
REGION="us-central1"
SERVICE="cadence-api"

echo "=== Deploying Cadence API to Cloud Run ==="
echo "Project: $PROJECT_ID"
echo "Region:  $REGION"
echo "Service: $SERVICE"
echo ""

cd backend

echo "Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE

echo ""
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE \
  --image gcr.io/$PROJECT_ID/$SERVICE \
  --platform managed \
  --region $REGION \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --allow-unauthenticated \
  --set-env-vars "ANALYSIS_MODE=HYBRID_ML,CLOUD_STT_ENABLED=true,GCS_ENABLED=true,GCS_BUCKET_NAME=cadence-audio-cadence-cheeshacks,FIRESTORE_ENABLED=true,CORS_ORIGINS=*"

echo ""
echo "=== Deployment complete ==="
echo "URL:"
gcloud run services describe $SERVICE --region $REGION --format "value(status.url)"
