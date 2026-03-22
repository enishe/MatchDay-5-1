🏟️ MatchDay 5+1 — Dokumentimi i Arkitekturës
🏗️ Shtresat (Layers) dhe Përgjegjësitë
Projekti ndjek parimin e arkitekturës me shtresa (Layered Architecture) për të siguruar ndarjen e qartë të përgjegjësive (Separation of Concerns).

Models/: Përmban definicionet e objekteve kryesore (Match.js). Këto shërbejnë si blueprint për të gjithë sistemin, duke definuar atributet si terrain, hasRental, dhe status.

Services/: Këtu ndodhet logjika "Smart Split" dhe kalkulimet e penaliteteve prej 40%. Është shtresa më e rëndësishme që përmban rregullat e biznesit (Business Logic).

Repositories/: Përdor Repository Pattern për të menaxhuar ruajtjen e të dhënave. Kjo shtresë izolon detajet teknike të shkrimit në skedarë (CSV) nga pjesa tjetër e aplikacionit.

Routes/ & index.js: Pikat e hyrjes që lidhin kërkesat e përdoruesit me serverin. index.js është mbajtur minimal (Program.cs equivalent) për të respektuar rregullën e 10 rreshtave.

🌟 Parimet SOLID dhe Scalability
Në këtë projekt janë aplikuar parimet bazë të inxhinierisë softuerike:

1. Single Responsibility Principle (SRP)
Çdo klasë ka vetëm një përgjegjësi të caktuar:

FileRepository: Merret vetëm me leximin/shkrimin e të dhënave në disk.

MatchService: Merret vetëm me kalkulimet matematike të kostos dhe rimbursimit.

index.js: Vetëm inicializon serverin dhe lidh middleware-ët.

2. Dependency Inversion Principle (DIP)
Përmes abstraksionit me Interface (IRepository), logjika e biznesit nuk është e lidhur drejtpërdrejt me formatin CSV.

Nga CSV në SQL: Nëse nesër vendosim të kalojmë në PostgreSQL, mjafton të krijojmë një klasë të re SqlRepository që implementon të njëjtin interface. Logjika te MatchService mbetet e paprekur.

🛡️ Error Handling & System Resilience
Sistemi është dizajnuar për të qenë i qëndrueshëm (Robust) ndaj gabimeve:

Përdorimi i Try-Catch: Çdo komunikim me skedarët CSV (I/O operations) është i rrethuar me blloqe mbrojtëse. Nëse skedari mungon ose është i korruptuar, sistemi e kap gabimin pa u rrëzuar (crash).

Integriteti i të dhënave: Para llogaritjes së penalitetit 40%, sistemi kontrollon statusin e rezervimit dhe kohën e mbetur, duke siguruar që kalkulimet financiare të jenë gjithmonë të sakta bazuar në rregullat e biznesit.