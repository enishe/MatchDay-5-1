const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const AuthService = require('../Services/AuthService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const TokenBlacklistService = require('../Services/TokenBlacklistService');

const router = express.Router();
const authService = new AuthService();
const tokenBlacklistService = new TokenBlacklistService();

router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword } = req.body || {};
        const result = await authService.register({
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
        });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(201).json(result);
    } catch (error) {
        console.error('Registration error:', error);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(401).json({ error: error.message });
    }
});

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await authService.getUserById(req.user.id);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(404).json({ error: error.message });
    }
});

router.put('/profile', express.json({ limit: '10mb' }), authenticateToken, async (req, res) => {
    try {
        const user = await authService.updateProfile(req.user.id, req.body);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(user);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Fjalëkalimi aktual dhe i ri janë të detyrueshëm.',
            });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere.',
            });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({
                error: 'Fjalëkalimi i ri duhet të jetë i ndryshëm nga aktual.',
            });
        }

        const result = await pool.query(
            'SELECT id, password FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Përdoruesi nuk u gjet.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                error: 'Fjalëkalimi aktual është i gabuar.',
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, req.user.id]
        );

        res.json({ success: true, message: 'Fjalëkalimi u ndryshua me sukses.' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Gabim serveri.' });
    }
});

router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        const users = await authService.searchUsers(q, req.user.id);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const decoded = token ? authService.verifyToken(token) : null;
        if (decoded?.jti) {
            const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : null;
            await tokenBlacklistService.add(decoded.jti, expiresAt);
        }
        return res.json({ ok: true });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Logout dështoi.' });
    }
});

module.exports = {
    router,
    authenticateToken,
    requireRole,
};
