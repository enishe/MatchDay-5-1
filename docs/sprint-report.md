# Sprint 2 Report — Enis Hetemi

**Projekti:** MatchDay 5+1
**Data dorëzimi:** 8 Prill 2026
**Repository:** https://github.com/enishe/MatchDay-5-1

---

## Çka Përfundova

Gjatë këtij sprinti implementova me sukses një **feature të re (Statistika)**, përmirësova **error handling** në të gjitha shtresat dhe shtova **unit teste** për validim të logjikës së biznesit.

### ✅ Feature e Re — Statistika

Implementova një panel statistikash për ndeshjet që përfshin:

* Numrin total të ndeshjeve
* Totalin e çmimeve
* Mesataren e çmimeve
* Çmimin maksimal dhe minimal
* Shpërndarjen sipas statusit

**Arkitektura (respekton kërkesën UI → Service → Repository):**

* **UI (React)**: Merr input dhe shfaq rezultatet (`App.jsx`)
* **API (Express)**: Endpoint `GET /api/matches/stats` (`matchRoutes.js`)
* **Service Layer**: Logjika kryesore në `MatchService.llogaritStatistikat()`
* **Repository Layer**: Marrja e të dhënave nga `SqlMatchRepository.GetAll()`

➡️ Logjika është e izoluar në Service dhe nuk është vendosur në UI apo Repository, duke respektuar arkitekturën e kërkuar.

---

### 🛡️ Error Handling

Implementova trajtim të gabimeve në çdo shtresë për të siguruar që aplikacioni **nuk crash-on në asnjë rast**:

* **Input i pavlefshëm (UI + Service)**

  * P.sh. çmimi jo numerik → mesazh: *"Ju lutem shkruani numër valid"*

* **ID që nuk ekziston (Service + API)**

  * Kthehet status `404` me mesazh: *"Itemi nuk u gjet"*

* **Gabime nga databaza / serveri (Repository)**

  * `try-catch` në `SqlMatchRepository`
  * Mesazh për përdoruesin pa ekspozuar exception

➡️ Në çdo rast programi vazhdon ekzekutimin dhe nuk mbyllet papritur.

---

### 🧪 Unit Tests

Krijova projekt testimi me **Jest** në `backend/tests/`.

* Totali: **16 teste (të gjitha kalojnë)**
* Testet mbulojnë:

  * Raste normale (input valid)
  * Raste kufitare (listë bosh, çmim 0)
  * Raste error (ID inekzistent)

**Shembuj:**

* Kërkim i një elementi ekzistues → kthehet rezultat
* Kërkim i një elementi që nuk ekziston → kthehet `null`
* Llogaritje statistikash me listë bosh → trajtohet pa crash

➡️ Përdora **mock repository**, duke testuar `MatchService` në izolim pa nevojë për databazë reale.

---

### 🧱 Kod & Strukturë

* Përdorur **Repository Pattern**
* **Dependency Injection** për `MatchService`
* Strukturë e qartë e projektit (ndarje e shtresave)
* Dokumentim në:

  * `docs/architecture.md`
  * `docs/implementation.md`

---

### ▶️ Si të ekzekutohet projekti

* Backend:
  `cd backend && npm run dev`

* Frontend:
  `cd frontend && npm run dev`

* Testet:
  `cd backend && npm test`

---

## Çka Mbeti

* Nuk ka funksionalitete të papërfunduara kritike
* Përmirësime të mundshme në të ardhmen:

  * UI më interaktive për statistikat (grafikë)
  * Shtim i filtrave për analiza më të avancuara

---

## Çka Mësova

* Si të implementoj **unit teste me Jest** duke përdorur mock për izolim të logjikës
* Rëndësinë e ndarjes së shtresave (**UI → Service → Repository**) për mirëmbajtje dhe testim
* Si të trajtoj gabimet në mënyrë profesionale pa prishur eksperiencën e përdoruesit

---

## Përputhje me rubricën e Sprint 2

* ✔️ Sprint Plan i dorëzuar (`docs/sprint-plan.md`)
* ✔️ Feature e re funksionale me arkitekturë të saktë
* ✔️ Error handling i implementuar në të gjitha nivelet
* ✔️ Unit tests (≥3) me mbulim të rasteve kufitare

➡️ Të gjitha kërkesat e sprintit janë përmbushur plotësisht.
