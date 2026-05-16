const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireRole, requireFieldAccess } = require('../middleware/auth');

router.get(
  '/fields/:id/blocked-slots',
  authenticateToken,
  requireRole(['admin', 'field_admin']),
  requireFieldAccess,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM blocked_slots
         WHERE field_id = $1
         ORDER BY blocked_date ASC NULLS LAST, blocked_hour ASC NULLS LAST`,
        [parseInt(req.params.id, 10)]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Gabim gjatë ngarkimit.' });
    }
  }
);

router.post(
  '/fields/:id/blocked-slots',
  authenticateToken,
  requireRole(['admin', 'field_admin']),
  requireFieldAccess,
  async (req, res) => {
    try {
      const fieldId = parseInt(req.params.id, 10);
      const { block_type, blocked_date, blocked_hour, weekday, reason } = req.body;

      if (!block_type) {
        return res.status(400).json({ error: 'block_type është i detyrueshëm.' });
      }
      if (block_type === 'hour' && (!blocked_date || blocked_hour == null)) {
        return res.status(400).json({ error: 'Ora dhe data janë të detyrueshme.' });
      }
      if (block_type === 'full_day' && !blocked_date) {
        return res.status(400).json({ error: 'Data është e detyrueshme.' });
      }
      if (block_type === 'weekday' && weekday == null) {
        return res.status(400).json({ error: 'Dita e javës është e detyrueshme.' });
      }

      const result = await pool.query(
        `INSERT INTO blocked_slots
         (field_id, block_type, blocked_date, blocked_hour, weekday, reason)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          fieldId,
          block_type,
          blocked_date || null,
          blocked_hour ?? null,
          weekday ?? null,
          reason || null,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Gabim gjatë bllokimit.' });
    }
  }
);

router.delete(
  '/fields/:id/blocked-slots/:slotId',
  authenticateToken,
  requireRole(['admin', 'field_admin']),
  requireFieldAccess,
  async (req, res) => {
    try {
      await pool.query('DELETE FROM blocked_slots WHERE id = $1 AND field_id = $2', [
        parseInt(req.params.slotId, 10),
        parseInt(req.params.id, 10),
      ]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Gabim gjatë fshirjes.' });
    }
  }
);

module.exports = router;
