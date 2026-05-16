const AuthService = require('../Services/AuthService');

const authService = new AuthService();

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const isBearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
    const token = isBearer ? authHeader.slice(7).trim() : '';

    if (!token) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(401).json({ error: 'Ju duhet të kyçeni për të vazhduar.' });
    }

    try {
        const decoded = authService.verifyToken(token);
        req.user = decoded;
        next();
    } catch {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(401).json({ error: 'Sesioni juaj ka skaduar. Kyçuni përsëri.' });
    }
}

function optionalAuthenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    const isBearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
    const token = isBearer ? authHeader.slice(7).trim() : '';
    if (!token) return next();
    try {
        req.user = authService.verifyToken(token);
    } catch {
        /* token i pavlefshëm — trajtohet si kërkesë publike */
    }
    next();
}

function requireRole(roles) {
    const allowed = new Set(roles);
    if (allowed.has('participant')) {
        allowed.add('player');
    }
    if (allowed.has('admin')) {
        allowed.add('superadmin');
    }
    return (req, res, next) => {
        if (req.user.role === 'superadmin') {
            return next();
        }
        if (!allowed.has(req.user.role)) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(403).json({ error: 'Nuk keni leje të mjaftueshme.' });
        }
        next();
    };
}

async function requireFieldAccess(req, res, next) {
    try {
        if (req.user.role === 'superadmin' || req.user.role === 'admin') return next();
        if (req.user.role !== 'field_admin') {
            return res.status(403).json({ error: 'Nuk keni akses.' });
        }
        const fieldId = parseInt(
            req.params.id || req.params.fieldId ||
            req.query.fieldId || req.body.fieldId
        );
        if (!fieldId || isNaN(fieldId)) {
            return res.status(400).json({ error: 'Field ID mungon.' });
        }
        const pool = require('../config/db');
        const result = await pool.query(
            'SELECT id FROM fields WHERE id = $1 AND owner_id = $2',
            [fieldId, req.user.id]
        );
        if (!result.rows.length) {
            return res.status(403).json({ error: 'Nuk keni akses në këtë fushë.' });
        }
        next();
    } catch (err) {
        console.error('requireFieldAccess error:', err.message);
        res.status(500).json({ error: 'Gabim gjatë kontrollit të aksesit.' });
    }
}

/** Protects cron-style jobs: Authorization: Bearer <CRON_SECRET> */
function requireCronSecret(req, res, next) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            return res.status(503).json({ error: 'CRON_SECRET is not configured' });
        }
        console.warn('CRON_SECRET not set: /api/auto-cancel is unauthenticated (non-production only)');
        return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Invalid cron authorization' });
    }
    next();
}

module.exports = {
    authenticateToken,
    optionalAuthenticate,
    requireRole,
    requireFieldAccess,
    requireCronSecret,
};
