const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'matchday-secret-key';

const ADMIN_EMAIL = 'admin@matchday.com';
const ADMIN_PASSWORD = 'MatchDay@Admin2026!';

function splitName(full) {
  const t = String(full || '').trim();
  if (!t) return { firstName: '', lastName: '' };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** DB: participant -> API/JWT: player */
function apiRole(dbRole) {
  if (dbRole === 'participant') return 'player';
  return dbRole;
}

function mapUserRow(row) {
  const { firstName, lastName } = splitName(row.name);
  const profilePhoto = row.profile_photo ?? row.profile_photo_url ?? null;
  return {
    id: row.id,
    firstName,
    lastName,
    name: row.name,
    email: row.email,
    role: apiRole(row.role),
    phone: row.phone ?? null,
    bank_account: row.bank_account ?? null,
    avatar_url: row.avatar_url ?? null,
    nickname: row.nickname ?? null,
    profile_photo: profilePhoto,
    profile_photo_url: profilePhoto,
    preferred_field_id: row.preferred_field_id ?? null,
  };
}

class AuthService {
  generateToken(row) {
    const role = apiRole(row.role);
    return jwt.sign({ id: row.id, email: row.email, role }, JWT_SECRET, { expiresIn: '7d' });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      throw new Error('Invalid token');
    }
  }

  async register(userData) {
    const firstName = String(userData.firstName || '').trim();
    const lastName = String(userData.lastName || '').trim();
    const emailNorm = String(userData.email || '').trim().toLowerCase();
    const password = userData.password;
    const confirmPassword = userData.confirmPassword;

    if (!firstName || !lastName) {
      throw new Error('Emri dhe mbiemri jan\u00eb t\u00eb detyruesh\u00ebm.');
    }
    if (!emailNorm) {
      throw new Error('Email \u00ebsht\u00eb i detyruesh\u00ebm.');
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(emailNorm)) {
      throw new Error('Formati i email-it nuk \u00ebsht\u00eb i vlefsh\u00ebm.');
    }
    if (!password || String(password).length < 8) {
      throw new Error('Fjal\u00ebkalimi duhet t\u00eb ket\u00eb t\u00eb pakt\u00ebn 8 karaktere.');
    }
    if (password !== confirmPassword) {
      throw new Error('Fjal\u00ebkalimet nuk p\u00ebrputhen.');
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
      [emailNorm]
    );
    if (existing.rows.length > 0) {
      throw new Error('Ky email \u00ebsht\u00eb tashm\u00eb i regjistruar.');
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const ins = await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'participant')
         RETURNING id, name, email, role, created_at`,
        [fullName, emailNorm, hashedPassword]
      );
      const row = ins.rows[0];
      const token = this.generateToken(row);
      return { user: mapUserRow(row), token };
    } catch (e) {
      if (e && e.code === '23505') {
        throw new Error('Ky email \u00ebsht\u00eb tashm\u00eb i regjistruar.');
      }
      console.error('[AuthService.register] DB:', e.message);
      throw new Error(
        'Regjistrimi d\u00ebshtoi. Kontrollo databaz\u00ebn ose provo p\u00ebrs\u00ebri.'
      );
    }
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email dhe fjal\u00ebkalimi jan\u00eb t\u00eb detyruesh\u00ebm.');
    }
    const emailNorm = String(email).trim().toLowerCase();
    const result = await pool.query(
      'SELECT id, name, email, password, role, created_at FROM users WHERE LOWER(TRIM(email)) = $1',
      [emailNorm]
    );
    if (result.rows.length === 0) {
      throw new Error('Email ose fjal\u00ebkalim i gabuar');
    }
    const row = result.rows[0];
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) {
      throw new Error('Email ose fjal\u00ebkalim i gabuar');
    }
    const token = this.generateToken(row);
    return { user: mapUserRow(row), token };
  }

  async getUserById(userId) {
    const result = await pool
      .query(
        `SELECT id, name, email, role, created_at,
                phone, bank_account, avatar_url, preferred_field_id, nickname, profile_photo, profile_photo_url
         FROM users WHERE id = $1`,
        [userId]
      )
      .catch(() =>
        pool.query(`SELECT id, name, email, role, created_at FROM users WHERE id = $1`, [userId])
      );
    if (result.rows.length === 0) {
      throw new Error('Përdoruesi nuk u gjet.');
    }
    const u = mapUserRow(result.rows[0]);
    const stats = await this.getUserMatchStats(userId);
    return { ...u, stats };
  }

  async getUserMatchStats(userId) {
    const totalR = await pool.query(
      `SELECT COUNT(*)::int AS c FROM bookings WHERE organizer_id = $1`,
      [userId]
    );
    const monthR = await pool.query(
      `SELECT COUNT(*)::int AS c FROM bookings
       WHERE organizer_id = $1
         AND start_time >= date_trunc('month', CURRENT_TIMESTAMP)
         AND start_time < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'`,
      [userId]
    );
    return {
      matches_total: totalR.rows[0]?.c ?? 0,
      matches_this_month: monthR.rows[0]?.c ?? 0,
    };
  }

  async updateProfile(userId, profileData) {
    const {
      firstName,
      lastName,
      phone,
      bank_account,
      avatar_url,
      preferred_field_id,
      nickname,
      profile_photo,
      profile_photo_url,
    } = profileData;
    const updates = [];
    const vals = [];
    let i = 1;

    if (firstName != null || lastName != null) {
      const cur = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const { firstName: fn0, lastName: ln0 } = splitName(cur.rows[0]?.name);
      const fn = firstName != null ? String(firstName).trim() : fn0;
      const ln = lastName != null ? String(lastName).trim() : ln0;
      const full = `${fn} ${ln}`.trim();
      if (full) {
        updates.push(`name = $${i++}`);
        vals.push(full);
      }
    }
    if (phone !== undefined) {
      updates.push(`phone = $${i++}`);
      vals.push(phone === '' || phone == null ? null : String(phone).trim());
    }
    if (bank_account !== undefined) {
      updates.push(`bank_account = $${i++}`);
      vals.push(bank_account === '' || bank_account == null ? null : String(bank_account).trim());
    }
    if (avatar_url !== undefined) {
      const avatar = avatar_url === '' || avatar_url == null ? null : String(avatar_url).trim();
      if (avatar && !avatar.startsWith('data:image')) {
        throw new Error('avatar_url duhet të jetë base64 i fotos (data:image...)');
      }
      updates.push(`avatar_url = $${i++}`);
      vals.push(avatar);
    }
    const incomingProfilePhoto = profile_photo !== undefined ? profile_photo : profile_photo_url;
    if (incomingProfilePhoto !== undefined) {
      const photo = incomingProfilePhoto === '' || incomingProfilePhoto == null ? null : String(incomingProfilePhoto).trim();
      if (photo && !photo.startsWith('data:image')) {
        throw new Error('profile_photo duhet të jetë base64 i fotos (data:image...)');
      }
      updates.push(`profile_photo = $${i++}`);
      vals.push(photo);
    }
    if (nickname !== undefined) {
      const nick = nickname === '' || nickname == null ? null : String(nickname).trim();
      if (nick && nick.length < 3) {
        throw new Error('Nickname duhet të ketë të paktën 3 karaktere.');
      }
      updates.push(`nickname = $${i++}`);
      vals.push(nick);
    }
    if (preferred_field_id !== undefined) {
      const pid = preferred_field_id === '' || preferred_field_id == null ? null : parseInt(preferred_field_id, 10);
      updates.push(`preferred_field_id = $${i++}`);
      vals.push(Number.isNaN(pid) ? null : pid);
    }

    if (updates.length > 0) {
      vals.push(userId);
      try {
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, vals);
      } catch (err) {
        if (err?.code === '23505') {
          throw new Error('Ky nickname është i zënë');
        }
        throw err;
      }
    }
    return this.getUserById(userId);
  }

  async searchUsers(query, currentUserId) {
    const q = String(query || '').trim();
    if (q.length < 2) return [];
    const like = `%${q.toLowerCase()}%`;
    const result = await pool.query(
      `SELECT id, name, email, role FROM users
       WHERE id <> $1
         AND (
           LOWER(email) LIKE $2
           OR LOWER(name) LIKE $2
         )
       ORDER BY name
       LIMIT 20`,
      [currentUserId, like]
    );
    return result.rows.map((row) => mapUserRow(row));
  }

  async ensureAdminUser() {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const adminExists = await pool.query(
      `SELECT id, password, role, name
       FROM users
       WHERE LOWER(TRIM(email)) = $1`,
      [ADMIN_EMAIL]
    );
    if (adminExists.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'admin')`,
        ['Admin MatchDay', ADMIN_EMAIL, hash]
      );
      console.log('[seed] Admin user created:', ADMIN_EMAIL);
    } else {
      const admin = adminExists.rows[0];
      const syncPw =
        process.env.NODE_ENV !== 'production' || process.env.SYNC_ADMIN_PASSWORD === '1';
      const currentHash = String(admin.password || '');
      const hashLooksInvalid =
        !currentHash.startsWith('$2a$') &&
        !currentHash.startsWith('$2b$') &&
        !currentHash.startsWith('$2y$');
      const hasPlaceholderHash = currentHash.includes('hash_placeholder');
      const mustRepairAdmin = hasPlaceholderHash || hashLooksInvalid || admin.role !== 'admin';

      if (syncPw || mustRepairAdmin) {
        await pool.query(
          `UPDATE users SET password = $1, role = 'admin', name = COALESCE(NULLIF(TRIM(name), ''), 'Admin MatchDay')
           WHERE LOWER(TRIM(email)) = $2`,
          [hash, ADMIN_EMAIL]
        );
        console.log('[seed] Admin credentials synced:', ADMIN_EMAIL);
      }
    }
  }
}

module.exports = AuthService;
