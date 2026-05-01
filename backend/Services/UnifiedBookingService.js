/**
 * Purpose:
 * Unified adapter layer for booking-related operations used by both
 * legacy `/api/matches` routes and newer `/api/bookings` routes.
 *
 * Notes:
 * - Additive only: does not remove or replace existing services.
 * - Keeps backward compatibility by allowing callers to merge normalized
 *   fields into their existing response payload.
 */
const pool = require('../config/db');
const BookingService = require('./BookingService');

class UnifiedBookingService {
  constructor() {
    this.bookingService = new BookingService();
  }

  normalizeBooking(row) {
    return {
      id: Number(row.id),
      status: row.status,
      userId: Number(row.organizer_id),
      matchId: Number(row.id),
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
    };
  }

  async createBooking(userId, payload) {
    const method = String(payload?.payment_method || payload?.paymentMethod || 'cash').toLowerCase();
    if (method === 'card') {
      const created = await this.bookingService.createCardBooking(userId, {
        fieldId: payload.fieldId,
        courtNumber: payload.court_number ?? payload.courtNumber,
        startTime: payload.startTime,
        endTime: payload.endTime,
        inviteEmails: Array.isArray(payload.inviteEmails) ? payload.inviteEmails : [],
      });
      return { raw: created, normalized: this.normalizeBooking(created) };
    }
    const created = await this.bookingService.createCashBooking(userId, {
      fieldId: payload.fieldId,
      courtNumber: payload.court_number ?? payload.courtNumber,
      startTime: payload.startTime,
      endTime: payload.endTime,
      teamShoes: Array.isArray(payload.teamShoes) ? payload.teamShoes : [],
    });
    return { raw: created, normalized: this.normalizeBooking(created) };
  }

  async getBooking(id) {
    const result = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      throw new Error('Rezervimi nuk u gjet.');
    }
    const row = result.rows[0];
    return { raw: row, normalized: this.normalizeBooking(row) };
  }

  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE bookings
       SET status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, status]
    );
    if (result.rows.length === 0) {
      throw new Error('Rezervimi nuk u gjet.');
    }
    const row = result.rows[0];
    return { raw: row, normalized: this.normalizeBooking(row) };
  }

  async cancelBooking(id) {
    return this.updateStatus(id, 'canceled');
  }
}

module.exports = UnifiedBookingService;
