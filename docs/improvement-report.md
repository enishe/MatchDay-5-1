# Improvement Report — MatchDay 5+1

**Autori:** Enisi  
**Data:** 21 Prill 2026  
**Sprint:** Improvement Sprint — Pjesa 2

---

## Përmirësimi 1 — Blloko terminin e zënë [kod/strukturë]

### Çka ishte problem
`shtoNdeshje()` në `MatchService.js` validonte datën dhe çmimin, por **asnjëherë nuk kontrollonte** nëse fusha ishte tashmë e rezervuar për atë orë. Dy persona mund të rezervonin Fushën #1 për të njëjtën datë dhe orë — të dyja do të ruheshin në database pa gabim.

### Çfarë ndryshova
**`SqlMatchRepository.js`** — Shtova metodën `checkConflict(fieldId, startTime, endTime)` që ekzekuton:
```sql
SELECT id FROM Bookings 
WHERE field_id = $1 
  AND status != 'canceled'
  AND start_time < $3 
  AND end_time > $2
```

**`MatchService.js`** — Ndryshova `shtoNdeshje()` që tani ka 3 hapa të qartë:
1. `validateMatchInput()` — validim i plotë
2. `checkConflict()` — kontroll konflikti
3. `repo.Add()` — ruajtje vetëm nëse të dy hapat kalojnë

### Pse versioni i ri është më i mirë
Versioni i vjetër lejonte rezervime të dyfishta — bug funksional i rëndë. Versioni i ri bën `SELECT` para çdo `INSERT` dhe ndalon konfliktet me mesazh të qartë: `"Fusha është e zënë për këtë orë. Zgjidhni një orar tjetër."` Logjika e konfliktit qëndron në Repository (e duhura — është operacion DB), ndërsa vendimi për ta hedhur gabimin qëndron në Service (e duhura — është rregull biznesi).

---

## Përmirësimi 2 — Validim i plotë i input-it [reliability/validation]

### Çka ishte problem
`shtoNdeshje()` bënte disa kontrolle bazike, por kishte raste të patrajtuara:
- `startTime: "abc"` → `new Date("abc")` kthen `Invalid Date` pa gabim të dukshëm
- `fieldId: -5` → kalonte pa u kontrolluar
- Sistemi kthente vetëm gabimin e parë — nëse kishte 3 gabime, shfaqej vetëm 1

### Çfarë ndryshova
Shtova metodën `validateMatchInput(data)` në `MatchService.js` që:
- Kontrollon nëse `fieldId` është numër pozitiv valid
- Kontrollon nëse `startTime` dhe `endTime` janë data të vlefshme me `isNaN(date.getTime())`
- Mbledh **të gjitha gabimet** në array dhe i kthen të gjitha njëherësh
- Thirret si hapi i parë në `shtoNdeshje()` — para çdo kontrolli tjetër

### Pse versioni i ri është më i mirë
Të dhëna të gabuara të bllokuara në hyrje janë shumë më të lehta se sa të dhëna të korruptuara në database. `Invalid Date` i ruajtur në PostgreSQL shkakton gabime të vështira për t'u gjetur. Gjithashtu, kthimi i të gjitha gabimeve njëherësh (jo vetëm të parit) e ndihmon zhvilluesin të kuptojë saktësisht çfarë mungon.

---

## Përmirësimi 3 — `.env.example` + README setup instructions [dokumentim]

### Çka ishte problem
Projekti nuk kishte `.env.example`. README nuk kishte instruksione si të ekzekutohej lokalisht. Dikush që klononte repo-n do të shihte gabimin `Error: connect ECONNREFUSED` pa asnjë shpjegim — dhe nuk do të dinte se duhet të konfigurojë `DATABASE_URL`.

### Çfarë ndryshova
1. **Krijova `backend/.env.example`** — dokumenton të gjitha variablat e nevojshme me shpjegim
2. **Shtova seksion `Setup & Installation` në README.md** — hapa të qartë për backend dhe frontend
3. **Shtova linkun live** të Render deploy-it

### Pse versioni i ri është më i mirë
Kodi që funksionon vetëm në kompjuterin tënd nuk është i gatshëm. Me `.env.example` dhe instruksionet e README, çdokush mund ta ekzekutojë projektin lokalisht në 5 minuta pa pyetur. Kjo është standardi minimal i çdo projekti profesional.

---

## Çka mbetet ende e dobët në projekt

1. **Nuk ka autentikim** — `organizerId` është ende hardcoded si `1`. Pa login/register, sistemi nuk mund të funksionojë me shumë përdorues.
2. **Lojtarët janë mock data** — `LOJTARET_MOCK` në `MatchDetail.jsx` nuk është e lidhur me database. Smart Split shfaqet vizualisht por nuk reflekton të dhëna reale.
3. **Testet janë të kufizuara** — mbulohet vetëm `MatchService`. Routes dhe Repository nuk testohen — mund të prishen pa u vënë re.