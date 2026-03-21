// Kjo shërben si "Interface" (Abstraksion)
class IRepository {
    getAll() { throw new Error("Metoda duhet të implementohet!"); }
    add(entity) { throw new Error("Metoda duhet të implementohet!"); }
    getById(id) { throw new Error("Metoda duhet të implementohet!"); }
}

// Implementimi real
class FileRepository extends IRepository {
    constructor(fileName) {
        super();
        const fs = require('fs');
        this.fs = fs;
        this.filePath = `./Data/${fileName}.csv`;
        if (!this.fs.existsSync(this.filePath)) {
            this.fs.writeFileSync(this.filePath, 'id,name,amount,paid\n');
        }
    }

    getAll() {
        const data = this.fs.readFileSync(this.filePath, 'utf8');
        return data.split('\n').slice(1).filter(line => line.trim() !== '');
    }

    add(entity) {
        const row = `${entity.id},${entity.name},${entity.amount},${entity.paid}\n`;
        this.fs.appendFileSync(this.filePath, row);
    }
}

module.exports = FileRepository;