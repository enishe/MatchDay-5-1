const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { nickname } = req.query;
    if (!nickname || nickname.trim().length < 2) {
      return res.status(400).json({
        error: 'Nickname duhet të ketë të paktën 2 karaktere.',
      });
    }

    const result = await pool.query(
      `SELECT
        u.id,
        u.name,
        u.nickname,
        COALESCE(u.profile_photo_url, u.profile_photo) AS profile_photo_url,
        u.preferred_field_id,
        f.name AS preferred_field_name,
        COUNT(DISTINCT b.id) FILTER (
          WHERE DATE_TRUNC('month', b.start_time) = DATE_TRUNC('month', NOW())
          AND b.status != 'canceled'
        ) AS matches_this_month
       FROM users u
       LEFT JOIN fields f ON f.id = u.preferred_field_id
       LEFT JOIN bookings b ON b.organizer_id = u.id
       WHERE LOWER(u.nickname) = LOWER(TRIM($1))
         AND u.role IN ('participant', 'player')
       GROUP BY u.id, u.name, u.nickname, u.profile_photo_url, u.profile_photo, u.preferred_field_id, f.name
       LIMIT 1`,
      [nickname.trim()]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Asnjë lojtar nuk u gjet me këtë nickname.',
      });
    }

    const player = result.rows[0];
    res.json({
      id: player.id,
      name: player.name,
      nickname: player.nickname,
      profile_photo_url: player.profile_photo_url || null,
      preferred_field_name: player.preferred_field_name || null,
      matches_this_month: parseInt(player.matches_this_month, 10) || 0,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Gabim serveri.' });
  }
});

module.exports = router;
