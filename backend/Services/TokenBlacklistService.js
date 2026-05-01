/**
 * Purpose:
 * Persists invalidated JWT identifiers (jti) so logged-out tokens
 * are rejected before normal auth checks.
 */
const pool = require('../config/db');

class TokenBlacklistService {
  async add(jti, expiresAt) {
    if (!jti) return;
    await pool.query(
      `INSERT INTO token_blacklist (jti, invalidated_at, expires_at)
       VALUES ($1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (jti) DO NOTHING`,
      [jti, expiresAt ? new Date(expiresAt) : null]
    );
  }

  async isBlacklisted(jti) {
    if (!jti) return false;
    const result = await pool.query(
      `SELECT 1
       FROM token_blacklist
       WHERE jti = $1
       LIMIT 1`,
      [jti]
    );
    return result.rows.length > 0;
  }

  async cleanupExpired() {
    await pool.query(
      `DELETE FROM token_blacklist
       WHERE expires_at IS NOT NULL
         AND expires_at < CURRENT_TIMESTAMP`
    );
  }
}

module.exports = TokenBlacklistService;
