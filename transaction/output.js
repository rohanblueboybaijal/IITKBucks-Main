class Output {
    constructor({ coins, publicKeyLength, publicKey }) {
        this.coins = coins.toString();
        this.publicKeyLength = publicKeyLength;
        this.publicKey = publicKey;
    }

}

module.exports = Output;