const express = require('express');
const router  = express.Router();
const MatchService = require('../Services/MatchService');
const repo         = require('../Repositories/SqlMatchRepository');

// Dependency Injection — repo inject-ohet te Service, jo hardcoded brenda
const service = new MatchService(repo);

// ─── GET /api/matches ─────────────────────────────────────────────────────
// Ushtrimi 3: Listo me filtrim opsional
// Shembuj: /api/matches
//          /api/matches?status=confirmed
//          /api/matches?terrain_type=indoor_hall
router.get('/matches', async (req, res) => {
    try {
        const filters = req.query;
        const matches = await service.listoTeGjitha(filters);
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/matches/:id ─────────────────────────────────────────────────
// Ushtrimi 3: Gjej sipas ID
router.get('/matches/:id', async (req, res) => {
    try {
        const match = await service.gjejSipasId(req.params.id);
        res.json(match);
    } catch (err) {
        // gjejSipasId hedh Error nëse nuk ekziston → 404
        res.status(404).json({ error: err.message });
    }
});

// ─── POST /api/matches ────────────────────────────────────────────────────
// Ushtrimi 3: Shto ndeshje të re (me validim në Service)
// Body: { fieldId, organizerId, startTime, endTime, totalPrice }
router.post('/matches', async (req, res) => {
    try {
        const newMatch = await service.shtoNdeshje(req.body);
        // 201 Created — standard HTTP për burim të ri të krijuar
        res.status(201).json(newMatch);
    } catch (err) {
        // Validimi dështoi (çmim <= 0, fushë bosh, kohë gabim) → 400
        res.status(400).json({ error: err.message });
    }
});

// ─── PUT /api/matches/:id ─────────────────────────────────────────────────
// Bonus: Përditëso statusin e ndeshjes
// Body: { status: 'pending' | 'confirmed' | 'canceled' }
router.put('/matches/:id', async (req, res) => {
    try {
        const { status } = req.body;

        // Validim bazë në route — status duhet dërguar
        if (!status) {
            return res.status(400).json({ error: 'Statusi është i detyrueshëm në body.' });
        }

        const updated = await service.perditesoStatusin(req.params.id, status);
        res.json(updated);
    } catch (err) {
        // perditesoStatusin hedh Error nëse ID nuk ekziston ose status i gabuar
        const code = err.message.includes('nuk u gjet') ? 404 : 400;
        res.status(code).json({ error: err.message });
    }
});

// ─── DELETE /api/matches/:id ──────────────────────────────────────────────
// Bonus: Fshi ndeshjen
router.delete('/matches/:id', async (req, res) => {
    try {
        await service.fshiNdeshjen(req.params.id);
        // 200 me mesazh konfirmimi
        res.json({ message: `Ndeshja me ID ${req.params.id} u fshi me sukses.` });
    } catch (err) {
        // fshiNdeshjen hedh Error nëse ID nuk ekziston → 404
        const code = err.message.includes('nuk ekziston') ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

// ─── GET /api/matches/split-preview ──────────────────────────────────────
// Bonus UI: Llogarit Smart Split para pagesës (pa ruajtur në DB)
// Shembull: /api/matches/split-preview?totalPrice=60&players=12
router.get('/matches/split-preview', async (req, res) => {
    try {
        const totalPrice  = parseFloat(req.query.totalPrice);
        const playerCount = parseInt(req.query.players) || 12;
        const perPlayer   = service.llogaritSmartSplit(totalPrice, playerCount);
        res.json({
            totalPrice,
            playerCount,
            pricePerPlayer: perPlayer,
            currency: 'EUR'
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;