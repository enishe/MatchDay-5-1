/**
 * MatchService
 * Shtresa e logjikës së biznesit — "truri" i aplikacionit.
 * 
 * Parimi SRP: Ky service merret VETËM me rregullat e biznesit.
 * Parimi DIP: Varet nga IRepository (repo), jo nga implementimi konkret.
 *             Mund të zëvendësohet SqlMatchRepository me FileRepository
 *             pa ndryshuar asnjë rresht këtu.
 * 
 * @param {Object} repo - Çdo objekt që implementon kontratën IRepository
 *                        (SqlMatchRepository ose FileRepository)
 */
class MatchService {
    constructor(repo) {
        this.repo = repo;
    }

    // ─── Ushtrimi 2: Listo me filtrim ────────────────────────────────────────
    /**
     * Merr të gjitha ndeshjet me mundësi filtrimi.
     * @param {Object} filters - p.sh. { status: 'confirmed', terrain_type: 'indoor_hall' }
     * @returns {Array} Lista e ndeshjeve
     */
    async listoTeGjitha(filters = {}) {
        return await this.repo.GetAll(filters);
    }

    // ─── Ushtrimi 2: Gjej sipas ID ───────────────────────────────────────────
    /**
     * Kërkon një ndeshje specifike sipas ID-së.
     * @param {number} id
     */
    async gjejSipasId(id) {
        if (!id) throw new Error('ID është e detyrueshme.');

        const match = await this.repo.GetById(id);
        if (!match) throw new Error(`Ndeshja me ID ${id} nuk u gjet.`);

        return match;
    }

    // ─── Ushtrimi 2: Shto me Validim ─────────────────────────────────────────
    /**
     * Shton një ndeshje të re pasi kalon të gjitha validimet.
     * Smart Split llogaritet në Repository (totalPrice / 12).
     * 
     * Validimi (përshtatje JS e kërkesës C# "emri jo bosh, çmimi > 0"):
     *   - fieldId    → ekuivalenti i "emrit" (identifikon fushën/lokacionin)
     *   - totalPrice → çmimi > 0
     *   - startTime  → duhet të jetë në të ardhmen
     *   - endTime    → duhet të jetë pas startTime
     * 
     * @param {Object} matchData - { fieldId, organizerId, startTime, endTime, totalPrice }
     */
    async shtoNdeshje(matchData) {
        // Validim 1: Field ID (ekuivalent i "emrit" në shembullin C#)
        if (!matchData.fieldId) {
            throw new Error('ID e fushës është e detyrueshme (nuk mund të jetë bosh).');
        }

        // Validim 2: Çmimi > 0
        if (!matchData.totalPrice || matchData.totalPrice <= 0) {
            throw new Error('Çmimi total duhet të jetë mbi 0€.');
        }

        // Validim 3: Koha e fillimit duhet të jetë në të ardhmen
        if (new Date(matchData.startTime) <= new Date()) {
            throw new Error('Koha e fillimit duhet të jetë në të ardhmen.');
        }

        // Validim 4: Koha e mbarimit duhet të jetë pas fillimit
        if (new Date(matchData.endTime) <= new Date(matchData.startTime)) {
            throw new Error('Koha e mbarimit duhet të jetë pas kohës së fillimit.');
        }

        return await this.repo.Add(matchData);
    }

    // ─── Bonus: Update ────────────────────────────────────────────────────────
    /**
     * Përditëson statusin e një ndeshje.
     * Logjika e anulimit (US #5, #6, #7): nëse anulohet brenda 2 orëve → penalitet 40%.
     * 
     * @param {number} id
     * @param {string} status - 'pending' | 'confirmed' | 'canceled'
     */
    async perditesoStatusin(id, status) {
        // Validim 1: Statusi duhet të jetë i njohur
        const statuset = ['pending', 'confirmed', 'canceled'];
        if (!statuset.includes(status)) {
            throw new Error(`Statusi "${status}" nuk është i vlefshëm. Lejohen: ${statuset.join(', ')}.`);
        }

        // Validim 2: Ndeshja duhet të ekzistojë
        const existing = await this.repo.GetById(id);
        if (!existing) {
            throw new Error(`Ndeshja me ID ${id} nuk u gjet.`);
        }

        // Logjika e anulimit me penalitet (US #5 dhe #6)
        if (status === 'canceled') {
            const taniMs   = new Date().getTime();
            const fillimMs = new Date(existing.start_time).getTime();
            const diferencaOrë = (fillimMs - taniMs) / (1000 * 60 * 60);

            if (diferencaOrë < 2) {
                // Anulim i vonuar — penalitet 40% aplikohet nga DB (cancellation_status)
                existing.cancellationNote = 'PENALITET 40% — anulim brenda 2 orëve (US #6)';
            } else {
                existing.cancellationNote = 'Pa penalitet — anulim mbi 2 orë para (US #5)';
            }
        }

        const updated = await this.repo.Update(id, status);
        return {
            ...updated,
            cancellationNote: existing.cancellationNote || null
        };
    }

    // ─── Bonus: Delete ────────────────────────────────────────────────────────
    /**
     * Fshin një ndeshje sipas ID-së.
     * @param {number} id
     */
    async fshiNdeshjen(id) {
        if (!id) throw new Error('ID është e detyrueshme.');

        const existing = await this.repo.GetById(id);
        if (!existing) {
            throw new Error(`Ndeshja me ID ${id} nuk ekziston.`);
        }

        return await this.repo.Delete(id);
    }

    // ─── Smart Split Calculator (US #2) ──────────────────────────────────────
    /**
     * Llogarit çmimin për lojtar.
     * Ekspozohet si metodë publike për UI (p.sh. preview para pagesës).
     * @param {number} totalPrice - Çmimi total i fushës (p.sh. 60€)
     * @param {number} playerCount - Numri i lojtarëve (default: 12)
     */
    llogaritSmartSplit(totalPrice, playerCount = 12) {
        if (!totalPrice || totalPrice <= 0) throw new Error('Çmimi duhet të jetë > 0.');
        if (playerCount <= 0) throw new Error('Numri i lojtarëve duhet të jetë > 0.');
        return parseFloat((totalPrice / playerCount).toFixed(2));
    }
}

module.exports = MatchService;