const pool = require('../config/db');

class NotificationService {
    async getAdminRecipientIds() {
        const rows = await pool.query(
            `SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC`,
            []
        );
        return rows.rows
            .map((r) => Number(r.id))
            .filter((id) => Number.isInteger(id) && id > 0);
    }

    /**
     * Purpose:
     * Adapter over dual notification sources (`admin_notifications` + `notifications`)
     * so routes can read one consistent stream/count without migrating tables yet.
     */
    async listNotifications(userId = null, limit = 20) {
        const safeLimit = Number.isInteger(Number(limit)) ? Math.max(1, Math.min(100, Number(limit))) : 20;
        const unifiedRows = [];

        if (userId == null) {
            const [adminLegacy, adminUnified] = await Promise.all([
                pool.query(
                    `SELECT
                        id,
                        type,
                        title,
                        message,
                        booking_id,
                        is_read,
                        created_at,
                        COALESCE(booking_id::text, type || ':' || title || ':' || message) AS reference_id
                     FROM admin_notifications
                     ORDER BY created_at DESC
                     LIMIT $1`,
                    [safeLimit * 3]
                ),
                pool.query(
                    `SELECT
                        id,
                        type,
                        title,
                        message,
                        booking_id,
                        is_read,
                        created_at,
                        COALESCE(booking_id::text, type || ':' || title || ':' || message) AS reference_id
                     FROM notifications
                     WHERE recipient_type = 'admin'
                     ORDER BY created_at DESC
                     LIMIT $1`,
                    [safeLimit * 3]
                ),
            ]);
            unifiedRows.push(
                ...adminLegacy.rows.map((r) => ({ ...r, source: 'admin' })),
                ...adminUnified.rows.map((r) => ({ ...r, source: 'unified' }))
            );
        } else {
            const [userUnified] = await Promise.all([
                pool.query(
                    `SELECT
                        id,
                        type,
                        title,
                        message,
                        booking_id,
                        is_read,
                        created_at,
                        COALESCE(booking_id::text, type || ':' || title || ':' || message) AS reference_id
                     FROM notifications
                     WHERE COALESCE(recipient_id, user_id) = $1
                     ORDER BY created_at DESC
                     LIMIT $2`,
                    [userId, safeLimit * 3]
                ),
            ]);
            unifiedRows.push(...userUnified.rows.map((r) => ({ ...r, source: 'unified' })));
        }

        const dedup = new Map();
        for (const row of unifiedRows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) {
            const key = `${row.reference_id}:${row.type}`;
            if (!dedup.has(key)) {
                dedup.set(key, row);
            }
        }
        return [...dedup.values()].slice(0, safeLimit).map((row) => ({
            ...row,
            id: `${row.source}:${row.id}`,
        }));
    }

    async markAsRead(notificationId, userId = null) {
        const asString = String(notificationId || '');
        const [sourceMaybe, idMaybe] = asString.includes(':') ? asString.split(':') : [null, asString];
        const numericId = Number(idMaybe);
        if (!Number.isInteger(numericId) || numericId <= 0) {
            throw new Error('ID e njoftimit nuk është valide.');
        }

        if (sourceMaybe === 'admin') {
            await pool.query(`UPDATE admin_notifications SET is_read = true WHERE id = $1`, [numericId]);
            return { ok: true };
        }
        if (sourceMaybe === 'unified') {
            if (userId == null) {
                await pool.query(`UPDATE notifications SET is_read = true WHERE id = $1`, [numericId]);
            } else {
                await pool.query(`UPDATE notifications SET is_read = true WHERE id = $1 AND COALESCE(recipient_id, user_id) = $2`, [numericId, userId]);
            }
            return { ok: true };
        }

        if (userId == null) {
            await Promise.all([
                pool.query(`UPDATE admin_notifications SET is_read = true WHERE id = $1`, [numericId]),
                pool.query(`UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_type = 'admin'`, [numericId]),
            ]);
        } else {
            await pool.query(
                `UPDATE notifications
                 SET is_read = true
                 WHERE id = $1 AND COALESCE(recipient_id, user_id) = $2`,
                [numericId, userId]
            );
        }
        return { ok: true };
    }

    async createUserNotification(recipientId, type, title, message, bookingId = null) {
        const safeRecipientId = Number(recipientId);
        if (!Number.isInteger(safeRecipientId) || safeRecipientId <= 0) {
            throw new Error('Recipient user_id i pavlefshëm për notifications.');
        }
        const result = await pool.query(
            `INSERT INTO notifications (user_id, recipient_id, recipient_type, type, title, message, booking_id, is_read)
             VALUES ($1, $1, 'user', $2, $3, $4, $5, false)
             RETURNING *`,
            [safeRecipientId, type, title, message, bookingId]
        );
        return result.rows[0];
    }

