class MatchService {
    constructor(repository) {
        this.repo = repository; // Këtu injektohet FileRepository
    }

    // Merr të gjitha ndeshjet dhe llogarit totalin e borxhit (Unpaid)
    getInventorySummary() {
        try {
            const matches = this.repo.getAll();
            const totalAmount = matches.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
            const unpaidMatches = matches.filter(m => m.paid === 'false' || m.paid === false);
            
            return {
                count: matches.length,
                totalValue: totalAmount,
                unpaidCount: unpaidMatches.length
            };
        } catch (error) {
            console.error("Gabim në MatchService:", error.message);
            return null;
        }
    }

    // Regjistron një ndeshje të re
    createNewMatch(name, amount) {
        const matches = this.repo.getAll();
        const newId = matches.length > 0 ? Math.max(...matches.map(m => parseInt(m.id))) + 1 : 1;
        
        const newMatch = {
            id: newId,
            name: name,
            amount: amount,
            paid: false
        };

        return this.repo.add(newMatch);
    }

    // Ndryshon statusin e pagesës (Psh. kur paguhet termini)
    markAsPaid(id) {
        // Këtu mund të shtohet logjika për update në CSV nëse dëshiron më vonë
        console.log(`Duke procesuar pagesën për terminin me ID: ${id}`);
    }
}

module.exports = MatchService;