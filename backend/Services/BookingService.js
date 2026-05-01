const crypto = require('crypto');
const pool = require('../config/db');
const NotificationService = require('./NotificationService');
const { formatBelgradeDate, formatBelgradeTime } = require('../utils/timezone');

class BookingService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  normalizeSubject(type, title) {
    const candidate = String(title || '').trim();
    if (candidate) return candidate;
    const byType = {
      new_booking: 'Rezervim i ri',
      booking_confirmed: 'Rezervim i konfirmuar',
      booking_canceled: 'Rezervim i anuluar',
      invite_accepted: 'Ftesë e pranuar',
      invite: 'Ftesë për lojë',
    };
    return byType[String(type || '').trim()] || 'Njoftim';
  }

  normalizeBody(message) {
    const candidate = String(message || '').trim();
    return candidate || 'Keni një njoftim të ri.';
  }

  async createAdminNotification(client, { type, title, message, bookingId = null, fallbackUserId = null }) {
    const adminRows = await client.query(
      `SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC`,
      []
    );
    const adminIds = adminRows.rows
      .map((r) => Number(r.id))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (adminIds.length === 0 && Number.isInteger(Number(fallbackUserId)) && Number(fallbackUserId) > 0) {
      adminIds.push(Number(fallbackUserId));
    }
    if (adminIds.length === 0) {
      throw new Error('Nuk u gjet asnjë admin valid për njoftim.');
    }

    await client.query(
      `INSERT INTO admin_notifications (type, title, message, booking_id)
       VALUES ($1, $2, $3, $4)`,
      [type, title, message, bookingId]
    );
    const safeSubject = this.normalizeSubject(type, title);
    const safeBody = this.normalizeBody(message);
    for (const adminUserId of adminIds) {
      await client.query(
        `INSERT INTO notifications (user_id, recipient_id, recipient_type, type, title, message, subject, body, booking_id, is_read)
         VALUES ($1, $1, 'admin', $2, $3, $4, $5, $6, $7, false)`,
        [adminUserId, type, safeSubject, safeBody, safeSubject, safeBody, bookingId]
      );
    }
  }

  async getFieldOrThrow(client, fieldId) {
    const r = await client.query(
      `SELECT id, name, location, terrain_type, price_per_hour, courts_count
       FROM fields
       WHERE id = $1 AND is_active = TRUE`,
      [fieldId]
    );
    if (r.rows.length === 0) {
      throw new Error('Fusha nuk ekziston ose nuk është aktive.');
    }
    return r.rows[0];
  }

  async getOrganizerName(client, organizerId) {
    const r = await client.query(`SELECT name FROM users WHERE id = $1`, [organizerId]);
    return r.rows[0]?.name || `Përdoruesi #${organizerId}`;
  }

  async ensureSlotAvailable(client, { fieldId, courtNumber, startTime, endTime }) {
    const conflict = await client.query(
      `SELECT 1
       FROM bookings
       WHERE field_id = $1
         AND court_number = $2
         AND status <> 'canceled'
         AND start_time < $4::timestamptz
         AND end_time > $3::timestamptz
       LIMIT 1`,
      [fieldId, courtNumber, startTime.toISOString(), endTime.toISOString()]
    );
    if (conflict.rows.length > 0) {
      throw new Error('Ky orar është i zënë për këtë fushë.');
    }
  }

  normalizeShoesSummary(teamShoes) {
    const rows = Array.isArray(teamShoes) ? teamShoes : [];
    return rows
      .map((s) => ({ size: Number(s.size), count: Number(s.count) }))
      .filter((s) => Number.isInteger(s.size) && s.size >= 36 && s.size <= 45 && Number.isInteger(s.count) && s.count > 0);
  }

  async notifyBookingParticipants(client, bookingId, type, title, messageBuilder) {
    const participants = await client.query(
      `SELECT DISTINCT user_id
       FROM booking_participants
       WHERE booking_id = $1 AND user_id IS NOT NULL`,
      [bookingId]
    );
    for (const row of participants.rows) {
      const userId = Number(row.user_id);
      await this.notificationService.createUserNotification(
        userId,
        type,
        title,
        messageBuilder(userId),
        bookingId
      );
    }
  }

  async createCashBooking(organizerId, bookingData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const fieldId = Number(bookingData.fieldId);
      const courtNumber = Number(bookingData.courtNumber);
      const startTime = new Date(bookingData.startTime);
      const endTime = new Date(bookingData.endTime);
      if (!Number.isInteger(fieldId) || fieldId <= 0) throw new Error('Fusha nuk është valide.');
      if (!Number.isInteger(courtNumber) || courtNumber <= 0) throw new Error('Numri i fushës nuk është valid.');
      if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime()) || startTime >= endTime) {
        throw new Error('Intervali kohor nuk është valid.');
      }

      const field = await this.getFieldOrThrow(client, fieldId);
      if (courtNumber > Number(field.courts_count || 1)) {
        throw new Error('Numri i fushës është jashtë intervalit të lejuar.');
      }
      await this.ensureSlotAvailable(client, { fieldId, courtNumber, startTime, endTime });

      const shoesSummary = this.normalizeShoesSummary(bookingData.teamShoes);
      const shoesCount = shoesSummary.reduce((s, row) => s + row.count, 0);
      const fieldPrice = Number(field.price_per_hour || 0);
      const totalAmount = Number((fieldPrice + shoesCount * 2).toFixed(2));
      const pricePerPlayer = Number((fieldPrice / 12).toFixed(2));

      const ins = await client.query(
        `INSERT INTO bookings
          (field_id, organizer_id, start_time, end_time, total_price, price_per_player, status, court_number, payment_method, payment_status, total_amount, shoes_summary)
         VALUES
          ($1, $2, $3, $4, $5, $6, 'confirmed', $7, 'cash', 'completed', $8, $9::jsonb)
         RETURNING *`,
        [fieldId, organizerId, startTime.toISOString(), endTime.toISOString(), totalAmount, pricePerPlayer, courtNumber, totalAmount, JSON.stringify(shoesSummary)]
      );
      const booking = ins.rows[0];
      const organizerName = await this.getOrganizerName(client, organizerId);
      const msg = `${organizerName} rezervoi "${field.name}" më ${formatBelgradeDate(startTime, 'sq-AL')} në ${formatBelgradeTime(startTime, 'sq-AL', { hour: '2-digit', minute: '2-digit' })}. Totali: ${totalAmount.toFixed(2)}€.`;
      await this.createAdminNotification(client, {
        type: 'new_booking',
        title: 'Rezervim i ri (Cash)',
        message: msg,
        bookingId: booking.id,
        fallbackUserId: organizerId,
      });

      await client.query('COMMIT');
      return {
        ...booking,
        field_name: field.name,
        shoes_summary: shoesSummary,
        total_amount: totalAmount,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createCardBooking(organizerId, bookingData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const fieldId = Number(bookingData.fieldId);
      const courtNumber = Number(bookingData.courtNumber);
      const startTime = new Date(bookingData.startTime);
      const endTime = new Date(bookingData.endTime);
      const inviteEmails = Array.isArray(bookingData.inviteEmails)
        ? [...new Set(bookingData.inviteEmails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))]
        : [];
      if (inviteEmails.length > 11) throw new Error('Mund të dërgoni maksimumi 11 ftesa.');

      const field = await this.getFieldOrThrow(client, fieldId);
      if (courtNumber > Number(field.courts_count || 1)) {
        throw new Error('Numri i fushës është jashtë intervalit të lejuar.');
      }
      await this.ensureSlotAvailable(client, { fieldId, courtNumber, startTime, endTime });

      const fieldPrice = Number(field.price_per_hour || 0);
      const pricePerPlayer = Number((fieldPrice / 12).toFixed(2));
      const inviteToken = crypto.randomBytes(32).toString('hex');

      const ins = await client.query(
        `INSERT INTO bookings
          (field_id, organizer_id, start_time, end_time, total_price, price_per_player, status, court_number, payment_method, payment_status, total_amount, invite_token, shoes_summary)
         VALUES
          ($1, $2, $3, $4, $5, $6, 'pending', $7, 'card', 'pending', $8, $9, '[]'::jsonb)
         RETURNING *`,
        [fieldId, organizerId, startTime.toISOString(), endTime.toISOString(), fieldPrice, pricePerPlayer, courtNumber, fieldPrice, inviteToken]
      );
      const booking = ins.rows[0];

      await client.query(
        `INSERT INTO booking_participants
          (booking_id, user_id, status, amount_due, amount_paid, payment_method, paid_at)
         VALUES
          ($1, $2, 'paid', $3, $3, 'card', CURRENT_TIMESTAMP)`,
        [booking.id, organizerId, pricePerPlayer]
      );

      for (const email of inviteEmails) {
        await client.query(
          `INSERT INTO booking_participants
            (booking_id, invite_email, status, amount_due, amount_paid, payment_method)
           VALUES
            ($1, $2, 'invited', $3, 0, 'card')`,
          [booking.id, email, pricePerPlayer]
        );
      }

      const organizerName = await this.getOrganizerName(client, organizerId);
      const msg = `${organizerName} krijoi rezervim me kartë te "${field.name}". Në pritje për pagesat e lojtarëve të tjerë (${inviteEmails.length}).`;
      await this.createAdminNotification(client, {
        type: 'new_booking',
        title: 'Rezervim i ri (Kartë)',
        message: msg,
        bookingId: booking.id,
        fallbackUserId: organizerId,
      });

      await client.query('COMMIT');
      const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
      return {
        ...booking,
        invite_link: `${base}/booking/join/${inviteToken}`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async acceptInvite(inviteToken, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bookingRes = await client.query(
        `SELECT b.*, f.name AS field_name, f.location, f.terrain_type, u.name AS organizer_name
         FROM bookings b
         JOIN fields f ON f.id = b.field_id
         JOIN users u ON u.id = b.organizer_id
         WHERE b.invite_token = $1`,
        [inviteToken]
      );
      if (bookingRes.rows.length === 0) throw new Error('Ky link i ftesës nuk është më i vlefshëm.');
      const booking = bookingRes.rows[0];
      if (booking.status !== 'pending') throw new Error('Ky link i ftesës nuk është më i vlefshëm.');
      if (new Date(booking.start_time).getTime() <= Date.now()) throw new Error('Ky link i ftesës nuk është më i vlefshëm.');

      const existing = await client.query(
        `SELECT id, status, amount_due, amount_paid
         FROM booking_participants
         WHERE booking_id = $1 AND user_id = $2`,
        [booking.id, userId]
      );
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
      } else {
        await client.query(
          `WITH one_row AS (
             SELECT id
             FROM booking_participants
             WHERE booking_id = $2
               AND user_id IS NULL
               AND LOWER(TRIM(invite_email)) = (SELECT LOWER(TRIM(email)) FROM users WHERE id = $1)
             ORDER BY id ASC
             LIMIT 1
           )
           UPDATE booking_participants bp
           SET user_id = $1,
               status = CASE WHEN bp.status = 'invited' THEN 'accepted' ELSE bp.status END
           FROM one_row
           WHERE bp.id = one_row.id`,
          [userId, booking.id]
        );
        const userNow = await client.query(
          `SELECT id FROM booking_participants WHERE booking_id = $1 AND user_id = $2`,
          [booking.id, userId]
        );
        if (userNow.rows.length === 0) {
          await client.query(
            `INSERT INTO booking_participants
              (booking_id, user_id, status, amount_due, amount_paid, payment_method)
             VALUES
              ($1, $2, 'accepted', $3, 0, 'card')`,
            [booking.id, userId, Number(booking.price_per_player || 0)]
          );
        }
        const player = await client.query(`SELECT name FROM users WHERE id = $1`, [userId]);
        const playerName = player.rows[0]?.name || `Lojtari #${userId}`;
        await this.notificationService.createUserNotification(
          Number(booking.organizer_id),
          'invite_accepted',
          'Ftesa u pranua',
          `${playerName} pranoi ftesën për ndeshjen në ${booking.field_name}.`,
          booking.id
        );
        await client.query('COMMIT');
      }

      const paidCountRes = await pool.query(
        `SELECT COUNT(*)::int AS c FROM booking_participants WHERE booking_id = $1 AND status = 'paid'`,
        [booking.id]
      );
      return {
        booking_id: booking.id,
        field_name: booking.field_name,
        location: booking.location,
        terrain_type: booking.terrain_type,
        organizer_name: booking.organizer_name,
        start_time: booking.start_time,
        end_time: booking.end_time,
        price_per_player: Number(booking.price_per_player || 0),
        paid_count: paidCountRes.rows[0]?.c || 0,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async participantPayment(bookingId, userId, needsShoes, shoeSize) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bookingRes = await client.query(
        `SELECT b.*, f.name AS field_name
         FROM bookings b
         JOIN fields f ON f.id = b.field_id
         WHERE b.id = $1`,
        [bookingId]
      );
      if (bookingRes.rows.length === 0) throw new Error('Rezervimi nuk u gjet.');
      const booking = bookingRes.rows[0];

      const participantRes = await client.query(
        `SELECT * FROM booking_participants WHERE booking_id = $1 AND user_id = $2`,
        [bookingId, userId]
      );
      if (participantRes.rows.length === 0) throw new Error('Nuk jeni pjesëmarrës në këtë rezervim.');

      const basePrice = Number(booking.price_per_player || 0);
      const extra = needsShoes ? 2 : 0;
      const amount = Number((basePrice + extra).toFixed(2));
      await client.query(
        `UPDATE booking_participants
         SET status = 'paid',
             needs_shoes = $1,
             shoe_size = $2,
             amount_due = $3,
             amount_paid = $3,
             paid_at = CURRENT_TIMESTAMP
         WHERE booking_id = $4 AND user_id = $5`,
        [Boolean(needsShoes), needsShoes ? Number(shoeSize) : null, amount, bookingId, userId]
      );

      const counts = await client.query(
        `SELECT
           COUNT(*)::int AS total_count,
           COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count
         FROM booking_participants
         WHERE booking_id = $1`,
        [bookingId]
      );
      const totalCount = counts.rows[0]?.total_count || 0;
      const paidCount = counts.rows[0]?.paid_count || 0;
      const allPaid = totalCount >= 12 && paidCount >= 12;
      if (allPaid) {
        await client.query(
          `UPDATE bookings
           SET status = 'confirmed', payment_status = 'completed'
           WHERE id = $1`,
          [bookingId]
        );
        const totalRevenue = paidCount * basePrice;
        await this.createAdminNotification(client, {
          type: 'booking_confirmed',
          title: 'Rezervim i konfirmuar',
          message: `Rezervimi te "${booking.field_name}" u konfirmua. Të hyrat: ${Number(totalRevenue).toFixed(2)}€.`,
          bookingId,
          fallbackUserId: Number(booking.organizer_id),
        });
        await this.notifyBookingParticipants(
          client,
          bookingId,
          'booking_confirmed',
          'Rezervimi u konfirmua!',
          () => `Rezervimi juaj në ${booking.field_name} më ${formatBelgradeDate(booking.start_time, 'sq-AL')} ora ${formatBelgradeTime(booking.start_time, 'sq-AL', { hour: '2-digit', minute: '2-digit' })} u konfirmua.`
        );
      } else {
        await client.query(
          `UPDATE bookings SET payment_status = 'partial' WHERE id = $1 AND payment_status = 'pending'`,
          [bookingId]
        );
      }

      await client.query('COMMIT');
      return { booking_id: bookingId, participant_paid: amount, paid_count: paidCount, total_count: totalCount, confirmed: allPaid };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkAutoCancel(bookingId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `SELECT b.*, f.name AS field_name
         FROM bookings b
         JOIN fields f ON f.id = b.field_id
         WHERE b.id = $1`,
        [bookingId]
      );
      if (r.rows.length === 0) throw new Error('Rezervimi nuk u gjet.');
      const booking = r.rows[0];
      const hoursLeft = (new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursLeft >= 2 || booking.payment_status !== 'pending') {
        await client.query('COMMIT');
        return { canceled: false, reason: 'Kushtet për anulim automatik nuk u përmbushën.' };
      }
      const paidRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM booking_participants WHERE booking_id = $1 AND status = 'paid'`,
        [bookingId]
      );
      const paidCount = paidRes.rows[0]?.c || 0;
      if (paidCount < 12) {
        await client.query(
          `UPDATE bookings
           SET status = 'canceled', payment_status = 'refunded'
           WHERE id = $1`,
          [bookingId]
        );
        await this.createAdminNotification(client, {
          type: 'booking_canceled',
          title: 'Rezervim i anuluar automatikisht',
          message: `Rezervimi te "${booking.field_name}" u anulua automatikisht. Pagesa të kryera: ${paidCount}/12.`,
          bookingId,
          fallbackUserId: Number(booking.organizer_id),
        });
        await this.notifyBookingParticipants(
          client,
          bookingId,
          'booking_canceled',
          'Rezervimi u anulua',
          () => `Rezervimi në ${booking.field_name} u anulua automatikisht.`
        );
        await client.query('COMMIT');
        return { canceled: true, paid_count: paidCount };
      }
      await client.query('COMMIT');
      return { canceled: false, paid_count: paidCount };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAdminNotifications(unreadOnly = false) {
    const where = unreadOnly ? 'WHERE is_read = false' : '';
    const r = await pool.query(
      `SELECT * FROM admin_notifications ${where} ORDER BY created_at DESC`,
      []
    );
    return r.rows;
  }

  async markNotificationRead(notificationId) {
    await pool.query(
      `UPDATE admin_notifications SET is_read = true WHERE id = $1`,
      [notificationId]
    );
    return { ok: true };
  }

  async getUnreadNotificationCount() {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS c FROM admin_notifications WHERE is_read = false`,
      []
    );
    return Number(r.rows[0]?.c || 0);
  }

  async getMyBookings(userId) {
    const r = await pool.query(
      `SELECT DISTINCT
          b.*,
          f.name AS field_name,
          f.location,
          COALESCE(p.total_count, 0) AS participants_total,
          COALESCE(p.paid_count, 0) AS participants_paid
       FROM bookings b
       JOIN fields f ON f.id = b.field_id
       LEFT JOIN booking_participants bp ON bp.booking_id = b.id
       LEFT JOIN (
         SELECT booking_id,
                COUNT(*)::int AS total_count,
                COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count
         FROM booking_participants
         GROUP BY booking_id
       ) p ON p.booking_id = b.id
       WHERE b.organizer_id = $1 OR bp.user_id = $1
       ORDER BY b.start_time DESC`,
      [userId]
    );
    return r.rows;
  }
}

module.exports = BookingService;
