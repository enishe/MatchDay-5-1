const pool = require('../config/db');
const { createUtcDateFromBelgradeLocal } = require('../utils/timezone');
const { isSlotBlocked } = require('../utils/blockedSlots');
const { cascadeDeleteField } = require('../utils/fieldCascadeDelete');

class FieldService {
  buildHourlySlots(startDate, days, startHour, endHour) {
    const slots = [];
    for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
      const baseYmd = String(startDate);
      const base = createUtcDateFromBelgradeLocal(baseYmd, 12, 0);
      base.setUTCDate(base.getUTCDate() + dayOffset);
      const y = base.getUTCFullYear();
      const m = String(base.getUTCMonth() + 1).padStart(2, '0');
      const d = String(base.getUTCDate()).padStart(2, '0');
      const dayYmd = `${y}-${m}-${d}`;
      for (let h = startHour; h <= endHour; h += 1) {
        const start = createUtcDateFromBelgradeLocal(dayYmd, h, 0);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const dateKey = dayYmd;
        const hourKey = `${String(h).padStart(2, '0')}:00`;
        slots.push({ start, end, dateKey, hourKey });
      }
    }
    return slots;
  }

  async getAllFields() {
    const result = await pool.query(
      `SELECT id, name, location, terrain_type, price_per_hour, courts_count, is_active, created_at
       FROM fields
       ORDER BY id ASC`
    );
    return result.rows;
  }

  async getFieldById(id) {
    const result = await pool.query(
      `SELECT id, name, location, terrain_type, price_per_hour, courts_count, is_active, created_at
       FROM fields
       WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) throw new Error('Fusha nuk u gjet.');
    return result.rows[0];
  }

  async createField(payload) {
    const { name, location, terrain_type, price_per_hour, courts_count, owner_id } = payload;
    const created = await pool.query(
      `INSERT INTO fields (name, location, terrain_type, price_per_hour, courts_count, is_active, owner_id)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       RETURNING id, name, location, terrain_type, price_per_hour, courts_count, is_active, created_at`,
      [name, location, terrain_type, price_per_hour, courts_count, owner_id ?? null]
    );
    const field = created.rows[0];
    await pool.query(
      `INSERT INTO field_shoes_inventory (field_id, shoe_size, quantity_available, rent_price)
       SELECT $1, size, 3, 2.00
       FROM generate_series(36, 45) AS size
       ON CONFLICT (field_id, shoe_size) DO NOTHING`,
      [field.id]
    );
    return field;
  }

  async updateField(id, payload) {
    const updates = [];
    const values = [];
    let idx = 1;

    if (payload.price_per_hour !== undefined) {
      updates.push(`price_per_hour = $${idx++}`);
      values.push(payload.price_per_hour);
    }
    if (payload.courts_count !== undefined) {
      updates.push(`courts_count = $${idx++}`);
      values.push(payload.courts_count);
    }
    if (payload.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(payload.name);
    }
    if (payload.location !== undefined) {
      updates.push(`location = $${idx++}`);
      values.push(payload.location);
    }
    if (payload.terrain_type !== undefined) {
      updates.push(`terrain_type = $${idx++}`);
      values.push(payload.terrain_type);
    }
    if (payload.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(payload.is_active));
    }

    if (updates.length === 0) return this.getFieldById(id);
    values.push(id);
    const result = await pool.query(
      `UPDATE fields
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, name, location, terrain_type, price_per_hour, courts_count, is_active, created_at`,
      values
    );
    if (result.rows.length === 0) throw new Error('Fusha nuk u gjet.');
    return result.rows[0];
  }

  async deleteField(id) {
    await cascadeDeleteField(id);
    return { ok: true, message: 'Fusha dhe të gjitha rezervimet u fshinë përgjithmonë.' };
  }

  async updateShoesInventory(fieldId, updates) {
    for (const row of updates) {
      await pool.query(
        `INSERT INTO field_shoes_inventory (field_id, shoe_size, quantity_available, rent_price)
         VALUES ($1, $2, $3, COALESCE($4, 2.00))
         ON CONFLICT (field_id, shoe_size)
         DO UPDATE SET quantity_available = EXCLUDED.quantity_available,
                       rent_price = COALESCE(EXCLUDED.rent_price, field_shoes_inventory.rent_price),
                       updated_at = CURRENT_TIMESTAMP`,
        [fieldId, row.shoe_size, row.quantity_available, row.rent_price]
      );
    }
    return this.getShoesByField(fieldId);
  }

  async updateShoesInventoryBulk(fieldId, inventory) {
    const rows = Array.isArray(inventory) ? inventory : [];
    for (const row of rows) {
      const size = Number(row.size);
      const quantity = Number(row.quantity);
      const rentRaw = row.rent_price ?? row.rental_price;
      const rentPrice = rentRaw != null && Number.isFinite(Number(rentRaw)) ? Number(rentRaw) : 2;
      if (!Number.isInteger(size) || size < 36 || size > 45) continue;
      if (!Number.isFinite(quantity) || quantity < 0) continue;
      await pool.query(
        `INSERT INTO field_shoes_inventory (field_id, shoe_size, quantity_available, rent_price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (field_id, shoe_size)
         DO UPDATE SET quantity_available = EXCLUDED.quantity_available,
                       rent_price = EXCLUDED.rent_price,
                       updated_at = CURRENT_TIMESTAMP`,
        [fieldId, size, Math.floor(quantity), rentPrice]
      );
    }
    return this.getShoesByField(fieldId);
  }

  async getShoesByField(fieldId) {
    const result = await pool.query(
      `SELECT shoe_size, quantity_available, rent_price
       FROM field_shoes_inventory
       WHERE field_id = $1
       ORDER BY shoe_size ASC`,
      [fieldId]
    );
    return result.rows;
  }

  async getAllShoesGroupedByField() {
    const result = await pool.query(
      `SELECT f.id AS field_id, f.name AS field_name, f.location,
              s.shoe_size, s.quantity_available, s.rent_price
       FROM fields f
       LEFT JOIN field_shoes_inventory s ON s.field_id = f.id
       ORDER BY f.id ASC, s.shoe_size ASC`
    );
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.field_id]) {
        grouped[row.field_id] = {
          field_id: row.field_id,
          field_name: row.field_name,
          location: row.location,
          inventory: [],
        };
      }
      if (row.shoe_size != null) {
        grouped[row.field_id].inventory.push({
          shoe_size: row.shoe_size,
          quantity_available: row.quantity_available,
          rent_price: Number(row.rent_price),
        });
      }
    }
    return Object.values(grouped);
  }

  async getAvailableCourts(fieldId, start, end) {
    const field = await this.getFieldById(fieldId);
    const startDate = start instanceof Date ? start : new Date(start);
    if (await isSlotBlocked(pool, fieldId, startDate)) {
      return {
        field_id: Number(fieldId),
        start,
        end,
        total_courts: Number(field.courts_count || 1),
        available_courts: [],
        taken_courts: [],
        blocked: true,
      };
    }
    const booked = await pool.query(
      `SELECT court_number
       FROM bookings
       WHERE field_id = $1
         AND status <> 'canceled'
         AND start_time < $3::timestamptz
         AND end_time > $2::timestamptz
         AND court_number IS NOT NULL`,
      [fieldId, start, end]
    );
    const takenSet = new Set(booked.rows.map((r) => Number(r.court_number)));
    const available = [];
    const taken = [];
    for (let court = 1; court <= Number(field.courts_count || 1); court += 1) {
      if (takenSet.has(court)) taken.push(court);
      else available.push(court);
    }
    return {
      field_id: Number(fieldId),
      start,
      end,
      total_courts: Number(field.courts_count || 1),
      available_courts: available,
      taken_courts: taken,
      blocked: false,
    };
  }

  async getAvailabilityGrid({ startDate, days = 7, startHour = 12, endHour = 23, fieldIds = [] }) {
    const date = createUtcDateFromBelgradeLocal(startDate, 0, 0);
    if (Number.isNaN(date.getTime())) {
      throw new Error('startDate nuk është valid.');
    }
    if (!Number.isInteger(days) || days < 1 || days > 14) {
      throw new Error('days duhet të jetë nga 1 deri në 14.');
    }
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || endHour > 23 || startHour > endHour) {
      throw new Error('Ora e intervalit nuk është valide.');
    }

    const filters = ['is_active = TRUE'];
    const params = [];
    if (Array.isArray(fieldIds) && fieldIds.length > 0) {
      const ids = fieldIds.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0);
      if (ids.length > 0) {
        params.push(ids);
        filters.push(`id = ANY($${params.length}::int[])`);
      }
    }
    const fieldsQ = await pool.query(
      `SELECT id, name, location, courts_count
       FROM fields
       WHERE ${filters.join(' AND ')}
       ORDER BY id ASC`,
      params
    );
    const fields = fieldsQ.rows.map((f) => ({
      id: Number(f.id),
      name: f.name,
      location: f.location,
      courts_count: Number(f.courts_count || 1),
    }));
    if (fields.length === 0) return { fields: [], availability: {} };

    const slots = this.buildHourlySlots(startDate, days, startHour, endHour);
    const rangeStart = slots[0].start;
    const rangeEnd = slots[slots.length - 1].end;

    const bookingsQ = await pool.query(
      `SELECT field_id, court_number, start_time, end_time
       FROM bookings
       WHERE status <> 'canceled'
         AND field_id = ANY($1::int[])
         AND court_number IS NOT NULL
         AND start_time < $3::timestamptz
         AND end_time > $2::timestamptz`,
      [fields.map((f) => f.id), rangeStart.toISOString(), rangeEnd.toISOString()]
    );

    const bookingsByField = new Map();
    for (const row of bookingsQ.rows) {
      const fieldId = Number(row.field_id);
      const list = bookingsByField.get(fieldId) || [];
      list.push({
        court: Number(row.court_number),
        start: new Date(row.start_time),
        end: new Date(row.end_time),
      });
      bookingsByField.set(fieldId, list);
    }

    const availability = {};
    for (const slot of slots) {
      if (!availability[slot.dateKey]) availability[slot.dateKey] = {};
      if (!availability[slot.dateKey][slot.hourKey]) availability[slot.dateKey][slot.hourKey] = {};

      for (const field of fields) {
        const taken = new Set();
        const bookings = bookingsByField.get(field.id) || [];
        for (const b of bookings) {
          if (b.start < slot.end && b.end > slot.start) taken.add(b.court);
        }
        availability[slot.dateKey][slot.hourKey][field.id] = {
          total: field.courts_count,
          free: Math.max(field.courts_count - taken.size, 0),
        };
      }
    }

    return { fields, availability };
  }
}

module.exports = FieldService;
