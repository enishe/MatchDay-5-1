# MATCHDAY Platform Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+ or Supabase
- Redis (for session storage, optional)
- Domain with SSL certificate
- Email service (SendGrid/Resend) for notifications

### Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/matchday
# OR Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# JWT
JWT_SECRET=your_jwt_secret_key_at_least_32_characters

# Server
PORT=5000
NODE_ENV=production

# Email Service
EMAIL_SERVICE=resend
EMAIL_API_KEY=your_email_api_key
FROM_EMAIL=noreply@matchday.com

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

#### Frontend (.env)
```bash
VITE_API_URL=https://your-api-domain.com/api
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

#### Option 1: PostgreSQL
```sql
-- Create database
CREATE DATABASE matchday;

-- Run schema
\i backend/Data/schema.sql
```

#### Option 2: Supabase
1. Create new Supabase project
2. Run schema.sql in Supabase SQL editor
3. Enable Realtime on tables: MatchPlayers, PlayerPayments, Bookings, Notifications
4. Set up Row Level Security policies

### Frontend Deployment

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

#### Docker
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Deployment

#### Docker (Recommended)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

#### PM2 (Node.js)
```bash
# Install PM2
npm i -g pm2

# Start application
cd backend
pm2 start ecosystem.config.js
```

#### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'matchday-api',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### SSL Configuration

#### Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### Monitoring & Logging

#### Health Checks
- Backend: `GET /health`
- Database: Connection pool monitoring
- Frontend: Error tracking with Sentry

#### Log Management
```bash
# Rotate logs
pm2 logs matchday-api --lines 1000

# Log aggregation
tail -f /var/log/matchday/app.log | jq '.'
```

### Cron Jobs

#### Auto-Cancel Matches
```bash
# Every 5 minutes
*/5 * * * * curl -X POST https://your-api.com/api/auto-cancel

# Every hour for no-show detection
0 * * * * curl -X POST https://your-api.com/api/handle-no-show

# Every 30 minutes for email queue
*/30 * * * * curl -X POST https://your-api.com/api/process-email-queue
```

### Security

#### Environment Security
- Use environment variables for all secrets
- Enable CORS for specific domains only
- Implement rate limiting
- Set up firewall rules

#### Database Security
- Use connection pooling
- Enable SSL for database connections
- Regular backups
- Row Level Security policies

### Performance Optimization

#### Backend
- Enable gzip compression
- Implement caching with Redis
- Use CDN for static assets
- Database query optimization

#### Frontend
- Code splitting
- Image optimization
- Service worker for caching
- Lazy loading components

### Testing

#### Staging Environment
- Mirror production setup
- Run automated tests
- Performance testing
- Security scanning

#### Load Testing
```bash
# Install artillery
npm i -g artillery

# Run load test
artillery run load-test-config.yml
```

### Backup Strategy

#### Database
```bash
# Daily backup
pg_dump matchday > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump matchday | gzip > /backups/matchday_$DATE.sql.gz
find /backups -name "*.sql.gz" -mtime +30 -delete
```

#### File Storage
- User uploads to S3/CloudFront
- Database backups to separate region
- Version control for code

### Troubleshooting

#### Common Issues
1. **Database Connection**: Check connection string and firewall
2. **CORS Errors**: Verify allowed origins
3. **Real-time Issues**: Check Supabase Realtime setup
4. **Payment Failures**: Verify payment gateway credentials
5. **Email Not Sending**: Check API keys and templates

#### Debug Mode
```bash
# Enable debug logging
DEBUG=matchday:* npm start

# Database query logging
PGDEBUG=1 npm start
```

### Scaling

#### Horizontal Scaling
- Load balancer for multiple API instances
- Read replicas for database
- CDN for static assets

#### Vertical Scaling
- Increase server resources based on metrics
- Database connection pool sizing
- Memory optimization for real-time features

### Compliance

#### GDPR
- User data deletion endpoints
- Data export functionality
- Cookie consent management
- Privacy policy implementation

#### Payment Compliance
- PCI DSS compliance
- Secure payment processing
- Audit trail maintenance

---

## 🎯 Quick Start Checklist

- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Set up SSL certificates
- [ ] Configure monitoring
- [ ] Test all critical flows
- [ ] Set up backup procedures
- [ ] Enable logging and alerting

## 📞 Support

For deployment issues:
1. Check logs: `pm2 logs matchday-api`
2. Verify environment variables
3. Test database connectivity
4. Check health endpoint: `curl https://your-api.com/health`