    async createAdminNotification(type, title, message, bookingId = null) {
        const adminIds = await this.getAdminRecipientIds();
        if (adminIds.length === 0) {
            throw new Error('Asnjë admin valid për notifications.');
        }
        let firstInserted = null;
        for (const adminUserId of adminIds) {
            const result = await pool.query(
                `INSERT INTO notifications (user_id, recipient_id, recipient_type, type, title, message, booking_id, is_read)
                 VALUES ($1, $1, 'admin', $2, $3, $4, $5, false)
                 RETURNING *`,
                [adminUserId, type, title, message, bookingId]
            );
            if (!firstInserted && result.rows[0]) firstInserted = result.rows[0];
        }
        return firstInserted;
    }

    async getMyNotifications(recipientId, limit = 20) {
        return this.listNotifications(recipientId, limit);
    }

    async getMyUnreadCount(recipientId) {
        return this.getUnreadCount(recipientId);
    }

    async markMyNotificationRead(recipientId, notificationId) {
        return this.markAsRead(notificationId, recipientId);
    }

    async markAllMyNotificationsRead(recipientId) {
        await pool.query(
            `UPDATE notifications
             SET is_read = true
             WHERE COALESCE(recipient_id, user_id) = $1 AND is_read = false`,
            [recipientId]
        );
        return { ok: true };
    }

