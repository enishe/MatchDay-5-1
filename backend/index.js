const express = require('express');
const cors = require('cors');
const matchRoutes = require('./Routes/matchRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', matchRoutes);

app.listen(5000, () => console.log('Serveri u ndez ne portin 5000'));