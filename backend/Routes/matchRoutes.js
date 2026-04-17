const express = require('express');
const pool = require('../config/db');
const MatchService = require('../Services/MatchService');
const sqlMatchRepository = require('../Repositories/SqlMatchRepository');
const PaymentService = require('../Services/PaymentService');
const AutoCancelService = require('../Services/AutoCancelService');
const AuthService = require('../Services/AuthService');
const {
    authenticateToken,
    requireRole,
    requireCronSecret,
} = require('../middleware/auth');

const router = express.Router();
const matchService = new MatchService(sqlMatchRepository);
const paymentService = new PaymentService();
const autoCancelService = new AutoCancelService();
const authService = new AuthService();

function fieldLabel(terrain) {
    if (terrain === 'indoor_hall') return 'Sallë Futsali';
    if (terrain === 'artificial_grass') return 'Bar Artificial';
    return terrain || '—';
}

async function loadFieldsMap() {
    const r = await pool.query('SELECT id, name, location, terrain_type, price_per_hour, is_active FROM Fields ORDER BY id');
    const map = {};
    for (const row of r.rows) map[row.id] = row;
    return map;
}

function mapBookingRow(row, fieldMap) {
    const f = fieldMap[row.field_id] || {};
    return {
        id: row.id,
        field_id: row.field_id,
        field_name: f.name || `Fusha #${row.field_id}`,
        location: f.location || '',
        terrain_type: f.terrain_type,
        terrain_label: fieldLabel(f.terrain_type),
        start_time: row.start_time,
        end_time: row.end_time,
        total_price: parseFloat(row.total_price),
        price_per_player: parseFloat(row.price_per_player),
        status: row.status,
        organizer_id: row.organizer_id,
        smart_split: `${parseFloat(row.total_price)}€ ÷ 12`,
    };
}

