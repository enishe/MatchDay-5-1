# Dokumentimi i Implementimit - MatchDay 5+1

## 🚀 Përmbledhja
Në këtë fazë të projektit, kemi implementuar arkitekturën e plotë të aplikacionit, duke kaluar nga ruajtja e thjeshtë e të dhënave në një sistem real të menaxhimit të bazës së të dhënave (PostgreSQL).

## 🏗️ Arkitektura e Sistemit
Sistemi ndjek parimin e ndarjes së përgjegjësive (Separation of Concerns):
1. **Database:** PostgreSQL (Tabelat: Bookings, Users, Fields).
2. **Repository Layer:** `SqlMatchRepository` – ekzekuton query-t SQL.
3. **Service Layer:** `MatchService` – përmban logjikën e biznesit dhe validimet (çmimi > 0, llogaritja e çmimit për lojtar).
4. **API Layer:** Express.js – rrugët (Routes) që mundësojnë komunikimin me Frontend.
5. **UI Layer:** React.js – shfaqja e të dhënave në tabelë përmes kërkesave asinkrone (Fetch API).

## ✅ Çfarë funksionon?
- **GetAll():** Leximi i të gjitha ndeshjeve nga databaza.
- **Dependency Injection:** Service pranon Repository-n si parametër.
- **Validimi:** Kontrolli i të dhënave para regjistrimit.
- **Smart Split:** Llogaritja automatike e çmimit për person ($Total / 12$).

## 📸 Pamja nga Aplikacioni (Screenshot)
![Tabela e Ndeshjeve](../frontend/screenshot.png)
