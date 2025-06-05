#!/bin/bash

# Google App Engine Deployment Script for RunThru Backend
# Make sure you have gcloud CLI installed and authenticated

set -e

echo "🚀 Deploying RunThru Backend to Google App Engine..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ You need to authenticate with gcloud first:"
    echo "   gcloud auth login"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project set. Please set your GCP project:"
    echo "   gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Deploying to project: $PROJECT_ID"

# Check if App Engine is enabled
if ! gcloud app describe &> /dev/null; then
    echo "⚠️  App Engine not initialized. Initializing..."
    echo "Please select a region when prompted (e.g., us-central1)"
    gcloud app create
fi

# Build the backend
echo "🔨 Building backend..."
npm run build:backend

# Set environment variables securely (optional, you can also set via console)
echo "🔧 You may want to set environment variables:"
echo "   gcloud app deploy --set-env-vars OPENAI_API_KEY=your_key,SUPABASE_URL=your_url,..."
echo ""

# Deploy to App Engine
echo "🚀 Deploying to App Engine..."
gcloud app deploy app.yaml --quiet

# Get the deployed URL
URL=$(gcloud app describe --format="value(defaultHostname)")
echo ""
echo "✅ Deployment successful!"
echo "🌐 Your backend is now available at: https://$URL"
echo ""
echo "🔍 Useful commands:"
echo "   View logs: gcloud app logs tail -s default"
echo "   Open in browser: gcloud app browse"
echo "   View in console: https://console.cloud.google.com/appengine"
echo ""
echo "📝 Next steps:"
echo "   1. Test your backend: https://$URL/api/storage/info"
echo "   2. Update your frontend environment variables:"
echo "      VITE_API_BASE_URL=https://$URL"
echo "      VITE_WS_BASE_URL=wss://$URL"
echo "   3. Deploy your frontend to Vercel with these URLs" 