// MATCHDAY Platform - Render Compatible Version
// This version is designed to work perfectly on Render

const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // Health check endpoint
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'MATCHDAY API is running on Render',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }));
    return;
  }

  // Basic API info
  if (path === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'MATCHDAY Football Field Booking API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        health: '/health',
        matches: '/api/matches (coming soon)',
        auth: '/api/auth (coming soon)',
        docs: '/api/docs (coming soon)'
      }
    }));
    return;
  }

  // Root endpoint
  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Welcome to MATCHDAY API',
      status: 'operational',
      health_check: '/health',
      documentation: 'https://github.com/enishe/MatchDay-5-1'
    }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    message: 'Endpoint not available yet',
    available_endpoints: ['/health', '/api', '/']
  }));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('🚀 MATCHDAY API started successfully!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Ready for Render deployment!');
});
