<div align="center">

# MatchDay 5+1

**Menaxhim profesional i termineve dhe ndeshjeve të futbollit 5+1**

*Full-stack: React · Express · PostgreSQL · Repository pattern & SOLID*

[![Node](https://img.shields.io/badge/Node.js-LTS-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## Çfarë është ky projekt?

**MatchDay 5+1** është një aplikacion web për organizimin e ndeshjeve në fushë: regjistron terminet, ndjek statusin (në pritje / konfirmuar / anuluar), llogarit **Smart Split** (çmimi total i ndarë me 12 lojtarë), ofron **statistika** të përmbledhura mbi tabelë dhe trajton gabimet në mënyrë të qartë (validim, 404, databazë e padisponueshme). Arkitektura ndan përgjegjësitë: **UI → API REST → shërbim biznesi → repository → databazë**.

---

## Çfarë bën aplikacioni (përmbledhje funksionale)

| Funksioni | Përshkrimi |
|-----------|------------|
| **Lista & CRUD** | Shfaq ndeshjet; krijim, përditësim dhe fshirje me validim |
| **Filtrim** | Sipas statusit dhe llojit të fushës (kur aplikohet) |
| **Statistika** | Total ndeshjesh, çmime min/max/mesatare, shpërndarje sipas statusit, total të ardhurash |
| **Smart Split** | Parapamje në kohë reale: çmimi për lojtar (total ÷ 12) |
| **Rregulla biznesi** | P.sh. penalitet 40% për anulim afër fillimit të ndeshjes |
| **Teste automatike** | Jest mbi `MatchService` me repository të simuluar (pa DB reale në test) |

---

## Gjuhët programuese dhe teknologjitë — pse nevojiten

| Gjuha / teknologjia | Ku përdoret | Pse nevojitet |
|---------------------|-------------|---------------|
| **JavaScript (ES6+)** | Backend (`Node.js`), skriptet e testeve | Një gjuhë për API-në (`Express`), logjikën e biznesit (`MatchService`) dhe integrimin me databazën; ekosistem i pasur dhe i njëjtë me frontend-in |
| **JSX** | Frontend (`React`) | Shkrim i lexueshëm i komponentëve UI; përkthehet në JavaScript nga Vite |
| **SQL** | PostgreSQL (përmes `pg`) | Ruajtje e qëndrueshme e ndeshjeve; pyetje dhe transaksione të strukturuara për listë, insert, update, delete |
| **HTML & CSS** | Brenda React (JSX + stil inline / praktika ekzistuese) | Strukturë dhe pamje e ndërfaqes; CSS për layout dhe lexueshmëri |

### Stack-i në një tabelë (shtresa)

| Shtresa | Teknologjia | Roli |
|---------|-------------|------|
| **Paraqitja** | React 19, Vite | SPA, forma, tabela, panel statistikash |
| **API** | Express, CORS | Rrugët REST (`/api/matches`, `/api/matches/stats`) |
| **Biznesi** | JavaScript (`MatchService`) | Validim, statistika, Smart Split, rregulla anulimi |
| **Të dhënat** | `pg`, PostgreSQL | Repository pattern — izolim i aksesit në DB |
| **Cilësia** | Jest | Unit teste të izoluara me mock repository |

---

## Struktura e repozitorit

| Dosja | Përmbajtja |
|-------|------------|
| `backend/` | `index.js`, `Routes/`, `Services/`, `Repositories/`, `config/`, `tests/` |
| `frontend/` | Aplikacion Vite + React (`src/App.jsx`, etj.) |
| `docs/` | Plan sprinti, arkitekturë, diagram klasesh, implementim |

---



<div align="center">

**Autor:** Enis Hetemi · *MatchDay 5+1*

</div>
