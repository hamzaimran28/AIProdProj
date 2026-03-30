# The Creator’s Crucible — Phase 3 MVP

**Text transcript → multi-platform text posts** (no database, no YouTube URL fetch in this slice).

## What this proves

- Paste or load a **transcript**, pick **platforms**, **generate** drafts via **Groq** (`openai/gpt-oss-120b` by default), **edit**, then **copy** or **export**.

## Structure

| Folder | Role |
|--------|------|
| `backend/` | Node.js + Express — `routes` → `controllers` → `services` (Groq) + `models` (DTOs) |
| `frontend/` | React + TypeScript + **Redux Toolkit** — `store/slices`, `features/*`, `app/store` |
| `sample-data/` | Example transcript for demos |

## Prerequisites

- **Node.js** 20+ recommended  
- **Groq API key** — [Groq Console](https://console.groq.com/)

## Setup

### Backend

```bash
cd backend
cp .env.example .env
# Set GROQ_API_KEY=your_key
npm install
npm run dev
```

API: `http://localhost:3001` — health: `GET /health`, generate: `POST /api/generate`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` — Vite **proxies** `/api` to the backend.

## Environment

**Backend** (`backend/.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key |
| `GROQ_MODEL` | No | Default `openai/gpt-oss-120b` |
| `PORT` | No | Default `3001` |

## Assumptions tested (Phase 4)

- Usefulness of **transcript → platform-formatted text** with **human edit**.
- Next step: **YouTube URL → transcript** as a prepend to the same pipeline (no change to generation logic).

## Limitations (MVP)

- No user accounts, no persistence, no scheduling, no auto-posting.
- Long transcripts may be **truncated** server-side (see API response `notice`).
- **Groq** model defaults to `openai/gpt-oss-120b`; override with `GROQ_MODEL` in `backend/.env`.
