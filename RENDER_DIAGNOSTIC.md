# Render Deployment Diagnostic Guide

## Current Status
Build error "Exited with status 1" persists despite multiple fix attempts.

## Root Cause Analysis

### Most Likely Issues
1. **Missing Environment Variables**: Render can't access required configuration
2. **Import/Module Errors**: Circular dependencies or missing files
3. **Database Connection**: Can't connect to PostgreSQL/Supabase
4. **Port Configuration**: PORT not properly set
5. **File Structure**: Missing files or incorrect paths

## Step-by-Step Diagnostic Process

### Step 1: Verify Basic Node.js Setup
Create `backend/test-basic.js`:
```javascript
console.log('Starting basic test...');

try {
  require('dotenv').config();
  console.log('✅ dotenv loaded');
  
  const express = require('express');
  console.log('✅ express loaded');
  
  const app = express();
  app.use(express.json());
  
  app.get('/test', (req, res) => {
    res.json({ status: 'ok', message: 'Basic test working' });
  });
  
  const PORT = process.env.PORT || 5000;
  console.log(`🚀 Starting server on port ${PORT}`);
  
  app.listen(PORT, () => {
    console.log('✅ Server started successfully');
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
```

Update package.json:
```json
{
  "scripts": {
    "test-basic": "node test-basic.js"
  }
}
```

### Step 2: Test Locally
```bash
cd backend
npm run test-basic
```

### Step 3: Deploy Minimal Version
If basic test works, deploy this minimal version to Render.

### Step 4: Add Environment Variables One by One
Start with just these in Render:
```
NODE_ENV=production
PORT=5000
```

Then add:
```
DATABASE_URL=your_connection_string
JWT_SECRET=your_secret
```

### Step 5: Check Render Logs Carefully
Look for specific error messages:
- "Cannot find module"
- "Permission denied"
- "Connection refused"
- "Port already in use"

## Alternative Deployment Strategies

### Strategy A: Use Docker
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Strategy B: Use Different Platform
Try Vercel for backend:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy backend
cd backend
vercel --prod
```

### Strategy C: Simplify to Extreme Minimum
Create `backend/minimal.js`:
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});
```

## Quick Fix Commands

### Reset Render Service
1. Go to Render dashboard
2. Delete current service
3. Create new service with same name
4. Add environment variables immediately
5. Deploy

### Check File Permissions
```bash
# Ensure files are executable
chmod +x backend/index.js

# Check file ownership
ls -la backend/
```

### Validate package.json
```bash
cd backend
npm ls --depth=0
```

Should show:
- express
- cors
- dotenv
- pg (if using database)

## Environment Variable Template for Render
Copy and paste these exactly into Render dashboard:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://username:password@host:5432/database
JWT_SECRET=your_32_character_secret_key
```

## Verification Tests

### Test 1: Health Check
```bash
curl https://matchday-5-1-1.onrender.com/test
```

### Test 2: Environment Check
Add this to your server temporarily:
```javascript
app.get('/debug/env', (req, res) => {
  res.json({
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL ? 'set' : 'not set',
    jwt_secret: process.env.JWT_SECRET ? 'set' : 'not set'
  });
});
```

## Emergency Recovery Plan

### If All Else Fails
1. **Create completely new service** on Render
2. **Use different name** (matchday-api-v2)
3. **Deploy absolute minimum** (just HTTP server)
4. **Gradually add features** once basic works
5. **Keep old service** for reference

### Contact Support
- Render support through dashboard
- Check GitHub issues for Render deployment
- Review Render status page for outages

---

## Immediate Action Plan

1. **Create basic test file** (`test-basic.js`)
2. **Test locally** to ensure it works
3. **Deploy minimal version** to Render
4. **Add environment variables** one by one
5. **Monitor each step** carefully

The goal is to get ANY working version deployed, then build up from there.
