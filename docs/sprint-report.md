# Sprint 2 Report — Enis Hetemi

**Projekti:** MatchDay 5+1  
**Data dorëzimi:** përputhet me afatin: Martë, 8 Prill 2026  
**Repository:** [GitHub — MatchDay-5+1](https://github.com/enishe/MatchDay-5-1) (link i plotë vendoset në Student Hub)

---

## Çka Përfundova

| Kërkesa (rubric) | Përmbledhje | Dëshmi në kod |
|------------------|-------------|---------------|
| **Feature e re (40 p.)** — Statistika | Panel statistikash: total ndeshjesh, total/mesatar/max/min çmimesh, shpërndarje sipas statusit. Kalon **UI → Express → `MatchService.llogaritStatistikat()` → `SqlMatchRepository.GetAll()`**. | `GET /api/matches/stats`, `MatchService.js`, `matchRoutes.js`, `App.jsx` |
| **Error handling (25 p.)** | Input i pavlefshëm për çmim; ID që nuk ekziston (404); dështim DB / server — mesazhe për përdoruesin, pa crash. | Validim në UI + `MatchService`; `SqlMatchRepository` me try/catch; mesazhe në `App.jsx` |
| **Unit tests (20 p.)** | Projekt test me **Jest** në `backend/tests/`; **16 teste** kalojnë (më shumë se minimumi 3). Raste normale + kufitare (listë bosh, çmim 0, ID inekzistent, etj.). | `backend/tests/matchService.test.js`; komanda: `cd backend && npm test` |
| **Kod & arkitekturë** | Repository pattern, DI për `MatchService`, dokumentim në `docs/`. | `docs/implementation.md`, `docs/architecture.md` |

**Dëshmi shtesë (output):** aplikacioni i hostuar (p.sh. Render) + ky repo; për vlerësim mund të përdoret edhe ekzekutimi lokal (`npm run dev` në `backend` dhe `frontend`).

---

## Çka Mbeti

- **Screenshot në `docs/`:** nëse pedagogu kërkon pamje statike, mund të shtohen `docs/Screenshot1.png` (desktop) dhe `docs/Screenshot2.png` (mobile) dhe të përmenden këtu — aktualisht dëshmia kryesore është **deploy-i aktiv** dhe kodi në GitHub.
- **Përmirësime jo-kritike:** variabla mjedisi për URL të API-së në frontend (`VITE_API_URL`) për të mos hardcoduar URL në `App.jsx` — nuk është kërkesë e Sprint 2.

---

## Çka Mësova

- Si të shkruaj **unit teste me Jest** duke përdorur një **mock repository**, pa PostgreSQL reale, dhe si kjo e bën `MatchService`-in të testueshëm në izolim.
- Rëndësia e **ndarjes së shtresave**: UI vetëm shfaq; logjika e biznesit në service; akses në të dhëna në repository.
- **Trajtimi i gabimeve** në çdo nivel: validim para kërkesës, përgjigje HTTP të qarta, mesazhe për përdoruesin kur rrjeti ose DB dështojnë.

---

## Përputhje me rubricën e Sprint 2

| Kategori | Pikë (maks) | Status |
|----------|----------------|--------|
| Sprint Plan (1 Prill) | 15 | `docs/sprint-plan.md` — i push-uar |
| Feature e re | 40 | Statistika përmes UI → Service → Repository |
| Error handling | 25 | Input, ID, DB/server — jo crash i papërpunuar |
| Unit tests | 20 | Jest, ≥3 teste, raste kufitare |
| **Total Sprint 2 (delivery)** | **85** | Përmbushja e mësipërme |
