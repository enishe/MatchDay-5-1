console.log('🔍 Starting MATCHDAY deployment diagnostic...');

try {
  // Test 1: Check if dotenv loads
  console.log('📦 Testing dotenv...');
  require('dotenv').config();
  console.log('✅ dotenv loaded successfully');

  // Test 2: Check environment variables
  console.log('🌍 Testing environment variables...');
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
  };
  console.log('Environment variables:', envVars);

  // Test 3: Check if express loads
  console.log('🚀 Testing express...');
  const express = require('express');
  console.log('✅ express loaded successfully');

  // Test 4: Check if cors loads
  console.log('🌐 Testing cors...');
  const cors = require('cors');
  console.log('✅ cors loaded successfully');

  // Test 5: Create basic app
  console.log('⚙️ Creating Express app...');
  const app = express();
  app.use(cors());
  app.use(express.json());
  console.log('✅ Express app created');

  // Test 6: Add health endpoint
  app.get('/health', (req, res) => {
    console.log('🏥 Health check requested');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'MATCHDAY API is running',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000
    });
  });

  // Test 7: Add debug endpoint
  app.get('/debug', (req, res) => {
    console.log('🐛 Debug endpoint requested');
    res.json({
      message: 'MATCHDAY Debug Info',
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      database_url: process.env.DATABASE_URL ? 'configured' : 'missing',
      jwt_secret: process.env.JWT_SECRET ? 'configured' : 'missing',
      node_version: process.version,
      platform: process.platform
    });
  });

  // Test 8: Start server
  const PORT = process.env.PORT || 5000;
  console.log(`🚀 Starting server on port ${PORT}...`);
  
  app.listen(PORT, () => {
    console.log('✅ SUCCESS: MATCHDAY API is running!');
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🐛 Debug info: http://localhost:${PORT}/debug`);
    console.log('🎯 Deployment diagnostic complete - server is ready');
  });

} catch (error) {
  console.error('❌ CRITICAL ERROR:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
