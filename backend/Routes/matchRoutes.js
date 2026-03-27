const express = require('express');
const router = express.Router();
// Kujdes: Sigurohu që emrat e skedarëve përputhen me ato që ke në folderin Services/Repositories
const MatchService = require('../Services/MatchService');
const repo = require('../Repositories/SqlMatchRepository');

const service = new MatchService(repo);

router.get('/matches', async (req, res) => {
    try {
        const matches = await service.listoTeGjitha();
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;