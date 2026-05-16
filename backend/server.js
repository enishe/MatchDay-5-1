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
const superAdminRoutes = require('./Routes/superAdminRoutes');
const { ensureSchema, seedMitrovicaFields } = require('./config/ensureSchema');
const AuthService = require('./Services/AuthService');
const TokenBlacklistService = require('./Services/TokenBlacklistService');
const checkTokenBlacklist = require('./middleware/checkTokenBlacklist');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MATCHDAY backend is running' });
});

// API routes para static — shmang përplasje me skedarë në dist
app.use('/api', checkTokenBlacklist);
app.use('/api/auth', authRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', fieldRoutes);
app.use('/api', matchRouter);
app.use('/api/superadmin', superAdminRoutes);

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

function scheduleTokenBlacklistCleanup() {
  const tokenBlacklistService = new TokenBlacklistService();
  const cleanup = async () => {
    try {
      await tokenBlacklistService.cleanupExpired();
    } catch (error) {
      console.error('[token-blacklist] Cleanup failed:', error?.message || error);
    }
  };
  cleanup();
  setInterval(cleanup, 24 * 60 * 60 * 1000);
}

async function bootstrap() {
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL environment variable is required in production.');
  }

  console.log('[startup] Step 1/4: Testing database connection...');
  const ping = await pool.query('SELECT NOW() AS now');
  console.log('[DB] PostgreSQL connected successfully at', ping.rows[0]?.now);

  console.log('[startup] Step 2/4: Applying schema migrations (ensureSchema)...');
  await ensureSchema();
  console.log('[startup] ensureSchema complete');

  console.log('[startup] Step 3/4: Seeding Mitrovica fields...');
  await seedMitrovicaFields();
  console.log('[startup] seedMitrovicaFields complete');

  console.log('[startup] Step 4/4: Ensuring admin user exists...');
  const authService = new AuthService();
  await authService.ensureAdminUser();
  console.log('[startup] Admin check complete');
}

async function startServer() {
  try {
    await bootstrap();

    const server = app.listen(PORT, HOST, () => {
      console.log(`[server] MATCHDAY listening on http://${HOST}:${PORT}`);
      console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[server] Health check: http://${HOST}:${PORT}/health`);
    });

    server.on('error', (err) => {
      console.error('[server] Failed to bind:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.error(`[server] Port ${PORT} is already in use.`);
      }
      process.exit(1);
    });

    scheduleTokenBlacklistCleanup();
  } catch (err) {
    console.error('[startup] FATAL — server did not start.');
    console.error('[startup] Error:', err?.message || err);
    if (err?.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

startServer();

module.exports = app;
