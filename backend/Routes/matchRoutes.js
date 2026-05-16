const express = require('express');
const pool = require('../config/db');
const MatchService = require('../Services/MatchService');
const sqlMatchRepository = require('../Repositories/SqlMatchRepository');
const PaymentService = require('../Services/PaymentService');
const AutoCancelService = require('../Services/AutoCancelService');
const AuthService = require('../Services/AuthService');
const UnifiedBookingService = require('../Services/UnifiedBookingService');
const { BELGRADE_TIMEZONE, createUtcDateFromBelgradeLocal, formatBelgradeYmd } = require('../utils/timezone');
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
const unifiedBookingService = new UnifiedBookingService();

function fieldLabel(terrain) {
    if (terrain === 'indoor_hall') return 'Sallë Futsali';
    if (terrain === 'artificial_grass') return 'Bar Artificial';
    return terrain || '—';
}

async function loadFieldsMap() {
    const r = await pool.query(
        'SELECT id, name, location, terrain_type, price_per_hour, courts_count, is_active FROM fields ORDER BY id'
    );
    const map = {};
    for (const row of r.rows) map[row.id] = row;
    return map;
}

function formatShoesSummary(value) {
    if (value == null) return 'Pa patika';
    let arr = value;
    if (typeof value === 'string') {
        try {
            arr = JSON.parse(value);
        } catch {
            return 'Pa patika';
        }
    }
    if (!Array.isArray(arr) || arr.length === 0) return 'Pa patika';
    return arr.map((s) => `${s.count} palë nr.${s.size}`).join(', ');
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
        organizer_name: row.organizer_name || null,
        organizer_email: row.organizer_email || null,
        court_number: row.court_number ?? null,
        payment_method: row.payment_method || 'cash',
        shoes_summary: formatShoesSummary(row.shoes_summary),
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

/** Krahasim i sigurt ID (JWT mund të kthejë numër ose string). */
function sameUserId(a, b) {
    return Number(a) === Number(b);
}

function isStaffAdmin(role) {
    return role === 'admin' || role === 'superadmin' || role === 'field_admin';
}

async function assertMatchAccess(booking, user) {
    if (isStaffAdmin(user.role)) return;
    if (sameUserId(booking.organizer_id, user.id)) return;
    const err = new Error('Nuk keni akses në këtë ndeshje.');
    err.status = 403;
    throw err;
}

/**
 * Orët lokale 12–23 të zëna, sipas Europe/Belgrade.
 */
function occupiedLocalHoursFromBookings(dateStr, timeRows) {
    const occupied = new Set();
    for (let H = 12; H <= 23; H += 1) {
        const slotStart = createUtcDateFromBelgradeLocal(dateStr, H, 0);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
        for (const row of timeRows) {
            const bs = new Date(row.start_time);
            const be = new Date(row.end_time);
            if (bs < slotEnd && be > slotStart) {
                occupied.add(H);
                break;
            }
        }
    }
    return [...occupied].sort((a, b) => a - b);
}

function pad2(value) {
    return String(value).padStart(2, '0');
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

        let rows;
        if (req.user.role === 'field_admin') {
            const values = [Number(req.user.id)];
            let q = `SELECT b.*, u.name AS organizer_name, u.email AS organizer_email
                     FROM bookings b
                     JOIN users u ON u.id = b.organizer_id
                     WHERE b.field_id IN (SELECT id FROM fields WHERE owner_id = $1)`;
            if (filters.status) {
                values.push(filters.status);
                q += ` AND b.status = $${values.length}`;
            }
            if (filters.terrain_type) {
                values.push(filters.terrain_type);
                q += ` AND b.field_id IN (SELECT id FROM fields WHERE owner_id = $1 AND terrain_type = $${values.length})`;
            }
            q += ' ORDER BY b.start_time DESC';
            const r = await pool.query(q, values);
            rows = r.rows;
        } else {
            rows = await matchService.listoTeGjitha(filters);
            if (rows.length > 0) {
                const organizerIds = [...new Set(rows.map((row) => row.organizer_id).filter(Boolean))];
                const userR = await pool.query(
                    'SELECT id, name, email FROM users WHERE id = ANY($1::int[])',
                    [organizerIds]
                );
                const userMap = Object.fromEntries(userR.rows.map((u) => [u.id, u]));
                rows = rows.map((row) => ({
                    ...row,
                    organizer_name: userMap[row.organizer_id]?.name || null,
                    organizer_email: userMap[row.organizer_id]?.email || null,
                }));
            }
        }

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
        const values = [Number(req.user.id)];
        let q = `SELECT b.* FROM bookings b WHERE b.organizer_id = $1`;
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
    requireRole(['organizer', 'admin', 'participant']),
    async (req, res) => {
        // TODO: deprecated — do të ridrejtohet te /api/bookings në v2
        try {
            const fieldId = parseInt(req.body.fieldId, 10);
            const totalPrice = parseFloat(req.body.totalPrice);
            if (!Number.isFinite(fieldId) || fieldId <= 0) {
                return res.status(400).json({ error: 'Zgjidhni një fushë të vlefshme.' });
            }
            if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
                return res.status(400).json({ error: 'Çmimi total duhet të jetë mbi 0.' });
            }
            const payload = {
                fieldId,
                startTime: req.body.startTime,
                endTime: req.body.endTime,
                totalPrice,
                organizerId: Number(req.user.id),
            };
            const startTime = new Date(payload.startTime);
            const endTime = new Date(payload.endTime);
            const requestedCourtNumber = req.body.court_number;
            const paymentMethod = req.body.payment_method === 'card' ? 'card' : 'cash';
            if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime()) || startTime >= endTime) {
                return res.status(400).json({ error: 'Intervali i kohës nuk është i vlefshëm.' });
            }
            const fieldR = await pool.query(
                `SELECT id, courts_count
                 FROM fields
                 WHERE id = $1 AND is_active = TRUE`,
                [fieldId]
            );
            if (fieldR.rows.length === 0) {
                return res.status(404).json({ error: 'Fusha nuk ekziston ose është joaktive.' });
            }
            const totalCourts = Number(fieldR.rows[0].courts_count || 1);
            const courtNumber =
                requestedCourtNumber == null || requestedCourtNumber === ''
                    ? (totalCourts === 1 ? 1 : NaN)
                    : Number(requestedCourtNumber);
            if (!Number.isInteger(courtNumber) || courtNumber <= 0) {
                return res.status(400).json({ error: 'Duhet të zgjidhni numrin e fushës.' });
            }
            if (courtNumber > totalCourts) {
                return res.status(400).json({ error: 'Numri i fushës është jashtë intervalit të lejuar.' });
            }
            const conflict = await pool.query(
                `SELECT 1
                 FROM bookings
                 WHERE field_id = $1
                   AND court_number = $2
                   AND status <> 'canceled'
                   AND start_time < $4::timestamptz
                   AND end_time > $3::timestamptz
                 LIMIT 1`,
                [fieldId, courtNumber, startTime.toISOString(), endTime.toISOString()]
            );
            if (conflict.rows.length > 0) {
                return res.status(409).json({ error: 'Fusha është e zënë për këtë orë' });
            }

            const { raw: created, normalized } = await unifiedBookingService.createBooking(Number(req.user.id), {
                fieldId,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                totalPrice,
                court_number: courtNumber,
                payment_method: paymentMethod,
                teamShoes: req.body.teamShoes,
                inviteEmails: req.body.inviteEmails,
            });
            const fieldMap = await loadFieldsMap();
            res.status(201).json({
                ...mapBookingRow(created, fieldMap),
                ...normalized,
            });
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
            `SELECT start_time, end_time FROM bookings
             WHERE field_id = $1 AND status != 'canceled'
               AND (start_time::date = $2::date OR end_time::date = $2::date)`,
            [fieldId, date]
        );
        const occupiedHours = occupiedLocalHoursFromBookings(date, result.rows);
        res.json({ occupiedHours });
    } catch (error) {
        console.error('Availability error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/fields/availability', authenticateToken, async (req, res) => {
    try {
        const date = req.query.date;
        if (!date) {
            return res.status(400).json({ error: 'date është e detyrueshme' });
        }
        const fieldsR = await pool.query(
            `SELECT id, name FROM fields WHERE is_active = true ORDER BY id`
        );
        const bookR = await pool.query(
            `SELECT b.field_id, b.start_time, b.end_time, u.name AS organizer_name
             FROM bookings b
             JOIN users u ON u.id = b.organizer_id
             WHERE b.status != 'canceled'
               AND (b.start_time::date = $1::date OR b.end_time::date = $1::date)`,
            [date]
        );
        const hours = [];
        for (let h = 12; h <= 23; h += 1) {
            hours.push(`${String(h).padStart(2, '0')}:00`);
        }
        function shortOrganizer(name) {
            const p = String(name || '').trim().split(/\s+/).filter(Boolean);
            if (p.length === 0) return 'Lojtar';
            if (p.length === 1) return p[0];
            return `${p[0]} ${p[p.length - 1].charAt(0).toUpperCase()}.`;
        }
        function slotForHour(fieldId, hourStr) {
            const hour = parseInt(hourStr.split(':')[0], 10);
            const slotStart = createUtcDateFromBelgradeLocal(date, hour, 0);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
            for (const row of bookR.rows) {
                if (row.field_id !== fieldId) continue;
                const bs = new Date(row.start_time);
                const be = new Date(row.end_time);
                if (bs < slotEnd && be > slotStart) {
                    return {
                        available: false,
                        bookedBy: shortOrganizer(row.organizer_name),
                    };
                }
            }
            return { available: true };
        }
        const fields = fieldsR.rows.map((f) => ({
            id: f.id,
            name: f.name,
            slots: hours.map((time) => {
                const s = slotForHour(f.id, time);
                return s.available ? { time, available: true } : { time, available: false, bookedBy: s.bookedBy };
            }),
        }));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({ fields });
    } catch (error) {
        console.error('Fields availability error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    if (req.user.role === 'field_admin') {
        return res.status(403).json({ error: 'Nuk keni akses.' });
    }
    try {
        const r = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.created_at, COUNT(b.id)::int AS total_bookings
             FROM users u
             LEFT JOIN bookings b ON b.organizer_id = u.id
             GROUP BY u.id, u.name, u.email, u.role, u.created_at
             ORDER BY u.id ASC`
        );
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(
            r.rows.map((row) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                role: row.role === 'participant' ? 'player' : row.role,
                created_at: row.created_at,
                total_bookings: row.total_bookings || 0,
            }))
        );
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/admin/stats', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
    try {
        const isFieldAdmin = req.user.role === 'field_admin';
        const bookingFilter = isFieldAdmin
            ? 'WHERE b.field_id IN (SELECT id FROM fields WHERE owner_id = $1)'
            : '';
        const bookingParams = isFieldAdmin ? [req.user.id] : [];
        const result = await pool.query(
            `SELECT
                COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END), 0)::numeric AS total_revenue,
                COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.start_time::date = CURRENT_DATE THEN b.total_price ELSE 0 END), 0)::numeric AS today_revenue,
                COALESCE(SUM(CASE WHEN b.status = 'confirmed' AND b.start_time >= date_trunc('week', NOW()) AND b.start_time < date_trunc('week', NOW()) + INTERVAL '7 day' THEN b.total_price ELSE 0 END), 0)::numeric AS week_revenue,
                COUNT(b.id)::int AS total_bookings,
                COUNT(CASE WHEN b.status = 'confirmed' AND b.start_time::date = CURRENT_DATE THEN 1 END)::int AS today_confirmed_bookings,
                COUNT(CASE WHEN b.status = 'pending' THEN 1 END)::int AS pending_bookings
             FROM bookings b
             ${bookingFilter}`,
            bookingParams
        );
        const fieldsR = await pool.query(
            isFieldAdmin
                ? `SELECT COUNT(*)::int AS total_fields
                   FROM fields
                   WHERE is_active = TRUE AND owner_id = $1`
                : `SELECT COUNT(*)::int AS total_fields
                   FROM fields
                   WHERE is_active = TRUE`,
            isFieldAdmin ? [req.user.id] : []
        );
        const playersR = await pool.query(
            `SELECT COUNT(*)::int AS total_players
             FROM users
             WHERE role IN ('participant', 'player')`
        );
        const row = result.rows[0] || {};
        res.json({
            total_revenue: Number(row.total_revenue || 0),
            today_revenue: Number(row.today_revenue || 0),
            week_revenue: Number(row.week_revenue || 0),
            total_bookings: Number(row.total_bookings || 0),
            today_confirmed_bookings: Number(row.today_confirmed_bookings || 0),
            total_fields: Number(fieldsR.rows[0]?.total_fields || 0),
            total_players: Number(playersR.rows[0]?.total_players || 0),
            pending_bookings: Number(row.pending_bookings || 0),
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(400).json({ error: 'Nuk u lexuan statistikat e adminit.' });
    }
});

router.get('/admin/today-bookings', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
    try {
        const isFieldAdmin = req.user.role === 'field_admin';
        const ownerFilter = isFieldAdmin ? 'AND f.owner_id = $1' : '';
        const params = isFieldAdmin ? [req.user.id] : [];
        const result = await pool.query(
            `SELECT
                f.id AS field_id,
                f.name AS field_name,
                f.location,
                f.courts_count,
                b.id AS booking_id,
                b.court_number,
                b.start_time,
                b.end_time,
                b.total_price,
                b.shoes_summary,
                b.payment_method,
                b.status,
                u.name AS organizer_name,
                u.email AS organizer_email
             FROM fields f
             LEFT JOIN bookings b
               ON b.field_id = f.id
              AND b.status = 'confirmed'
              AND b.start_time::date = CURRENT_DATE
             LEFT JOIN users u ON u.id = b.organizer_id
             WHERE f.is_active = TRUE
             ${ownerFilter}
             ORDER BY f.id ASC, b.start_time ASC`,
            params
        );
        const grouped = {};
        for (const row of result.rows) {
            if (!grouped[row.field_id]) {
                grouped[row.field_id] = {
                    field_id: row.field_id,
                    field_name: row.field_name,
                    location: row.location,
                    courts_count: Number(row.courts_count || 1),
                    confirmed_bookings_today: 0,
                    revenue_today: 0,
                    bookings: [],
                };
            }
            if (row.booking_id) {
                grouped[row.field_id].confirmed_bookings_today += 1;
                grouped[row.field_id].revenue_today += Number(row.total_price || 0);
                grouped[row.field_id].bookings.push({
                    booking_id: row.booking_id,
                    court_number: row.court_number,
                    start_time: row.start_time,
                    end_time: row.end_time,
                    total_price: Number(row.total_price || 0),
                    organizer_name: row.organizer_name || null,
                    organizer_email: row.organizer_email || null,
                    shoes_summary: formatShoesSummary(row.shoes_summary),
                    payment_method: row.payment_method || null,
                    status: row.status || 'confirmed',
                });
            }
        }
        res.json(Object.values(grouped));
    } catch (error) {
        console.error('Admin today bookings error:', error);
        res.status(400).json({ error: 'Nuk u lexuan rezervimet e sotme.' });
    }
});

router.get('/admin/field-calendar', authenticateToken, requireRole(['admin', 'field_admin']), async (req, res) => {
    try {
        const fieldId = Number(req.query.fieldId);
        const selectedDate = String(req.query.date || formatBelgradeYmd(new Date())).trim();
        if (!Number.isInteger(fieldId) || fieldId <= 0) {
            return res.status(400).json({ error: 'fieldId është i detyrueshëm dhe duhet të jetë valid.' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            return res.status(400).json({ error: 'date duhet të jetë në formatin YYYY-MM-DD.' });
        }

        const isFieldAdmin = req.user.role === 'field_admin';
        const fieldResult = await pool.query(
            isFieldAdmin
                ? `SELECT id, name, location, terrain_type, courts_count
                   FROM fields
                   WHERE id = $1 AND is_active = TRUE AND owner_id = $2`
                : `SELECT id, name, location, terrain_type, courts_count
                   FROM fields
                   WHERE id = $1 AND is_active = TRUE`,
            isFieldAdmin ? [fieldId, req.user.id] : [fieldId]
        );
        if (fieldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Fusha nuk u gjet ose nuk është aktive.' });
        }
        const field = fieldResult.rows[0];

        const bookingsResult = await pool.query(
            `SELECT b.id,
                    b.start_time,
                    b.end_time,
                    b.created_at,
                    b.court_number,
                    b.organizer_id,
                    u.name AS organizer_name,
                    u.phone AS organizer_phone
             FROM bookings b
             LEFT JOIN users u ON u.id = b.organizer_id
             WHERE b.field_id = $1
               AND b.status <> 'canceled'
               AND DATE(b.start_time AT TIME ZONE '${BELGRADE_TIMEZONE}') = $2::date
             ORDER BY b.start_time ASC`,
            [fieldId, selectedDate]
        );

        const now = new Date();
        const slots = [];
        let freeCount = 0;
        let bookedCount = 0;
        let pastCount = 0;

        for (let hour = 12; hour <= 23; hour += 1) {
            const slotStart = createUtcDateFromBelgradeLocal(selectedDate, hour, 0);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
            const isPast = slotStart.getTime() <= now.getTime();
            const bookingRow = bookingsResult.rows.find((row) => {
                const bookingStart = new Date(row.start_time);
                const bookingEnd = new Date(row.end_time);
                return bookingStart < slotEnd && bookingEnd > slotStart;
            });

            let status = 'available';
            if (isPast) status = 'past';
            else if (bookingRow) status = 'booked';

            if (status === 'past') pastCount += 1;
            else if (status === 'booked') bookedCount += 1;
            else freeCount += 1;

            slots.push({
                hour: `${pad2(hour)}:00`,
                label: `${pad2(hour)}:00 - ${pad2(hour + 1)}:00`,
                status,
                booking: bookingRow
                    ? {
                        booking_id: bookingRow.id,
                        organizer_name: bookingRow.organizer_name || `Përdoruesi #${bookingRow.organizer_id}`,
                        organizer_phone: bookingRow.organizer_phone || null,
                        court_number: bookingRow.court_number || null,
                        created_at: bookingRow.created_at,
                        start_time: bookingRow.start_time,
                        end_time: bookingRow.end_time,
                    }
                    : null,
            });
        }

        res.json({
            timezone: BELGRADE_TIMEZONE,
            date: selectedDate,
            field: {
                id: field.id,
                name: field.name,
                location: field.location,
                terrain_type: field.terrain_type,
                courts_count: Number(field.courts_count || 1),
            },
            counts: {
                free: freeCount,
                booked: bookedCount,
                past: pastCount,
            },
            slots,
        });
    } catch (error) {
        console.error('Admin field calendar error:', error);
        res.status(400).json({ error: error.message || 'Nuk u lexua kalendari i fushës.' });
    }
});

