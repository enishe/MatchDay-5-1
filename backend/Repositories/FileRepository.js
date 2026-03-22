const fs = require('fs');
const path = require('path');

// Ushtrimi 3: Interface IRepository (Abstraksioni)
class IRepository {
    GetAll() { throw new Error("Duhet të implementohet!"); }
    GetById(id) { throw new Error("Duhet të implementohet!"); }
    Add(entity) { throw new Error("Duhet të implementohet!"); }
    Save() { throw new Error("Duhet të implementohet!"); }
}

// Implementimi konkret për MatchDay 5+1
class FileRepository extends IRepository {
    constructor() {
        super();
        this.filePath = path.join(__dirname, '../../data/matches.csv');
        this.data = [];
        this.initFile();
    }

    initFile() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.filePath)) {
            // Kolonat sipas User Stories: id, terreni, kosto, patikat, statusi
            fs.writeFileSync(this.filePath, 'id,terrain,totalCost,hasRental,isPaid\n');
        }
        this.Load();
    }

    Load() {
        const content = fs.readFileSync(this.filePath, 'utf8');
        this.data = content.split('\n').slice(1).filter(l => l.trim() !== '').map(line => {
            const [id, terrain, totalCost, hasRental, isPaid] = line.split(',');
            return { id, terrain, totalCost: parseFloat(totalCost), hasRental: hasRental === 'true', isPaid: isPaid === 'true' };
        });
    }

    GetAll() { return this.data; }

    GetById(id) { return this.data.find(m => m.id === id.toString()); }

    Add(match) { 
        this.data.push(match); 
        this.Save(); 
    }

    // Ushtrimi 3: Metoda Save() e kërkuar
    Save() {
        const header = 'id,terrain,totalCost,hasRental,isPaid\n';
        const rows = this.data.map(m => `${m.id},${m.terrain},${m.totalCost},${m.hasRental},${m.isPaid}`).join('\n');
        fs.writeFileSync(this.filePath, header + rows);
    }
}

module.exports = FileRepository;