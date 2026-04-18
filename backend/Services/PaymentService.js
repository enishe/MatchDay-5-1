const pool = require('../config/db');

class PaymentService {
    // Calculate Smart Split for a booking
    calculateSmartSplit(totalPrice, playerCount = 12) {
        const pricePerPlayer = totalPrice / playerCount;
        return {
            totalPrice,
            pricePerPlayer: parseFloat(pricePerPlayer.toFixed(2)),
            playerCount
        };
    }

    // Create payment records for all players in a match
    async createPlayerPayments(bookingId, players, shoeRentals = {}) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const payments = [];
            
            for (const player of players) {
                const { user_id, shoe_id = null, is_organizer = false, payment_method = 'cash' } = player;
                
                // Get booking details to calculate price
                const bookingResult = await client.query(
                    'SELECT price_per_player FROM Bookings WHERE id = $1',
                    [bookingId]
                );
                
                if (bookingResult.rows.length === 0) {
                    throw new Error('Booking not found');
                }
                
                const pricePerPlayer = bookingResult.rows[0].price_per_player;
                
                // Calculate rental fee if shoes are rented
                let rentalFee = 0;
                if (shoe_id) {
                    const shoeResult = await client.query(
                        'SELECT rent_price FROM ShoesInventory WHERE id = $1',
                        [shoe_id]
                    );
                    
                    if (shoeResult.rows.length > 0) {
                        rentalFee = shoeResult.rows[0].rent_price;
                    }
                }
                
                const totalAmount = pricePerPlayer + rentalFee;
                
                // Create payment record with payment method
                const paymentResult = await client.query(
                    `INSERT INTO PlayerPayments 
                     (booking_id, user_id, field_share, rental_fee, shoe_id, total_amount, payment_method) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     RETURNING id, field_share, rental_fee, total_amount, status, payment_method`,
                    [bookingId, user_id, pricePerPlayer, rentalFee, shoe_id, totalAmount, payment_method]
                );
                
                payments.push({
                    ...paymentResult.rows[0],
                    user_id,
                    shoe_id,
                    is_organizer
                });
            }
            
            await client.query('COMMIT');
            return payments;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Process payment for a player
    async processPayment(paymentId, paymentMethod, transactionReference = null) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get payment details
            const paymentResult = await client.query(
                'SELECT * FROM PlayerPayments WHERE id = $1',
                [paymentId]
            );
            
            if (paymentResult.rows.length === 0) {
                throw new Error('Payment not found');
            }
            
            const payment = paymentResult.rows[0];
            
            if (payment.status === 'paid') {
                throw new Error('Payment already processed');
            }
            
