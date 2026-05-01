const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const UnifiedBookingService = require('../Services/UnifiedBookingService');

const router = express.Router();
const bookingService = new UnifiedBookingService();

router.post('/cash', authenticateToken, async (req, res) => {
  // TODO: deprecated — do të ridrejtohet te /api/bookings në v2
  try {
    const { raw, normalized } = await bookingService.createBooking(Number(req.user.id), {
      ...(req.body || {}),
      payment_method: 'cash',
    });
    res.status(201).json({ ...raw, ...normalized });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/card', authenticateToken, async (req, res) => {
  // TODO: deprecated — do të ridrejtohet te /api/bookings në v2
  try {
    const { raw, normalized } = await bookingService.createBooking(Number(req.user.id), {
      ...(req.body || {}),
      payment_method: 'card',
    });
    res.status(201).json({ ...raw, ...normalized });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/join/:token', authenticateToken, async (req, res) => {
  try {
    const data = await bookingService.bookingService.acceptInvite(String(req.params.token || ''), Number(req.user.id));
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const data = await bookingService.bookingService.participantPayment(
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
    const rows = await bookingService.bookingService.getMyBookings(Number(req.user.id));
    res.json(rows.map((row) => ({ ...row, ...bookingService.normalizeBooking(row) })));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
