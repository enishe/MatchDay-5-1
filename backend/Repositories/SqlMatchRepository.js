const pool = require('../config/db');

/**
 * SqlMatchRepository
 * Implementon kontratën IRepository për PostgreSQL.
 * Përshtatje e Repository Pattern nga C# FileRepository → Node.js/SQL.
 * 
 * Kontratat (IRepository):
 *   GetAll()      → SELECT * FROM Bookings
 *   GetById(id)   → SELECT WHERE id
 *   Add(entity)   → INSERT
 *   Update(id,..) → UPDATE  (Bonus)
 *   Delete(id)    → DELETE  (Bonus)
 *   Save()        → implicit — çdo query SQL është auto-commit
 */
class SqlMatchRepository {

    // ─── Ushtrimi 1: GetAll() ────────────────────────────────────────────────
    /**
     * Kthen të gjitha rezervimet, me filtrim opsional.
     * @param {Object} filters - { status, terrain_type } (opsionale)
     */
    async GetAll(filters = {}) {
        let query = 'SELECT * FROM Bookings';
        const values = [];
        const conditions = [];

        if (filters.status) {
            values.push(filters.status);
            conditions.push(`status = $${values.length}`);
        }

        if (filters.terrain_type) {
            values.push(filters.terrain_type);
            conditions.push(`field_id IN (SELECT id FROM Fields WHERE terrain_type = $${values.length})`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY start_time DESC';

        const result = await pool.query(query, values);
        return result.rows;
    }

    // ─── Ushtrimi 1: GetById(id) ─────────────────────────────────────────────
    /**
     * Kthen një rezervim sipas ID-së.
     * @param {number} id
     */
    async GetById(id) {
        const result = await pool.query(
            'SELECT * FROM Bookings WHERE id = $1',
            [id]
        );
        if (!result.rows[0]) return null;
        return result.rows[0];
    }

    // ─── Ushtrimi 1: Add(entity) ─────────────────────────────────────────────
    /**
     * Shton një rezervim të ri.
     * Smart Split llogaritet këtu: totalPrice / 12.
     * @param {Object} match - { fieldId, organizerId, startTime, endTime, totalPrice }
     */
    async Add(match) {
        // Smart Split — llogjika e biznesit (US #2)
        const pricePerPlayer = parseFloat((match.totalPrice / 12).toFixed(2));

        const query = `
            INSERT INTO Bookings 
                (field_id, organizer_id, start_time, end_time, total_price, price_per_player, status)
            VALUES 
                ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING *`;

        const values = [
            match.fieldId,
            match.organizerId,
            match.startTime,
            match.endTime,
            match.totalPrice,
            pricePerPlayer
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // ─── Bonus: Update(id, status) ───────────────────────────────────────────
    /**
     * Përditëson statusin e një rezervimi.
     * @param {number} id
     * @param {string} status - 'pending' | 'confirmed' | 'canceled'
     */
    async Update(id, status) {
        const result = await pool.query(
            `UPDATE Bookings 
             SET status = $1, 
                 canceled_at = CASE WHEN $1 = 'canceled' THEN CURRENT_TIMESTAMP ELSE canceled_at END
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );
        if (!result.rows[0]) return null;
        return result.rows[0];
    }

    // ─── Bonus: Delete(id) ───────────────────────────────────────────────────
    /**
     * Fshin një rezervim sipas ID-së.
     * @param {number} id
     */
    async Delete(id) {
        const result = await pool.query(
            'DELETE FROM Bookings WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rowCount > 0;
    }

    // ─── Save() — kontratat IRepository ─────────────────────────────────────
    /**
     * Në PostgreSQL çdo query është auto-commit.
     * Save() ekziston për të respektuar kontratën IRepository (si në C# FileRepository).
     */
    async Save() {
        // PostgreSQL: auto-commit për çdo query
        return true;
    }
}

module.exports = new SqlMatchRepository();