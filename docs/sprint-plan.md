# Sprint 2 Plan — Enis Hetemi
Data: 1 Prill 2026

## Gjendja Aktuale

### Çka funksionon tani:
- GetAll() me filtrim dinamik (status, terrain_type)
- GetById(id) me gabim 404 nëse nuk ekziston
- Add() me Smart Split automatik (totalPrice / 12)
- Update() — statusi + logjika penalitetit 40% (US #5/#6)
- Delete() me verifikim ekzistence para fshirjes
- React UI — tabelë + formë Create + Update + Delete + filtrim
- Smart Split Preview në kohë reale në UI
- Dependency Injection — MatchService(repo) në konstruktor
- Rrjedha e plotë: React → Express → MatchService → SqlMatchRepository → PostgreSQL
- docs/implementation.md me shpjegim të plotë teknik

### Çka nuk funksionon / mungon:
- Unit Tests — nuk janë implementuar fare
- Error Handling i plotë — input "abc" për çmim dërgon NaN në backend
- Screenshot real i aplikacionit mungon në docs/
- Error kur DB është joaktive — aplikacioni crashon pa mesazh

### A kompajlohet dhe ekzekutohet?
Po — backend (port 5000) dhe frontend (port 5173) ekzekutohen pa gabime.

---

## Plani i Sprintit

### Prioriteti 1 — Feature e Re: Statistika (40 pikë)
**Çka bën:** Paneli i statistikave llogarit dhe shfaq mbi tabelën e ndeshjeve:
- Numri total i ndeshjeve
- Çmimi mesatar i fushës
- Çmimi maksimal dhe minimal
- Numri i ndeshjeve sipas statusit (pending / confirmed / canceled)
- Të ardhurat totale të mbledhura

**Si e përdor useri:** Hap aplikacionin → sheh panelin automatikisht mbi tabelë — nuk ka nevojë për veprim shtesë.

**Rrjedha (UI → Service → Repository):**
```
React UI
  → GET /api/matches/stats
    → MatchService.llogaritStatistikat()   ← logjika këtu, jo në UI
      → SqlMatchRepository.GetAll()        ← vetëm merr të dhënat
        → llogaritje: total, mesatare, max, min
          → React shfaq panelin e kartave
```

**Pse Statistika dhe jo tjetër:**
Projekti ka tashmë filtrim — Statistika është feature natyrale për MatchDay,
kalon nëpër të tri shtresat, dhe është e lehtë për Unit Test.

---

### Prioriteti 2 — Error Handling (25 pikë)

Tre rastet specifike që do trajtohen:

**Rasti 1 — Input i gabuar nga useri:**
- Problem tani: totalPrice = "abc" → NaN dërgohet në backend → crash
- Zgjidhja: validim në UI para fetch + try-catch në Service
- Mesazhi: `"Ju lutem shkruani një çmim valid (numër mbi 0)"`

**Rasti 2 — ID që nuk ekziston:**
- Problem tani: GET /api/matches/9999 → undefined → crash në UI
- Zgjidhja: gjejSipasId() hedh Error → route kthen 404
- Mesazhi: `"Ndeshja me ID 9999 nuk u gjet"`

**Rasti 3 — Lidhja me DB dështon:**
- Problem tani: PostgreSQL joaktiv → aplikacioni crashon pa mesazh
- Zgjidhja: try-catch në SqlMatchRepository + mesazh në UI
- Mesazhi: `"Serveri nuk është i disponueshëm, provoni përsëri"`

---

### Prioriteti 3 — Unit Tests (20 pikë)

Minimum 4 teste me Jest (JavaScript — ekuivalent i xUnit):

**Test 1 — Rast normal:**
```js
llogaritStatistikat([{total_price:60},{total_price:60}])
→ { total: 2, mesatare: 60, max: 60, min: 60 }
```

**Test 2 — Listë bosh:**
```js
llogaritStatistikat([])
→ { total: 0, mesatare: 0, max: 0, min: 0 }  // jo NaN
```

**Test 3 — Validim çmimi:**
```js
shtoNdeshje({ totalPrice: 0 })
→ hedh Error("Çmimi total duhet të jetë mbi 0€")
```

**Test 4 — ID që nuk ekziston:**
```js
gjejSipasId(9999)  // me mock repo që kthen null
→ hedh Error("Ndeshja me ID 9999 nuk u gjet")
```

---

## Renditja e Punës (8 ditë)

| Dita       | Detyra                                              |
|------------|-----------------------------------------------------|
| 1 Prill    | Push sprint-plan.md (sot)                           |
| 2–3 Prill  | Statistikat — Service + Repository + route          |
| 4 Prill    | Statistikat — React UI (panel kartat)               |
| 5 Prill    | Error Handling — të tri rastet                      |
| 6 Prill    | Unit Tests — 4 teste me Jest                        |
| 7 Prill    | Screenshot + docs/sprint-report.md                  |
| 8 Prill    | Git push final + dorëzim ora 08:30                  |

---

## Afati
- **Sprint Plan:** 1 Prill 2026 — pushed sot
- **Sprint Delivery:** Martë, 8 Prill 2026, ora 08:30


# Sprint 2 Report — MatchDay 5+1
**Autori:** Enis Hetemi   
**Statusi:** ✅ Përfunduar

---

## Çfarë u planifikua vs Çfarë u realizua

| E planifikuar | E realizuar | Statusi |
|---------------|-------------|---------|
| Statistikat e Ndeshjeve | Implementuar plotësisht | ✅ |
| Error Handling — 3 raste | Implementuar plotësisht | ✅ |
| Unit Tests — 4 teste | 16 teste — të gjitha kaluan | ✅ |
| Screenshot i aplikacionit | Screenshot1.png + Screenshot2.png | ✅ |
| Sprint Report | Ky dokument | ✅ |

---

## Feature e Re: Statistikat e Ndeshjeve

### Çfarë bën:
Paneli i statistikave shfaqet automatikisht mbi listën e ndeshjeve dhe llogarit:
- Numrin total të ndeshjeve
- Totalin e çmimeve (€)
- Çmimin mesatar (€)
- Çmimin maksimal dhe minimal
- Numrin e ndeshjeve sipas statusit (Në Pritje / Konfirmuara / Anuluara)

### Rrjedha (UI → Service → Repository):
```
React UI → GET /api/matches/stats
         → MatchService.llogaritStatistikat()   ← logjika këtu
         → SqlMatchRepository.GetAll()           ← vetëm merr të dhënat
         → { total, mesatare, max, min, ... }
         → React shfaq panelin e kartave
```

### Pse logjika është në Service dhe jo në UI:
Sipas parimit SRP, UI merret vetëm me shfaqjen. Llogaritjet (mesatare, max, min) janë logjikë biznesi dhe qëndrojnë në `MatchService.llogaritStatistikat()`. Kjo e bën metodën të testueshme pa UI.

---

## Error Handling — 3 Rastet

### Rasti 1 — Input i gabuar nga useri:
- **Problem:** `totalPrice = "abc"` → NaN dërgohej në backend → crash
- **Zgjidhja:** Validim në UI para fetch + validim në Service
- **Mesazhi:** `"Ju lutem shkruani një çmim valid (numër mbi 0)"`

### Rasti 2 — ID që nuk ekziston:
- **Problem:** `GET /api/matches/9999` → `undefined` → crash në UI
- **Zgjidhja:** `gjejSipasId()` hedh Error → route kthen 404
- **Mesazhi:** `"Ndeshja me ID 9999 nuk u gjet"`

### Rasti 3 — Lidhja me DB dështon:
- **Problem:** PostgreSQL joaktiv → aplikacioni crashonte pa mesazh
- **Zgjidhja:** try-catch në çdo metodë të `SqlMatchRepository`
- **Mesazhi:** `"Nuk mund të merren ndeshjet. Kontrollo lidhjen me databazën"`

---

## Unit Tests — 16/16 Kaluan ✅

```
Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
Time:        0.411s
```

### Teste të implementuara:

| Testi | Rezultati |
|-------|-----------|
| llogaritStatistikat — rast normal | ✅ |
| llogaritStatistikat — listë bosh (jo NaN) | ✅ |
| llogaritStatistikat — CSV format | ✅ |
| shtoNdeshje — çmimi 0 | ✅ |
| shtoNdeshje — çmimi negativ | ✅ |
| shtoNdeshje — fieldId bosh | ✅ |
| shtoNdeshje — të dhëna valide | ✅ |
| gjejSipasId — ID ekzistuese | ✅ |
| gjejSipasId — ID që nuk ekziston | ✅ |
| gjejSipasId — ID bosh | ✅ |
| llogaritSmartSplit — ndarje 60€/12 | ✅ |
| llogaritSmartSplit — ndarje 72€/12 | ✅ |
| llogaritSmartSplit — çmim 0 (gabim) | ✅ |
| perditesoStatusin — status i pavlefshëm | ✅ |
| perditesoStatusin — ID që nuk ekziston | ✅ |
| perditesoStatusin — anulim me penalitet 40% | ✅ |

**Komanda verifikimi:** nga dosja `backend`, ekzekuto `npm test` (Jest — 16 teste, pa databazë reale).

---

## Mësimet kryesore (reflektim)

- **Unit testing me Jest:** mock i repository-t izolon `MatchService` nga PostgreSQL; testohet vetëm logjika e biznesit.
- **SRP:** llogaritjet (statistika, Smart Split, validim) qëndrojnë në service; UI dhe repository mbeten të holla.
- **Gabimet në çdo shtresë:** validim në UI dhe service; 404 për ID të panjohur; mesazhe të qarta kur databaza nuk përgjigjet.