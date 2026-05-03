# Demo Plan — MatchDay 5+1

---

## 1. Titulli i projektit

**MatchDay 5+1**
Platformë web për rezervimin e fushave të futbollit 5+1

---

## 2. Problemi që zgjidh

Rezervimi i fushave sportive bëhet ende me telefon, mesazhe WhatsApp, ose marrëveshje gojore. Kjo shkakton:

- **Rezervime të dyfishta** — dy grupe zënë të njëjtin termin pa e ditur
- **Asnjë konfirmim zyrtar** — klienti nuk e di nëse termini është i sigurt
- **Admin pa pamje të qartë** — menaxheri nuk ka kalendarit të centralizuar
- **Asnjë historik** — nuk ruhen rezervimet e kaluara

MatchDay 5+1 zgjidh pikërisht këtë: rezervim online me konfirmim të menjëhershëm, bllokimi automatik i slotit, dhe panel admin me kalendarit në kohë reale.

---

## 3. Përdoruesit kryesorë

| Roli | Çfarë bën në sistem |
|------|---------------------|
| **User (klient)** | Regjistrohet, kërkon fushë të lirë, zgjedh orën, bën rezervim me cash |
| **Admin (menaxhues i fushës)** | Shikon rezervimet e reja në kohë reale, menaxhon kalendarin, shikon statusin e pagesave |

---

## 4. Flow-i që do ta demonstroj

### Flow-i zgjedhur:

```
User login
    ↓
Zgjedh fushën
    ↓
Zgjedh datën dhe orën (slot i lirë)
    ↓
Bën rezervimin me cash  →  POST /api/bookings/cash
    ↓
Konfirmim rezervimit (status: confirmed)
    ↓
[notifikim i menjëhershëm dërguar tek admin]
    ↓
Admin login
    ↓
Shikon notifikacionin — "rezervim i ri"
    ↓
Hap kalendarin
    ↓
Termini figuron si i REZERVUAR ✓ — slot i bllokuar
```

### Pse pikërisht ky flow?

Sepse tregon **ciklin e plotë të sistemit** — nga veprimi i parë i klientit deri te konfirmimi në anën e adminit. Ky flow:

- Demonstron **të dyja rolet** (user + admin) brenda një demo të vetme
- Tregon **komunikimin në kohë reale** mes dy palëve (notifikimi)
- Tregon **logjikën kryesore të biznesit** — bllokimi i slotit për të shmangur konfliktet
- Është **i plotë dhe i kuptueshëm** edhe nga dikush që e sheh sistemin për herë të parë

---

## 5. Një problem real që e kam zgjidhur

### 🔴 Problemi — çfarë po ndodhte

Imagjino dy persona që hapin aplikacionin në të njëjtën kohë dhe të dy zgjedhin **të njëjtën fushë, të njëjtën orë**. Sistemi i vjetër i pranonte **të dyja rezervimet** si të vlefshme — pa e ditur njëri për tjetrin. Rezultati: dy grupe shfaqen në fushë në të njëjtën kohë.

### 🟡 Ku ishte shkaku

Kodi në `BookingService.js` shkruante rezervimin direkt në databazë **pa kontrolluar** nëse ai slot ishte tashmë i zënë. Nuk kishte asnjë "roje" para ruajtjes.

```
Kërkesë rezervimi  →  Shkruaj në DB  ✗  (pa kontroll)
```

### 🟢 Si e zgjidha

Shtova një kontroll të detyrueshëm **para çdo ruajtjeje** — funksioni `ensureSlotAvailable()`. Ai pyet databazën: *"ekziston ndonjë rezervim aktiv për këtë fushë, këtë sallë, në këtë interval kohor?"*

```
Kërkesë rezervimi  →  ensureSlotAvailable()  →  Shkruaj në DB  ✓
                              ↓
                    (nëse slot është zënë → hedh error, ndalet)
```

```js
async ensureSlotAvailable(fieldId, courtNumber, startTime, endTime) {
  const conflict = await db.query(
    `SELECT id FROM bookings
     WHERE field_id = $1
       AND court_number = $2
       AND status != 'canceled'
       AND start_time < $4
       AND end_time > $3`,
    [fieldId, courtNumber, startTime, endTime]
  );
  if (conflict.rows.length > 0) {
    throw new Error('Ky slot është tashmë i rezervuar.');
  }
}
```

### ✅ Rezultati

Nëse dy persona provojnë të njëjtin slot njëkohësisht — **vetëm i pari kalon**. I dyti merr mesazh të qartë: *"Ky slot është tashmë i rezervuar."* Asnjë konflikt, asnjë rezervim i dyfishtë.

---

## 6. Çka mbetet ende e dobët

**Pagesa me kartë** — flow-i i pagesës me kartë (`POST /api/bookings/card`) është i implementuar në backend, por integrimi me gateway real pagese (Stripe, PayPal) nuk është bërë ende. Aktualisht funksionon vetëm pagesa me cash. Ky është kufizim i dukshëm për një sistem rezervimi real që do të shkonte në prodhim.

---

## 7. Struktura e prezantimit (5–7 minuta)

```
TOTAL:  ├── Hyrja          ~45 sek
        ├── Demo live       ~3 min
        ├── Shpjegim teknik ~1 min
        ├── Problem+Zgjidhje ~45 sek
        └── Mbyllja         ~30 sek
```

