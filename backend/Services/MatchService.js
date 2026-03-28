/**
 * MatchService
 * Menaxhon logjikën e biznesit për ndeshjet.
 * Ky shërbim pranon Repository-n si parametër (Dependency Injection).
 */
class MatchService {
    constructor(repo) {
        this.repo = repo;
    }

    // ─── Ushtrimi 2: Listo me filtrim ────────────────────────────────────────
    /**
     * Merr të gjitha ndeshjet me mundësi filtrimi.
     * @param {Object} filters - p.sh. { status: 'confirmed' }
     */
    async listoTeGjitha(filters = {}) {
        return await this.repo.GetAll(filters);
    }

    // ─── Ushtrimi 2: Gjej sipas ID ───────────────────────────────────────────
    async gjejSipasId(id) {
        if (!id) throw new Error("ID është e detyrueshme.");
        return await this.repo.GetById(id);
    }

    // ─── Ushtrimi 2: Shto me Validim ────────────────────────────────────────
    /**
     * Shton një ndeshje të re pasi kalon validimet.
     * @param {Object} matchData 
     */
    async shtoNdeshje(matchData) {
        // 1. Validimi: Emri (Field ID) nuk duhet të jetë bosh
        if (!matchData.fieldId) {
            throw new Error("ID e fushës është e detyrueshme (nuk mund të jetë bosh).");
        }

        // 2. Validimi: Çmimi duhet të jetë > 0
        if (!matchData.totalPrice || matchData.totalPrice <= 0) {
            throw new Error("Çmimi total duhet të jetë një vlerë pozitive mbi 0.");
        }

        // Logjika e biznesit është e deleguar te repo për ruajtje
        return await this.repo.Add(matchData);
    }

    // ─── Bonus: Update & Delete ──────────────────────────────────────────────
    async perditesoStatusin(id, status) {
        const statuses = ['pending', 'confirmed', 'canceled'];
        if (!statuses.includes(status)) {
            throw new Error("Statusi i dhënë nuk është i vlefshëm.");
        }
        return await this.repo.Update(id, status);
    }

    async fshiNdeshjen(id) {
        return await this.repo.Delete(id);
    }
}

module.exports = MatchService;