const express = require('express');
const cors = require('cors');
const matchRoutes = require('./Routes/matchRoutes');
const { router: authRoutes } = require('./Routes/authRoutes');
const RealtimeInitializer = require('./Services/RealtimeInitializer');
const CheckInService = require('./Services/CheckInService');
const NotificationService = require('./Services/NotificationService');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize services
const realtimeInitializer = new RealtimeInitializer();
const checkInService = new CheckInService();
const notificationService = new NotificationService();

// Check-in routes
app.post('/api/check-in', authRoutes.authenticateToken, async (req, res) => {
    try {
        const { booking_id } = req.body;
        const result = await checkInService.playerCheckIn(req.user.id, booking_id);
        res.json(result);
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/admin/check-in', authRoutes.authenticateToken, authRoutes.requireRole(['admin']), async (req, res) => {
    try {
        const { booking_id, player_ids } = req.body;
        const result = await checkInService.adminCheckIn(req.user.id, booking_id, player_ids);
        res.json(result);
    } catch (error) {
        console.error('Admin check-in error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/handle-no-show', async (req, res) => {
    try {
        const result = await checkInService.handleNoShow();
        res.json(result);
    } catch (error) {
        console.error('No-show handling error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Notification routes
app.get('/api/notifications', authRoutes.authenticateToken, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const notifications = await notificationService.getUserNotifications(req.user.id, limit, offset);
        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/notifications/unread-count', authRoutes.authenticateToken, async (req, res) => {
    try {
        const count = await notificationService.getUnreadCount(req.user.id);
        res.json({ unread_count: count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/notifications/read', authRoutes.authenticateToken, async (req, res) => {
    try {
        const { notification_ids } = req.body;
        await notificationService.markAsSent(req.user.id, notification_ids);
        res.json({ success: true });
    } catch (error) {
        console.error('Mark notifications as read error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/send-email-confirmation', authRoutes.authenticateToken, async (req, res) => {
    try {
        const { booking_id, type } = req.body;
        const result = await notificationService.sendEmailConfirmation(req.user.id, booking_id, type);
        res.json(result);
    } catch (error) {
        console.error('Send email confirmation error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Admin notification stats
app.get('/api/admin/notifications/stats', authRoutes.authenticateToken, authRoutes.requireRole(['admin']), async (req, res) => {
    try {
        const stats = await notificationService.getNotificationStats();
        res.json(stats);
    } catch (error) {
        console.error('Get notification stats error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Process email queue (cron job)
app.post('/api/process-email-queue', async (req, res) => {
    try {
        const { limit = 50 } = req.body;
        const result = await notificationService.processEmailQueue(limit);
        res.json(result);
    } catch (error) {
        console.error('Process email queue error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', matchRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        realtime: realtimeInitializer.isInitialized,
        services: {
            realtime: realtimeInitializer.isInitialized,
            checkin: true,
            notifications: true
        }
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Serveri u ndez ne portin ${PORT}`);
    
    try {
        // Initialize real-time services after server starts
        await realtimeInitializer.initialize();
        console.log('MATCHDAY Platform initialized successfully');
        console.log('Available endpoints:');
        console.log('- Authentication: /api/auth/*');
        console.log('- Matches: /api/matches/*');
        console.log('- Check-in: /api/check-in, /api/admin/check-in');
        console.log('- Notifications: /api/notifications/*');
        console.log('- Email: /api/send-email-confirmation');
        console.log('- Admin: /api/admin/*');
        console.log('- Health: /health');
    } catch (error) {
        console.error('Failed to initialize services:', error);
    }
});