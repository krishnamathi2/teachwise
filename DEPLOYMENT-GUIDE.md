# 🚀 Deployment Guide - TeachWise AI

## Quick Deploy to Vercel (Recommended)

### 1. Prepare Environment Variables

Create these environment variables in your deployment platform:

**Frontend Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
```

**Backend Environment Variables:**
```env
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_KEY=your_production_service_key
OPENAI_API_KEY=your_openai_api_key
ADMIN_JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_production_email@gmail.com
SMTP_PASS=your_production_app_password
NODE_ENV=production
```

### 2. Deploy with Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables through Vercel dashboard
# or use CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add OPENAI_API_KEY
# ... repeat for all variables
```

### 3. Custom Domain (Optional)

1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your custom domain
5. Configure DNS records as shown

## Alternative: Separate Frontend/Backend

### Frontend on Netlify
```bash
# Build frontend
cd frontend
npm run build

# Deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=.next
```

### Backend on Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy backend
cd backend
railway login
railway deploy
```

## Database Setup

Ensure your Supabase database is configured:

1. Create production Supabase project
2. Import your database schema
3. Configure RLS policies
4. Update environment variables

## Security Checklist

- [ ] All environment variables set in production
- [ ] Database RLS policies configured
- [ ] API rate limiting enabled
- [ ] HTTPS certificates configured
- [ ] CORS properly configured for your domain
- [ ] Payment webhooks secured

## Post-Deployment

1. **Test all features** in production
2. **Configure domain** (if using custom domain)
3. **Set up monitoring** (Vercel Analytics)
4. **Configure error tracking** (Sentry)
5. **Set up backups** for database

## Scaling Considerations

- **CDN**: Vercel includes global CDN
- **Database**: Supabase auto-scales
- **API**: Consider Redis for caching
- **Files**: Use cloud storage for large files

## Cost Estimates

**Free Tier Options:**
- Vercel: Free for personal projects
- Railway: $5/month for hobby
- Supabase: Free tier with generous limits

**Production Ready:**
- Vercel Pro: $20/month
- Railway: $5-20/month depending on usage
- Supabase Pro: $25/month

Total estimated cost: $30-65/month for production app with moderate traffic.