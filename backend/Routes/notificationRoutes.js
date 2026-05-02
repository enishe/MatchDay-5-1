const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const NotificationService = require('../Services/NotificationService');
const pool = require('../config/db');

const router = express.Router();
const notificationService = new NotificationService();

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const rows = await notificationService.getMyNotifications(Number(req.user.id), 20);
    res.json(rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/my/count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE recipient_id = $1 AND is_read = false`,
      [Number(req.user.id)]
    );
    const count = parseInt(result.rows?.[0]?.count, 10) || 0;
    res.json({ count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/my/:id/read', authenticateToken, async (req, res) => {
  try {
    const data = await notificationService.markMyNotificationRead(
      Number(req.user.id),
      String(req.params.id)
    );
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/my/read-all', authenticateToken, async (req, res) => {
  try {
    const data = await notificationService.markAllMyNotificationsRead(Number(req.user.id));
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.warn('[notifications] Legacy admin endpoint in use: GET /api/notifications');
    const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';
    const rows = await notificationService.listNotifications(null, 100);
    res.json(unreadOnly ? rows.filter((n) => !n.is_read) : rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/read', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.warn('[notifications] Legacy admin endpoint in use: PUT /api/notifications/:id/read');
    const data = await notificationService.markAsRead(String(req.params.id), null);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/count', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.warn('[notifications] Legacy admin endpoint in use: GET /api/notifications/count');
    const count = await notificationService.getUnreadCount(null);
    res.json({ count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
