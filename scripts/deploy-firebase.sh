#!/bin/bash
set -e

echo "=== Deploying Cadence Frontend to Firebase Hosting ==="

cd frontend

echo "Building Next.js static export..."
npm run build

echo ""
echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "=== Frontend deployment complete ==="
