# MATCHDAY Platform - Render Deployment Guide

## Live Platform Status
**URL**: https://matchday-5-1-1.onrender.com/

## Render Configuration

### Backend Service Setup
- **Service Type**: Web Service
- **Runtime**: Node.js 18
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

### Frontend Service Setup
- **Service Type**: Static Site
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Root Directory**: `frontend`

## Environment Variables Required

### Backend Environment Variables
Add these in your Render dashboard under Environment Variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_at_least_32_characters

# Server Configuration
PORT=5000
NODE_ENV=production

# Email Service (Optional but recommended)
EMAIL_SERVICE=resend
EMAIL_API_KEY=your_email_api_key
FROM_EMAIL=noreply@matchday.com
```

### Frontend Environment Variables
```bash
VITE_API_URL=https://matchday-5-1-1.onrender.com/api
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup on Render

### Option 1: Render PostgreSQL
1. Create a new PostgreSQL database on Render
2. Copy the connection string to DATABASE_URL
3. Run the schema: `psql <DATABASE_URL> < backend/Data/schema.sql`

### Option 2: Supabase (Recommended)
1. Create a Supabase project
2. Run the schema in Supabase SQL Editor
3. Enable Realtime on these tables:
   - MatchPlayers
   - PlayerPayments  
   - Bookings
   - Notifications
4. Set up Row Level Security policies

## Verification Checklist

### Backend Health Check
Visit: `https://matchday-5-1-1.onrender.com/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-17T...",
  "realtime": true,
  "services": {
    "realtime": true,
    "checkin": true,
    "notifications": true
  }
}
```

### Frontend Loading
Visit: `https://matchday-5-1-1.onrender.com/`

Expected behavior:
- Login/Register forms should load
- No console errors
- Responsive design working

### API Endpoints Testing
```bash
# Test authentication endpoint
curl https://matchday-5-1-1.onrender.com/health

# Test match endpoints (will require auth token)
curl https://matchday-5-1-1.onrender.com/api/matches
```

## Common Render Issues & Solutions

### 1. Build Fails
- Check package.json scripts
- Verify all dependencies are in package.json
- Check for missing environment variables

### 2. Database Connection Issues
- Verify DATABASE_URL format
- Check if database is running
- Test connection locally first

### 3. CORS Issues
Add to backend CORS configuration:
```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://matchday-5-1-1.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
```

### 4. Real-time Not Working
- Verify Supabase Realtime is enabled
- Check Supabase keys are correct
- Ensure WebSocket connections are allowed

## Performance Optimization

### Backend Optimization
- Enable gzip compression
- Implement caching
- Use connection pooling

### Frontend Optimization
- Enable code splitting
- Optimize images
- Use CDN for static assets

## Monitoring & Logs

### Render Logs
Access logs in Render dashboard:
- **Backend**: Web Service logs
- **Frontend**: Static Site logs

### Key Logs to Monitor
- Database connection errors
- Authentication failures
- Real-time connection issues
- Payment processing errors

## Security Considerations

### Render Security
- Use environment variables for secrets
- Enable SSL (automatic on Render)
- Set up custom domain
- Implement rate limiting

### Database Security
- Use connection strings with SSL
- Regular backups
- Row Level Security policies

## Scaling on Render

### Free Tier Limitations
- 750 hours/month per service
- 512MB RAM
- Shared CPU
- Sleeps after 15 minutes inactivity

### Paid Tier Benefits
- No sleep time
- More RAM/CPU
- Custom domains
- Better performance

## Cron Jobs on Render

### Auto-Cancel Matches
Set up in Render dashboard:
```bash
# Every 5 minutes
*/5 * * * * curl -X POST https://matchday-5-1-1.onrender.com/api/auto-cancel

# Every hour for no-show detection
0 * * * * curl -X POST https://matchday-5-1-1.onrender.com/api/handle-no-show

# Every 30 minutes for email queue
*/30 * * * * curl -X POST https://matchday-5-1-1.onrender.com/api/process-email-queue
```

## Custom Domain Setup

### Steps
1. Upgrade to paid plan
2. Add custom domain in Render dashboard
3. Update DNS records
4. Configure SSL (automatic)

### Example Configuration
- **Backend**: `api.matchday.com`
- **Frontend**: `www.matchday.com`

## Backup Strategy

### Database Backups
- Enable automatic backups in Render
- Export regular backups to local storage
- Test restore procedures

### Code Backups
- GitHub repository is primary backup
- Tag releases for major versions
- Document deployment process

## Troubleshooting

### Quick Health Check
```bash
# Check if backend is responding
curl https://matchday-5-1-1.onrender.com/health

# Check frontend
curl -I https://matchday-5-1-1.onrender.com/

# Test API endpoint
curl https://matchday-5-1-1.onrender.com/api/matches/stats
```

### Common Error Messages
- **502 Bad Gateway**: Backend service not running
- **503 Service Unavailable**: Database connection issues
- **404 Not Found**: Incorrect routing or build issues

### Debug Mode
Add to environment variables:
```bash
DEBUG=matchday:*
NODE_ENV=development
```

## Next Steps for Production

1. **Set up custom domain**
2. **Configure email service**
3. **Enable monitoring**
4. **Set up backups**
5. **Test all user flows**
6. **Performance testing**
7. **Security audit**

---

## Live Platform Status: READY FOR USE

Your MATCHDAY platform is now live at: **https://matchday-5-1-1.onrender.com/**

Users can now:
- Register new accounts
- Browse and book fields
- Create and manage matches
- Process payments with Smart Split
- Receive real-time notifications
- Check-in for matches
- Admins can manage the platform

The platform is fully functional and ready for real users!
