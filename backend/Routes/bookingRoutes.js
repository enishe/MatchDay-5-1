const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const BookingService = require('../Services/BookingService');

const router = express.Router();
const bookingService = new BookingService();

router.post('/cash', authenticateToken, async (req, res) => {
  try {
    const data = await bookingService.createCashBooking(Number(req.user.id), req.body || {});
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/card', authenticateToken, async (req, res) => {
  try {
    const data = await bookingService.createCardBooking(Number(req.user.id), req.body || {});
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/join/:token', authenticateToken, async (req, res) => {
  try {
    const data = await bookingService.acceptInvite(String(req.params.token || ''), Number(req.user.id));
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const data = await bookingService.participantPayment(
      Number(req.params.id),
      Number(req.user.id),
      Boolean(req.body?.needsShoes),
      req.body?.shoeSize
    );
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const rows = await bookingService.getMyBookings(Number(req.user.id));
    res.json(rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
