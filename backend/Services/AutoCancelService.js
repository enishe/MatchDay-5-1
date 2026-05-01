const pool = require('../config/db');

class AutoCancelService {
    /**
     * Check and auto-cancel matches that are within 2 hours of start time
     * and don't have enough paid players (less than 12)
     */
    async checkAndCancelMatches() {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Find matches that need to be auto-cancelled
            // Criteria: 
            // 1. Status is 'pending'
            // 2. Start time is within 2 hours from now
            // 3. Less than 12 players have paid
            
            const result = await client.query(`
                SELECT b.id, b.start_time, b.organizer_id,
                       COUNT(pp.id) as paid_count,
                       b.total_price,
                       b.price_per_player
                FROM Bookings b
                LEFT JOIN PlayerPayments pp ON b.id = pp.booking_id AND pp.status = 'paid'
                WHERE b.status = 'pending'
                  AND b.start_time BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
                GROUP BY b.id, b.start_time, b.organizer_id, b.total_price, b.price_per_player
                HAVING COUNT(pp.id) < 12
            `);
            
            const cancelledMatches = [];
            
            for (const match of result.rows) {
                // Update booking status to cancelled
                await client.query(
                    `UPDATE Bookings 
                     SET status = 'canceled', 
                         cancellation_status = 'auto_cancelled',
                         canceled_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [match.id]
                );
                
                // Update all pending payments to refunded (100% for auto-cancel)
                await client.query(
                    `UPDATE PlayerPayments 
                     SET status = 'refunded', 
                         refunded_at = CURRENT_TIMESTAMP
                     WHERE booking_id = $1 AND status = 'paid'`,
                    [match.id]
                );
                
                // Create refund transactions for paid players
                const paidPayments = await client.query(
                    `SELECT id, total_amount, user_id 
                     FROM PlayerPayments 
                     WHERE booking_id = $1 AND status = 'refunded'`,
                    [match.id]
                );
                
                for (const payment of paidPayments.rows) {
                    await client.query(
                        `INSERT INTO PaymentTransactions 
                         (payment_id, transaction_type, amount, payment_method, notes)
                         VALUES ($1, 'refund', $2, 'bank_transfer', 'Auto-cancel refund')`,
                        [payment.id, payment.total_amount]
                    );
                }
                
                // Update match players status
                await client.query(
                    `UPDATE MatchPlayers 
                     SET invitation_status = 'declined', 
                         responded_at = CURRENT_TIMESTAMP
                     WHERE booking_id = $1 AND invitation_status IN ('invited', 'pending')`,
                    [match.id]
                );
                
                // Create notification for organizer
                const organizerId = Number(match.organizer_id);
                if (!Number.isInteger(organizerId) || organizerId <= 0) {
                    continue;
                }
                await client.query(
                    `INSERT INTO Notifications 
                     (user_id, booking_id, type, subject, body, is_sent, sent_at)
                     VALUES ($1, $2, 'cancellation', $3, $4, TRUE, CURRENT_TIMESTAMP)`,
                    [
                        organizerId,
                        match.id,
                        'Ndeshja u anulua automatikisht',
                        `Ndeshja juaj për datën ${new Date(match.start_time).toLocaleString('sq-AL')} u anulua automatikisht sepse nuk u arritën 12 lojtarë pagesë. Të gjitha pagesat do të rimbursohen.`
                    ]
                );
                
                cancelledMatches.push({
                    id: match.id,
                    start_time: match.start_time,
                    paid_count: match.paid_count,
                    refund_amount: match.paid_count * match.price_per_player
                });
            }
            
            await client.query('COMMIT');
            
            return {
                cancelled_count: cancelledMatches.length,
                cancelled_matches: cancelledMatches
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Auto-cancel service error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Run auto-cancel check (can be called by cron job)
     */
    async runAutoCancel() {
        try {
            console.log('Running auto-cancel check...');
            const result = await this.checkAndCancelMatches();
            console.log(`Auto-cancel check completed. Cancelled ${result.cancelled_count} matches.`);
            return result;
        } catch (error) {
            console.error('Auto-cancel check failed:', error);
            throw error;
        }
    }
}

module.exports = AutoCancelService;
