# Quick Render Deployment Fix

## The Problem
Build error "Exited with status 1" means the deployment process is failing during the build phase.

## Immediate Fix Steps

### 1. Check Render Environment Variables
Go to your Render dashboard and add these EXACT environment variables:

#### Backend Service Environment Variables:
```
DATABASE_URL=postgresql://username:password@host:5432/database
JWT_SECRET=your_32_character_secret_key
PORT=5000
NODE_ENV=production
```

#### Frontend Service Environment Variables:
```
VITE_API_URL=https://matchday-5-1-1.onrender.com/api
```

### 2. Update Backend Index.js
Add this to the top of `backend/index.js`:
```javascript
require('dotenv').config();
```

### 3. Fix Import Issues
Update `backend/index.js` to fix import paths:
```javascript
// Change from:
const { router: authRoutes } = require('./Routes/authRoutes');

// To:
const { authenticateToken, requireRole } = require('./Routes/authRoutes');
const authRoutes = require('./Routes/authRoutes');
```

### 4. Simplify Package Dependencies
Update `backend/package.json` dependencies:
```json
{
  "dependencies": {
    "express": "^4.22.1",
    "cors": "^2.8.6",
    "bcryptjs": "^3.0.3",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.20.0",
    "dotenv": "^16.3.1"
  }
}
```

### 5. Create Minimal Working Version
Create a simple test file `backend/test.js`:
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Update package.json start script:
```json
{
  "scripts": {
    "start": "node test.js"
  }
}
```

## Deployment Commands

### Option 1: Manual Deploy
1. Go to Render dashboard
2. Click "Manual Deploy"
3. This will trigger a new build with latest code

### Option 2: Restart Service
1. Go to your service in Render dashboard
2. Click "Restart"
3. This will restart with current build

### Option 3: Rebuild from Scratch
1. Delete current service
2. Create new service with same settings
3. Add environment variables
4. Deploy fresh

## Verification

### Check Health Endpoint
```bash
curl https://matchday-5-1-1.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-17T..."
}
```

## Common Build Errors & Fixes

### Error: "Cannot find module 'dotenv'"
**Fix**: Add `require('dotenv').config();` to top of index.js

### Error: "Cannot find module './Routes/authRoutes'"
**Fix**: Check file paths and import statements

### Error: "PORT is not defined"
**Fix**: Add `const PORT = process.env.PORT || 5000;`

### Error: "DATABASE_URL is not defined"
**Fix**: Add `require('dotenv').config();` before any database usage

## Next Steps

1. **Apply the quick fix** above
2. **Push to GitHub**
3. **Trigger manual deploy** in Render
4. **Monitor build logs** in Render dashboard
5. **Test health endpoint** once deployed

The goal is to get a basic working version first, then add features gradually.
