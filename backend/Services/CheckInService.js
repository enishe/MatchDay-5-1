const pool = require('../config/db');
const NotificationService = require('./NotificationService');

class CheckInService {
    constructor() {
        this.notificationService = new NotificationService();
    }

    // Player check-in for a match
    async playerCheckIn(userId, bookingId) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Verify player is part of this match
            const playerResult = await client.query(
                `SELECT mp.*, b.start_time, b.end_time 
                 FROM MatchPlayers mp 
                 JOIN Bookings b ON mp.booking_id = b.id 
                 WHERE mp.booking_id = $1 AND mp.user_id = $2`,
                [bookingId, userId]
            );
            
            if (playerResult.rows.length === 0) {
                throw new Error('You are not part of this match');
            }
            
            const player = playerResult.rows[0];
            
            // Check if already checked in
            if (player.check_in_status === 'checked_in') {
                throw new Error('You have already checked in');
            }
            
            // Check if it's time to check in (15 minutes before match)
            const matchStartTime = new Date(player.start_time);
            const checkInTime = new Date(matchStartTime.getTime() - 15 * 60 * 1000);
            const now = new Date();
            
            if (now < checkInTime) {
                throw new Error('Check-in is only available 15 minutes before match start');
            }
            
            // Check if match has already ended
            if (now > new Date(player.end_time)) {
                throw new Error('Cannot check in after match has ended');
            }
            
            // Update player check-in status
            await client.query(
                `UPDATE MatchPlayers 
                 SET check_in_status = 'checked_in', checked_in_at = CURRENT_TIMESTAMP 
                 WHERE booking_id = $1 AND user_id = $2`,
                [bookingId, userId]
            );
            
            // Update match session
            await client.query(
                `UPDATE MatchSessions 
                 SET checked_in_players = checked_in_players + 1 
                 WHERE booking_id = $1`,
                [bookingId]
            );
            
            // Check if all players have checked in
            await this.checkAllPlayersCheckedIn(bookingId, client);
            
            await client.query('COMMIT');
            
            // Send notification
            await this.notificationService.createNotification(
                userId, 
                'confirmation', 
                'Check-in i plotësuar!', 
                'Ju keni bërë check-in për ndeshjen me sukses.',
                bookingId
            );
            
            return {
                success: true,
                message: 'Check-in successful',
                checked_in_at: new Date()
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Admin manual check-in for players
    async adminCheckIn(adminUserId, bookingId, playerIds) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Verify admin has permission
            const adminResult = await client.query(
                'SELECT role FROM Users WHERE id = $1',
                [adminUserId]
            );
            
            if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'admin') {
                throw new Error('Admin access required');
            }
            
            let checkedInCount = 0;
            
            for (const playerId of playerIds) {
                // Check if player is part of this match
                const playerResult = await client.query(
                    `SELECT mp.*, b.start_time, b.end_time 
                     FROM MatchPlayers mp 
                     JOIN Bookings b ON mp.booking_id = b.id 
                     WHERE mp.booking_id = $1 AND mp.user_id = $2`,
                    [bookingId, playerId]
                );
                
                if (playerResult.rows.length > 0) {
                    const player = playerResult.rows[0];
                    
                    // Only check in if not already checked in
                    if (player.check_in_status !== 'checked_in') {
                        await client.query(
                            `UPDATE MatchPlayers 
                             SET check_in_status = 'checked_in', checked_in_at = CURRENT_TIMESTAMP 
                             WHERE booking_id = $1 AND user_id = $2`,
                            [bookingId, playerId]
                        );
                        
                        checkedInCount++;
                        
                        // Send notification to player
                        await this.notificationService.createNotification(
                            playerId, 
                            'confirmation', 
                            'Check-in i plotësuar nga admin!', 
                            'Admin ju ka bërë check-in për ndeshjen.',
                            bookingId
                        );
                    }
                }
            }
            
            // Update match session
            if (checkedInCount > 0) {
                await client.query(
                    `UPDATE MatchSessions 
                     SET checked_in_players = checked_in_players + $1 
                     WHERE booking_id = $2`,
                    [checkedInCount, bookingId]
                );
                
                // Check if all players have checked in
                await this.checkAllPlayersCheckedIn(bookingId, client);
            }
            
            await client.query('COMMIT');
            
