/**
 * Unit Tests — MatchService
 * Sprint 2 | MatchDay 5+1
 *
 * Ekzekuto: npm test (nga dosja backend)
 *
 * Këto teste verifikojnë logjikën e biznesit të MatchService
 * pa lidhje reale me databazën (Mock Repository).
 */

const MatchService = require('../Services/MatchService');

// ─── MOCK REPOSITORY ─────────────────────────────────────────────────────────
// Simulon SqlMatchRepository/FileRepository pa nevojë për DB reale.
// Kjo është esenca e Unit Testing — testojmë VETËM logjikën e Service.

function createMockRepo(matches = []) {
    return {
        GetAll:    async (filters = {}) => matches,
        GetById:   async (id) => matches.find(m => String(m.id) === String(id)) || null,
        Add:       async (data) => ({ id: 99, ...data }),
        Update:    async (id, status) => ({ id, status }),
        Delete:    async (id) => !!matches.find(m => String(m.id) === String(id)),
        Save:      async () => true,
    };
}

// ─── TEST 1: llogaritStatistikat — listë normale ──────────────────────────────
describe('llogaritStatistikat()', () => {

    test('Rast normal — llogarit saktë total, mesatare, max, min', async () => {
        const matches = [
            { id: 1, total_price: 60, status: 'confirmed' },
            { id: 2, total_price: 60, status: 'pending'   },
            { id: 3, total_price: 72, status: 'canceled'  },
        ];
        const service = new MatchService(createMockRepo(matches));
        const stats = await service.llogaritStatistikat();

        expect(stats.total).toBe(3);
        expect(stats.mesatare).toBe(64);        // (60+60+72)/3 = 64
        expect(stats.max).toBe(72);
        expect(stats.min).toBe(60);
        expect(stats.totali_cmimit).toBe(192);
        expect(stats.confirmed).toBe(1);
        expect(stats.pending).toBe(1);
        expect(stats.canceled).toBe(1);
    });

    // ─── TEST 2: llogaritStatistikat — listë bosh (Unit Test kritik) ─────────
    test('Listë bosh — kthen 0 për të gjitha vlerat, JO NaN', async () => {
        const service = new MatchService(createMockRepo([]));
        const stats = await service.llogaritStatistikat();

        expect(stats.total).toBe(0);
        expect(stats.mesatare).toBe(0);
        expect(stats.max).toBe(0);
        expect(stats.min).toBe(0);
        expect(stats.totali_cmimit).toBe(0);
        // Asnjë vlerë nuk duhet të jetë NaN
        Object.values(stats).forEach(val => {
            expect(isNaN(val)).toBe(false);
        });
    });

    // ─── TEST 3: Mbështet si total_price (SQL) ashtu edhe amount (CSV) ───────
    test('CSV format — lexon kolonën "amount" nëse mungon "total_price"', async () => {
        const matches = [
            { id: 1, amount: 60, status: 'Paid'    },
            { id: 2, amount: 60, status: 'Pending' },
        ];
        const service = new MatchService(createMockRepo(matches));
        const stats = await service.llogaritStatistikat();

        expect(stats.total).toBe(2);
        expect(stats.mesatare).toBe(60);
        expect(stats.confirmed).toBe(1);   // 'Paid' → confirmed
        expect(stats.pending).toBe(1);     // 'Pending' → pending
    });
});

// ─── TEST 4: shtoNdeshje — validimi i çmimit ─────────────────────────────────
describe('shtoNdeshje()', () => {

    test('Çmimi 0 — hedh gabim validimi', async () => {
        const service = new MatchService(createMockRepo());
        await expect(
            service.shtoNdeshje({ fieldId: 1, totalPrice: 0 })
        ).rejects.toThrow('Çmimi total duhet të jetë mbi 0€.');
    });

    test('Çmimi negativ — hedh gabim validimi', async () => {
        const service = new MatchService(createMockRepo());
        await expect(
            service.shtoNdeshje({ fieldId: 1, totalPrice: -10 })
        ).rejects.toThrow('Çmimi total duhet të jetë mbi 0€.');
    });

    test('FieldId bosh — hedh gabim validimi', async () => {
        const service = new MatchService(createMockRepo());
        await expect(
            service.shtoNdeshje({ totalPrice: 60 })
        ).rejects.toThrow('ID e fushës është e detyrueshme');
    });

    test('Të dhëna valide — shton me sukses', async () => {
        const service = new MatchService(createMockRepo());
        const result = await service.shtoNdeshje({
            fieldId:    1,
            totalPrice: 60,
            startTime:  new Date(Date.now() + 86400000).toISOString(), // nesër
            endTime:    new Date(Date.now() + 90000000).toISOString(),
        });
        expect(result).toBeDefined();
        expect(result.id).toBe(99);
    });
});

// ─── TEST 5: gjejSipasId — ID që nuk ekziston ────────────────────────────────
describe('gjejSipasId()', () => {

    test('ID ekzistuese — kthen ndeshjen', async () => {
        const matches = [{ id: 1, total_price: 60, status: 'confirmed' }];
        const service = new MatchService(createMockRepo(matches));
        const result = await service.gjejSipasId(1);
        expect(result.id).toBe(1);
    });

    test('ID që nuk ekziston — hedh gabim të qartë', async () => {
        const service = new MatchService(createMockRepo([]));
        await expect(
            service.gjejSipasId(9999)
        ).rejects.toThrow('Ndeshja me ID 9999 nuk u gjet.');
    });

    test('ID bosh — hedh gabim', async () => {
        const service = new MatchService(createMockRepo());
        await expect(
            service.gjejSipasId(null)
        ).rejects.toThrow('ID është e detyrueshme.');
    });
});

// ─── TEST 6: llogaritSmartSplit ───────────────────────────────────────────────
describe('llogaritSmartSplit()', () => {

    test('60€ / 12 lojtarë = 5.00€', () => {
        const service = new MatchService(createMockRepo());
        expect(service.llogaritSmartSplit(60)).toBe(5.00);
    });

    test('72€ / 12 lojtarë = 6.00€', () => {
        const service = new MatchService(createMockRepo());
        expect(service.llogaritSmartSplit(72)).toBe(6.00);
    });

    test('Çmimi 0 — hedh gabim', () => {
        const service = new MatchService(createMockRepo());
        expect(() => service.llogaritSmartSplit(0)).toThrow('Çmimi duhet të jetë > 0.');
    });
});

// ─── TEST 7: perditesoStatusin — statuse të pavlefshme ───────────────────────
describe('perditesoStatusin()', () => {

    test('Status i pavlefshëm — hedh gabim', async () => {
        const matches = [{ id: 1, total_price: 60, status: 'pending', start_time: new Date(Date.now() + 86400000) }];
        const service = new MatchService(createMockRepo(matches));
        await expect(
            service.perditesoStatusin(1, 'invalid_status')
        ).rejects.toThrow('nuk është i vlefshëm');
    });

    test('ID që nuk ekziston — hedh gabim', async () => {
        const service = new MatchService(createMockRepo([]));
        await expect(
            service.perditesoStatusin(999, 'confirmed')
        ).rejects.toThrow('nuk u gjet');
    });

    test('Anulim brenda 2 orëve — shton notën e penalitetit', async () => {
        const matches = [{
            id: 1,
            total_price: 60,
            status: 'confirmed',
            start_time: new Date(Date.now() + 30 * 60 * 1000), // 30 min nga tani
        }];
        const service = new MatchService(createMockRepo(matches));
        const result = await service.perditesoStatusin(1, 'canceled');
        expect(result.cancellationNote).toContain('PENALITET 40%');
    });
});