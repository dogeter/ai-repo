const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/experiments', require('./routes/experiments'));
app.use('/api/runs', require('./routes/runs'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI Experiment Manager → http://localhost:${PORT}`));
