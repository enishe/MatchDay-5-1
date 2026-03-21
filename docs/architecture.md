# Dokumentimi i Arkitekturës

### Shtresat (Layers) dhe Përgjegjësitë:

1. **Models/**: Përmban definicionet e objekteve kryesore (Lojtari, Ndeshja).
2. **Services/**: Këtu ndodhet logjika "Smart Split" dhe kalkulimet e penaliteteve.
3. **Data/**: Përdor "Repository Pattern" për të menaxhuar ruajtjen e të dhënave në CSV.
4. **UI/**: Pikat e hyrjes (Routes) që lidhin kërkesat e përdoruesit me serverin.

### Arsyetimi:
Kjo arkitekturë është zgjedhur për të ndarë qartë "Business Logic" nga "Data Access". Nëse në të ardhmen vendosim të kalojmë nga CSV në një Database SQL, mjafton të ndryshojmë vetëm folderin **Data**, pa prekur pjesën tjetër të programit.

## 🌟 Bonus: Parimet SOLID

Në këtë projekt është aplikuar parimi i parë i SOLID: **Single Responsibility Principle (SRP)**.

**Shpjegimi:**
Çdo klasë ka vetëm një përgjegjësi të caktuar:
- **FileRepository:** Merret vetëm me leximin/shkrimin e të dhënave në disk. Nuk e di se çfarë bëhet me paratë apo rezervimet.
- **Models (Match/Player):** Vetëm përcaktojnë strukturën e të dhënave.
- **index.js:** Vetëm inicializon sistemin.

Kjo ndarje bën që kodi të jetë i lehtë për t'u testuar dhe mirëmbajtur. Nëse ndryshon formati i ruajtjes së të dhënave, ne ndryshojmë vetëm Repository-n, pa prekur logjikën e biznesit.

Error Handling & System Resilience
Në këtë projekt, është zbatuar një sistem i mbrojtjes nga gabimet (Error Handling) për të siguruar që aplikacioni të mos ndalojë së punuari ("crash") në raste të papritura:

Përdorimi i Try-Catch: Çdo komunikim me skedarët CSV është i rrethuar me blloqe try-catch. Nëse skedari mungon ose është i dëmtuar, sistemi e kap gabimin (exception), e regjistron atë dhe kthen një mesazh miqësor për përdoruesin në vend që të bllokojë serverin.

Data Integrity: Para se të bëhet llogaritja e ekipeve (Smart Split), sistemi kontrollon nëse të dhënat janë valide. Nëse një lojtar nuk ka nivel aftësie (skill level), sistemi cakton një vlerë të paracaktuar (default) për të parandaluar gabimet matematikore.

 Scalability & Dependency Inversion
Arkitektura e projektit "MatchDay" është ndërtuar duke pasur parasysh rritjen në të ardhmen (Scalability):

Abstraksioni përmes Interface: Duke përdorur modelin IMatchRepository, logjika e biznesit (MatchService) nuk është e lidhur drejtpërdrejt me mënyrën se si ruhen të dhënat.

Nga CSV në SQL: Falë parimit të Dependency Inversion, nëse nesër vendosim të kalojmë nga skedarët CSV në një databazë profesionale si PostgreSQL ose MySQL, mjafton të krijojmë një klasë të re SqlMatchRepository që implementon të njëjtin interface.

Zero Change in Frontend: Ky ndryshim do të ndodhte vetëm në shtresën e të dhënave (Data Layer), pa pasur nevojë të ndryshohet asnjë rresht kodi në Frontend ose në logjikën kryesore të aplikacionit.