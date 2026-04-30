require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');
const { router: authRouter } = require('./Routes/authRoutes');
const { router: friendsRouter } = require('./Routes/friendsRoutes');
const matchRouter = require('./Routes/matchRoutes');
const fieldRoutes = require('./Routes/fieldRoutes');
const bookingRoutes = require('./Routes/bookingRoutes');
const notificationRoutes = require('./Routes/notificationRoutes');
const { ensureSchema, seedMitrovicaFields } = require('./config/ensureSchema');
const AuthService = require('./Services/AuthService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MATCHDAY backend is running' });
});

// API routes para static — shmang përplasje me skedarë në dist
app.use('/api/auth', authRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', fieldRoutes);
app.use('/api', matchRouter);

// Serve static files from frontend dist folder
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Root endpoint - serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    res.status(404).json({ error: 'Not found' });
  } else {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Gabim i brendshëm në server.',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint-i i API-së nuk u gjet.' });
});

async function bootstrap() {
  await pool
    .query('SELECT NOW()')
    .then(() => console.log('[DB] PostgreSQL connected successfully'))
    .catch((err) => {
      console.error('[DB] Connection failed:', err.message);
      throw err;
    });
  await ensureSchema();
  await seedMitrovicaFields();
  const authService = new AuthService();
  try {
    await authService.ensureAdminUser();
    console.log('[startup] Admin check complete');
  } catch (err) {
    console.error('[startup] Admin check failed:', err?.message || err);
    throw err;
  }
}

bootstrap()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MATCHDAY server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });

module.exports = app;
