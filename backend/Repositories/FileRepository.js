const fs   = require('fs');
const path = require('path');

// ─── IRepository — Kontratat (DIP) ───────────────────────────────────────────
class IRepository {
    GetAll()         { throw new Error("Duhet të implementohet!"); }
    GetById(id)      { throw new Error("Duhet të implementohet!"); }
    Add(entity)      { throw new Error("Duhet të implementohet!"); }
    Update(id, data) { throw new Error("Duhet të implementohet!"); }
    Delete(id)       { throw new Error("Duhet të implementohet!"); }
    Save()           { throw new Error("Duhet të implementohet!"); }
}

// ─── FileRepository — Implementimi konkret me CSV ────────────────────────────
class FileRepository extends IRepository {
    constructor() {
        super();
        this.filePath = path.join(__dirname, '../Data/matches.csv');
        this.data = [];
        this.initFile();
    }

    // Error Handling — krijon file me 7 rekorde nëse nuk ekziston
    initFile() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath,
                'id,name,terrain,amount,hasRental,status\n' +
                '1,Termini_Salla_1,Sallë,60,false,Paid\n' +
                '2,Termini_Artificial_1,Bar Artificial,60,true,Paid\n' +
                '3,Termini_Salla_2,Sallë,60,false,Pending\n' +
                '4,Termini_Artificial_2,Bar Artificial,72,true,Paid\n' +
                '5,Termini_Salla_3,Sallë,60,false,Pending\n' +
                '6,Termini_Artificial_3,Bar Artificial,60,true,Paid\n' +
                '7,Termini_Salla_4,Sallë,72,false,Pending\n'
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
                    const [id, name, terrain, amount, hasRental, status] = line.split(',');
                    return {
                        id,
                        name,
                        terrain,
                        amount:    parseFloat(amount),
                        hasRental: hasRental === 'true',
                        status:    status ? status.trim() : 'Pending'
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
        const maxId = this.data.length > 0
            ? Math.max(...this.data.map(m => parseInt(m.id) || 0))
            : 0;
        match.id = (maxId + 1).toString();
        this.data.push(match);
        this.Save();
        return match;
    }

    // ─── Update ───────────────────────────────────────────────────────────────
    Update(id, updates) {
        const index = this.data.findIndex(m => m.id === id.toString());
        if (index === -1) return null;
        this.data[index] = { ...this.data[index], ...updates };
        this.Save();
        return this.data[index];
    }

    // ─── Delete ───────────────────────────────────────────────────────────────
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
            const header = 'id,name,terrain,amount,hasRental,status\n';
            const rows   = this.data
                .map(m => `${m.id},${m.name},${m.terrain},${m.amount},${m.hasRental},${m.status}`)
                .join('\n');
            fs.writeFileSync(this.filePath, header + rows);
        } catch (err) {
            console.error('FileRepository: gabim gjatë ruajtjes në CSV:', err.message);
        }
    }
}

module.exports = FileRepository;