# Project Audit — MatchDay 5+1

**Autori:** Enisi  
**Data:** 15 Prill 2026  
**Versioni:** Sprint 2 — Post-deployment  
**Stack:** React + Node.js + PostgreSQL + Render

---

## 1. Përshkrimi i shkurtër i projektit

### Çka bën sistemi?
MatchDay 5+1 është një platformë web për rezervimin e fushave të futbollit të vogël (format 5+1 lojtarë). Sistemi lejon organizatorin të rezervojë një termin duke zgjedhur fushën, datën dhe orën. Automatikisht llogarit çmimin për çdo lojtar duke e ndarë koston totale të fushës në 12 pjesë të barabarta — funksionalitet i quajtur **Smart Split**. Lojtarët mund të zgjedhin edhe patika me qira (+2€) që shtohen vetëm tek fatura e tyre personale.

### Kush janë përdoruesit kryesorë?
- **Organizatori** — rezervon fushën, zgjedh datën dhe orën, menaxhon ndeshjen
- **Lojtarët** — 12 pjesëmarrës që paguajnë pjesën e tyre individuale
- **Administratori** — sheh statistikat, menaxhon rezervimet dhe inventarin e patikave

### Funksionaliteti kryesor
- Rezervim termini: zgjedhje fushe (Bar Artificial / Sallë Futsali) → datë → orë
- Smart Split: `60€ ÷ 12 lojtarë = 5€/lojtar` — llogaritje automatike
- Patika me qira: +2€ individuale, nuk ndikon çmimin e lojtarëve të tjerë
- Anulim me logjikë penaliteti: 40% nëse brenda 2 orëve, 0% nëse më herët
- Panel Admin: statistika, CRUD rezervimesh, filtrim sipas statusit
- Dark mode dhe UI responsive për të gjitha pajisjet

---

## 2. Çka funksionon mirë?

### 1. Arkitektura e shtresëzuar është zbatuar saktë
Kodi ndahet qartë në katër shtresa: `Routes → Service → Repository → Database`. `matchRoutes.js` merret vetëm me HTTP — nuk di asgjë për SQL. `MatchService.js` merret vetëm me logjikën e biznesit — nuk di asgjë për PostgreSQL. `SqlMatchRepository.js` merret vetëm me query-t SQL. Kjo ndarje është e qëllimshme dhe e dokumentuar me komente — dhe e bën sistemin të lehtë për t'u ndryshuar. Për shembull, `SqlMatchRepository` mund të zëvendësohet me `MongoRepository` pa ndryshuar asnjë rresht në `MatchService.js`.

### 2. Validimi i input-it ndodh në shtresën e duhur
`shtoNdeshje()` në `MatchService.js` kontrollon: nëse `fieldId` ekziston, nëse `totalPrice > 0`, nëse `startTime` është në të ardhmen, dhe nëse `endTime > startTime`. Validimi ndodh në **Service layer** — aty ku duhet sipas arkitekturës — jo në routes dhe jo në frontend. Kjo do të thotë se rregullat e biznesit janë të centralizuara dhe nuk mund të anashkalohen.

### 3. Error handling specifik në Repository
`SqlMatchRepository.js` ka try/catch në çdo metodë me mesazhe specifike: trajton `err.code === '23503'` (Foreign Key violation kur `field_id` nuk ekziston në tabelën `Fields`), ID jo-numerike (`"abc"`), dhe dështime të lidhjes me databazën. Çdo gabim ka mesazh në shqip që shpjegon saktësisht çfarë shkoi keq — jo vetëm "Internal Server Error".

### 4. Route ordering i menduar me dokumentim
`/matches/stats` dhe `/matches/split-preview` janë vendosur para `/matches/:id` me koment shpjegues direkt në kod (`// KUJDES: Ky route duhet PARA /matches/:id`). Pa këtë rend, Express lexon `"stats"` si vlerë të `:id` dhe kthen gabim 404. Ky është bug i heshtur dhe i vështirë për t'u gjetur — fakti që është trajtuar dhe shpjeguar tregon kujdes të vërtetë.

### 5. Smart Split është i izoluar dhe i testuar
`llogaritSmartSplit(totalPrice, playerCount)` ekziston si metodë e veçantë në `MatchService.js` dhe ka teste në `tests/matchService.test.js`. Logjika nuk është duplikuar në frontend — frontendi e merr rezultatin nga API. Kjo do të thotë se nëse ndryshon formula (p.sh. nga 12 në 10 lojtarë), ndryshimi bëhet vetëm në një vend.

---

## 3. Dobësitë e projektit

### Dobësia 1 — BUG KRITIK: Nuk kontrollohet nëse termini është i zënë
**Ku ndodh:** `MatchService.js` → metoda `shtoNdeshje()`

