const express = require('express');
const router = express.Router();
const MatchService = require('../Services/MatchService');
const repo = require('../Repositories/SqlMatchRepository');

// Krijojmë instancën e Service duke i kaluar Repository-n (Dependency Injection)
const service = new MatchService(repo);

// ─── Ushtrimi 3: GET /api/matches (Listo me mundësi filtrimi) ──────────────
router.get('/matches', async (req, res) => {
    try {
        // Mund të marrë filtra nga URL (psh: /api/matches?status=confirmed)
        const filters = req.query; 
        const matches = await service.listoTeGjitha(filters);
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Ushtrimi 3: POST /api/matches (Shto me validim) ───────────────────────
router.post('/matches', async (req, res) => {
    try {
        const newMatch = await service.shtoNdeshje(req.body);
        res.status(201).json(newMatch);
    } catch (err) {
        // Nëse validimi dështon (psh. çmimi <= 0), kthen 400 Bad Request
        res.status(400).json({ error: err.message });
    }
});

// ─── Bonus: PUT /api/matches/:id (Update status) ──────────────────────────
router.put('/matches/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await service.perditesoStatusin(req.params.id, status);
        if (!updated) return res.status(404).json({ error: "Ndeshja nuk u gjet" });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Bonus: DELETE /api/matches/:id (Delete) ──────────────────────────────
router.delete('/matches/:id', async (req, res) => {
    try {
        const deleted = await service.fshiNdeshjen(req.params.id);
        if (!deleted) return res.status(404).json({ error: "Ndeshja nuk u gjet" });
        res.json({ message: "Ndeshja u fshi me sukses" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;