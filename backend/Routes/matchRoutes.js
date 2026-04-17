const express = require('express');

const MatchService = require('../Services/MatchService');

const PaymentService = require('../Services/PaymentService');

const AutoCancelService = require('../Services/AutoCancelService');

const EmailService = require('../Services/EmailService');

const { authenticateToken, requireRole, requireCronSecret } = require('../middleware/auth');



const router = express.Router();

const matchService = new MatchService();

const paymentService = new PaymentService();

const autoCancelService = new AutoCancelService();

const emailService = new EmailService();



// Create new match

router.post('/matches', authenticateToken, requireRole(['organizer', 'admin']), async (req, res) => {

    try {

        const match = await matchService.createMatch(req.user.id, req.body);

        res.status(201).json(match);

    } catch (error) {

        console.error('Create match error:', error);

        res.status(400).json({ error: error.message });

    }

});



// Get match details

router.get('/matches/:id', authenticateToken, async (req, res) => {

    try {

        const match = await matchService.getMatchDetails(req.params.id, req.user.id);

        res.json(match);

    } catch (error) {

        console.error('Get match error:', error);

        res.status(404).json({ error: error.message });

    }

});



// Get user's matches

router.get('/my-matches', authenticateToken, async (req, res) => {

    try {

        const { status } = req.query;

        const matches = await matchService.getUserMatches(req.user.id, status);

        res.json(matches);

    } catch (error) {

        console.error('Get user matches error:', error);

        res.status(400).json({ error: error.message });

    }

});



// Respond to invitation

router.post('/matches/:id/respond', authenticateToken, async (req, res) => {

    try {

        const { response } = req.body; // 'accepted' or 'declined'

        const result = await matchService.respondToInvitation(req.params.id, req.user.id, response);

        res.json(result);

    } catch (error) {

        console.error('Respond to invitation error:', error);

        res.status(400).json({ error: error.message });

    }

});



// Cancel match

router.post('/matches/:id/cancel', authenticateToken, async (req, res) => {

    try {

        const result = await matchService.cancelMatch(req.params.id, req.user.id);

        res.json(result);

    } catch (error) {

        console.error('Cancel match error:', error);

        res.status(400).json({ error: error.message });

    }

});



// Get available slots for a field

router.get('/fields/:id/slots', authenticateToken, async (req, res) => {

    try {

        const { date } = req.query;

        const slots = await matchService.getAvailableSlots(req.params.id, date);

        res.json(slots);

    } catch (error) {

        console.error('Get slots error:', error);

        res.status(400).json({ error: error.message });

    }

});



// Search users for invitations

router.get('/search-users', authenticateToken, async (req, res) => {

    try {

        const { q } = req.query;

        const users = await matchService.searchUsers(q, req.user.id);

        res.json(users);

    } catch (error) {

        console.error('Search users error:', error);

        res.status(400).json({ error: error.message });

    }

});



// Process payment

router.post('/payments/:id/process', authenticateToken, requireRole(['admin']), async (req, res) => {

    try {

        const { payment_method, transaction_reference } = req.body;

        const payment = await paymentService.processPayment(req.params.id, payment_method, transaction_reference);

        res.json(payment);

    } catch (error) {

        console.error('Process payment error:', error);

        res.status(400).json({ error: error.message });

    }

});



// Get payment summary for booking

router.get('/matches/:id/payments', authenticateToken, async (req, res) => {

    try {

        const payments = await paymentService.getPaymentSummary(req.params.id);

        res.json(payments);

    } catch (error) {

        console.error('Get payment summary error:', error);

        res.status(400).json({ error: error.message });

    }

});



// Update payment method

router.put('/payments/:id/method', authenticateToken, async (req, res) => {

    try {

        const { payment_method } = req.body;

        const payment = await paymentService.updatePaymentMethod(req.params.id, payment_method);

        res.json(payment);

    } catch (error) {

        console.error('Update payment method error:', error);

        res.status(400).json({ error: error.message });

    }

});



// Auto-cancel matches (cron job endpoint)

router.post('/auto-cancel', requireCronSecret, async (req, res) => {

    try {

        const result = await autoCancelService.runAutoCancel();

        res.json(result);

    } catch (error) {

        console.error('Auto cancel error:', error);

        res.status(500).json({ error: error.message });

    }

});



// Smart Split calculator (for preview)

router.get('/split-preview', async (req, res) => {

    try {

        const totalPrice = parseFloat(req.query.totalPrice);

        const playerCount = parseInt(req.query.players) || 12;



        if (isNaN(totalPrice) || totalPrice <= 0) {

            return res.status(400).json({ error: 'Total price must be a valid number greater than 0' });

        }



        const split = paymentService.calculateSmartSplit(totalPrice, playerCount);

        res.json(split);

    } catch (error) {

        console.error('Split preview error:', error);

        res.status(400).json({ error: error.message });

    }

});



module.exports = router;