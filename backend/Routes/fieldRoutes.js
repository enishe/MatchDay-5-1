const express = require('express');
const FieldService = require('../Services/FieldService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const fieldService = new FieldService();

function validateFieldPayload(body, isUpdate = false) {
  const errors = [];
  const terrain = body.terrain_type;
  if (!isUpdate || body.name !== undefined) {
    if (!String(body.name || '').trim()) errors.push('Emri i fushës është i detyrueshëm.');
  }
  if (!isUpdate || body.location !== undefined) {
    if (!String(body.location || '').trim()) errors.push('Lokacioni është i detyrueshëm.');
  }
  if (!isUpdate || body.terrain_type !== undefined) {
    if (!['artificial_grass', 'indoor_hall'].includes(terrain)) {
      errors.push('Lloji i terrenit duhet të jetë artificial_grass ose indoor_hall.');
    }
  }
  if (!isUpdate || body.price_per_hour !== undefined) {
    if (!Number.isFinite(Number(body.price_per_hour)) || Number(body.price_per_hour) <= 0) {
      errors.push('Çmimi për orë duhet të jetë numër pozitiv.');
    }
  }
  if (!isUpdate || body.courts_count !== undefined) {
    if (!Number.isInteger(Number(body.courts_count)) || Number(body.courts_count) < 1 || Number(body.courts_count) > 10) {
      errors.push('Numri i fushave duhet të jetë nga 1 deri në 10.');
    }
  }
  return errors;
}

router.get('/fields', async (req, res) => {
  try {
    const rows = await fieldService.getAllFields();
    res.json(rows);
  } catch (error) {
    res.status(400).json({ error: 'Nuk u lexuan fushat.' });
  }
});

router.get('/fields/inventory', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const grouped = await fieldService.getAllShoesGroupedByField();
    res.json(grouped);
  } catch {
    res.status(400).json({ error: 'Nuk u lexua inventari.' });
  }
});

router.get('/fields/availability-grid', async (req, res) => {
  try {
    const { startDate, days, startHour, endHour, fieldIds } = req.query;
    if (!startDate) {
      return res.status(400).json({ error: 'Parametri startDate është i detyrueshëm.' });
    }
    const ids = typeof fieldIds === 'string' && fieldIds.trim()
      ? fieldIds.split(',').map((x) => Number(x.trim())).filter((x) => Number.isInteger(x) && x > 0)
      : [];
    const data = await fieldService.getAvailabilityGrid({
      startDate: String(startDate),
      days: days != null ? Number(days) : 7,
      startHour: startHour != null ? Number(startHour) : 8,
      endHour: endHour != null ? Number(endHour) : 22,
      fieldIds: ids,
    });
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Nuk u lexua kalendari.' });
  }
});

// Backward-compatible calendar endpoint used by smoke checks and older clients.
router.get('/fields/availability', authenticateToken, async (req, res) => {
  try {
    const date = String(req.query.date || '').trim();
    if (!date) {
      return res.status(400).json({ error: 'date është e detyrueshme' });
    }
    const dayData = await fieldService.getAvailabilityGrid({
      startDate: date,
      days: 1,
      startHour: 8,
      endHour: 22,
    });
    const hours = [];
    for (let h = 8; h <= 22; h += 1) hours.push(`${String(h).padStart(2, '0')}:00`);
    const fields = (dayData.fields || []).map((f) => ({
      id: f.id,
      name: f.name,
      slots: hours.map((time) => {
        const slot = dayData.availability?.[date]?.[time]?.[f.id];
        const free = Number(slot?.free || 0);
        return free > 0 ? { time, available: true } : { time, available: false, bookedBy: 'E zënë' };
      }),
    }));
    res.json({ fields });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Nuk u lexua disponueshmëria e fushave.' });
  }
});

router.get('/fields/:id', async (req, res) => {
  try {
    const field = await fieldService.getFieldById(Number(req.params.id));
    const shoes = await fieldService.getShoesByField(Number(req.params.id));
    res.json({ ...field, shoes_inventory: shoes });
  } catch (error) {
    res.status(404).json({ error: error.message || 'Fusha nuk u gjet.' });
  }
});

router.get('/fields/:id/availability', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Parametrat start dhe end janë të detyrueshëm.' });
    const data = await fieldService.getAvailableCourts(Number(req.params.id), start, end);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Nuk u lexua disponueshmëria.' });
  }
});

router.post('/fields', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const errors = validateFieldPayload(req.body, false);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    const field = await fieldService.createField({
      name: String(req.body.name).trim(),
      location: String(req.body.location).trim(),
      terrain_type: req.body.terrain_type,
      price_per_hour: Number(req.body.price_per_hour),
      courts_count: Number(req.body.courts_count),
    });
    res.status(201).json(field);
  } catch {
    res.status(400).json({ error: 'Krijimi i fushës dështoi.' });
  }
});

router.put('/fields/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const errors = validateFieldPayload(req.body, true);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    const updated = await fieldService.updateField(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Përditësimi i fushës dështoi.' });
  }
});

router.delete('/fields/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const data = await fieldService.deleteField(Number(req.params.id));
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Çaktivizimi i fushës dështoi.' });
  }
});

router.put('/fields/:id/shoes', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.inventory) ? req.body.inventory : [];
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Dërgoni të paktën një rresht inventari.' });
    }
    const sanitized = rows.map((r) => ({
      shoe_size: Number(r.shoe_size),
      quantity_available: Number(r.quantity_available),
      rent_price: r.rent_price != null ? Number(r.rent_price) : undefined,
    }));
    const updated = await fieldService.updateShoesInventory(Number(req.params.id), sanitized);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Përditësimi i inventarit dështoi.' });
  }
});

module.exports = router;
