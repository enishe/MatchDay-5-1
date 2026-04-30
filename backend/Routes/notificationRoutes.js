const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const BookingService = require('../Services/BookingService');

const router = express.Router();
const bookingService = new BookingService();

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
