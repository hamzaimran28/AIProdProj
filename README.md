# The Creator's Crucible - Phase 3 MVP

**Text transcript -> summary -> multi-platform text posts** (no database, no YouTube URL fetch in this slice).

## What this proves

- Paste or load a **transcript**, have it **summarized via OpenRouter**, then **generate** drafts via **Groq** (`openai/gpt-oss-120b` by default), **edit**, then **copy** or **export**.

## Structure

| Folder | Role |
|--------|------|
| `backend/` | Node.js + Express - `routes` -> `controllers` -> `services` (OpenRouter summary + Groq generation) + `models` (DTOs) |
| `frontend/` | React + TypeScript + **Redux Toolkit** - `store/slices`, `features/*`, `app/store` |
| `sample-data/` | Example transcript for demos |

## Prerequisites

- **Node.js** 20+ recommended
- **OpenRouter API key** - [OpenRouter Keys](https://openrouter.ai/keys)
- **Groq API key** - [Groq Console](https://console.groq.com/)

## Setup

### Backend

```bash
cd backend
cp .env.example .env
# Set OPENROUTER_API_KEY=your_key
# Set GROQ_API_KEY=your_key
npm install
npm run dev
```

API: `http://localhost:3001` - health: `GET /health`, generate: `POST /api/generate`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` - Vite **proxies** `/api` to the backend.

## Environment

**Backend** (`backend/.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for transcript summarization |
| `OPENROUTER_MODEL` | No | Default `openrouter/free` |
| `OPENROUTER_MAX_COMPLETION_TOKENS` | No | Summary token budget |
| `GROQ_API_KEY` | Yes | Groq API key |
| `GROQ_MODEL` | No | Default `openai/gpt-oss-120b` |
| `GROQ_MAX_COMPLETION_TOKENS` | No | Post-generation token budget |
| `GROQ_MAX_TRANSCRIPT_CHARS` | No | Transcript chars allowed before summarization |
| `PORT` | No | Default `3001` |

## Assumptions tested (Phase 4)

- Usefulness of **transcript -> summary -> platform-formatted text** with **human edit**.
- Next step: **YouTube URL -> transcript** as a prepend to the same pipeline (no change to generation logic).

## Limitations (MVP)

- No user accounts, no persistence, no scheduling, no auto-posting.
- Long transcripts may be **truncated** server-side before summarization (see API response `notice`).
- **OpenRouter** defaults to `openrouter/free`; override with `OPENROUTER_MODEL` in `backend/.env`.
- **Groq** defaults to `openai/gpt-oss-120b`; override with `GROQ_MODEL` in `backend/.env`.
