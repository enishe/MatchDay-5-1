const express = require('express');
const cors = require('cors');
const { router: authRouter } = require('./Routes/authRoutes');
const matchRouter = require('./Routes/matchRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MATCHDAY backend is running' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api', matchRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'MATCHDAY 5+1 API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      matches: '/api/matches/*',
      payments: '/api/payments/*',
      autoCancel: '/api/auto-cancel',
      processEmails: '/api/process-emails'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`MATCHDAY server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
