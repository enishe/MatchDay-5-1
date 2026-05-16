const express = require('express');
const pool = require('../config/db');
const FieldService = require('../Services/FieldService');
const { authenticateToken, optionalAuthenticate, requireRole, requireFieldAccess } = require('../middleware/auth');

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
    if (!['artificial_grass', 'indoor_hall', 'futsal'].includes(terrain)) {
      errors.push('Lloji i terrenit duhet të jetë artificial_grass, indoor_hall ose futsal.');
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

router.get('/fields', optionalAuthenticate, async (req, res) => {
  try {
    let rows;
    const role = req.user?.role;
    if (role === 'field_admin') {
      const result = await pool.query(
        `SELECT id, name, location, terrain_type, price_per_hour, courts_count, is_active, created_at
         FROM fields
         WHERE owner_id = $1
         ORDER BY id ASC`,
        [req.user.id]
      );
      rows = result.rows;
    } else if (role === 'superadmin' || role === 'admin') {
      rows = await fieldService.getAllFields();
    } else if (role === 'player' || role === 'participant' || !role) {
      const result = await pool.query(
        `SELECT id, name, location, terrain_type, price_per_hour, courts_count, is_active, created_at
         FROM fields
         WHERE is_active = TRUE AND owner_id IS NOT NULL
         ORDER BY location ASC, name ASC`
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `SELECT id, name, location, terrain_type, price_per_hour, courts_count, is_active, created_at
         FROM fields
         WHERE is_active = TRUE AND owner_id IS NOT NULL
         ORDER BY location ASC, name ASC`
      );
      rows = result.rows;
    }
    res.json(rows);
  } catch {
    res.status(400).json({ error: 'Nuk u lexuan fushat.' });
  }
});

router.get('/fields/inventory', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
  try {
    const grouped = await fieldService.getAllShoesGroupedByField();
    if (req.user.role === 'field_admin') {
      const owned = await pool.query(
        'SELECT id FROM fields WHERE owner_id = $1',
        [req.user.id]
      );
      const ownedIds = new Set(owned.rows.map((r) => r.id));
      const filtered = {};
      for (const [key, value] of Object.entries(grouped)) {
        if (ownedIds.has(Number(key))) filtered[key] = value;
      }
      return res.json(filtered);
    }
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
      startHour: startHour != null ? Number(startHour) : 12,
      endHour: endHour != null ? Number(endHour) : 23,
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
      startHour: 12,
      endHour: 23,
    });
    const hours = [];
    for (let h = 12; h <= 23; h += 1) hours.push(`${String(h).padStart(2, '0')}:00`);
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

router.post('/fields', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
  try {
    const errors = validateFieldPayload(req.body, false);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    const ownerId = req.user.role === 'field_admin' ? req.user.id : (req.body.owner_id ?? null);
    const field = await fieldService.createField({
      name: String(req.body.name).trim(),
      location: String(req.body.location).trim(),
      terrain_type: req.body.terrain_type,
      price_per_hour: Number(req.body.price_per_hour),
      courts_count: Number(req.body.courts_count),
      owner_id: ownerId,
    });
    res.status(201).json(field);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Krijimi i fushës dështoi.' });
  }
});

router.put('/fields/:id', authenticateToken, requireRole(['admin', 'field_admin']), requireFieldAccess, async (req, res) => {
  try {
    const errors = validateFieldPayload(req.body, true);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    const updated = await fieldService.updateField(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Përditësimi i fushës dështoi.' });
  }
});

router.delete('/fields/:id', authenticateToken, requireRole(['admin', 'field_admin']), requireFieldAccess, async (req, res) => {
  try {
    const data = await fieldService.deleteField(Number(req.params.id));
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Fshirja e fushës dështoi.' });
  }
});

router.get('/fields/:id/shoes', authenticateToken, requireRole(['admin', 'field_admin']), requireFieldAccess, async (req, res) => {
  try {
    const shoes = await fieldService.getShoesByField(Number(req.params.id));
    res.json(shoes);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Nuk u lexua inventari i patikave.' });
  }
});

router.put('/fields/:id/shoes', authenticateToken, requireRole(['admin', 'field_admin']), requireFieldAccess, async (req, res) => {
  try {
    const raw = Array.isArray(req.body)
      ? req.body
      : (Array.isArray(req.body?.inventory) ? req.body.inventory : []);
    if (raw.length === 0) {
      return res.status(400).json({ error: 'Dërgoni të paktën një rresht inventari.' });
    }
    const sanitized = raw.map((r) => ({
      shoe_size: Number(r.shoe_size ?? r.size),
      quantity_available: Number(r.quantity_available ?? r.quantity),
      rent_price: r.rent_price != null ? Number(r.rent_price) : undefined,
    }));
    const updated = await fieldService.updateShoesInventory(Number(req.params.id), sanitized);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Përditësimi i inventarit dështoi.' });
  }
});

router.put('/fields/:id/shoes/bulk', authenticateToken, requireRole(['admin', 'field_admin']), requireFieldAccess, async (req, res) => {
  try {
    const fieldId = Number(req.params.id);
    const rows = Array.isArray(req.body?.inventory) ? req.body.inventory : [];
    if (!Number.isInteger(fieldId) || fieldId <= 0) {
      return res.status(400).json({ error: 'ID e fushës nuk është valide.' });
    }
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Dërgoni inventarin për ruajtje.' });
    }
    const updated = await fieldService.updateShoesInventoryBulk(fieldId, rows);
    res.json(updated.map((r) => ({
      size: Number(r.shoe_size),
      quantity: Number(r.quantity_available),
      rent_price: Number(r.rent_price),
    })));
  } catch (error) {
    res.status(400).json({ error: error.message || 'Gabim gjatë ruajtjes. Provo përsëri.' });
  }
});

module.exports = router;
