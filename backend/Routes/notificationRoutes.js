const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const BookingService = require('../Services/BookingService');
const NotificationService = require('../Services/NotificationService');

const router = express.Router();
const bookingService = new BookingService();
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
    const count = await notificationService.getMyUnreadCount(Number(req.user.id));
    res.json({ count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/my/:id/read', authenticateToken, async (req, res) => {
  try {
    const data = await notificationService.markMyNotificationRead(
      Number(req.user.id),
      Number(req.params.id)
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
    const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';
    const rows = await bookingService.getAdminNotifications(unreadOnly);
    res.json(rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/read', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const data = await bookingService.markNotificationRead(Number(req.params.id));
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/count', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const count = await bookingService.getUnreadNotificationCount();
    res.json({ count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