            // Update payment status
            await client.query(
                `UPDATE PlayerPayments 
                 SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [paymentId]
            );
            
            // Create transaction record
            await client.query(
                `INSERT INTO PaymentTransactions 
                 (payment_id, transaction_type, amount, payment_method, transaction_reference) 
                 VALUES ($1, 'payment', $2, $3, $4)`,
                [paymentId, payment.total_amount, paymentMethod, transactionReference]
            );
            
            // Check if all players have paid - if so, confirm the match
            await this.checkMatchConfirmation(payment.booking_id, client);
            
            await client.query('COMMIT');
            
            return {
                ...payment,
                status: 'paid',
                paid_at: new Date()
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Check if match should be confirmed (all 12 players paid)
    async checkMatchConfirmation(bookingId, client) {
        const result = await client.query(
            `SELECT COUNT(*) as paid_count 
             FROM PlayerPayments 
             WHERE booking_id = $1 AND status = 'paid'`,
            [bookingId]
        );
        
        const paidCount = parseInt(result.rows[0].paid_count);
        
        if (paidCount >= 12) {
            // Confirm the match
            await client.query(
                `UPDATE Bookings 
                 SET status = 'confirmed' 
                 WHERE id = $1`,
                [bookingId]
            );
            
            // Update match players status
            await client.query(
                `UPDATE MatchPlayers 
                 SET invitation_status = 'accepted' 
                 WHERE booking_id = $1 AND invitation_status IN ('invited', 'pending')`,
                [bookingId]
            );
        }
    }

    // Process refund based on cancellation policy
    async processRefund(paymentId, cancellationType, cancellationTime) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get payment and booking details
            const paymentResult = await client.query(
                `SELECT pp.*, b.start_time, b.cancellation_status 
                 FROM PlayerPayments pp 
                 JOIN Bookings b ON pp.booking_id = b.id 
                 WHERE pp.id = $1`,
                [paymentId]
            );
            
            if (paymentResult.rows.length === 0) {
                throw new Error('Payment not found');
            }
            
            const payment = paymentResult.rows[0];
            
            if (payment.status === 'refunded') {
                throw new Error('Payment already refunded');
            }
            
            // Calculate refund amount based on policy
            let refundAmount = 0;
            const hoursUntilMatch = (new Date(payment.start_time) - new Date(cancellationTime)) / (1000 * 60 * 60);
            
            if (cancellationType === 'free' || hoursUntilMatch > 2) {
                // Full refund
                refundAmount = payment.total_amount;
            } else if (cancellationType === 'penalty_40' || hoursUntilMatch <= 2) {
                // 60% refund for field, 100% for shoes
                const fieldRefund = payment.field_share * 0.6;
                const shoesRefund = payment.rental_fee; // 100% refund for shoes
                refundAmount = fieldRefund + shoesRefund;
            }
            
            // Update payment status
            await client.query(
                `UPDATE PlayerPayments 
                 SET status = 'refunded', refunded_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [paymentId]
            );
            
            // Create transaction record
            await client.query(
                `INSERT INTO PaymentTransactions 
                 (payment_id, transaction_type, amount, payment_method) 
                 VALUES ($1, 'refund', $2, 'bank_transfer')`,
                [paymentId, refundAmount]
            );
            
            await client.query('COMMIT');
            
            return {
                ...payment,
                status: 'refunded',
                refunded_at: new Date(),
                refund_amount: parseFloat(refundAmount.toFixed(2))
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get payment summary for a booking
    async getPaymentSummary(bookingId) {
        const result = await pool.query(
            `SELECT 
                pp.id,
                pp.user_id,
                pp.field_share,
                pp.rental_fee,
                pp.total_amount,
                pp.status,
                NULL::varchar(20) AS payment_method,
                pp.paid_at,
                pp.refunded_at,
                u.name as user_name,
                NULL::text as user_username,
                si.size as shoe_size,
                si.rent_price as shoe_rent_price
             FROM playerpayments pp
             JOIN users u ON pp.user_id = u.id
             LEFT JOIN shoesinventory si ON pp.shoe_id = si.id
             WHERE pp.booking_id = $1
             ORDER BY pp.id`,
            [bookingId]
        );
        
        return result.rows;
    }

    // Get payment statistics for admin dashboard
    async getPaymentStats() {
        const result = await pool.query(
            `SELECT 
                COUNT(CASE WHEN pp.status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN pp.status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN pp.status = 'refunded' THEN 1 END) as refunded_count,
                COALESCE(SUM(CASE WHEN pp.status = 'paid' THEN pp.total_amount ELSE 0 END), 0) as total_collected,
                COALESCE(SUM(CASE WHEN pp.status = 'refunded' THEN pp.total_amount ELSE 0 END), 0) as total_refunded
             FROM PlayerPayments pp`
        );
        
        return result.rows[0];
    }

    // Update payment method for an existing payment
    async updatePaymentMethod(paymentId, paymentMethod) {
        const validMethods = ['cash', 'card'];
        if (!validMethods.includes(paymentMethod)) {
            throw new Error('Invalid payment method. Must be cash or card');
        }

        const result = await pool.query(
            `UPDATE PlayerPayments 
             SET payment_method = $1 
             WHERE id = $2 
             RETURNING id, payment_method, status`,
            [paymentMethod, paymentId]
        );

        if (result.rows.length === 0) {
            throw new Error('Payment not found');
        }

        return result.rows[0];
    }
}

module.exports = PaymentService;