router.get('/fields', authenticateToken, async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT id, name, location, terrain_type, price_per_hour, is_active FROM fields ORDER BY id'
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
            `SELECT start_time, end_time FROM bookings
             WHERE field_id = $1 AND status != 'canceled'
               AND (start_time::date = $2::date OR end_time::date = $2::date)`,
            [fieldId, date]
        );
        const occupiedHours = occupiedLocalHoursFromBookings(date, result.rows);
        res.json({ occupiedHours });
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
        const users = await authService.searchUsers(req.query.q, req.user.id);
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
             FROM bookings b
             JOIN fields f ON f.id = b.field_id
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
    // TODO: deprecated — do të ridrejtohet te /api/bookings në v2
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'status është i detyrueshëm' });
        const booking = await matchService.gjejSipasId(req.params.id);
        const isAdmin = isStaffAdmin(req.user.role);
        const isOwner = sameUserId(booking.organizer_id, req.user.id);
        if (!isAdmin && !(isOwner && status === 'confirmed')) {
            return res.status(403).json({ error: 'Nuk keni leje për këtë veprim' });
        }
        const { raw: updated, normalized } = await unifiedBookingService.updateStatus(req.params.id, status);
        const fieldMap = await loadFieldsMap();
        res.json({
            ...mapBookingRow(updated, fieldMap),
            ...normalized,
        });
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
    // TODO: deprecated — do të ridrejtohet te /api/bookings në v2
    try {
        const booking = await matchService.gjejSipasId(req.params.id);
        if (!isStaffAdmin(req.user.role) && !sameUserId(booking.organizer_id, req.user.id)) {
            return res.status(403).json({ error: 'Nuk keni leje për këtë veprim' });
        }
        const { raw: result, normalized } = await unifiedBookingService.cancelBooking(req.params.id);
        res.json({ ...result, ...normalized });
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

router.post('/notifications/read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET is_sent = true WHERE user_id = $1 AND is_sent = false`,
            [Number(req.user.id)]
        );
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({ ok: true });
    } catch (error) {
        console.error('Notifications read error:', error);
        res.status(400).json({ error: error.message });
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
