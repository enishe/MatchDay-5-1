const express = require('express');
const AuthService = require('../Services/AuthService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const authService = new AuthService();

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

module.exports = {
    router,
    authenticateToken,
    requireRole,
};
