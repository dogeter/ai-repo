const API = '/api';
let state = { experiments: [], selectedId: null };

// ── API helper ──────────────────────────────────────────────
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Data ────────────────────────────────────────────────────
async function loadExperiments() {
  state.experiments = await api('/experiments');
  renderSidebar();
}

async function selectExperiment(id) {
  state.selectedId = id;
  document.querySelectorAll('.exp-card').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id)
  );
  const exp = await api(`/experiments/${id}`);
  renderDetail(exp);
}

// ── Sidebar ─────────────────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('exp-list');
  const q = document.getElementById('search').value.toLowerCase();
  const items = q
    ? state.experiments.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    : state.experiments;

  if (items.length === 0) {
    list.innerHTML = `<div class="empty">${q ? 'No matching experiments.' : 'No experiments yet.<br>Click "+ New Experiment" to start.'}</div>`;
    return;
  }

  list.innerHTML = items.map(exp => `
    <div class="exp-card${state.selectedId === exp.id ? ' active' : ''}" data-id="${exp.id}">
      <div class="exp-card-header">
        <span class="exp-name">${esc(exp.name)}</span>
        ${exp.last_run
          ? `<span class="badge badge-${exp.last_run.status}">${exp.last_run.status}</span>`
          : `<span class="badge badge-none">no runs</span>`}
      </div>
      ${exp.tags.length ? `<div class="exp-tags">${exp.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    </div>
  `).join('');

  list.querySelectorAll('.exp-card').forEach(el =>
    el.addEventListener('click', () => selectExperiment(el.dataset.id))
  );
}

// ── Detail ───────────────────────────────────────────────────
function renderDetail(exp) {
  const panel = document.getElementById('detail');
  panel.innerHTML = `
    <div class="detail-header">
      <h2>${esc(exp.name)}</h2>
      <div class="detail-meta">
        ${exp.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        <span class="meta-date">Created ${fmtDate(exp.created_at)}</span>
      </div>
    </div>
    ${exp.description ? `<p class="detail-description">${esc(exp.description)}</p>` : ''}
    ${exp.source ? `
      <div class="source-block">
        <div class="source-label">Source / Prompt</div>
        <pre class="source-code">${esc(exp.source)}</pre>
      </div>
    ` : ''}
    <div class="runs-section">
      <div class="runs-header">
        <h3>Run History <span class="run-count">${exp.runs.length}</span></h3>
        <button class="btn btn-primary btn-sm" id="log-run-btn">+ Log Run</button>
      </div>
      ${renderRunsTable(exp.runs)}
    </div>
  `;

  panel.querySelector('#log-run-btn').addEventListener('click', () => showRunModal(exp.id));

  panel.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async e => {
      const runId = e.target.dataset.runId;
      const newStatus = e.target.value;
      e.target.className = `status-select badge-select badge-${newStatus}`;
      await api(`/runs/${runId}`, { method: 'PATCH', body: { status: newStatus } });
      await loadExperiments();
    });
  });

  panel.querySelectorAll('.run-expand-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const runId = e.currentTarget.dataset.runId;
      const body = document.getElementById(`run-body-${runId}`);
      const expanded = body.classList.toggle('expanded');
      e.currentTarget.textContent = expanded ? '▲' : '▼';
    });
  });
}

function renderRunsTable(runs) {
  if (runs.length === 0) {
    return '<div class="empty">No runs yet. Click "+ Log Run" to record one.</div>';
  }
  return `
    <table class="runs-table">
      <thead>
        <tr>
          <th>Date</th><th>Model</th><th>Duration</th><th>Status</th><th>Notes</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${runs.map(run => `
          <tr class="run-row">
            <td class="run-date">${fmtDate(run.created_at)}</td>
            <td class="run-model">${esc(run.model || '—')}</td>
            <td>${run.duration_ms != null ? `${run.duration_ms}ms` : '—'}</td>
            <td>
              <select class="status-select badge-select badge-${run.status}" data-run-id="${run.id}">
                <option value="pending"${run.status === 'pending' ? ' selected' : ''}>pending</option>
                <option value="pass"${run.status === 'pass' ? ' selected' : ''}>pass</option>
                <option value="fail"${run.status === 'fail' ? ' selected' : ''}>fail</option>
                <option value="interesting"${run.status === 'interesting' ? ' selected' : ''}>interesting</option>
              </select>
            </td>
            <td class="run-notes">${esc(run.notes || '')}</td>
            <td><button class="run-expand-btn" data-run-id="${run.id}">▼</button></td>
          </tr>
          <tr id="run-body-${run.id}" class="run-body">
            <td colspan="6">
              <div class="run-io">
                <div class="run-io-section">
                  <div class="run-io-label">Inputs</div>
                  <pre>${esc(fmtJson(run.inputs))}</pre>
                </div>
                <div class="run-io-section">
                  <div class="run-io-label">Outputs</div>
                  <pre>${esc(fmtJson(run.outputs))}</pre>
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ── Modals ───────────────────────────────────────────────────
function showCreateModal() {
  setModal('New Experiment', `
    <form id="exp-form">
      <label>Name <span style="color:var(--fail)">*</span>
        <input name="name" required placeholder="e.g. Summarize news articles" autofocus>
      </label>
      <label>Description
        <textarea name="description" rows="2" placeholder="What does this experiment test?"></textarea>
      </label>
      <label>Tags
        <input name="tags" placeholder="comma-separated: summarization, vision, claude-4">
      </label>
      <label>Source / Prompt
        <textarea name="source" rows="5" placeholder="Paste your prompt or code here…"></textarea>
      </label>
      <div class="form-actions">
        <button type="button" class="btn" id="cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Experiment</button>
      </div>
    </form>
  `);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('exp-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const tags = fd.get('tags').split(',').map(t => t.trim()).filter(Boolean);
    await api('/experiments', {
      method: 'POST',
      body: { name: fd.get('name'), description: fd.get('description'), tags, source: fd.get('source') },
    });
    closeModal();
    await loadExperiments();
  });
}

function showRunModal(experimentId) {
  setModal('Log Run', `
    <form id="run-form">
      <label>Model
        <input name="model" placeholder="e.g. claude-sonnet-4-6">
      </label>
      <label>Status
        <select name="status">
          <option value="pending">pending</option>
          <option value="pass">pass</option>
          <option value="fail">fail</option>
          <option value="interesting">interesting</option>
        </select>
      </label>
      <label>Duration (ms)
        <input name="duration_ms" type="number" min="0" placeholder="e.g. 1200">
      </label>
      <label>Inputs (JSON or plain text)
        <textarea name="inputs" rows="3" placeholder='{"prompt": "Summarize this article…"}'></textarea>
      </label>
      <label>Outputs (JSON or plain text)
        <textarea name="outputs" rows="3" placeholder='{"response": "The article discusses…"}'></textarea>
      </label>
      <label>Notes
        <textarea name="notes" rows="2" placeholder="Observations, next steps, issues…"></textarea>
      </label>
      <div class="form-actions">
        <button type="button" class="btn" id="cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">Log Run</button>
      </div>
    </form>
  `);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('run-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const tryJson = v => { try { return JSON.parse(v); } catch { return v; } };
    await api(`/experiments/${experimentId}/runs`, {
      method: 'POST',
      body: {
        model: fd.get('model'),
        status: fd.get('status'),
        duration_ms: fd.get('duration_ms') ? parseInt(fd.get('duration_ms'), 10) : null,
        inputs: tryJson(fd.get('inputs')),
        outputs: tryJson(fd.get('outputs')),
        notes: fd.get('notes'),
      },
    });
    closeModal();
    await selectExperiment(experimentId);
    await loadExperiments();
  });
}

function setModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  openModal();
}
function openModal()  { document.getElementById('modal-overlay').classList.add('open'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

// ── Utilities ────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleString();
}

function fmtJson(str) {
  if (!str) return '(empty)';
  try { return JSON.stringify(JSON.parse(str), null, 2); } catch { return str; }
}

// ── Init ─────────────────────────────────────────────────────
document.getElementById('new-btn').addEventListener('click', showCreateModal);
document.getElementById('search').addEventListener('input', renderSidebar);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('modal-close').addEventListener('click', closeModal);

loadExperiments();