---

### PJESA 1 — Hyrja `~45 sekonda`

**Qëllimi:** Bëj audiencën të kuptojë problemin para se të shohin zgjidhjen.

> *"Sot rezervimi i fushave sportive bëhet ende me telefon ose WhatsApp — pa konfirmim, pa kalendarit, dhe shpesh me konflikte. MatchDay 5+1 e zgjidh këtë: rezervim online me dy klikime, konfirmim i menjëhershëm, dhe panel admin në kohë reale."*

**Çfarë them:**
- Problemi real (1 fjali)
- Zgjidhja (1 fjali)
- "Sot do t'ju tregoj ciklin e plotë — nga rezervimi i userit deri te kalendari i adminit"

---

### PJESA 2 — Demo live `~3 minuta`

**Qëllimi:** Lëre sistemin të flasë vetë. Mos shpjego — trego.

| # | Veprimi | Çfarë tregohet |
|---|---------|----------------|
| 1 | Login si **user** | Autentifikim JWT, kalim te dashboard |
| 2 | Zgjedh **fushën** | Lista e fushave aktive në Mitrovicë |
| 3 | Zgjedh **datën + orën** | Slot-et e lira vizualisht |
| 4 | Rezervim me **cash** | `POST /api/bookings/cash` → confirmed |
| 5 | Login si **admin** | Role-based redirect te panel admin |
| 6 | Shikon **notifikacionin** | "Rezervim i ri" — komunikim real-time |
| 7 | Hap **kalendarin** | Termini bllokuar ✓ — slot nuk mund të rezervohet sërish |

> 💡 **Shënim gjatë demos:** Pas çdo hapi, ndalo 1 sekondë — lëre audiencën ta shohë ekranin para se të vazhdosh.

---

### PJESA 3 — Shpjegimi teknik `~1 minutë`

**Qëllimi:** Trego se e kupton arkitekturën, jo vetëm UI-n.

**Rruga e një rezervimi nëpër sistem:**
```
Browser (React)
    ↓  fetch + JWT
Express API  →  BookingService  →  ensureSlotAvailable()
    ↓                                      ↓
PostgreSQL ←── INSERT booking       Nëse zënë → 409 Error
    ↓
NotificationService → njoftime për admin
```

**Çfarë them:**
- Stack: React + Vite / Express / PostgreSQL / JWT
- `BookingService` menaxhon logjikën e rezervimit
- `NotificationService` dërgon njoftimin tek admin automatikisht

---

### PJESA 4 — Problemi real + zgjidhja `~45 sekonda`

**Qëllimi:** Trego se ke hasur dhe zgjidhur një problem konkret teknik.

> *"Gjatë zhvillimit hasa një problem: dy userë mund të rezervonin të njëjtin slot njëkohësisht. Sistemi i pranonte të dyja. E zgjidha duke shtuar funksionin `ensureSlotAvailable()` — i cili kontrollon konfliktet në databazë para çdo ruajtjeje. Tani vetëm rezervimi i parë kalon."*

**Struktura e shpjegimit (30 fjalë maks):**
1. Problemi → 2. Ku ishte → 3. Si e zgjidha → 4. Rezultati

---

### PJESA 5 — Mbyllja `~30 sekonda`

**Qëllimi:** Mbyll qartë, lër përshtypje profesionale.

> *"Sistemi sot funksionon plotësisht për rezervime cash me të dyja rolet. Çfarë mbetet: integrimi i pagesës me kartë përmes Stripe. Faleminderit."*

**Çfarë them:**
- Çfarë funksionon sot (cash, dy role, kalendarit)
- 1 gjë konkrete që mbetet (pagesa me kartë)
- Falënderim i shkurtër — pa zgjatje

---

## 8. Plan B — nëse diçka nuk funksionon live

| Situata | Plan B |
|---------|--------|
| Aplikacioni nuk hapet | Screenshots të secilit hap të flow-it |
| Databaza nuk lidhet | Tregoj README-n dhe shpjegoj arkitekturën verbalisht |
| Flow prishet në mes | Tregoj kodin direkt në GitHub (`BookingService.js`, `bookingRoutes.js`) |
| Notifikimi nuk shfaqet | Screenshot i output-it nga testi lokal |

### Screenshots për t'i bërë para demos:

- [ ] Faqja e login-it (user)
- [ ] Lista e fushave aktive
- [ ] Formulari i rezervimit me cash
- [ ] Ekrani i konfirmimit — status: confirmed
- [ ] Paneli admin — notifikacioni i ri
- [ ] Kalendari admin — slot i shënuar si i rezervuar

---

## 9. Checklist para demos

- [ ] `git push` — repo e përditësuar në GitHub
- [ ] README i qartë me udhëzime instalimi
- [ ] Aplikacioni niset pa gabime (`npm run dev` + `node server.js`)
- [ ] Databaza është e seeduar me fusha aktive (Mitrovicë)
- [ ] User test ekziston në DB me kredenciale të njohura
- [ ] Admin user ekziston (`ensureAdminUser()` ka run)
- [ ] Flow-i është testuar 3 herë nga fillimi deri në fund
- [ ] Screenshots janë gati si Plan B
- [ ] Prezantimi është praktikuar disa herë

