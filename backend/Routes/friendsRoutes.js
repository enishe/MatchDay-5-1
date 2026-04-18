const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../Services/NotificationService');

const router = express.Router();
const notifications = new NotificationService();

router.use(authenticateToken);

/** Lista e miqve (ftesa të pranuara) */
router.get('/', async (req, res) => {
  try {
    const me = req.user.id;
    const r = await pool.query(
      `SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at,
              u.id AS friend_id, u.name AS friend_name, u.email AS friend_email
       FROM friend_requests fr
       JOIN users u ON u.id = CASE
         WHEN fr.from_user_id = $1 THEN fr.to_user_id
         ELSE fr.from_user_id
       END
       WHERE fr.status = 'accepted'
         AND (fr.from_user_id = $1 OR fr.to_user_id = $1)
       ORDER BY fr.created_at DESC`,
      [me]
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(
      r.rows.map((row) => ({
        friendshipId: row.id,
        friend: { id: row.friend_id, name: row.friend_name, email: row.friend_email },
      }))
    );
  } catch (e) {
    console.error('Friends list:', e);
    res.status(400).json({ error: e.message });
  }
});

/** Ftesa në pritje (marrë) */
router.get('/pending', async (req, res) => {
  try {
    const me = req.user.id;
    const r = await pool.query(
      `SELECT fr.id, fr.from_user_id, fr.created_at, u.name, u.email
       FROM friend_requests fr
       JOIN users u ON u.id = fr.from_user_id
       WHERE fr.to_user_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [me]
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(
      r.rows.map((row) => ({
        id: row.id,
        from: { id: row.from_user_id, name: row.name, email: row.email },
        created_at: row.created_at,
      }))
    );
  } catch (e) {
    console.error('Friends pending:', e);
    res.status(400).json({ error: e.message });
  }
});

/** Dërgo ftesë miqësie me email */
router.post('/request', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email është i detyrueshëm.' });
    const t = await pool.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = $1', [email]);
    if (t.rows.length === 0) return res.status(404).json({ error: 'Nuk u gjet lojtar me këtë email.' });
    const toId = t.rows[0].id;
    if (toId === req.user.id) return res.status(400).json({ error: 'Nuk mund të shtoni veten.' });

    const dup = await pool.query(
      `SELECT id, status FROM friend_requests
       WHERE (from_user_id = $1 AND to_user_id = $2)
          OR (from_user_id = $2 AND to_user_id = $1)`,
      [req.user.id, toId]
    );
    if (dup.rows.length > 0) {
      const st = dup.rows[0].status;
      if (st === 'accepted') return res.status(400).json({ error: 'Jeni tashmë miq.' });
      if (st === 'pending') return res.status(400).json({ error: 'Ftesa ekziston tashmë.' });
      await pool.query('DELETE FROM friend_requests WHERE id = $1', [dup.rows[0].id]);
    }

    const ins = await pool.query(
      `INSERT INTO friend_requests (from_user_id, to_user_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id`,
      [req.user.id, toId]
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(201).json({ ok: true, id: ins.rows[0].id });
  } catch (e) {
    console.error('Friend request:', e);
    res.status(400).json({ error: e.message });
  }
});

/** Prano ftesë */
router.post('/accept/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await pool.query(
      `UPDATE friend_requests SET status = 'accepted'
       WHERE id = $1 AND to_user_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, req.user.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Ftesa nuk u gjet.' });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({ ok: true });
  } catch (e) {
    console.error('Friend accept:', e);
    res.status(400).json({ error: e.message });
  }
});

/** Refuzo */
router.post('/decline/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await pool.query(
      `UPDATE friend_requests SET status = 'declined'
       WHERE id = $1 AND to_user_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, req.user.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Ftesa nuk u gjet.' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** Njoftim: fto mikun në ndeshjen e radhës (organizatori) */
router.post('/invite-to-match', async (req, res) => {
  try {
    const friendId = parseInt(req.body.friendId, 10);
    if (Number.isNaN(friendId)) return res.status(400).json({ error: 'friendId është i pavlefshëm.' });

    const ok = await pool.query(
      `SELECT 1 FROM friend_requests
       WHERE status = 'accepted'
         AND ((from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1))`,
      [req.user.id, friendId]
    );
    if (ok.rows.length === 0) return res.status(403).json({ error: 'Miqësia duhet të jetë e pranuar.' });

    const m = await pool.query(
      `SELECT id, start_time FROM bookings
       WHERE organizer_id = $1 AND status IN ('pending', 'confirmed')
       ORDER BY start_time ASC
       LIMIT 1`,
      [req.user.id]
    );
    if (m.rows.length === 0) {
      return res.status(400).json({ error: 'Nuk keni ndeshje aktive për ta ndarë.' });
    }
    const bookingId = m.rows[0].id;
    const path = `/match/${bookingId}`;
    const base = (process.env.PUBLIC_APP_URL || '').replace(/\/+$/, '');
    const abs = base ? `${base}${path}` : path;
    const body = `Ti je ftuar në ndeshje. Hap linkun: ${abs}`;

    await notifications.createNotification(
      friendId,
      'reminder',
      'Ftesë në ndeshje — MatchDay',
      body,
      bookingId
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({ ok: true, matchId: bookingId, path, link: abs });
  } catch (e) {
    console.error('Invite to match:', e);
    res.status(400).json({ error: e.message });
  }
});

module.exports = { router };