**Kodi problematik:**
```javascript
async shtoNdeshje(matchData) {
    if (!matchData.fieldId) throw new Error('...');
    if (!matchData.totalPrice || matchData.totalPrice <= 0) throw new Error('...');
    if (new Date(matchData.startTime) <= new Date()) throw new Error('...');
    if (new Date(matchData.endTime) <= new Date(matchData.startTime)) throw new Error('...');
    // ← MUNGON PLOTËSISHT: kontroll konflikti orarit
    return await this.repo.Add(matchData);
}
```
**Problemi:** Dy persona mund të rezervojnë Fushën #1 për të njëjtën datë dhe orë — të dyja do të ruhen në database pa asnjë gabim. Nuk ka `SELECT` para `INSERT` që kontrollon nëse ekziston rezervim aktiv për atë fushë dhe interval kohor.  
**Ndikimi:** Rezervime të dyfishta — problemi më i rëndë funksional i sistemit.

---

### Dobësia 2 — `organizerId` hardcoded si `1`
**Ku ndodh:** `SqlMatchRepository.js` → `Add()` dhe `BookingPage.jsx`

**Kodi problematik:**
```javascript
// SqlMatchRepository.js - Add()
match.organizerId || 1   // ← gjithmonë 1 kur nuk ka auth

// BookingPage.jsx
body: JSON.stringify({ organizerId: 1, ... })  // ← hardcoded
```
**Problemi:** Nuk ka sistem autentikimi. Çdo rezervim i atribuohet përdoruesit me ID=1, pavarësisht kush e bëri. Nuk ka mënyrë të dihet kush rezervoi çfarë.  
**Ndikimi:** Sistemi nuk mund të funksionojë me shumë përdorues.

---

### Dobësia 3 — Lojtarët janë mock data — nuk ka tabelë reale
**Ku ndodh:** `MatchDetail.jsx`

**Kodi problematik:**
```javascript
const LOJTARET_MOCK = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    emri: i === 0 ? 'Ti (Organizatori)' : `Lojtar ${i + 1}`,
    paguar: i < 7,          // ← i fiksuar artificialisht
    patika: i === 2 || i === 5,  // ← i fiksuar artificialisht
}));
```
**Problemi:** Nuk ka tabelë `players` në database. Statusi "paguar/pa paguar" dhe progress bar-i janë false — nuk reflektojnë të dhëna reale.  
**Ndikimi:** Smart Split vizualisht funksionon, por numerikisht është i rremë.

---

### Dobësia 4 — `FileRepository.js` është kod i vdekur (dead code)
**Ku ndodh:** `backend/Repositories/FileRepository.js`

**Problemi:** Ky skedar ekzistonte kur të dhënat ruheshin në CSV. Tani që sistemi përdor PostgreSQL, `FileRepository.js` nuk thirret nga asnjë komponent — por mbetet në projekt pa koment shpjegues. `matchRoutes.js` importon vetëm `SqlMatchRepository`, kurrë `FileRepository`.  
**Ndikimi:** Konfuzion — zhvilluesi i ri nuk di nëse ky skedar është aktiv, deprecated, apo duhet mirëmbajtur.

---

### Dobësia 5 — Nuk ka `.env.example` dhe setup nuk është i dokumentuar
**Problemi:** Projekti përdor `DATABASE_URL` dhe `PORT` si variabla mjedisi, por nuk ka `.env.example` dhe README nuk ka instruksione setup. `.env` reali është në `.gitignore` (siç duhet), por askund nuk shkruhet çfarë variablash duhen.  
**Ndikimi:** Dikush që klonon repo-n nuk mund ta ekzekutojë lokalisht pa lexuar të gjithë kodin — ose pa pyetur.

---

### Dobësia 6 — Testet mbulojnë vetëm Service, jo routes ose repository
**Problemi:** `tests/matchService.test.js` teston vetëm `MatchService`. Nuk ka teste për:
- API endpoints (`POST /api/matches`, `DELETE /api/matches/:id`)
- `SqlMatchRepository` — query-t SQL dhe rastet kufitare
- Integrimin mes shtresave

**Ndikimi:** Mund të prishet një route dhe testet do të kalonin gjithsesi — false sense of security.

---

### Dobësia 7 — Frontend nuk trajton gjendjen "server i fjetur"
**Problemi:** Render Free tier e fle serverin pas inaktivitetit. Kur ndodh, frontend shfaq vetëm `"Cannot connect to the server"` — pa retry buton, pa shpjegim, pa loading skeleton.  
**Ndikimi:** Përdoruesi nuk di nëse aplikacioni është i prishur apo duke u ngarkuar — eksperiencë konfuze.

---

## 4. Tre përmirësime që do t'i implementoj

### Përmirësimi 1 — Blloko rezervimin kur termini është i zënë `[kod/strukturë]`

**Problemi:**  
`shtoNdeshje()` nuk kontrollon konfliktet e orarit. Dy persona mund të rezervojnë të njëjtën fushë njëkohësisht — të dyja ruhen në database pa gabim. Ky është bug strukturor: mungon një kontroll i tërë para `INSERT`.