function buildPlayersFromPayments(payments, booking) {
    const list = (payments || []).map((p) => ({
        id: p.user_id,
        payment_id: p.id,
        name: p.user_name || `Lojtar #${p.user_id}`,
        initials: (p.user_name || '?')
            .split(' ')
            .map((s) => s[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        paid: p.status === 'paid',
        rental_fee: parseFloat(p.rental_fee || 0),
        shoeBadge: parseFloat(p.rental_fee || 0) > 0,
    }));
    while (list.length < 12) {
        const i = list.length + 1;
        list.push({
            id: `slot-${i}`,
            name: `Vend ${i}`,
            initials: '—',
            paid: false,
            rental_fee: 0,
            shoeBadge: false,
            placeholder: true,
        });
    }
    return list.slice(0, 12);
}

async function assertMatchAccess(booking, user) {
    if (user.role === 'admin') return;
    if (booking.organizer_id === user.id) return;
    const err = new Error('Nuk keni akses në këtë ndeshje.');
    err.status = 403;
    throw err;
}

// ─── Stats & list (before /matches/:id) ──────────────────────────────────────

router.get('/matches/stats', authenticateToken, async (req, res) => {
    try {
        const filters = {};
        if (req.query.status) filters.status = req.query.status;
        const stats = await matchService.llogaritStatistikat(filters);
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/matches', authenticateToken, async (req, res) => {
    try {
        const filters = {};
        if (req.query.status) filters.status = req.query.status;
        if (req.query.terrain_type) filters.terrain_type = req.query.terrain_type;
        const rows = await matchService.listoTeGjitha(filters);
        const fieldMap = await loadFieldsMap();
        res.json(rows.map((row) => mapBookingRow(row, fieldMap)));
    } catch (error) {
        console.error('List matches error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/my-matches', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;
        const values = [req.user.id];
        let q = `SELECT b.* FROM Bookings b WHERE b.organizer_id = $1`;
        if (status) {
            values.push(status);
            q += ` AND b.status = $2`;
        }
        q += ' ORDER BY b.start_time DESC';
        const result = await pool.query(q, values);
        const fieldMap = await loadFieldsMap();
        res.json(result.rows.map((row) => mapBookingRow(row, fieldMap)));
    } catch (error) {
        console.error('My matches error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.post(
    '/matches',
    authenticateToken,
    requireRole(['organizer', 'admin']),
    async (req, res) => {
        try {
            const payload = {
                fieldId: parseInt(req.body.fieldId, 10),
                startTime: req.body.startTime,
                endTime: req.body.endTime,
                totalPrice: parseFloat(req.body.totalPrice),
                organizerId: req.user.id,
            };
            const created = await matchService.shtoNdeshje(payload);
            const fieldMap = await loadFieldsMap();
            res.status(201).json(mapBookingRow(created, fieldMap));
        } catch (error) {
            console.error('Create match error:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

router.get('/bookings/check', authenticateToken, async (req, res) => {
    try {
        const fieldId = parseInt(req.query.fieldId, 10);
        const start = req.query.start;
        const end = req.query.end;
        if (!fieldId || !start || !end) {
            return res.status(400).json({ error: 'fieldId, start dhe end janë të detyrueshme' });
        }
        const conflict = await sqlMatchRepository.checkConflict(fieldId, start, end);
        res.json({ available: !conflict });
    } catch (error) {
        console.error('Bookings check error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/bookings/availability', authenticateToken, async (req, res) => {
    try {
        const fieldId = parseInt(req.query.fieldId, 10);
        const date = req.query.date;
        if (!fieldId || !date) {
            return res.status(400).json({ error: 'fieldId dhe date janë të detyrueshme' });
        }
        const result = await pool.query(
            `SELECT start_time, end_time FROM Bookings
             WHERE field_id = $1 AND status != 'canceled'
               AND (start_time::date = $2::date OR end_time::date = $2::date)`,
            [fieldId, date]
        );
        const occupiedHours = new Set();
        for (const row of result.rows) {
            let t = new Date(row.start_time);
            const end = new Date(row.end_time);
            while (t < end) {
                occupiedHours.add(t.getHours());
                t = new Date(t.getTime() + 60 * 60 * 1000);
            }
        }
        res.json({ occupiedHours: [...occupiedHours].sort((a, b) => a - b) });
    } catch (error) {
        console.error('Availability error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/fields', authenticateToken, async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT id, name, location, terrain_type, price_per_hour, is_active FROM Fields ORDER BY id'
        );
        res.json(
            r.rows.map((row) => ({
                id: row.id,
                name: row.name,
                location: row.location,
                terrain_type: row.terrain_type,
                terrain_label: fieldLabel(row.terrain_type),
                price_per_hour: parseFloat(row.price_per_hour),
                is_active: row.is_active,
            }))
        );
    } catch (error) {
        console.error('Fields error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/fields/:id/slots', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'date është e detyrueshme' });
        req.query.fieldId = req.params.id;
        req.query.date = date;
        const fieldId = parseInt(req.params.id, 10);
        const result = await pool.query(
            `SELECT start_time, end_time FROM Bookings
             WHERE field_id = $1 AND status != 'canceled'
               AND (start_time::date = $2::date OR end_time::date = $2::date)`,
            [fieldId, date]
        );
        const occupiedHours = new Set();
        for (const row of result.rows) {
            let t = new Date(row.start_time);
            const end = new Date(row.end_time);
            while (t < end) {
                occupiedHours.add(t.getHours());
                t = new Date(t.getTime() + 60 * 60 * 1000);
            }
        }
        res.json({ occupiedHours: [...occupiedHours].sort((a, b) => a - b) });
    } catch (error) {
        console.error('Slots error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/shoes/inventory', authenticateToken, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT si.*,
                    COALESCE((
                        SELECT ROUND(AVG(sr.rating)::numeric, 1)
                        FROM shoeratings sr WHERE sr.shoe_id = si.id
                    ), 0) AS rating_avg
             FROM shoesinventory si
             ORDER BY si.size, si.id`
        );
        res.json(r.rows);
    } catch (error) {
        console.error('Shoes inventory error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/search-users', authenticateToken, async (req, res) => {
    try {
        const users = await authService.searchUsersByUsername(req.query.q, req.user.id);
        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/matches/:id/payments', authenticateToken, async (req, res) => {
    try {
        const booking = await matchService.gjejSipasId(req.params.id);
        await assertMatchAccess(booking, req.user);
        const payments = await paymentService.getPaymentSummary(req.params.id);
        res.json(payments);
    } catch (error) {
        const code = error.status || (error.message && error.message.includes('nuk u gjet') ? 404 : 400);
        console.error('Get payments error:', error);
        res.status(code).json({ error: error.message });
    }
});

router.get('/matches/:id', authenticateToken, async (req, res) => {
    try {
        const booking = await matchService.gjejSipasId(req.params.id);
        await assertMatchAccess(booking, req.user);

        const r = await pool.query(
            `SELECT b.*, f.name AS field_name, f.location, f.terrain_type
             FROM Bookings b
             JOIN Fields f ON f.id = b.field_id
             WHERE b.id = $1`,
            [req.params.id]
        );
        const row = r.rows[0];
        const payments = await paymentService.getPaymentSummary(req.params.id);
        const players = buildPlayersFromPayments(payments, row);
        const paidCount = players.filter((p) => p.paid).length;
        const collected = payments
            .filter((p) => p.status === 'paid')
            .reduce((s, p) => s + parseFloat(p.total_amount || 0), 0);
        const totalPrice = parseFloat(row.total_price);
        const hoursLeft = (new Date(row.start_time) - new Date()) / (1000 * 60 * 60);
        const cancelBadge =
            hoursLeft > 2
                ? { type: 'ok', label: 'Pa penalitet' }
                : { type: 'penalty', label: 'Penalitet 40%' };

        res.json({
            match: {
                ...row,
                terrain_label: fieldLabel(row.terrain_type),
            },
            players,
            financials: {
                totalPrice,
                pricePerPlayer: parseFloat(row.price_per_player),
                smartSplit: parseFloat(row.price_per_player),
                collected: parseFloat(collected.toFixed(2)),
                remaining: Math.max(0, parseFloat((totalPrice - collected).toFixed(2))),
            },
            progress: { paid: paidCount, total: 12 },
            cancelPolicy: cancelBadge,
            countdownTarget: row.start_time,
        });
    } catch (error) {
        const code = error.status || (error.message && error.message.includes('nuk u gjet') ? 404 : 400);
        console.error('Get match error:', error);
        res.status(code).json({ error: error.message });
    }
});

router.put('/matches/:id', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'status është i detyrueshëm' });
        const booking = await matchService.gjejSipasId(req.params.id);
        const isAdmin = req.user.role === 'admin';
        const isOwner = booking.organizer_id === req.user.id;
        if (!isAdmin && !(isOwner && status === 'confirmed')) {
            return res.status(403).json({ error: 'Nuk keni leje për këtë veprim' });
        }
        const updated = await matchService.perditesoStatusin(req.params.id, status);
        const fieldMap = await loadFieldsMap();
        res.json(mapBookingRow(updated, fieldMap));
    } catch (error) {
        console.error('Update match error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.delete('/matches/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await matchService.fshiNdeshjen(req.params.id);
        res.json({ ok: true });
    } catch (error) {
        console.error('Delete match error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/matches/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const booking = await matchService.gjejSipasId(req.params.id);
        if (req.user.role !== 'admin' && booking.organizer_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const result = await matchService.perditesoStatusin(req.params.id, 'canceled');
        res.json(result);
    } catch (error) {
        console.error('Cancel match error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/matches/:id/respond', authenticateToken, async (req, res) => {
    res.status(501).json({ error: 'Ftesat nuk janë të aktivizuara në këtë version.' });
});

router.post(
    '/payments/:id/process',
    authenticateToken,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { payment_method, transaction_reference } = req.body;
            const payment = await paymentService.processPayment(
                req.params.id,
                payment_method,
                transaction_reference
            );
            res.json(payment);
        } catch (error) {
            console.error('Process payment error:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

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

router.post('/auto-cancel', requireCronSecret, async (req, res) => {
    try {
        const result = await autoCancelService.runAutoCancel();
        res.json(result);
    } catch (error) {
        console.error('Auto cancel error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/split-preview', async (req, res) => {
    try {
        const totalPrice = parseFloat(req.query.totalPrice);
        const playerCount = parseInt(req.query.players, 10) || 12;
        if (Number.isNaN(totalPrice) || totalPrice <= 0) {
            return res.status(400).json({ error: 'totalPrice duhet të jetë > 0' });
        }
        const split = paymentService.calculateSmartSplit(totalPrice, playerCount);
        res.json(split);
    } catch (error) {
        console.error('Split preview error:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
