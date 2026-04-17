const pool = require('../config/db');
const PaymentService = require('./PaymentService');

class MatchService {
    constructor() {
        this.paymentService = new PaymentService();
    }

    // Create a new match/booking
    async createMatch(organizerId, matchData) {
        const { field_id, start_time, end_time, player_usernames = [] } = matchData;
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get field details and calculate pricing
            const fieldResult = await client.query(
                'SELECT * FROM Fields WHERE id = $1 AND is_active = true',
                [field_id]
            );
            
            if (fieldResult.rows.length === 0) {
                throw new Error('Field not found or not active');
            }
            
            const field = fieldResult.rows[0];
            
            // Calculate duration and total price
            const duration = (new Date(end_time) - new Date(start_time)) / (1000 * 60 * 60); // hours
            const totalPrice = field.price_per_hour * duration;
            
            // Calculate Smart Split
            const smartSplit = this.paymentService.calculateSmartSplit(totalPrice);
            
            // Create booking
            const bookingResult = await client.query(
                `INSERT INTO Bookings 
                 (field_id, organizer_id, start_time, end_time, total_price, price_per_player) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING *`,
                [field_id, organizerId, start_time, end_time, totalPrice, smartSplit.pricePerPlayer]
            );
            
            const booking = bookingResult.rows[0];
            
            // Add organizer as first player (automatically accepted)
            await client.query(
                `INSERT INTO MatchPlayers 
                 (booking_id, user_id, invitation_status, is_organizer) 
                 VALUES ($1, $2, 'accepted', true)`,
                [booking.id, organizerId]
            );
            
            // Create payment record for organizer
            await this.paymentService.createPlayerPayments(booking.id, [
                { user_id: organizerId, is_organizer: true }
            ]);
            
            // Get user IDs for invited players
            if (player_usernames.length > 0) {
                const usersResult = await client.query(
                    `SELECT id FROM UserProfiles 
                     WHERE username = ANY($1) AND is_active = true`,
                    [player_usernames]
                );
                
                const invitedUsers = usersResult.rows;
                
                // Add invited players
                for (const user of invitedUsers) {
                    await client.query(
                        `INSERT INTO MatchPlayers 
                         (booking_id, user_id, invitation_status, is_organizer) 
                         VALUES ($1, $2, 'invited', false)`,
                        [booking.id, user.id]
                    );
                    
                    // Create payment record for invited player
                    await this.paymentService.createPlayerPayments(booking.id, [
                        { user_id: user.id, is_organizer: false }
                    ]);
                }
            }
            
            // Create match session
            await client.query(
                `INSERT INTO MatchSessions 
                 (booking_id, start_time, end_time, check_in_deadline, auto_cancel_deadline) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    booking.id,
                    start_time,
                    end_time,
                    new Date(new Date(start_time).getTime() - 15 * 60 * 1000), // 15 min before
                    new Date(new Date(start_time).getTime() - 2 * 60 * 60 * 1000) // 2 hours before
                ]
            );
            
            await client.query('COMMIT');
            
            return {
                ...booking,
                field,
                smart_split: smartSplit,
                invited_players: player_usernames.length
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get match details with all player information
    async getMatchDetails(matchId, userId = null) {
        const result = await pool.query(
            `SELECT 
                b.*,
                f.name as field_name,
                f.terrain_type,
                f.location,
                u.name as organizer_name,
                up.username as organizer_username,
                COUNT(mp.id) as total_players,
                COUNT(CASE WHEN mp.invitation_status = 'accepted' THEN 1 END) as accepted_players,
                COUNT(CASE WHEN mp.invitation_status = 'pending' THEN 1 END) as pending_players,
                COUNT(CASE WHEN mp.check_in_status = 'checked_in' THEN 1 END) as checked_in_players
             FROM Bookings b
             JOIN Fields f ON b.field_id = f.id
             JOIN Users u ON b.organizer_id = u.id
             LEFT JOIN UserProfiles up ON u.id = up.user_id
             LEFT JOIN MatchPlayers mp ON b.id = mp.booking_id
             WHERE b.id = $1
             GROUP BY b.id, f.name, f.terrain_type, f.location, u.name, up.username`,
            [matchId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Match not found');
        }
        
        const match = result.rows[0];
        
        // Get player details
        const playersResult = await pool.query(
            `SELECT 
                mp.*,
                u.name,
                up.username,
                pp.status as payment_status,
                pp.total_amount,
                pp.shoe_id,
                si.size as shoe_size
             FROM MatchPlayers mp
             JOIN Users u ON mp.user_id = u.id
             LEFT JOIN UserProfiles up ON u.id = up.user_id
             LEFT JOIN PlayerPayments pp ON mp.booking_id = pp.booking_id AND mp.user_id = pp.user_id
             LEFT JOIN ShoesInventory si ON pp.shoe_id = si.id
             WHERE mp.booking_id = $1
             ORDER BY mp.invited_at`,
            [matchId]
        );
        
        match.players = playersResult.rows;
        
        // Check if current user is part of this match
        if (userId) {
            const userPlayer = match.players.find(p => p.user_id === userId);
            match.user_role = userPlayer ? (userPlayer.is_organizer ? 'organizer' : 'participant') : null;
            match.user_invitation_status = userPlayer ? userPlayer.invitation_status : null;
        }
        
        return match;
    }

    // Get user's matches
    async getUserMatches(userId, status = null) {
        let query = `
            SELECT 
                b.*,
                f.name as field_name,
                f.terrain_type,
                f.location,
                mp.invitation_status,
                mp.is_organizer,
                pp.status as payment_status,
                pp.total_amount
             FROM MatchPlayers mp
             JOIN Bookings b ON mp.booking_id = b.id
             JOIN Fields f ON b.field_id = f.id
             LEFT JOIN PlayerPayments pp ON mp.booking_id = pp.booking_id AND mp.user_id = pp.user_id
             WHERE mp.user_id = $1
        `;
        
        const params = [userId];
        
        if (status) {
            query += ` AND b.status = $2`;
            params.push(status);
        }
        
        query += ` ORDER BY b.start_time DESC`;
        
        const result = await pool.query(query, params);
        return result.rows;
    }

    // Accept or decline invitation
    async respondToInvitation(matchId, userId, response) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Update match player status
            await client.query(
                `UPDATE MatchPlayers 
                 SET invitation_status = $1, responded_at = CURRENT_TIMESTAMP 
                 WHERE booking_id = $2 AND user_id = $3`,
                [response, matchId, userId]
            );
            
            // If accepted, check if match should be confirmed
            if (response === 'accepted') {
                await this.paymentService.checkMatchConfirmation(matchId, client);
            }
            
            await client.query('COMMIT');
            
            return { success: true, status: response };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Cancel a match
    async cancelMatch(matchId, userId, reason = 'manual') {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Check if user is organizer
            const matchResult = await client.query(
                'SELECT organizer_id, start_time FROM Bookings WHERE id = $1',
                [matchId]
            );
            
            if (matchResult.rows.length === 0) {
                throw new Error('Match not found');
            }
            
            const match = matchResult.rows[0];
            
            if (match.organizer_id !== userId) {
                throw new Error('Only organizer can cancel match');
            }
            
            // Determine cancellation policy
            const hoursUntilMatch = (new Date(match.start_time) - new Date()) / (1000 * 60 * 60);
            const cancellationStatus = hoursUntilMatch > 2 ? 'free' : 'penalty_40';
            
            // Update booking status
            await client.query(
                `UPDATE Bookings 
                 SET status = 'canceled', cancellation_status = $1, canceled_at = CURRENT_TIMESTAMP 
                 WHERE id = $2`,
                [cancellationStatus, matchId]
            );
            
            // Process refunds for all paid players
            const paidPaymentsResult = await client.query(
                'SELECT id FROM PlayerPayments WHERE booking_id = $1 AND status = \'paid\'',
                [matchId]
            );
            
            for (const payment of paidPaymentsResult.rows) {
                await this.paymentService.processRefund(
                    payment.id, 
                    cancellationStatus, 
                    new Date()
                );
            }
            
            await client.query('COMMIT');
            
            return {
                success: true,
                cancellation_status: cancellationStatus,
                refund_policy: hoursUntilMatch > 2 ? '100% refund' : '60% field refund, 100% shoes refund'
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Auto-cancel matches that don't have enough players 2 hours before start
    async autoCancelMatches() {
        const result = await pool.query(
            `SELECT b.id 
             FROM Bookings b
             LEFT JOIN MatchPlayers mp ON b.id = mp.booking_id
             WHERE b.status = 'pending' 
               AND b.start_time <= NOW() + INTERVAL '2 hours'
               AND b.start_time > NOW()
             GROUP BY b.id
             HAVING COUNT(mp.id) < 12`
        );
        
        const matchesToCancel = result.rows;
        
        for (const match of matchesToCancel) {
            await this.cancelMatch(match.id, null, 'auto_cancelled');
        }
        
        return matchesToCancel.length;
    }

    // Get available time slots for a field
    async getAvailableSlots(fieldId, date) {
        const result = await pool.query(
            `SELECT 
                start_time, 
                end_time,
                is_available,
                booking_id
             FROM FieldAvailability 
             WHERE field_id = $1 AND date = $2
             ORDER BY start_time`,
            [fieldId, date]
        );
        
        return result.rows;
    }

    // Search users by username (for invitations)
    async searchUsers(query, currentUserId) {
        if (!query || query.length < 2) {
            return [];
        }

        const result = await pool.query(
            `SELECT u.id, u.name, up.username, up.skill_level, up.preferred_position
             FROM Users u
             JOIN UserProfiles up ON u.id = up.user_id
             WHERE up.username ILIKE $1 
               AND u.id != $2
               AND u.role IN ('participant', 'organizer')
               AND up.is_active = true
             ORDER BY up.username
             LIMIT 10`,
            [`%${query}%`, currentUserId]
        );

        return result.rows;
    }
}

module.exports = MatchService;