**Zgjidhja:**  
Shtohet metoda `checkConflict(fieldId, startTime, endTime)` në `SqlMatchRepository.js`:
```javascript
async checkConflict(fieldId, startTime, endTime) {
    const result = await pool.query(
        `SELECT id FROM Bookings 
         WHERE field_id = $1 
           AND status != 'canceled'
           AND start_time < $3 
           AND end_time > $2`,
        [fieldId, startTime, endTime]
    );
    return result.rows.length > 0;
}
```
Thirret nga `shtoNdeshje()` para `repo.Add()`. Nëse ka konflikt → gabim i qartë: `"Fusha është e zënë për këtë orë. Zgjidhni një orar tjetër."`

**Pse ka rëndësi:**  
Ky nuk është ndryshim estetik — është bug funksional. Pa këtë kontroll, dy grupe lojtarësh mund të mbërrijnë në të njëjtën fushë në të njëjtën orë. Biznesi humbet para dhe besueshmëri.

---

### Përmirësimi 2 — Validim i plotë i input-it me mesazhe specifike `[reliability/validation]`

**Problemi:**  
`shtoNdeshje()` bën disa kontrolle, por ka raste të patrajtuara: çka nëse `startTime` është `"abc"` (jo datë e vlefshme)? Çka nëse `fieldId` është `0` ose negativ? `new Date("abc")` kthen `Invalid Date` pa gabim të dukshëm — dhe mund të ruhet në database.

**Zgjidhja:**  
Shtohet funksioni `validateMatchInput(data)` në `MatchService.js`:
```javascript
validateMatchInput(data) {
    const errors = [];
    const fieldId = parseInt(data.fieldId);
    if (isNaN(fieldId) || fieldId <= 0)
        errors.push('ID e fushës duhet të jetë numër pozitiv.');
    
    const start = new Date(data.startTime);
    const end   = new Date(data.endTime);
    if (isNaN(start.getTime()))
        errors.push('Koha e fillimit nuk është datë e vlefshme.');
    if (isNaN(end.getTime()))
        errors.push('Koha e mbarimit nuk është datë e vlefshme.');
    
    if (errors.length > 0)
        throw new Error(errors.join(' | '));
}
```
Thirret në fillim të `shtoNdeshje()` para çdo kontrolli tjetër.

**Pse ka rëndësi:**  
Të dhëna të gabuara që hyjnë në database janë shumë më të vështira për t'u korrigjuar se sa ato të bllokuara në hyrje. Mesazhet specifike ndihmojnë zhvilluesin dhe përdoruesin — jo vetëm `400 Bad Request`.

---

### Përmirësimi 3 — `.env.example` + setup instructions në README `[dokumentim]`

**Problemi:**  
Projekti nuk ka `.env.example`. README nuk ka instruksione si të ekzekutohet lokalisht. Dikush që klonon repo-n sheh gabime të pakuptueshme si `Error: connect ECONNREFUSED` pa asnjë udhëzim.

**Zgjidhja:**  
Krijohen:

**`.env.example`:**
```
# Database
DATABASE_URL=postgresql://username:password@host:5432/matchday_db

# Server
PORT=5000
NODE_ENV=development
```

**Seksion i ri në `README.md`:**
```markdown
## Setup & Installation

### Kërkesat
- Node.js v18+
- PostgreSQL v14+

### Hapat
1. git clone https://github.com/enishe/MatchDay-5-1
2. cd MatchDay-5-1/backend && npm install
3. cp .env.example .env  # plotëso me të dhënat tuaja
4. psql -f backend/Data/schema.sql  # krijo tabelat
5. npm run dev

### Frontend
cd frontend && npm install && npm run dev
```

**Pse ka rëndësi:**  
Kodi që funksionon vetëm në kompjuterin tënd nuk është i gatshëm. Dokumentimi i setup-it është shenjë e inxhinierit profesional — dhe kurseon orë pune për çdo person që punon me projektin.

---

## 5. Një pjesë që ende nuk e kuptoj plotësisht

Pjesa që më është e paqartë është **si funksionon `pg.Pool` dhe connection management në PostgreSQL me Render**.

E di se `db.js` krijon një `Pool` dhe çdo `pool.query()` merr automatikisht një lidhje, ekzekuton query-n, dhe e lëshon. Por nuk e kuptoj plotësisht:

1. **Sa lidhje hapen si default?** Mendoj 10, por nuk jam i sigurt si e menaxhon Render Free tier kufirin e lidhjes.
2. **Çfarë ndodh kur të gjitha lidhjet janë të zëna?** A prishet menjëherë kërkesa e re apo pret (`connectionTimeoutMillis`)?
3. **Pse ndodhin timeout-et pas inaktivitetit?** A i mbyll PostgreSQL lidhjet e vjetra nga ana e tij, dhe pool-i nuk e di?

Kam parë opsionet `idleTimeoutMillis` dhe `connectionTimeoutMillis` në dokumentacionin e `pg`, por nuk di si t'i konfigurojë saktë. Kjo paqartësi ka impakt real — nëse pool-i konfigurohet gabim, aplikacioni mund të dështojë nën ngarkesë edhe nëse logjika e biznesit është e saktë.