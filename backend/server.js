require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pool = require('./config/db');
const { router: authRouter } = require('./Routes/authRoutes');
const { router: friendsRouter } = require('./Routes/friendsRoutes');
const matchRouter = require('./Routes/matchRoutes');
const fieldRoutes = require('./Routes/fieldRoutes');
const bookingRoutes = require('./Routes/bookingRoutes');
const notificationRoutes = require('./Routes/notificationRoutes');
const superAdminRoutes = require('./Routes/superAdminRoutes');
const userRoutes = require('./Routes/userRoutes');
const blockedSlotRoutes = require('./Routes/blockedSlotRoutes');
const { ensureSchema } = require('./config/ensureSchema');
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

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Shumë kërkesa. Provo përsëri pas 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Shumë përpjekje hyrjeje. Provo përsëri pas 15 minutave.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Shumë rezervime. Provo përsëri pas 1 ore.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/bookings', bookingLimiter);

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
app.use('/api', blockedSlotRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/users', userRoutes);

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

function scheduleMatchReminders() {
  const runReminders = async () => {
    try {
      const result = await pool.query(`
        SELECT
          b.id, b.organizer_id, b.start_time, b.field_id,
          f.name AS field_name,
          u.name AS organizer_name
        FROM bookings b
        JOIN fields f ON f.id = b.field_id
        JOIN users u ON u.id = b.organizer_id
        WHERE b.status = 'confirmed'
          AND b.start_time > NOW() + INTERVAL '2 hours 45 minutes'
          AND b.start_time <= NOW() + INTERVAL '3 hours'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.booking_id = b.id
              AND n.type = 'reminder'
              AND n.recipient_id = b.organizer_id
          )
      `);

      for (const booking of result.rows) {
        const startFormatted = new Date(booking.start_time).toLocaleString('sq-AL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Belgrade',
        });

        await pool.query(
          `INSERT INTO notifications
           (user_id, recipient_id, recipient_type, type, title, message,
            subject, body, booking_id, is_read)
           VALUES ($1, $1, 'user', 'reminder', $2, $3, $2, $3, $4, false)`,
          [
            booking.organizer_id,
            'Kujtesë për ndeshjen!',
            `Ndeshja juaj në ${booking.field_name} fillon në 3 orë (ora ${startFormatted}). Mos harroni!`,
            booking.id,
          ]
        );
      }

      if (result.rows.length > 0) {
        console.log(`[reminders] Sent ${result.rows.length} reminder(s)`);
      }
    } catch (err) {
      console.error('[reminders] Error:', err.message);
    }
  };

  runReminders();
  setInterval(runReminders, 15 * 60 * 1000);
  console.log('[reminders] Scheduler started');
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
    scheduleMatchReminders();
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
