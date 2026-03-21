🏟️ MatchDay 5+1 — Dokumentimi i Arkitekturës
🏗️ Shtresat (Layers) dhe Përgjegjësitë
Projekti ndjek parimin e arkitekturës me shtresa (Layered Architecture) për të siguruar ndarjen e qartë të përgjegjësive (Separation of Concerns).

Models/: Përmban definicionet e objekteve kryesore (Player, Match). Këto shërbejnë si "blueprint" për të gjithë sistemin.

Services/: Këtu ndodhet logjika "Smart Split" dhe kalkulimet e penaliteteve. Është shtresa më e rëndësishme që përmban rregullat e biznesit.

Data/: Përdor Repository Pattern për të menaxhuar ruajtjen e të dhënave në CSV. Kjo shtresë izolon detajet teknike të diskut nga pjesa tjetër e aplikacionit.

UI/Routes: Pikat e hyrjes që lidhin kërkesat e përdoruesit me serverin dhe kthejnë përgjigjet në format JSON.

🌟 Parimet SOLID dhe Scalability
Në këtë projekt janë aplikuar parimet bazë të inxhinierisë softuerike për të garantuar që kodi të jetë i mirëmbajtshëm dhe i lehtë për t'u zgjeruar.

1. Single Responsibility Principle (SRP)
Çdo klasë ka vetëm një përgjegjësi të caktuar:

FileRepository: Merret vetëm me leximin/shkrimin e të dhënave.

MatchService: Merret vetëm me logjikën e ndeshjeve.

index.js: Vetëm inicializon sistemin (Program.cs equivalent).

2. Dependency Inversion Principle (DIP)
Përmes abstraksionit me Interface (IMatchRepository), logjika e biznesit nuk është e lidhur drejtpërdrejt me formatin CSV.

Nga CSV në SQL: Nëse nesër vendosim të kalojmë në PostgreSQL ose MySQL, mjafton të krijojmë një klasë të re SqlMatchRepository që implementon të njëjtin interface.

Zero Change in Frontend: Ky ndryshim do të ndodhte vetëm në shtresën e të dhënave, pa pasur nevojë të ndryshohet asnjë rresht kodi në Frontend ose në Service.

🛡️ Error Handling & System Resilience
Sistemi është dizajnuar për të qenë i qëndrueshëm (Robust) ndaj gabimeve:

Përdorimi i Try-Catch: Çdo komunikim me skedarët CSV është i rrethuar me blloqe mbrojtëse. Nëse skedari mungon, sistemi e kap gabimin dhe kthen një mesazh miqësor në vend që të bllokojë serverin ("crash").

Data Integrity: Para llogaritjeve, sistemi kontrollon validitetin e të dhënave. Nëse një lojtari i mungon niveli i aftësisë (skill level), caktohet një vlerë e paracaktuar (default) për të parandaluar dështimet matematike.