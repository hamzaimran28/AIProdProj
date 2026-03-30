# Phase 3 MVP Implementation Plan

**Product:** The Creator’s Crucible  

This document separates **(A) the full project direction** from **(B) what you implement first for Phase 3** so the MVP stays small, testable, and aligned with the course rubric.

---

## Full project (vision — not all built in Phase 3)

**Direction:** Help creators turn **long-form YouTube-derived content** into **text posts** for multiple platforms, reducing manual repurposing. The end-state story is: **YouTube video → transcript → platform-specific written posts → user edits → copy/export.** No audio/voice cloning; **text generation only**, with per-platform formatting rules.

That **full** arc includes **automatic transcript fetch from a YouTube URL**. That step is **realistic for the product** but **not required for the first implementation slice** (see below).

---

## Phase 3 MVP (what you build first)

**Implement from text:** The **first** implementation step is **transcript provided as plain text**—paste in a textarea and/or upload a `.txt` / `.md` file. Everything **after** that matches the full pipeline:

1. **Input:** User supplies **transcript text** (required path for v1).
2. **Configure:** Select target **platforms** (e.g. X thread, LinkedIn, newsletter teaser, Instagram caption).
3. **Optional:** Short **“extra instructions for all posts”** (e.g. CTA)—optional, minimal.
4. **Generate:** One LLM call (or batched calls) with **per-platform prompts** + transcript text.
5. **Review / edit:** Editable text per platform.
6. **Output:** Copy per block; optional export as `.md` / `.txt`.

**What this MVP tests:** The **core assumption**—that **transcript → multi-platform text** is useful and demoable—without depending on YouTube APIs, caption libraries, or network flakiness.

**What comes later (project extension, not Phase 3 blocking):**

- **Step 0:** User pastes **YouTube URL** → app **fetches transcript** → feeds the **same** pipeline as above. Treat this as **prepend-only**: no change to generation/review logic once you have a string.

Document in README/slides: *“Phase 3 ships the transformation pipeline with **text in**; **YouTube URL → transcript** is the next layer on the same engine.”*

---

## 1. MVP Hypothesis (Phase 3 — text-first)

| Assumption | How this MVP tests it |
|------------|------------------------|
| Creators need **platform-native text**, not a raw transcript | Outputs follow **per-platform rules** (thread breaks, length, etc.) |
| **Human oversight** on copy saves time vs doing it all manually | Review/edit before export |
| The **valuable part** is **transformation**, not where the transcript string came from | Same engine will accept YouTube-fetched text later |

---

## 2. Rubric Mapping (100 pts)

| Rubric area | How this MVP addresses it |
|-------------|---------------------------|
| **Alignment with Phases 1 & 2 (20)** | Problem = multi-platform repurposing; scope = **text transcript → posts** + explicit full-project note (YouTube path next) |
| **Core functionality (25)** | **Transcript text → generate multi-platform drafts → user refines** |
| **Completeness & coherence (20)** | Flow: **text → select platforms → generate → review/edit → export/copy** |
| **Technical reasoning (15)** | README + slides: why **text-first**; **React+TS + Node** split; LLM + truncation; later YouTube step |
| **Demo quality (10)** | Demo uses **`sample-data` transcript** or pasted text—**reliable**, end-to-end |
| **Code quality (10)** | Clear structure, `.env.example`, sample data |

---

## 3. In Scope vs Out of Scope (Phase 3)

### In scope (minimum viable — text-first)

1. **Transcript as text** — large textarea **and/or** file upload (`.txt`, optionally `.md`); validation (min length, soft max for demo).
2. **Platform selection** — user picks 2–4 targets; **text-only** outputs with **platform-specific** prompt rules.
3. **Generation** — LLM with structured prompts (transcript + rules per platform + optional global instructions).
4. **Review / edit UI** — editable text areas per platform.
5. **Output** — copy buttons; optional bundled export.

### Out of scope for Phase 3 implementation

- **YouTube URL → transcript fetch** (planned **product** step, **later**).
- Voice/audio features; creator voice modeling; scheduling; analytics; teams; auto-posting.

---

## 4. End-to-End User Flow (Phase 3 demo)

1. **Home** → value prop: **“Paste your transcript → get platform-ready text posts.”**
2. **Input:** Paste transcript **or** upload text file; show character count / truncation warning if needed.
3. **Configure:** Select platforms (+ optional extra instructions).
4. **Generate** → loading state.
5. **Review** → edit per platform.
6. **Export / copy** → optional accuracy disclaimer.

**60–90 s demo:** Load **`sample-transcript.txt`** or paste excerpt → **LinkedIn + X + teaser** → edit one line → copy.

**Full-project demo (when implemented):** Replace step 2 with **YouTube URL → fetch transcript** → same steps 3–6.

---

## 5. Technical Architecture (Phase 3)

**Pipeline:** `Transcript text` → **`Text post generation (LLM)`** → **Review UI** → **Export**

### Recommended stack (fixed for this project)

