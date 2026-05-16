const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { cascadeDeleteFieldsForOwner } = require('../utils/fieldCascadeDelete');

const isSuperAdmin = requireRole(['superadmin']);

// GET /api/superadmin/admins — list all field admins with their fields
router.get('/admins', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', f.id, 'name', f.name, 'location', f.location)
          ) FILTER (WHERE f.id IS NOT NULL), '[]'
        ) AS fields
      FROM users u
      LEFT JOIN fields f ON f.owner_id = u.id
      WHERE u.role = 'field_admin'
      GROUP BY u.id
      ORDER BY u.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /superadmin/admins error:', err.message);
    res.status(500).json({ error: 'Gabim gjatë ngarkimit të admin-ëve.' });
  }
});

// POST /api/superadmin/admins — create new field admin
router.post('/admins', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, fieldIds } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Emri, email dhe fjalëkalimi janë të detyrueshëm.' });
    }
    if (!fieldIds || !Array.isArray(fieldIds) || fieldIds.length === 0) {
      return res.status(400).json({ error: 'Zgjidhni të paktën një fushë.' });
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Formati i email-it nuk është i vlefshëm.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Fjalëkalimi duhet të ketë të paktën 8 karaktere.' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
      [email.trim().toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ky email është tashmë i regjistruar.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const inserted = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'field_admin')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.trim().toLowerCase(), hash]
    );
    const newUser = inserted.rows[0];

    await pool.query(
      'UPDATE fields SET owner_id = $1 WHERE id = ANY($2::int[])',
      [newUser.id, fieldIds]
    );

    const fieldsResult = await pool.query(
      'SELECT id, name, location FROM fields WHERE owner_id = $1',
      [newUser.id]
    );

    res.status(201).json({ ...newUser, fields: fieldsResult.rows });
  } catch (err) {
    console.error('POST /superadmin/admins error:', err.message);
    res.status(500).json({ error: 'Gabim gjatë krijimit të admin-it.' });
  }
});

// DELETE /api/superadmin/admins/:id — remove field admin
router.delete('/admins/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const adminId = parseInt(req.params.id);
    if (isNaN(adminId)) {
      return res.status(400).json({ error: 'ID e pavlefshme.' });
    }

    const check = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [adminId]
    );
    if (!check.rows.length) {
      return res.status(404).json({ error: 'Admin-i nuk u gjet.' });
    }
    if (check.rows[0].role !== 'field_admin') {
      return res.status(400).json({ error: 'Ky user nuk është field_admin.' });
    }

    await cascadeDeleteFieldsForOwner(adminId);
    await pool.query("UPDATE users SET role = 'participant' WHERE id = $1", [adminId]);

    res.json({ success: true, message: 'Admin-i dhe të gjitha fushat u larguan.' });
  } catch (err) {
    console.error('DELETE /superadmin/admins error:', err.message);
    res.status(500).json({ error: 'Gabim gjatë fshirjes së admin-it.' });
  }
});

module.exports = router;
