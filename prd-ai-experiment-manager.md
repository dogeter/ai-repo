# PRD: AI Experiment Manager

**Status:** Draft  
**Date:** 2026-04-16

---

## Problem

When using Claude to generate AI experiments, prototypes, and scripts, there's no central place to track what was built, what it does, how to run it, and what the results were. Experiments get lost, duplicated, or forgotten.

---

## Goal

A lightweight web app where Claude can create, store, and manage AI experiments — and a human can browse, run, and review them.

---

## Users

- **Primary:** A developer (you) who wants to direct Claude to build experiments and review results
- **Secondary:** Claude itself, which needs a structured way to register experiments it creates

---

## Core Concepts

| Term | Definition |
|---|---|
| **Experiment** | A self-contained AI task: a prompt, a script, or a small app |
| **Run** | A single execution of an experiment with inputs, outputs, and metadata |
| **Tag** | A label for organizing experiments (e.g. `summarization`, `code-gen`, `vision`) |

---

## Features (MVP)

### 1. Experiment Registry
- Create an experiment with: name, description, tags, and source code or prompt
- List all experiments with filtering by tag and status
- View a single experiment's detail page

### 2. Run Tracking
- Log a run against an experiment: inputs, outputs, model used, duration, cost estimate
- View run history for an experiment
- Mark a run as pass / fail / interesting

### 3. Claude-Friendly Interface
- A simple JSON API so Claude can register experiments and log runs programmatically
- API endpoints: `POST /experiments`, `POST /experiments/:id/runs`, `GET /experiments`

### 4. Basic UI
- Dashboard: list of recent experiments and runs
- Experiment detail: description, code/prompt, run history
- No auth required for MVP (local or single-user)

---

## Out of Scope (MVP)

- Multi-user / auth
- Real-time streaming of run output
- Cost tracking integrations with provider APIs
- Automated scheduling or triggers

---

## Tech Stack (proposed)

| Layer | Choice | Rationale |
|---|---|---|
| Backend | Node.js + Express | Fast to scaffold, easy for Claude to extend |
| Database | SQLite (via better-sqlite3) | Zero-config, file-based, good for local use |
| Frontend | Plain HTML + vanilla JS or React | Start minimal, upgrade if needed |
| API format | REST + JSON | Simple, no special tooling needed |

---

## Data Model

```
Experiment
  id          TEXT PRIMARY KEY
  name        TEXT
  description TEXT
  tags        TEXT  (comma-separated)
  source      TEXT  (prompt text or code)
  created_at  DATETIME

Run
  id             TEXT PRIMARY KEY
  experiment_id  TEXT REFERENCES Experiment(id)
  model          TEXT
  inputs         TEXT (JSON)
  outputs        TEXT (JSON)
  duration_ms    INTEGER
  status         TEXT  (pass | fail | interesting | pending)
  notes          TEXT
  created_at     DATETIME
```

---

## API (MVP)

```
GET    /api/experiments              List all experiments
POST   /api/experiments              Create an experiment
GET    /api/experiments/:id          Get one experiment
GET    /api/experiments/:id/runs     List runs for an experiment
POST   /api/experiments/:id/runs     Log a run
PATCH  /api/runs/:id                 Update run status/notes
```

---

## Success Criteria

- Claude can register a new experiment via API in one tool call
- A human can open the dashboard and see all experiments and their last run status
- Run history is persistent across sessions (survives server restart)

---

## Next Steps

1. Scaffold the backend (Express + SQLite)
2. Wire up the REST API endpoints
3. Build a minimal dashboard UI
4. Test end-to-end: Claude creates experiment → logs a run → human views result
