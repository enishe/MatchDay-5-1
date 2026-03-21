class MatchService {
    // Kjo kllapë këtu hap klasën

    generateSmartSplit(players) {
        // Kontrollojmë nëse players ekziston dhe është array
        if (!Array.isArray(players) || players.length === 0) {
            return { teamA: [], teamB: [] };
        }

        // Krijojmë një kopje dhe e rendisim (b.skillLevel - a.skillLevel)
        // Sigurohu që emri 'skillLevel' përputhet me atë që ke në model
        const sorted = [...players].sort((a, b) => {
            return (Number(b.skillLevel) || 0) - (Number(a.skillLevel) || 0);
        });

        let teamA = [];
        let teamB = [];
        let sumA = 0;
        let sumB = 0;

        sorted.forEach(p => {
            const pSkill = Number(p.skillLevel) || 0;
            
            if (sumA <= sumB) {
                teamA.push(p);
                sumA += pSkill;
            } else {
                teamB.push(p);
                sumB += pSkill;
            }
        });

        return { 
            teamA, 
            teamB, 
            difference: Math.abs(sumA - sumB) 
        };
    } // Kjo mbyll funksionin

} // Kjo mbyll klasën

export default new MatchService();