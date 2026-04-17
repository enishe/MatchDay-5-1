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
 *   Update(id,..) → UPDATE
 *   Delete(id)    → DELETE
 *   Save()        → implicit — çdo query SQL është auto-commit
 */
class SqlMatchRepository {

    // ─── GetAll() ─────────────────────────────────────────────────────────────
    async GetAll(filters = {}) {
        try {
            let query        = 'SELECT * FROM Bookings';
            const values     = [];
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

        } catch (err) {
            // Error Handling 1 — lidhja me DB dështoi (DB joaktive)
            console.error('SqlMatchRepository.GetAll gabim:', err.message);
            throw new Error('Nuk mund të merren ndeshjet. Kontrollo lidhjen me databazën.');
        }
    }

    // ─── GetById(id) ──────────────────────────────────────────────────────────
    async GetById(id) {
        try {
            // Error Handling 2 — ID e pavlefshme (p.sh. "abc")
            const idNum = parseInt(id);
            if (isNaN(idNum) || idNum <= 0) {
                throw new Error(`ID "${id}" nuk është e vlefshme. Duhet të jetë numër pozitiv.`);
            }

            const result = await pool.query(
                'SELECT * FROM Bookings WHERE id = $1', [idNum]
            );
            if (!result.rows[0]) return null;
            return result.rows[0];

        } catch (err) {
            if (err.message.includes('vlefshme')) throw err;
            console.error('SqlMatchRepository.GetById gabim:', err.message);
            throw new Error('Nuk mund të gjendet ndeshja. Kontrollo lidhjen me databazën.');
        }
    }

    // ─── Add(entity) ──────────────────────────────────────────────────────────
    async Add(match) {
        try {
            // Error Handling 3 — input i gabuar para INSERT
            if (!match.fieldId)
                throw new Error('ID e fushës është e detyrueshme.');
            if (!match.totalPrice || match.totalPrice <= 0)
                throw new Error('Çmimi total duhet të jetë mbi 0€.');
            if (!match.startTime)
                throw new Error('Koha e fillimit është e detyrueshme.');
            if (!match.endTime)
                throw new Error('Koha e mbarimit është e detyrueshme.');

            const pricePerPlayer = parseFloat((match.totalPrice / 12).toFixed(2));

            const query = `
                INSERT INTO Bookings
                    (field_id, organizer_id, start_time, end_time, total_price, price_per_player, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                RETURNING *`;

            const result = await pool.query(query, [
                match.fieldId,
                match.organizerId || 1,
                match.startTime,
                match.endTime,
                match.totalPrice,
                pricePerPlayer
            ]);
            return result.rows[0];

        } catch (err) {
            // Error Handling — Foreign Key (field_id nuk ekziston)
            if (err.code === '23503') {
                throw new Error(`Fusha me ID ${match.fieldId} nuk ekziston. Kontrollo ID-në e fushës.`);
            }
            if (err.message.includes('detyrueshme') || err.message.includes('mbi 0')) throw err;
            console.error('SqlMatchRepository.Add gabim:', err.message);
            throw new Error('Ndeshja nuk mund të shtohet. Kontrollo të dhënat dhe provo përsëri.');
        }
    }

    // ─── Update(id, status) ───────────────────────────────────────────────────
    async Update(id, status) {
        try {
            // Error Handling — status i pavlefshëm
            const statuset = ['pending', 'confirmed', 'canceled'];
            if (!statuset.includes(status)) {
                throw new Error(`Statusi "${status}" nuk është i vlefshëm. Lejohen: ${statuset.join(', ')}.`);
            }

            const idNum = parseInt(id);
            if (isNaN(idNum) || idNum <= 0) {
                throw new Error(`ID "${id}" nuk është e vlefshme.`);
            }

            const result = await pool.query(
                `UPDATE Bookings
                 SET status = $1,
                     canceled_at = CASE WHEN $1 = 'canceled' THEN CURRENT_TIMESTAMP
                                        ELSE canceled_at END
                 WHERE id = $2 RETURNING *`,
                [status, idNum]
            );

            if (!result.rows[0]) return null;
            return result.rows[0];

        } catch (err) {
            if (err.message.includes('vlefshëm') || err.message.includes('vlefshme')) throw err;
            console.error('SqlMatchRepository.Update gabim:', err.message);
            throw new Error('Statusi nuk mund të përditësohet. Kontrollo lidhjen me databazën.');
        }
    }

    // ─── Delete(id) ───────────────────────────────────────────────────────────
    async Delete(id) {
        try {
            const idNum = parseInt(id);
            // Error Handling — ID e pavlefshme
            if (isNaN(idNum) || idNum <= 0) {
                throw new Error(`ID "${id}" nuk është e vlefshme.`);
            }

            const result = await pool.query(
                'DELETE FROM Bookings WHERE id = $1 RETURNING id', [idNum]
            );

            // Error Handling — ID nuk u gjet në DB
            if (result.rowCount === 0) return false;
            return true;

        } catch (err) {
            if (err.message.includes('vlefshme')) throw err;
            console.error('SqlMatchRepository.Delete gabim:', err.message);
            throw new Error('Ndeshja nuk mund të fshihet. Kontrollo lidhjen me databazën.');
        }
    }
    // ─── checkConflict(fieldId, startTime, endTime) ───────────────────────────
// Kontrollon nëse fusha është e zënë për intervalin kohor të kërkuar.
// Thirret nga MatchService.shtoNdeshje() para çdo INSERT.
async checkConflict(fieldId, startTime, endTime) {
    try {
        const result = await pool.query(
            `SELECT id FROM Bookings 
             WHERE field_id = $1 
               AND status != 'canceled'
               AND start_time < $3 
               AND end_time > $2`,
            [fieldId, startTime, endTime]
        );
        return result.rows.length > 0;
    } catch (err) {
        console.error('SqlMatchRepository.checkConflict gabim:', err.message);
        throw new Error('Nuk mund të kontrollohet disponueshmëria. Provo përsëri.');
    }
}

    // ─── Save() — kontratat IRepository ──────────────────────────────────────
    async Save() {
        // PostgreSQL: auto-commit për çdo query
        // Ekziston për kontratën IRepository (si në C# FileRepository)
        return true;
    }
}

module.exports = new SqlMatchRepository();