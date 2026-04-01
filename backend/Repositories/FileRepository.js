const fs   = require('fs');
const path = require('path');

// ─── IRepository — Kontratat (DIP) ───────────────────────────────────────────
class IRepository {
    GetAll()        { throw new Error("Duhet të implementohet!"); }
    GetById(id)     { throw new Error("Duhet të implementohet!"); }
    Add(entity)     { throw new Error("Duhet të implementohet!"); }
    Update(id, data){ throw new Error("Duhet të implementohet!"); }
    Delete(id)      { throw new Error("Duhet të implementohet!"); }
    Save()          { throw new Error("Duhet të implementohet!"); }
}

// ─── FileRepository — Implementimi konkret me CSV ────────────────────────────
class FileRepository extends IRepository {
    constructor() {
        super();
        this.filePath = path.join(__dirname, '../Data/matches.csv');
        this.data = [];
        this.initFile();
    }

    // Error Handling — krijon file nëse nuk ekziston
    initFile() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath,
                'id,terrain,totalCost,hasRental,isPaid\n' +
                '1,artificial_grass,60,false,true\n'  +
                '2,indoor_hall,60,true,true\n'        +
                '3,artificial_grass,60,false,false\n' +
                '4,indoor_hall,60,true,true\n'        +
                '5,artificial_grass,60,false,true\n'
            );
        }
        this.Load();
    }

    // Deserializim CSV → objekte
    Load() {
        try {
            const content = fs.readFileSync(this.filePath, 'utf8');
            this.data = content
                .split('\n')
                .slice(1)
                .filter(l => l.trim() !== '')
                .map(line => {
                    const [id, terrain, totalCost, hasRental, isPaid] = line.split(',');
                    return {
                        id,
                        terrain,
                        totalCost:  parseFloat(totalCost),
                        hasRental:  hasRental === 'true',
                        isPaid:     isPaid.trim() === 'true'
                    };
                });
        } catch (err) {
            // Error Handling — file i korruptuar
            console.error('FileRepository: gabim gjatë leximit të CSV:', err.message);
            this.data = [];
        }
    }

    // ─── GetAll ───────────────────────────────────────────────────────────────
    GetAll() {
        return this.data;
    }

    // ─── GetById ──────────────────────────────────────────────────────────────
    GetById(id) {
        const match = this.data.find(m => m.id === id.toString());
        if (!match) return null;
        return match;
    }

    // ─── Add ──────────────────────────────────────────────────────────────────
    Add(match) {
        // ID auto-increment
        const maxId = this.data.length > 0
            ? Math.max(...this.data.map(m => parseInt(m.id) || 0))
            : 0;
        match.id = (maxId + 1).toString();
        this.data.push(match);
        this.Save();
        return match;
    }

    // ─── Update (i shtuar — ishte i mangët) ───────────────────────────────────
    Update(id, updates) {
        const index = this.data.findIndex(m => m.id === id.toString());
        if (index === -1) return null;

        // Bashko të dhënat ekzistuese me ndryshimet
        this.data[index] = { ...this.data[index], ...updates };
        this.Save();
        return this.data[index];
    }

    // ─── Delete (i shtuar — ishte i mangët) ───────────────────────────────────
    Delete(id) {
        const index = this.data.findIndex(m => m.id === id.toString());
        if (index === -1) return false;

        this.data.splice(index, 1);
        this.Save();
        return true;
    }

    // ─── Save — Serializim objekte → CSV ──────────────────────────────────────
    Save() {
        try {
            const header = 'id,terrain,totalCost,hasRental,isPaid\n';
            const rows   = this.data
                .map(m => `${m.id},${m.terrain},${m.totalCost},${m.hasRental},${m.isPaid}`)
                .join('\n');
            fs.writeFileSync(this.filePath, header + rows);
        } catch (err) {
            // Error Handling — shkrim i dështuar
            console.error('FileRepository: gabim gjatë ruajtjes në CSV:', err.message);
        }
    }
}

module.exports = FileRepository;