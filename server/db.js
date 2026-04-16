const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const dbFile = path.join(dataDir, 'db.json');

fs.mkdirSync(dataDir, { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(dbFile, 'utf8')); }
  catch { return { experiments: [], runs: [] }; }
}

function save(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

const byDateDesc = (a, b) => b.created_at.localeCompare(a.created_at);

const db = {
  getExperiments(tag) {
    const { experiments, runs } = load();
    const list = tag
      ? experiments.filter(e => e.tags.includes(tag))
      : experiments;
    return list.sort(byDateDesc).map(exp => ({
      ...exp,
      last_run: runs.filter(r => r.experiment_id === exp.id).sort(byDateDesc)[0] || null,
    }));
  },

  getExperiment(id) {
    const { experiments, runs } = load();
    const exp = experiments.find(e => e.id === id);
    if (!exp) return null;
    return { ...exp, runs: runs.filter(r => r.experiment_id === id).sort(byDateDesc) };
  },

  experimentExists(id) {
    return !!load().experiments.find(e => e.id === id);
  },

  createExperiment({ id, name, description = '', tags = [], source = '' }) {
    const data = load();
    const exp = { id, name, description, tags: Array.isArray(tags) ? tags : [], source, created_at: new Date().toISOString() };
    data.experiments.push(exp);
    save(data);
    return exp;
  },

  getRunsForExperiment(experimentId) {
    return load().runs.filter(r => r.experiment_id === experimentId).sort(byDateDesc);
  },

  getRun(id) {
    return load().runs.find(r => r.id === id) || null;
  },

  createRun({ id, experiment_id, model = '', inputs, outputs, duration_ms, status = 'pending', notes = '' }) {
    const data = load();
    const toStr = v => v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    const run = { id, experiment_id, model, inputs: toStr(inputs), outputs: toStr(outputs), duration_ms: duration_ms || null, status, notes, created_at: new Date().toISOString() };
    data.runs.push(run);
    save(data);
    return run;
  },

  updateRun(id, { status, notes }) {
    const data = load();
    const run = data.runs.find(r => r.id === id);
    if (!run) return null;
    if (status !== undefined) run.status = status;
    if (notes !== undefined) run.notes = notes;
    save(data);
    return run;
  },
};

module.exports = db;
