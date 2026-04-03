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

    // ─── Listo me filtrim ─────────────────────────────────────────────────────
    async listoTeGjitha(filters = {}) {
        return await this.repo.GetAll(filters);
    }

    // ─── Gjej sipas ID ────────────────────────────────────────────────────────
    async gjejSipasId(id) {
        if (!id) throw new Error('ID është e detyrueshme.');
        const match = await this.repo.GetById(id);
        if (!match) throw new Error(`Ndeshja me ID ${id} nuk u gjet.`);
        return match;
    }

    // ─── Shto me Validim ──────────────────────────────────────────────────────
    async shtoNdeshje(matchData) {
        if (!matchData.fieldId)
            throw new Error('ID e fushës është e detyrueshme (nuk mund të jetë bosh).');
        if (!matchData.totalPrice || matchData.totalPrice <= 0)
            throw new Error('Çmimi total duhet të jetë mbi 0€.');
        if (new Date(matchData.startTime) <= new Date())
            throw new Error('Koha e fillimit duhet të jetë në të ardhmen.');
        if (new Date(matchData.endTime) <= new Date(matchData.startTime))
            throw new Error('Koha e mbarimit duhet të jetë pas kohës së fillimit.');
        return await this.repo.Add(matchData);
    }

    // ─── Update me penalitet ──────────────────────────────────────────────────
    async perditesoStatusin(id, status) {
        const statuset = ['pending', 'confirmed', 'canceled'];
        if (!statuset.includes(status))
            throw new Error(`Statusi "${status}" nuk është i vlefshëm. Lejohen: ${statuset.join(', ')}.`);

        const existing = await this.repo.GetById(id);
        if (!existing)
            throw new Error(`Ndeshja me ID ${id} nuk u gjet.`);

        if (status === 'canceled') {
            const diferencaOrë = (new Date(existing.start_time) - new Date()) / (1000 * 60 * 60);
            existing.cancellationNote = diferencaOrë < 2
                ? 'PENALITET 40% — anulim brenda 2 orëve (US #6)'
                : 'Pa penalitet — anulim mbi 2 orë para (US #5)';
        }

        const updated = await this.repo.Update(id, status);
        return { ...updated, cancellationNote: existing.cancellationNote || null };
    }

    // ─── Delete ───────────────────────────────────────────────────────────────
    async fshiNdeshjen(id) {
        if (!id) throw new Error('ID është e detyrueshme.');
        const existing = await this.repo.GetById(id);
        if (!existing) throw new Error(`Ndeshja me ID ${id} nuk ekziston.`);
        return await this.repo.Delete(id);
    }

    // ─── Smart Split Calculator ───────────────────────────────────────────────
    llogaritSmartSplit(totalPrice, playerCount = 12) {
        if (!totalPrice || totalPrice <= 0) throw new Error('Çmimi duhet të jetë > 0.');
        if (playerCount <= 0) throw new Error('Numri i lojtarëve duhet të jetë > 0.');
        return parseFloat((totalPrice / playerCount).toFixed(2));
    }

    // ─── SPRINT 2: Statistikat e Ndeshjeve ───────────────────────────────────
    /**
     * Llogarit statistikat mbi të gjitha ndeshjet.
     * Logjikë biznesi — qëndron në Service, jo në UI dhe jo në Repository.
     *
     * @param {Object} filters - filtrim opsional (p.sh. { status: 'confirmed' })
     * @returns {Object} { total, mesatare, max, min, totali_cmimit, pending, confirmed, canceled }
     */
    async llogaritStatistikat(filters = {}) {
        const matches = await this.repo.GetAll(filters);

        // Rast kufitar — listë bosh (Unit Test 2)
        if (!matches || matches.length === 0) {
            return {
                total:         0,
                mesatare:      0,
                max:           0,
                min:           0,
                totali_cmimit: 0,
                pending:       0,
                confirmed:     0,
                canceled:      0,
            };
        }

        // Mbështet si total_price (PostgreSQL) ashtu edhe amount (CSV/FileRepository)
        const cmimet = matches.map(m => parseFloat(m.total_price || m.amount || 0));
        const shuma  = cmimet.reduce((a, b) => a + b, 0);

        return {
            total:         matches.length,
            mesatare:      parseFloat((shuma / cmimet.length).toFixed(2)),
            max:           Math.max(...cmimet),
            min:           Math.min(...cmimet),
            totali_cmimit: parseFloat(shuma.toFixed(2)),
            // Mbështet statuset e SQL (lowercase) dhe CSV (Paid/Pending)
            pending:   matches.filter(m => m.status === 'pending'   || m.status === 'Pending').length,
            confirmed: matches.filter(m => m.status === 'confirmed' || m.status === 'Paid').length,
            canceled:  matches.filter(m => m.status === 'canceled'  || m.status === 'Canceled').length,
        };
    }
}

module.exports = MatchService;