// backend/src/services/MatchService.js

class MatchService {
    constructor(repository) {
        this.repo = repository;
    }

    // User Story #6: Penaliteti 40%
    calculateRefund(matchId) {
        const match = this.repo.GetById(matchId);
        const now = new Date();
        const matchTime = new Date(match.startTime);
        
        // Diferenca në milisekonda e kthyer në minuta
        const diffMinutes = (matchTime - now) / (1000 * 60);

        if (diffMinutes >= 120) {
            return match.totalCost; // 100% rimbursim
        } else {
            // 40% penalitet vetëm mbi fushën (User Story #6)
            return match.totalCost * 0.60; 
        }
    }
}