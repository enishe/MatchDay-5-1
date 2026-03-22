const express = require('express');
const cors = require('cors');
const matchRoutes = require('./src/routes/matchRoutes');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', matchRoutes);

app.listen(5000, () => console.log('MatchDay 5+1 Server running on port 5000'));;

