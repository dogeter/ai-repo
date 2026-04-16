const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.getExperiments(req.query.tag));
});

router.post('/', (req, res) => {
  const { name, description, tags, source } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.status(201).json(db.createExperiment({ id: uuidv4(), name, description, tags, source }));
});

router.get('/:id', (req, res) => {
  const exp = db.getExperiment(req.params.id);
  if (!exp) return res.status(404).json({ error: 'not found' });
  res.json(exp);
});

router.get('/:id/runs', (req, res) => {
  res.json(db.getRunsForExperiment(req.params.id));
});

router.post('/:id/runs', (req, res) => {
  if (!db.experimentExists(req.params.id)) {
    return res.status(404).json({ error: 'experiment not found' });
  }
  const { model, inputs, outputs, duration_ms, status, notes } = req.body;
  res.status(201).json(db.createRun({ id: uuidv4(), experiment_id: req.params.id, model, inputs, outputs, duration_ms, status, notes }));
});

module.exports = router;
