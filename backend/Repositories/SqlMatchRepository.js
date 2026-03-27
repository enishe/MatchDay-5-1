const pool = require('../config/db'); // Sigurohu që ke backend/config/db.js

class SqlMatchRepository {
    // Ushtrimi 1: GetAll()
    async GetAll() {
        const result = await pool.query('SELECT * FROM Bookings ORDER BY start_time DESC');
        return result.rows;
    }

    // Ushtrimi 1: GetById(id)
    async GetById(id) {
        const result = await pool.query('SELECT * FROM Bookings WHERE id = $1', [id]);
        return result.rows[0];
    }

    // Ushtrimi 1: Add(entity)
    async Add(match) {
        const query = `
            INSERT INTO Bookings (field_id, organizer_id, start_time, end_time, total_price, price_per_player, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`;
        
        // Llogaritja e Smart Split (total / 12)
        const pricePerPlayer = match.totalPrice / 12;
        
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

    // Bonus: Delete
    async Delete(id) {
        await pool.query('DELETE FROM Bookings WHERE id = $1', [id]);
        return true;
    }
}

module.exports = new SqlMatchRepository();