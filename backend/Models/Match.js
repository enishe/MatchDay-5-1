class Match {
    constructor(id, name, terrain, amount, hasRental, status) {
        this.id = id;
        this.name = name;
        this.terrain = terrain; // 'Sallë' ose 'Bar'
        this.amount = amount;
        this.hasRental = hasRental; // true/false
        this.status = status; // 'Paid' ose 'Pending'
    }
}
module.exports = Match;