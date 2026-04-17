// MATCHDAY Platform - Ultra Minimal Render Version
// ZERO external dependencies - uses only Node.js built-in modules

const http = require('http');

const server = http.createServer((req, res) => {
  // Set CORS headers for Render
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'MATCHDAY API is running on Render',
      version: '1.0.0',
      environment: 'production'
    }));
    return;
  }

  // Root endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Welcome to MATCHDAY Football Field Booking API',
      status: 'operational',
      version: '1.0.0',
      health_check: '/health',
      documentation: 'https://github.com/enishe/MatchDay-5-1'
    }));
    return;
  }

  // API info endpoint
  if (req.url === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'MATCHDAY Football Field Booking API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        health: '/health',
        api: '/api',
        docs: 'https://github.com/enishe/MatchDay-5-1'
      }
    }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    message: 'Endpoint not available yet',
    available_endpoints: ['/health', '/api', '/'],
    documentation: 'https://github.com/enishe/MatchDay-5-1'
  }));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('🚀 MATCHDAY API started successfully!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ READY FOR RENDER DEPLOYMENT!');
});
