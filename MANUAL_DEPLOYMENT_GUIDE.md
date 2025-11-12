# TeachWise MVP - Manual Deployment Guide

Since the Next.js build process is consuming too much memory, here's a manual deployment approach:

## Option 1: Deploy as Development Build (Quick Deploy)

### Frontend Deployment:
1. **Upload Frontend Files**:
   - Upload the entire `frontend` folder to your web server
   - Point your domain to the `frontend` folder as the document root

2. **Configure Environment**:
   - Create `frontend/.env.production` with your production settings:
   ```
   NEXT_PUBLIC_BACKEND=https://your-backend-url.com
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
   ```

3. **Install Dependencies and Start**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Backend Deployment:
1. **Upload Backend Files**:
   - Upload the `backend` folder to your server
   - Can be in a subdomain like `api.mpaiapps.godaddysites.com`

2. **Configure Environment**:
   - Create `backend/.env` with your production settings
   - Include all database, payment, and API keys

3. **Install and Start**:
   ```bash
   cd backend
   npm install --production
   npm start
   ```

## Option 2: Use a Cloud Platform (Recommended)

For better performance and easier deployment, consider:

### Frontend (Vercel - Free):
1. Connect your GitHub repository to Vercel
2. It will automatically deploy your Next.js frontend
3. Configure environment variables in Vercel dashboard

### Backend Options:
1. **Railway.app** (Simple Node.js hosting)
2. **Render.com** (Free tier available)
3. **Heroku** (Free tier discontinued but still good)

## GoDaddy Specific Instructions:

### For GoDaddy Shared Hosting:
1. **Frontend**: Upload files via cPanel File Manager or FTP
2. **Backend**: May not support Node.js on shared hosting
   - Consider upgrading to VPS or dedicated hosting
   - Or use external API hosting service

### For GoDaddy VPS/Dedicated:
1. SSH into your server
2. Install Node.js and npm
3. Upload and configure both frontend and backend
4. Set up PM2 for process management
5. Configure Nginx/Apache as reverse proxy

## Environment Variables Needed:

### Frontend (.env.production):
```
NEXT_PUBLIC_BACKEND=https://your-api-domain.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Backend (.env):
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_admin_password
EMAIL_USER=your_email@domain.com
EMAIL_PASSWORD=your_app_password
PORT=3003
```

## Quick Deploy Commands:

1. **Prepare Files**:
   ```bash
   # Create production environment files
   cp .env.production.example frontend/.env.production
   cp .env.production.example backend/.env
   # Edit these files with your actual values
   ```

2. **Package for Upload**:
   ```bash
   # Create deployment zip
   zip -r teachwise-deployment.zip frontend/ backend/ *.md
   ```

3. **Upload and Configure**:
   - Upload zip to your server
   - Extract and configure environment variables
   - Install dependencies and start services

Would you like me to help you with any specific step or create the deployment package?