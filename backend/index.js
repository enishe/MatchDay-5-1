const express = require('express');
const cors = require('cors');
const app = express();
const matchRepo = new (require('./Data/FileRepository'))('matches');
const matchService = new (require('./Services/MatchService'))(matchRepo);

app.use(cors()); app.use(express.json());
app.get('/matches', (req, res) => res.json(matchService.getInventorySummary()));
app.listen(5000, () => console.log(`MatchDay running on port 5000`));