    // Create notification
    async createNotification(userId, type, subject, body, bookingId = null) {
        try {
            return await this.createUserNotification(userId, type, subject, body, bookingId);
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    // Get user notifications
    async getUserNotifications(userId, limit = 20, offset = 0) {
        try {
            const rows = await this.getMyNotifications(userId, limit + offset);
            return rows.slice(offset, offset + limit);
        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }

    // Get unread notifications count
    async getUnreadCount(userId = null) {
        try {
            if (userId == null) {
                const [legacy, unified] = await Promise.all([
                    pool.query(
                        `SELECT COUNT(*)::int AS c
                         FROM admin_notifications
                         WHERE is_read = false`
                    ),
                    pool.query(
                        `SELECT COUNT(*)::int AS c
                         FROM notifications
                         WHERE recipient_type = 'admin' AND is_read = false`
                    ),
                ]);
                return Number(legacy.rows[0]?.c || 0) + Number(unified.rows[0]?.c || 0);
            }
            const result = await pool.query(
                `SELECT COUNT(*)::int AS c
                 FROM notifications
                 WHERE COALESCE(recipient_id, user_id) = $1 AND is_read = false`,
                [userId]
            );
            return Number(result.rows[0]?.c || 0);
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    // Mark notifications as sent/read
    async markAsSent(userId, notificationIds = null) {
        try {
            if (notificationIds && notificationIds.length > 0) {
                for (const id of notificationIds) {
                    await this.markMyNotificationRead(userId, id);
                }
            } else {
                await this.markAllMyNotificationsRead(userId);
            }
            return true;
        } catch (error) {
            console.error('Error marking notifications as sent:', error);
            throw error;
        }
    }

    // Delete old notifications (cleanup)
    async deleteOldNotifications(daysOld = 30) {
        try {
            await pool.query(
                `DELETE FROM Notifications 
                 WHERE created_at < NOW() - INTERVAL '${daysOld} days'`,
                []
            );
            return true;
        } catch (error) {
            console.error('Error deleting old notifications:', error);
            throw error;
        }
    }

    // Send email confirmation (using Resend or similar service)
    async sendEmailConfirmation(userId, bookingId, type = 'confirmation') {
        try {
            // Get booking and user details
            const result = await pool.query(
                `SELECT 
                    b.*,
                    f.name as field_name,
                    f.location,
                    u.name as user_name,
                    u.email,
                    NULL::text as username
                 FROM bookings b
                 JOIN fields f ON b.field_id = f.id
                 JOIN users u ON b.organizer_id = u.id
                 WHERE b.id = $1`,
                [bookingId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Booking not found');
            }
            
            const booking = result.rows[0];
            
            // Prepare email content based on type
            let subject, body;
            
            switch (type) {
                case 'confirmation':
                    subject = '✅ Ndeshja u konfirmua! - MATCHDAY';
                    body = `
Përshëndetje ${booking.user_name},

Ndeshja juaj është konfirmuar me sukses!

🏟️ **Fusha:** ${booking.field_name}
📍 **Lokacioni:** ${booking.location}
📅 **Data:** ${new Date(booking.start_time).toLocaleDateString('sq-AL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
⏰ **Ora:** ${new Date(booking.start_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.end_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
💰 **Çmimi per lojtar:** €${booking.price_per_player}

Numri i lojtarëve: 12/12
Statusi: ✅ E KONFIRMUAR

Faleminderit,
MATCHDAY Team
                    `;
                    break;
                    
                case 'cancellation':
                    subject = '❌ Ndeshja u anulua - MATCHDAY';
                    body = `
Përshëndetje ${booking.user_name},

Ndeshja juaj është anuluar.

🏟️ **Fusha:** ${booking.field_name}
📅 **Data:** ${new Date(booking.start_time).toLocaleDateString('sq-AL')}
💰 **Politika e rimbursimit:** ${booking.cancellation_status === 'free' ? '100% refund' : '60% fushë, 100% patika'}

Rimbursimi do të procesohet brenda 24-48 orëve.

Faleminderit,
MATCHDAY Team
                    `;
                    break;
                    
                case 'invitation':
                    subject = '📩 Ftesë për ndeshje - MATCHDAY';
                    body = `
Përshëndetje,

Jeni ftuar në një ndeshje futbolli!

🏟️ **Fusha:** ${booking.field_name}
📅 **Data:** ${new Date(booking.start_time).toLocaleDateString('sq-AL')}
⏰ **Ora:** ${new Date(booking.start_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.end_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
👤 **Organizatori:** ${booking.organizer_name}

Hyni në platformën MATCHDAY për të pranuar ose refuzuar ftesën.

Faleminderit,
MATCHDAY Team
                    `;
                    break;
                    
                default:
                    subject = '📧 Njoftim MATCHDAY';
                    body = 'Keni një njoftim të ri në platformën MATCHDAY.';
            }
            
            // Store email in database (for tracking)
            await pool.query(
                `INSERT INTO EmailQueue (user_id, email, subject, body, status, created_at) 
                 VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)`,
                [userId, booking.email, subject, body]
            );
            
            // TODO: Integrate with actual email service (Resend, SendGrid, etc.)
            // For now, just log that email would be sent
            console.log(`Email queued for user ${userId}: ${subject}`);
            
            return {
                success: true,
                message: 'Email confirmation queued successfully',
                subject,
                body
            };
            
        } catch (error) {
            console.error('Error sending email confirmation:', error);
            throw error;
        }
    }

    // Send bulk notifications to all players in a match
    async notifyMatchPlayers(bookingId, type, subject, body) {
        try {
            const result = await pool.query(
                `SELECT mp.user_id 
                 FROM MatchPlayers mp 
                 WHERE mp.booking_id = $1`,
                [bookingId]
            );
            
            const players = result.rows;
            
            for (const player of players) {
                await this.createNotification(player.user_id, type, subject, body, bookingId);
            }
            
            return {
                success: true,
                notified_players: players.length
            };
            
        } catch (error) {
            console.error('Error notifying match players:', error);
            throw error;
        }
    }

    // Get notification statistics for admin
    async getNotificationStats() {
        try {
            const result = await pool.query(
                `SELECT 
                    COUNT(*) as total_notifications,
                    COUNT(CASE WHEN is_sent = false THEN 1 END) as unread_notifications,
                    COUNT(CASE WHEN type = 'confirmation' THEN 1 END) as confirmations,
                    COUNT(CASE WHEN type = 'cancellation' THEN 1 END) as cancellations,
                    COUNT(CASE WHEN type = 'invitation' THEN 1 END) as invitations
                 FROM Notifications`
            );
            
            return result.rows[0];
        } catch (error) {
            console.error('Error getting notification stats:', error);
            throw error;
        }
    }

    // Process email queue (cron job)
    async processEmailQueue(limit = 50) {
        try {
            const result = await pool.query(
                `SELECT * FROM EmailQueue 
                 WHERE status = 'pending' 
                 ORDER BY created_at ASC 
                 LIMIT $1`,
                [limit]
            );
            
            const emails = result.rows;
            let processedCount = 0;
            
            for (const email of emails) {
                try {
                    // TODO: Send actual email using email service
                    // await emailService.send(email.to, email.subject, email.body);
                    
                    // Mark as sent
                    await pool.query(
                        'UPDATE EmailQueue SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
                        ['sent', email.id]
                    );
                    
                    processedCount++;
                } catch (error) {
                    console.error(`Failed to send email ${email.id}:`, error);
                    
                    // Mark as failed
                    await pool.query(
                        'UPDATE EmailQueue SET status = $1, error_message = $2 WHERE id = $3',
                        ['failed', error.message, email.id]
                    );
                }
            }
            
            return {
                processed: processedCount,
                total: emails.length
            };
            
        } catch (error) {
            console.error('Error processing email queue:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;