| Layer | Technology | Notes |
|-------|------------|--------|
| **Frontend** | **React** + **TypeScript** (e.g. **Vite** `react-ts` template) | SPA calling the backend over HTTP; components for input, platform pickers, review editors |
| **Backend** | **Node.js** (e.g. **Express** or **Fastify**) | REST API (e.g. `POST /api/generate`); **LLM API keys stay server-side only** |
| **AI** | One chat/completions HTTP API (OpenAI, Anthropic, or Azure OpenAI) | Called from **Node** only |
| **Storage** | In-memory / session only for MVP | No DB required for Phase 3 |

**Repo layout (example):** `frontend/` (React + TS), `backend/` (Node), root `README.md` with **two** dev commands (`npm run dev` in each) or a root script that runs both.

**Why split frontend/backend:** Clear separation for the course demo; TypeScript catches contract errors between UI and API; Node is the standard default for LLM proxying.

**Later extension (same pipeline):** `YouTube URL` → **Transcript service** (Node route) → *same string input as above*.

**Deliberate simplifications:** Per-platform prompts + user edit loop; **truncate** long transcripts with visible notice.

### Reserved for “Phase B” (YouTube) — not required for Phase 3 MVP

Caption libraries, YouTube Data API, or Whisper—document in **Roadmap** section of README when you add them.

---

## 6. Data / Inputs (Course Requirement)

| Item | Phase 3 MVP |
|------|-------------|
| **What data** | **User-provided transcript text** (and optional short global instructions). |
| **Why sufficient** | Proves **transformation** value; mirrors real flow (export from Descript/YouTube captions **as text** into your app). |
| **Limitations** | Max length; language assumptions (e.g. English); no claim of “synced to video” until YouTube step exists. |

**Sample data:** `sample-data/sample-transcript.txt` (realistic episode excerpt, anonymized) for **repeatable demos** without user prep.

---

## 7. Output & Value

| Output | User value |
|--------|------------|
| Per-platform **text drafts** | Cuts manual rewriting across channels |
| **Editable** fields | Human-in-the-loop |
| **Copy/export** | Use in X, LinkedIn, email, etc. |

**Slides:** Clarify **Phase 3 = text in → posts out**; **full project = YouTube → transcript → same engine**.

---

## 8. Failure Handling (Phase 3)

| Case | Behavior |
|------|----------|
| **Empty / too-short text** | Block generate; inline error. |
| **Wrong file type** | Reject; suggest `.txt` / `.md`. |
| **Text too long for model** | Truncate with visible banner. |
| **LLM error / timeout** | Friendly message; retry once. |
| **Accuracy** | Footer: review AI output against source. |

*(YouTube-specific failures apply only after you add URL fetch.)*

---

## 9. Repository & Documentation Checklist

```
/README.md          — Full project vision + **Phase 3 = text-first**; install; env; limitations
/backend/           — Node.js API (package.json, src/, server entry)
/frontend/          — React + TypeScript (Vite), src/, components
/backend/.env.example — LLM API key (never commit real secrets)
/sample-data/       — sample-transcript.txt
/docs/              — this plan
```

**README must include:** **Node.js** and **npm** (or pnpm) versions; **how to run backend** (port, e.g. `http://localhost:3001`) and **frontend** (e.g. Vite dev server with **proxy** to API or `VITE_API_URL`); what Phase 3 proves vs what’s next (YouTube input).

---

## 10. Technical Summary Slides (2–3 slides)

1. **Full project vs Phase 3** — One diagram: **vision** = YouTube → transcript → posts; **built now** = **text transcript → posts** (same downstream steps).
2. **What we built** — **React + TypeScript** frontend, **Node.js** backend, LLM, per-platform text, truncation, **no** YouTube fetch in v1.
3. **Roadmap & risks** — YouTube as additive layer; hallucinations; Phase 4 metrics.

---

## 11. Demo Runbook

- [ ] **`sample-transcript.txt`** works offline except LLM call.
- [ ] Test **paste path** and **file upload** if implemented.
- [ ] Morning-of: full **generate → review → copy**.

**Script:** Problem (repurposing) → **paste/load transcript** → platforms → generate → edit → copy → **“Next: plug in YouTube for transcript.”**

---

## 12. Timeline (example)

| Phase | Tasks |
|-------|--------|
| **Days 1–2** | Scaffold **frontend** (React+TS/Vite) + **backend** (Node); **text input + stub API**; review UI shell. |
| **Days 3–4** | Wire LLM from **Node**; **typed** request/response; per-platform prompts; truncation; validation. |
| **Days 5–6** | Copy/export; sample data; error states. |
| **Day 7** | Slides; README vision vs MVP; rehearsal. |

**Optional if time:** YouTube URL → transcript → pass string to existing pipeline (same as adding “Step 0”).

---

## 13. Success Criteria (Phase 3 Submit)

- [ ] End-to-end: **text transcript → posts → edit → copy** on a fresh machine.
- [ ] At least one failure path (e.g. empty input).
- [ ] README explains **full project** vs **this MVP slice**.
- [ ] 2–3 slides + code + live demo.

---

## 14. Phase 4 Hook

Metrics can still target **time saved** and **draft usefulness** using **text transcript** workflows; later **YouTube** adds **time-to-first-draft** from URL.

---

*Document version: 1.4 — **Phase 3 MVP = text transcript in → multi-platform text out**; stack: **React + TypeScript** (frontend), **Node.js** (backend); full project adds **YouTube URL → transcript** as a preceding step; aligned with AI Product Development Phase 3 rubric.*
