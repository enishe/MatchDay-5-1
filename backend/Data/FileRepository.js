const fs = require('fs');

// Interface (Abstraksioni) - Përcakton rregullat për çdo Repository
class IRepository {
    getAll() { throw new Error("Metoda 'getAll()' duhet të implementohet!"); }
    add(entity) { throw new Error("Metoda 'add()' duhet të implementohet!"); }
    getById(id) { throw new Error("Metoda 'getById()' duhet të implementohet!"); }
}

// Implementimi konkret me FS (File System)
class FileRepository extends IRepository {
    constructor(fileName) {
        super();
        this.fs = fs;
        // Sigurohemi që path-i është korrekt sipas strukturës sate
        this.filePath = `./backend/Data/${fileName}.csv`;

        try {
            // Krijo folderin Data nëse nuk ekziston
            const path = require('path');
            const dir = path.dirname(this.filePath);
            if (!this.fs.existsSync(dir)) {
                this.fs.mkdirSync(dir, { recursive: true });
            }

            // Krijo skedarin CSV nëse nuk ekziston me header-at
            if (!this.fs.existsSync(this.filePath)) {
                this.fs.writeFileSync(this.filePath, 'id,name,amount,paid\n');
            }
        } catch (error) {
            console.error("Gabim gjatë inicializimit të skedarit:", error.message);
        }
    }

    // Lexon të gjitha të dhënat (Ushtrimi 3 - CRUD)
    getAll() {
        try {
            if (!this.fs.existsSync(this.filePath)) return [];
            const data = this.fs.readFileSync(this.filePath, 'utf8');
            return data.split('\n')
                .slice(1) // Hiq header-in (id, name, amount...)
                .filter(line => line.trim() !== '') // Hiq rreshtat bosh
                .map(line => {
                    const [id, name, amount, paid] = line.split(',');
                    return { id, name, amount, paid };
                });
        } catch (error) {
            console.error("Gabim gjatë leximit të të dhënave:", error.message);
            return [];
        }
    }

    // Shton një entitet të ri (Ushtrimi 3 - CRUD)
    add(entity) {
        try {
            const row = `${entity.id},${entity.name},${entity.amount},${entity.paid}\n`;
            this.fs.appendFileSync(this.filePath, row);
            return true;
        } catch (error) {
            console.error("Gabim gjatë shkrimit në skedar:", error.message);
            return false;
        }
    }

    // Kërkon një entitet sipas ID-së (Ushtrimi 3 - CRUD)
    getById(id) {
        try {
            const all = this.getAll();
            return all.find(item => item.id === id.toString()) || null;
        } catch (error) {
            console.error("Gabim gjatë kërkimit (getById):", error.message);
            return null;
        }
    }
}

module.exports = FileRepository;