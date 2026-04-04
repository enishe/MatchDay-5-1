# MatchDay 5+1

Aplikacion për menaxhimin e termineve të futbollit 5+1: lista e ndeshjeve, CRUD, filtrim, statistika, Smart Split (çmimi total / 12) dhe trajtim gabimesh. Frontend: **React 19 + Vite**. Backend: **Express + PostgreSQL** (`pg`), me **Repository pattern** dhe logjikë në **MatchService**.

## Struktura

| Dosja | Roli |
|--------|------|
| `backend/` | API REST (`/api/matches`, `/api/matches/stats`), lidhje DB |
| `frontend/` | UI React |
| `docs/` | Plan sprinti, arkitekturë, diagram klasesh, implementim |

## Parakushte

- **Node.js** (LTS)
- **PostgreSQL** (ose URL hosted, sipas konfigurimit në `backend/config/db.js`)

## Variabla mjedisi (backend)

| Variabla | Qëllimi |
|----------|---------|
| `DATABASE_URL` | Connection string PostgreSQL. Nëse mungon, përdoret vlera e paracaktuar në kod (vetëm për zhvillim/demo). Për prod, vendos gjithmonë `DATABASE_URL` në mjedis dhe mos e commit-o në repo. |

## Nisja lokale

**1. Backend** (port **5000**):

```bash
cd backend
npm install
npm run dev
```

**2. Frontend** (Vite, zakonisht port **5173**):

```bash
cd frontend
npm install
npm run dev
```

**Lidhja UI ↔ API lokale:** në `frontend/src/App.jsx`, konstanta `API` duhet të tregojë te backend-i lokal, p.sh. `http://localhost:5000/api` (aktualisht në projekt mund të jetë URL e deploy-tuar në Render — përshtate sipas mjedisit).

## Testet (backend)

```bash
cd backend
npm test
```

Ekzekuton **Jest** mbi `tests/matchService.test.js` (mock repository, pa DB). Pritet: **16 passed**.

## Dokumentacion shtesë

- `docs/sprint-plan.md` — plani dhe raporti i sprintit
- `docs/implementation.md` — detaje teknike të implementimit
