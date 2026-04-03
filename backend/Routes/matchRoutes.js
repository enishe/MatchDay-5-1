const express = require('express');
const router  = express.Router();
const MatchService = require('../Services/MatchService');
const repo         = require('../Repositories/SqlMatchRepository');

// Dependency Injection — repo inject-ohet te Service, jo hardcoded brenda
const service = new MatchService(repo);

// ─── GET /api/matches/stats ───────────────────────────────────────────────
// SPRINT 2 — Statistikat e ndeshjeve
// Shembuj: /api/matches/stats
//          /api/matches/stats?status=confirmed
// KUJDES: Ky route duhet PARA /matches/:id — përndryshe Express
//         lexon "stats" si parametër :id dhe kthehet gabim
router.get('/matches/stats', async (req, res) => {
    try {
        const stats = await service.llogaritStatistikat(req.query);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/matches/split-preview ──────────────────────────────────────
// Llogarit Smart Split para pagesës (pa ruajtur në DB)
// KUJDES: Edhe ky duhet PARA /matches/:id
router.get('/matches/split-preview', async (req, res) => {
    try {
        const totalPrice  = parseFloat(req.query.totalPrice);
        const playerCount = parseInt(req.query.players) || 12;

        // Error Handling — input i gabuar
        if (isNaN(totalPrice) || totalPrice <= 0) {
            return res.status(400).json({ error: 'Ju lutem shkruani një çmim valid (numër mbi 0).' });
        }

        const perPlayer = service.llogaritSmartSplit(totalPrice, playerCount);
        res.json({ totalPrice, playerCount, pricePerPlayer: perPlayer, currency: 'EUR' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── GET /api/matches ─────────────────────────────────────────────────────
// Listo me filtrim opsional
router.get('/matches', async (req, res) => {
    try {
        const matches = await service.listoTeGjitha(req.query);
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/matches/:id ─────────────────────────────────────────────────
// Gjej sipas ID
router.get('/matches/:id', async (req, res) => {
    try {
        const match = await service.gjejSipasId(req.params.id);
        res.json(match);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// ─── POST /api/matches ────────────────────────────────────────────────────
// Shto ndeshje të re me validim
router.post('/matches', async (req, res) => {
    try {
        const newMatch = await service.shtoNdeshje(req.body);
        res.status(201).json(newMatch);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── PUT /api/matches/:id ─────────────────────────────────────────────────
// Përditëso statusin
router.put('/matches/:id', async (req, res) => {
    try {
        const { status } = req.body;
        if (!status)
            return res.status(400).json({ error: 'Statusi është i detyrueshëm në body.' });
        const updated = await service.perditesoStatusin(req.params.id, status);
        res.json(updated);
    } catch (err) {
        const code = err.message.includes('nuk u gjet') ? 404 : 400;
        res.status(code).json({ error: err.message });
    }
});

// ─── DELETE /api/matches/:id ──────────────────────────────────────────────
// Fshi ndeshjen
router.delete('/matches/:id', async (req, res) => {
    try {
        await service.fshiNdeshjen(req.params.id);
        res.json({ message: `Ndeshja me ID ${req.params.id} u fshi me sukses.` });
    } catch (err) {
        const code = err.message.includes('nuk ekziston') ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

module.exports = router;