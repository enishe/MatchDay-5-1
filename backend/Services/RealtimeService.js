const { supabase } = require('../config/supabase');
const pool = require('../config/db');
const PaymentService = require('./PaymentService');

class RealtimeService {
    constructor() {
        this.paymentService = new PaymentService();
        this.subscriptions = new Map();
    }

    async _getMatchNotify(bookingId) {
        const r = await pool.query(
            `SELECT b.id, f.name AS field_name
             FROM Bookings b
             JOIN Fields f ON f.id = b.field_id
             WHERE b.id = $1`,
            [bookingId]
        );
        if (!r.rows[0]) throw new Error('Ndeshja nuk u gjet');
        const pl = await pool.query(
            `SELECT invitation_status FROM MatchPlayers WHERE booking_id = $1`,
            [bookingId]
        );
        return { ...r.rows[0], players: pl.rows };
    }

    // Initialize real-time subscriptions
    initializeRealtime() {
        // Listen for match player updates (acceptances/declines)
        const matchPlayersSubscription = supabase
            .channel('match_players')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'MatchPlayers' },
                (payload) => this.handleMatchPlayerChange(payload)
            );

        // Listen for payment updates
        const paymentsSubscription = supabase
            .channel('player_payments')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'PlayerPayments' },
                (payload) => this.handlePaymentChange(payload)
            );

        // Listen for booking status changes
        const bookingsSubscription = supabase
            .channel('bookings')
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'Bookings', filter: 'status=eq.confirmed' },
                (payload) => this.handleBookingConfirmation(payload)
            );

        // Store subscriptions for cleanup
        this.subscriptions.set('match_players', matchPlayersSubscription);
        this.subscriptions.set('player_payments', paymentsSubscription);
        this.subscriptions.set('bookings', bookingsSubscription);

        console.log('Real-time subscriptions initialized');
    }

    // Handle match player changes (invitations, acceptances, declines)
    async handleMatchPlayerChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        try {
            switch (eventType) {
                case 'INSERT':
                    // New player invited
                    await this.notifyPlayerInvited(newRecord);
                    break;
                    
                case 'UPDATE':
                    // Player responded to invitation
                    if (oldRecord.invitation_status !== newRecord.invitation_status) {
                        if (newRecord.invitation_status === 'accepted') {
                            await this.handlePlayerAccepted(newRecord);
                        } else if (newRecord.invitation_status === 'declined') {
                            await this.handlePlayerDeclined(newRecord);
                        }
                    }
                    // Check-in status change
                    if (oldRecord.check_in_status !== newRecord.check_in_status) {
                        await this.handleCheckInChange(newRecord);
                    }
                    break;
                    
                case 'DELETE':
                    // Player removed from match
                    await this.handlePlayerRemoved(newRecord);
                    break;
            }
        } catch (error) {
            console.error('Error handling match player change:', error);
        }
    }

    // Handle payment status changes
    async handlePaymentChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        try {
            if (eventType === 'UPDATE' && oldRecord.status !== newRecord.status) {
                if (newRecord.status === 'paid') {
                    await this.handlePaymentProcessed(newRecord);
                } else if (newRecord.status === 'refunded') {
                    await this.handlePaymentRefunded(newRecord);
                }
            }
        } catch (error) {
            console.error('Error handling payment change:', error);
        }
    }

    // Handle booking confirmation (when 12th player accepts)
    async handleBookingConfirmation(payload) {
        const { new: booking } = payload;

        try {
            await this.notifyMatchConfirmed(booking);
            await this.createNotificationForAllPlayers(booking.id, 'confirmation', 
                'Ndeshja u konfirmua!', 
                `Ndeshja në ${booking.field_name} është konfirmuar dhe do të fillojë në ${new Date(booking.start_time).toLocaleTimeString()}`);
        } catch (error) {
            console.error('Error handling booking confirmation:', error);
        }
    }

    // Handle player acceptance
    async handlePlayerAccepted(matchPlayer) {
        try {
            // Get match details
            const match = await this._getMatchNotify(matchPlayer.booking_id);
            
            // Notify organizer
            await this.createNotification(matchPlayer.user_id, 'confirmation', 
                'Lojtar pranoi ftesën!', 
                `${matchPlayer.username} pranoi ftesën për ndeshjen në ${match.field_name}`);
                
            // Check if match should be confirmed
            const acceptedCount = match.players.filter(p => p.invitation_status === 'accepted').length;
            if (acceptedCount >= 12) {
                await this.confirmMatch(matchPlayer.booking_id);
            }
        } catch (error) {
            console.error('Error handling player acceptance:', error);
        }
    }

    // Handle player decline
    async handlePlayerDeclined(matchPlayer) {
        try {
            const match = await this._getMatchNotify(matchPlayer.booking_id);
            
            // Notify organizer
            await this.createNotification(matchPlayer.user_id, 'cancellation', 
                'Lojtar refuzoi ftesën!', 
                `${matchPlayer.username} refuzoi ftesën për ndeshjen në ${match.field_name}. Slot është i lirë.`);
        } catch (error) {
            console.error('Error handling player decline:', error);
        }
    }

    // Handle check-in changes
    async handleCheckInChange(matchPlayer) {
        try {
            const match = await this._getMatchNotify(matchPlayer.booking_id);
            
            if (matchPlayer.check_in_status === 'checked_in') {
                await this.createNotification(matchPlayer.user_id, 'confirmation', 
                    'Check-in i plotësuar!', 
                    `Ju keni bërë check-in për ndeshjen në ${match.field_name}`);
            }
        } catch (error) {
            console.error('Error handling check-in change:', error);
        }
    }

    // Handle payment processed
    async handlePaymentProcessed(payment) {
        try {
            await this.createNotification(payment.user_id, 'confirmation', 
                'Pagesa e plotësuar!', 
                `Pagesa €${payment.total_amount} për ndeshjen është konfirmuar.`);
        } catch (error) {
            console.error('Error handling payment processed:', error);
        }
    }

    // Handle payment refunded
    async handlePaymentRefunded(payment) {
        try {
            await this.createNotification(payment.user_id, 'refund', 
                'Rimbursim i procesuar!', 
                `Rimbursimi €${payment.total_amount} është procesuar.`);
        } catch (error) {
            console.error('Error handling payment refunded:', error);
        }
    }

    // Confirm match (when 12 players have accepted)
    async confirmMatch(bookingId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE Bookings SET status = $1 WHERE id = $2', [
                'confirmed',
                bookingId,
            ]);
            await client.query(
                `UPDATE MatchPlayers
                 SET invitation_status = 'accepted'
                 WHERE booking_id = $1 AND invitation_status = 'pending'`,
                [bookingId]
            );
            await client.query('COMMIT');
            console.log(`Match ${bookingId} confirmed automatically`);
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
    }

    // Create notification for user
    async createNotification(userId, type, subject, body, bookingId = null) {
        const pool = require('../config/db');
        
        try {
            await pool.query(
                `INSERT INTO Notifications (user_id, booking_id, type, subject, body) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, bookingId, type, subject, body]
            );
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    // Create notification for all players in a match
    async createNotificationForAllPlayers(bookingId, type, subject, body) {
        const pool = require('../config/db');
        
        try {
            await pool.query(
                `INSERT INTO Notifications (user_id, booking_id, type, subject, body) 
                 SELECT mp.user_id, $1, $2, $3, $4
                 FROM MatchPlayers mp 
                 WHERE mp.booking_id = $5`,
                [bookingId, type, subject, body, bookingId]
            );
        } catch (error) {
            console.error('Error creating bulk notifications:', error);
        }
    }

    // Notify player when invited
    async notifyPlayerInvited(matchPlayer) {
        try {
            await this.createNotification(matchPlayer.user_id, 'confirmation', 
                'Ftesë e re!', 
                `Jeni ftuar në një ndeshje. Kontrolloni ftesat tuaja.`);
        } catch (error) {
            console.error('Error notifying player invited:', error);
        }
    }

    // Notify match confirmed
    async notifyMatchConfirmed(booking) {
        try {
            await this.createNotificationForAllPlayers(booking.id, 'confirmation', 
                'Ndeshja u konfirmua! ✅', 
                `Ndeshja në ${booking.field_name} është konfirmuar! Orari është bllokuar.`);
        } catch (error) {
            console.error('Error notifying match confirmed:', error);
        }
    }

    // Handle player removed
    async handlePlayerRemoved(matchPlayer) {
        try {
            await this.createNotification(matchPlayer.user_id, 'cancellation', 
                'U largua nga ndeshja', 
                `Jeni larguar nga ndeshja.`);
        } catch (error) {
            console.error('Error handling player removed:', error);
        }
    }

    // Cleanup subscriptions
    cleanup() {
        for (const [name, subscription] of this.subscriptions) {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        }
        this.subscriptions.clear();
        console.log('Real-time subscriptions cleaned up');
    }

    // Get unread notifications count for user
    async getUnreadCount(userId) {
        const pool = require('../config/db');
        
        try {
            const result = await pool.query(
                'SELECT COUNT(*) as count FROM Notifications WHERE user_id = $1 AND is_sent = false',
                [userId]
            );
            
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    // Mark notifications as read
    async markAsRead(userId) {
        const pool = require('../config/db');
        
        try {
            await pool.query(
                'UPDATE Notifications SET is_sent = true WHERE user_id = $1 AND is_sent = false',
                [userId]
            );
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }
}

module.exports = RealtimeService;
