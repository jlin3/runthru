# GitHub Actions Automated Deployment Setup

## 🔐 Required GitHub Secrets

To enable automated deployment, add these secrets in your GitHub repository:

**Repository Settings > Secrets and variables > Actions > Repository secrets**

### **Google App Engine Secrets**

1. **`GCP_SERVICE_ACCOUNT_KEY`**
   ```bash
   # Create a service account for GitHub Actions
   gcloud iam service-accounts create github-actions-deployer \
     --display-name="GitHub Actions Deployer" \
     --project=runthru-backend-prod

   # Grant necessary permissions
   gcloud projects add-iam-policy-binding runthru-backend-prod \
     --member="serviceAccount:github-actions-deployer@runthru-backend-prod.iam.gserviceaccount.com" \
     --role="roles/appengine.deployer"

   gcloud projects add-iam-policy-binding runthru-backend-prod \
     --member="serviceAccount:github-actions-deployer@runthru-backend-prod.iam.gserviceaccount.com" \
     --role="roles/appengine.serviceAdmin"

   gcloud projects add-iam-policy-binding runthru-backend-prod \
     --member="serviceAccount:github-actions-deployer@runthru-backend-prod.iam.gserviceaccount.com" \
     --role="roles/cloudbuild.builds.editor"

   gcloud projects add-iam-policy-binding runthru-backend-prod \
     --member="serviceAccount:github-actions-deployer@runthru-backend-prod.iam.gserviceaccount.com" \
     --role="roles/storage.admin"

   # Generate key file
   gcloud iam service-accounts keys create github-actions-key.json \
     --iam-account=github-actions-deployer@runthru-backend-prod.iam.gserviceaccount.com

   # Copy the entire contents of github-actions-key.json as the secret value
   ```

2. **Application Environment Variables**
   - `OPENAI_API_KEY`: Your OpenAI API key (starts with sk-proj-)
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key
   - `GCP_PROJECT_ID`: Your Google Cloud project ID for storage
   - `GCP_BUCKET_NAME`: Your Google Cloud Storage bucket name
   - `GCP_JSON_CREDENTIALS`: Your Google Cloud JSON credentials string
   
   **Copy these from your local .env file**

### **Vercel Deployment Secrets**

1. **Get Vercel Token**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and get token
   vercel login
   # Go to: https://vercel.com/account/tokens
   # Create new token and copy it
   ```

2. **Get Project Details**
   ```bash
   # In your project directory
   vercel link

   # Get org and project IDs from .vercel/project.json
   cat .vercel/project.json
   ```

3. **Add Vercel Secrets**
   - `VERCEL_TOKEN`: Your Vercel API token
   - `VERCEL_ORG_ID`: From `.vercel/project.json`
   - `VERCEL_PROJECT_ID`: From `.vercel/project.json`

## 🚀 How Automated Deployment Works

### **Trigger**: Push to `main` branch

### **Process**:
1. **Backend Deployment** (Google App Engine)
   - ✅ Build backend with production configuration
   - ✅ Authenticate with Google Cloud
   - ✅ Deploy to App Engine with environment variables
   - ✅ Verify deployment health

2. **Frontend Deployment** (Vercel)
   - ✅ Build frontend with production API URLs
   - ✅ Deploy to Vercel with optimized settings
   - ✅ Automatic preview and production URLs

3. **Integration Testing**
   - ✅ Health check backend API endpoints
   - ✅ Verify frontend accessibility

### **Deployment URLs**:
- **Backend**: https://runthru-backend-prod.uc.r.appspot.com
- **Frontend**: https://runthru-[project-id].vercel.app

## 🔧 Manual Deployment Commands

### **Backend Only**:
```bash
npm run gcp:deploy:prod
```

### **Frontend Only**:
```bash
npm run build:frontend
vercel --prod
```

### **Both**:
```bash
git push origin main  # Triggers automated deployment
```

## 📝 Notes

- Deployments only run on pushes to `main` branch
- Both frontend and backend deploy in parallel
- Integration tests run after both deployments complete
- All secrets are securely stored in GitHub
- No sensitive data is exposed in the repository 