# RunThru Deployment Guide

## Architecture Overview

RunThru is a full-stack application that needs to be deployed as two separate services:

- **Frontend**: React app (can be deployed to Vercel, Netlify, etc.)
- **Backend**: Node.js Express server with Playwright (needs Node.js hosting)

## Option 1: Frontend (Vercel) + Backend (Google App Engine) 🌟 RECOMMENDED

Since you're already using Google Cloud Platform for storage, deploying to Google App Engine provides the best integration and performance.

### Step 1: Deploy Backend to Google App Engine

#### Prerequisites
1. **Install gcloud CLI**: [Download here](https://cloud.google.com/sdk/docs/install)
2. **Authenticate**: `gcloud auth login`
3. **Set your project**: `gcloud config set project YOUR_GCP_PROJECT_ID`

#### Quick Deployment
```bash
# Use the provided deployment script
./deploy-gae.sh
```

#### Manual Deployment Steps
1. **Build the backend**: `npm run build:backend`
2. **Deploy to App Engine**: `gcloud app deploy`
3. **Set environment variables** (choose one method):

   **Method A: Via gcloud command**
   ```bash
   gcloud app deploy --set-env-vars \
     OPENAI_API_KEY=your_openai_key,\
     SUPABASE_URL=your_supabase_url,\
     SUPABASE_SERVICE_KEY=your_service_key,\
     GCP_PROJECT_ID=your_project_id,\
     GCP_BUCKET_NAME=your_bucket_name
   ```

   **Method B: Via Google Cloud Console**
   - Go to [App Engine Settings](https://console.cloud.google.com/appengine/settings)
   - Click "Environment Variables" 
   - Add your variables from `.env`

4. **Get your App Engine URL**: `gcloud app describe --format="value(defaultHostname)"`

### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**: Go to [vercel.com](https://vercel.com) and sign up
2. **Import Project**: Connect your GitHub repo
3. **Configure Build Settings**:
   - **Build Command**: `npm run build:frontend`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

4. **Set Environment Variables** in Vercel dashboard:
   ```
   VITE_API_BASE_URL=https://your-project-id.appspot.com
   VITE_WS_BASE_URL=wss://your-project-id.appspot.com
   ```

5. **Deploy**: Vercel will build and deploy your frontend

## Option 2: Frontend (Vercel) + Backend (Render/Railway)

### Step 1: Deploy Backend to Render.com

1. **Create Render Account**: Go to [render.com](https://render.com) and sign up
2. **Connect GitHub**: Link your GitHub account
3. **Create Web Service**: 
   - Select this repository
   - **Build Command**: `npm run build:backend`
   - **Start Command**: `npm start`
   - **Environment Variables**: Copy your current `.env` file variables:
     ```
     OPENAI_API_KEY=your_openai_key
     SUPABASE_URL=your_supabase_url
     SUPABASE_SERVICE_KEY=your_service_key
     GCP_PROJECT_ID=your_gcp_project
     # ... etc
     ```

4. **Deploy**: Render will build and deploy your backend
5. **Note the URL**: You'll get a URL like `https://runthru-backend.onrender.com`

### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**: Go to [vercel.com](https://vercel.com) and sign up
2. **Import Project**: Connect your GitHub repo
3. **Configure Build Settings**:
   - **Build Command**: `npm run build:frontend`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

4. **Set Environment Variables** in Vercel dashboard:
   ```
   VITE_API_BASE_URL=https://runthru-backend.onrender.com
   VITE_WS_BASE_URL=wss://runthru-backend.onrender.com
   ```

5. **Deploy**: Vercel will build and deploy your frontend

## Option 2: Full Stack on Railway

Alternative: Deploy the entire app to Railway which supports full Node.js applications:

1. **Create Railway Account**: Go to [railway.app](https://railway.app)
2. **Connect GitHub**: Import your repository
3. **Configure**:
   - Railway will auto-detect the Node.js app
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. **Set Environment Variables**: Add all your `.env` variables
5. **Deploy**: Railway handles both frontend and backend

## Option 3: Full Stack on Fly.io

Another alternative for the complete application:

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Create `fly.toml` in project root:
   ```toml
   app = "runthru-app"
   primary_region = "iad"

   [build]
     builder = "heroku/buildpacks:20"

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true

   [env]
     NODE_ENV = "production"
   ```

3. Deploy: `fly deploy`

## Environment Variables Reference

### Backend Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# Supabase Configuration  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Cloud Storage
GCP_PROJECT_ID=your-project-id
GCP_BUCKET_NAME=your-bucket-name
GCP_JSON_CREDENTIALS=your-credentials-string

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional
VIDEO_STORAGE_TYPE=gcp
PORT=3000
NODE_ENV=production
```

### Frontend Environment Variables (for Vercel)
```bash
# Point to your deployed backend
VITE_API_BASE_URL=https://your-backend-url.com
VITE_WS_BASE_URL=wss://your-backend-url.com
```

## Testing Your Deployment

1. **Backend Health Check**: Visit `https://your-project-id.appspot.com/api/storage/info` (GAE) or `https://your-backend-url/api/storage/info`
2. **Frontend**: Visit your Vercel URL and test creating a recording
3. **WebSocket**: Check real-time updates work during recording

## Google App Engine Specific Commands

```bash
# Deploy to GAE
npm run gcp:deploy

# Build and deploy with promotion (production)
npm run gcp:deploy:prod

# View logs
npm run gcp:logs
# or
gcloud app logs tail -s default

# Open your app in browser
gcloud app browse

# View app details
gcloud app describe

# Update environment variables
gcloud app deploy --set-env-vars KEY=value,KEY2=value2
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Backend needs to allow your frontend domain
2. **WebSocket Connection Failed**: Check WSS URL and certificates  
3. **404 on API Calls**: Verify `VITE_API_BASE_URL` is set correctly
4. **Build Failures**: Check Node.js version compatibility

### Platform-Specific Notes

**Google App Engine** ⭐:
- Perfect integration with your existing GCP infrastructure
- Automatic scaling and load balancing
- Supports long-running processes and WebSockets
- Built-in monitoring and logging
- No cold starts on flexible environment
- Best choice since you're already using GCP Storage

**Render.com**:
- Free tier has cold starts (app sleeps after 15min inactivity)
- Supports full Node.js applications
- Good for backend deployment

**Vercel**:
- Excellent for React frontends
- Has serverless functions but limited for this use case
- Free tier with good performance

**Railway**:
- Great for full-stack apps
- PostgreSQL database included
- More expensive but very reliable

**Fly.io**:
- Good performance globally
- Supports Docker deployments
- More complex setup but very flexible

## Why This Split Deployment?

The original issue was that Vercel is designed for:
- Static sites and SPAs
- Serverless functions (not full Express servers)
- Frontend frameworks

Your RunThru backend needs:
- File system access for video processing
- Long-running processes (Playwright automation)
- WebSocket connections
- Binary dependencies (FFmpeg)

These requirements work better on traditional Node.js hosting platforms. 