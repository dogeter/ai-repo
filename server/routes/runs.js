const express = require('express');
const db = require('../db');

const router = express.Router();

router.patch('/:id', (req, res) => {
  const run = db.getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'not found' });
  res.json(db.updateRun(req.params.id, req.body));
});

module.exports = router;
