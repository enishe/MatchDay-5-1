const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const NotificationService = require('../Services/NotificationService');
const pool = require('../config/db');

const router = express.Router();
const notificationService = new NotificationService();

function isStaffAdminRole(role) {
    return role === 'admin' || role === 'superadmin' || role === 'field_admin';
}

function staffNotificationUserId(user) {
    if (user.role === 'field_admin') return Number(user.id);
    if (user.role === 'admin' || user.role === 'superadmin') return null;
    return Number(user.id);
}

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

router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const count = isStaffAdminRole(req.user.role)
      ? await notificationService.getUnreadCount(staffNotificationUserId(req.user))
      : await notificationService.getMyUnreadCount(userId);
    res.json({ count: Number(count) || 0 });
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

router.patch('/my/:id/read', authenticateToken, async (req, res) => {
  try {
    const data = await notificationService.markMyNotificationRead(
      Number(req.user.id),
      String(req.params.id)
    );
    res.json({ success: true, ...data });
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

router.patch('/my/read-all', authenticateToken, async (req, res) => {
  try {
    const data = await notificationService.markAllMyNotificationsRead(Number(req.user.id));
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/admin/read-all', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
  try {
    const data = await notificationService.markAllAdminNotificationsRead();
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/my/:id', authenticateToken, async (req, res) => {
  try {
    await notificationService.deleteNotification(String(req.params.id), Number(req.user.id));
    res.json({ success: true });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message });
  }
});

router.get('/', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
    try {
        console.warn('[notifications] Legacy admin endpoint in use: GET /api/notifications');
        const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';
        const rows = await notificationService.listNotifications(staffNotificationUserId(req.user), 100);
    res.json(unreadOnly ? rows.filter((n) => !n.is_read) : rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/read', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
  try {
    console.warn('[notifications] Legacy admin endpoint in use: PUT /api/notifications/:id/read');
    const data = await notificationService.markAsRead(String(req.params.id), staffNotificationUserId(req.user));
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const data = isStaffAdminRole(req.user.role)
      ? await notificationService.markAsRead(String(req.params.id), staffNotificationUserId(req.user))
      : await notificationService.markMyNotificationRead(Number(req.user.id), String(req.params.id));
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    const data = isStaffAdminRole(req.user.role)
      ? (req.user.role === 'field_admin'
        ? await notificationService.markAllMyNotificationsRead(Number(req.user.id))
        : await notificationService.markAllAdminNotificationsRead())
      : await notificationService.markAllMyNotificationsRead(Number(req.user.id));
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/count', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
    try {
        console.warn('[notifications] Legacy admin endpoint in use: GET /api/notifications/count');
        const count = await notificationService.getUnreadCount(staffNotificationUserId(req.user));
    res.json({ count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/admin/unread-count', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
    try {
        const count = await notificationService.getUnreadCount(staffNotificationUserId(req.user));
    res.json({ count: Number(count) || 0 });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
    try {
        await notificationService.deleteNotification(String(req.params.id), staffNotificationUserId(req.user));
    res.json({ success: true });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
