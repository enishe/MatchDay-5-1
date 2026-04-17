# Render Deployment Troubleshooting Guide

## Common Render Errors & Solutions

### 1. Build Failures

#### Error: "npm install failed"
**Symptoms**: Build stops during dependency installation
**Solutions**:
```bash
# Check package.json for correct scripts
{
  "scripts": {
    "start": "node index.js",
    "install": "npm ci",
    "build": "npm run build"
  }
}

# Clear npm cache
npm cache clean --force

# Use npm ci instead of npm install
npm ci --production
```

#### Error: "Module not found"
**Symptoms**: Application crashes on startup
**Solutions**:
```bash
# Check if all dependencies are in package.json
npm list --depth=0

# Install missing dependencies
npm install missing-package-name

# Check for case sensitivity (Linux is case-sensitive)
```

### 2. Database Connection Issues

#### Error: "ECONNREFUSED" or "Connection refused"
**Symptoms**: Health check fails, API returns 500 errors
**Solutions**:
```bash
# Test database connection locally
psql $DATABASE_URL -c "SELECT 1;"

# Check if database is running
# In Render dashboard: Database > Connection > Test Connection

# Verify connection string format
# postgresql://username:password@host:5432/database
```

#### Error: "Authentication failed"
**Symptoms**: Database authentication errors
**Solutions**:
```bash
# Reset database password in Render dashboard
# Update DATABASE_URL with new password
# Check if user has correct permissions
```

### 3. Environment Variable Issues

#### Error: "SUPABASE_URL is not defined"
**Symptoms**: Real-time features not working
**Solutions**:
```bash
# Add to backend environment variables:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Add to frontend environment variables:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Error: "JWT_SECRET is not defined"
**Symptoms**: Authentication fails, token generation errors
**Solutions**:
```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to environment variables
JWT_SECRET=your-32-character-secret-key
```

### 4. CORS Issues

#### Error: "CORS policy error" in browser
**Symptoms**: Frontend can't connect to backend API
**Solutions**:
```javascript
// Update backend CORS configuration
const cors = require('cors');
app.use(cors({
  origin: [
    'https://matchday-5-1-1.onrender.com',
    'http://localhost:3000',
    'https://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

### 5. Real-time Connection Issues

#### Error: "WebSocket connection failed"
**Symptoms**: Real-time features not working, notifications not updating
**Solutions**:
```bash
# Check Supabase Realtime setup
1. Go to Supabase dashboard
2. Navigate to Settings > API
3. Enable Realtime for these tables:
   - MatchPlayers
   - PlayerPayments
   - Bookings
   - Notifications

# Verify keys are correct
# Frontend should use ANON_KEY
# Backend should use SERVICE_ROLE_KEY
```

### 6. Port and Routing Issues

#### Error: "Cannot GET /" or 404 errors
**Symptoms**: Frontend not loading, API endpoints not found
**Solutions**:
```bash
# Check if backend is listening on correct port
# Add to backend:
const PORT = process.env.PORT || 5000;

# Check frontend API URL
VITE_API_URL=https://matchday-5-1-1.onrender.com/api

# Verify routing configuration
# Backend should have /api prefix for all routes
```

### 7. Memory and Performance Issues

#### Error: "JavaScript heap out of memory"
**Symptoms**: Service crashes under load
**Solutions**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 index.js

# Add to package.json start script:
"start": "node --max-old-space-size=4096 index.js"

# Optimize database queries
# Use connection pooling
# Implement pagination
```

### 8. Service Sleep Issues

#### Error: "Service is sleeping" (Free tier)
**Symptoms**: Service takes 30+ seconds to respond
**Solutions**:
```bash
# Upgrade to paid Render plan
# Or implement keep-alive:
# Add to package.json:
"start": "node keep-alive.js & node index.js"

# keep-alive.js:
const http = require('http');
setInterval(() => {
  http.get('http://matchday-5-1-1.onrender.com/health');
}, 300000); // Every 5 minutes
```

## Debugging Steps

### 1. Check Render Logs
1. Go to Render dashboard
2. Click on your service
3. View "Logs" tab
4. Look for error messages

### 2. Test Health Endpoint
```bash
curl -v https://matchday-5-1-1.onrender.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-04-17T...",
  "realtime": true
}
```

### 3. Test Database Connection
```bash
# Add debug endpoint to backend
app.get('/debug/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'connected', time: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

# Test:
curl https://matchday-5-1-1.onrender.com/debug/db
```

### 4. Check Environment Variables
```bash
# Add debug endpoint to backend
app.get('/debug/env', (req, res) => {
  res.json({
    database_url: process.env.DATABASE_URL ? 'set' : 'not set',
    supabase_url: process.env.SUPABASE_URL ? 'set' : 'not set',
    jwt_secret: process.env.JWT_SECRET ? 'set' : 'not set',
    port: process.env.PORT
  });
});

# Test:
curl https://matchday-5-1-1.onrender.com/debug/env
```

## Quick Fix Commands

### Restart Service
```bash
# In Render dashboard:
1. Go to your service
2. Click "Manual Deploy"
3. This will restart and rebuild
```

### Redeploy with Latest Code
```bash
# Push changes to GitHub
git add .
git commit -m "Fix deployment issues"
git push origin main

# Render will auto-deploy from GitHub
```

### Clear Build Cache
```bash
# In package.json:
"scripts": {
  "clean": "rm -rf node_modules",
  "fresh": "npm run clean && npm install"
}

# In Render dashboard:
1. Go to Settings > Build & Deploy
2. Click "Clear Cache"
3. Trigger new deployment
```

## Environment Variable Template

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Authentication
JWT_SECRET=your-32-character-secret-key

# Server
PORT=5000
NODE_ENV=production

# Email (optional)
EMAIL_SERVICE=resend
EMAIL_API_KEY=your-email-api-key
FROM_EMAIL=noreply@matchday.com
```

### Frontend (.env)
```bash
VITE_API_URL=https://matchday-5-1-1.onrender.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Common Error Messages & Solutions

| Error | Cause | Solution |
|--------|--------|----------|
| "Cannot read properties of undefined" | Missing environment variable | Check .env files |
| "ECONNREFUSED" | Database not running | Start database service |
| "404 Not Found" | Wrong routing | Check API routes |
| "CORS error" | Origin not allowed | Update CORS config |
| "WebSocket failed" | Real-time not enabled | Enable Supabase Realtime |
| "Service sleeping" | Free tier inactivity | Upgrade plan or add keep-alive |

## Support Resources

### Render Documentation
- [Render Docs](https://render.com/docs)
- [Environment Variables Guide](https://render.com/docs/env-vars)
- [Troubleshooting Guide](https://render.com/docs/troubleshooting)

### MATCHDAY Platform
- [GitHub Repository](https://github.com/enishe/MatchDay-5-1)
- [Live Platform](https://matchday-5-1-1.onrender.com/)
- [Health Check](https://matchday-5-1-1.onrender.com/health)

---

## Emergency Recovery

### If All Else Fails
1. **Delete and recreate service** in Render dashboard
2. **Start with fresh environment variables**
3. **Deploy from scratch** with minimal setup
4. **Gradually add features** one by one
5. **Test each feature** before adding next

### Contact Support
- Render support through dashboard
- Check GitHub issues for known problems
- Review deployment logs for specific errors

---

Your MATCHDAY platform should be working. Use this guide to identify and fix any deployment issues on Render.
