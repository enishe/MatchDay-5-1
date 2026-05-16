const pool = require('../config/db');

async function safeDelete(label, sql, params) {
  try {
    await pool.query(sql, params);
  } catch (err) {
    console.warn(`[fieldCascade] ${label} skipped:`, err.message);
  }
}

/**
 * Hard-delete a field and all related bookings, payments, notifications, and inventory.
 */
async function cascadeDeleteField(fieldId) {
  const fid = Number(fieldId);
  if (!Number.isInteger(fid) || fid <= 0) {
    throw new Error('ID e fushës nuk është valide.');
  }

  await safeDelete(
    'notifications',
    `DELETE FROM notifications WHERE booking_id IN (SELECT id FROM bookings WHERE field_id = $1)`,
    [fid]
  );
  await safeDelete(
    'admin_notifications',
    `DELETE FROM admin_notifications WHERE booking_id IN (SELECT id FROM bookings WHERE field_id = $1)`,
    [fid]
  );
  await safeDelete(
    'booking_participants',
    `DELETE FROM booking_participants WHERE booking_id IN (SELECT id FROM bookings WHERE field_id = $1)`,
    [fid]
  );
  await safeDelete(
    'playerpayments',
    `DELETE FROM playerpayments WHERE booking_id IN (SELECT id FROM bookings WHERE field_id = $1)`,
    [fid]
  );
  await safeDelete(
    'shoeratings',
    `DELETE FROM shoeratings WHERE booking_id IN (SELECT id FROM bookings WHERE field_id = $1)`,
    [fid]
  );
  await safeDelete('bookings', 'DELETE FROM bookings WHERE field_id = $1', [fid]);
  await safeDelete(
    'field_shoes_inventory',
    'DELETE FROM field_shoes_inventory WHERE field_id = $1',
    [fid]
  );
  const deleted = await pool.query('DELETE FROM fields WHERE id = $1 RETURNING id', [fid]);
  if (deleted.rows.length === 0) {
    throw new Error('Fusha nuk u gjet.');
  }
}

async function cascadeDeleteFieldsForOwner(ownerId) {
  const result = await pool.query('SELECT id FROM fields WHERE owner_id = $1', [ownerId]);
  for (const row of result.rows) {
    await cascadeDeleteField(row.id);
  }
}

module.exports = { cascadeDeleteField, cascadeDeleteFieldsForOwner };