            return {
                success: true,
                message: `Successfully checked in ${checkedInCount} players`,
                checked_in_count: checkedInCount
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Check if all players have checked in
    async checkAllPlayersCheckedIn(bookingId, client) {
        const result = await client.query(
            `SELECT 
                    COUNT(*) as total_players,
                    COUNT(CASE WHEN mp.check_in_status = 'checked_in' THEN 1 END) as checked_in_players
                 FROM MatchPlayers mp
                 WHERE mp.booking_id = $1`,
            [bookingId]
        );
        
        const { total_players, checked_in_players } = result.rows[0];
        
        // If all players checked in, update session status
        if (checked_in_players >= total_players && total_players > 0) {
            await client.query(
                `UPDATE MatchSessions 
                 SET session_status = 'completed' 
                 WHERE booking_id = $1`,
                [bookingId]
            );
            
            // Update booking status to completed
            await client.query(
                `UPDATE Bookings 
                 SET status = 'completed' 
                 WHERE id = $1`,
                [bookingId]
            );
        }
    }

    // Handle no-show detection (runs after match end time)
    async handleNoShow() {
        const client = await pool.connect();
        
        try {
            // Find matches that should be checked for no-show
            const result = await client.query(
                `SELECT b.id, b.start_time, b.end_time,
                        COUNT(mp.id) as total_players,
                        COUNT(CASE WHEN mp.check_in_status = 'checked_in' THEN 1 END) as checked_in_players
                 FROM Bookings b
                 LEFT JOIN MatchPlayers mp ON b.id = mp.booking_id
                 WHERE b.status = 'confirmed' 
                   AND b.end_time < NOW() - INTERVAL '30 minutes'
                   AND b.end_time > NOW() - INTERVAL '2 hours'
                 GROUP BY b.id, b.start_time, b.end_time
                 HAVING COUNT(mp.id) > 0`
            );
            
            const matchesToCheck = result.rows;
            
            for (const match of matchesToCheck) {
                const { id, total_players, checked_in_players } = match;
                
                // If less than 50% of players checked in, mark as no-show
                const checkInThreshold = Math.ceil(total_players * 0.5);
                
                if (checked_in_players < checkInThreshold) {
                    await client.query('BEGIN');
                    
                    // Update match session to no-show
                    await client.query(
                        `UPDATE MatchSessions 
                         SET session_status = 'no_show' 
                         WHERE booking_id = $1`,
                        [id]
                    );
                    
                    // Update booking status
                    await client.query(
                        `UPDATE Bookings 
                         SET status = 'no_show', cancellation_status = 'penalty_40' 
                         WHERE id = $1`,
                        [id]
                    );
                    
                    // Process refunds (60% for field, 100% for shoes)
                    await this.processNoShowRefunds(id, client);
                    
                    await client.query('COMMIT');
                    
                    console.log(`Match ${id} marked as no-show`);
                }
            }
            
            return {
                processed: matchesToCheck.length,
                matches: matchesToCheck
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Process refunds for no-show matches
    async processNoShowRefunds(bookingId, client) {
        const paymentsResult = await client.query(
            `SELECT id, user_id, field_share, rental_fee, total_amount 
             FROM PlayerPayments 
             WHERE booking_id = $1 AND status = 'paid'`,
            [bookingId]
        );
        
        for (const payment of paymentsResult.rows) {
            // Calculate refund: 60% for field, 100% for shoes
            const fieldRefund = payment.field_share * 0.6;
            const shoesRefund = payment.rental_fee; // 100% refund for shoes
            const totalRefund = fieldRefund + shoesRefund;
            
            // Update payment status
            await client.query(
                `UPDATE PlayerPayments 
                 SET status = 'refunded', refunded_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [payment.id]
            );
            
            // Create transaction record
            await client.query(
                `INSERT INTO PaymentTransactions 
                 (payment_id, transaction_type, amount, payment_method, notes) 
                 VALUES ($1, 'refund', $2, 'bank_transfer', 'No-show refund: 60% field, 100% shoes')`,
                [payment.id, totalRefund]
            );
            
            // Send notification
            await this.notificationService.createNotification(
                payment.user_id, 
                'refund', 
                'Rimbursim No-Show', 
                `Rimbursim €${totalRefund.toFixed(2)} për shkakun e no-show (60% fushë, 100% patika).`,
                bookingId
            );
        }
    }

    // Get check-in statistics for a match
    async getCheckInStats(bookingId) {
        const result = await pool.query(
            `SELECT 
                    COUNT(*) as total_players,
                    COUNT(CASE WHEN mp.check_in_status = 'checked_in' THEN 1 END) as checked_in_players,
                    COUNT(CASE WHEN mp.check_in_status = 'no_show' THEN 1 END) as no_show_players,
                    COUNT(CASE WHEN mp.check_in_status IS NULL THEN 1 END) as pending_players
                 FROM MatchPlayers mp
                 WHERE mp.booking_id = $1`,
            [bookingId]
        );
        
        return result.rows[0] || {
            total_players: 0,
            checked_in_players: 0,
            no_show_players: 0,
            pending_players: 0
        };
    }

    // Get player check-in history
    async getPlayerCheckInHistory(userId, limit = 20) {
        const result = await pool.query(
            `SELECT 
                    mp.check_in_status,
                    mp.checked_in_at,
                    b.start_time,
                    b.end_time,
                    f.name as field_name,
                    f.location
                 FROM MatchPlayers mp
                 JOIN Bookings b ON mp.booking_id = b.id
                 JOIN Fields f ON b.field_id = f.id
                 WHERE mp.user_id = $1
                 ORDER BY mp.checked_in_at DESC NULLS LAST
                 LIMIT $2`,
            [userId, limit]
        );
        
        return result.rows;
    }
}

module.exports = CheckInService;
