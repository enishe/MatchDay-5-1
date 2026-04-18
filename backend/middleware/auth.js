const AuthService = require('../Services/AuthService');

const authService = new AuthService();

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = authService.verifyToken(token);
        req.user = decoded;
        next();
    } catch {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

function requireRole(roles) {
    const allowed = new Set(roles);
    if (allowed.has('participant')) {
        allowed.add('player');
    }
    return (req, res, next) => {
        if (!allowed.has(req.user.role)) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
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
    requireRole,
    requireCronSecret,
};
