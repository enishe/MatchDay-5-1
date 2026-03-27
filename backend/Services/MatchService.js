class MatchService {
    constructor(repo) {
        this.repo = repo;
    }

    async listoTeGjitha() {
        return await this.repo.GetAll();
    }

    // ... metodat e tjera (shtoNdeshje, etj.)
}

// KJO ËSHTË PJESA QË DUHET TA SHTOSH:
module.exports = MatchService;