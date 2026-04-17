require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'MATCHDAY API is running'
  });
});

// Basic API info
app.get('/api', (req, res) => {
  res.json({ 
    message: 'MATCHDAY Football Field Booking API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      matches: '/api/matches',
      auth: '/api/auth'
    }
  });
});

// Simple matches endpoint
app.get('/api/matches', (req, res) => {
  res.json({
    matches: [],
    message: 'Matches endpoint ready - database connection needed'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`MATCHDAY API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
