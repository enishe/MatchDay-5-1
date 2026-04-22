const pool = require('../config/db');

class FieldService {
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
    const { name, location, terrain_type, price_per_hour, courts_count } = payload;
    const created = await pool.query(
      `INSERT INTO fields (name, location, terrain_type, price_per_hour, courts_count, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, name, location, terrain_type, price_per_hour, courts_count, is_active, created_at`,
      [name, location, terrain_type, price_per_hour, courts_count]
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
    const result = await pool.query(
      `UPDATE fields
       SET is_active = FALSE
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) throw new Error('Fusha nuk u gjet.');
    return { ok: true };
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
    const booked = await pool.query(
      `SELECT court_number
       FROM bookings
       WHERE field_id = $1
         AND status <> 'canceled'
         AND start_time < $3::timestamp
         AND end_time > $2::timestamp
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
    };
  }
}

module.exports = FieldService;
