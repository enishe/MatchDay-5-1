const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("MatchDay 5+1 API po punon!");
});

app.listen(PORT, () => {
    console.log(`Serveri po punon në http://localhost:${PORT}`);
});

