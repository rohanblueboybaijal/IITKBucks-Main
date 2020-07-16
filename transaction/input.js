class Input {
    constructor({ transactionId, index, signatureLength, signature }) {
        this.transactionId = transactionId; //Transaction ID where the Output lies
        this.index = index; //Index of the  Output in the Transaction
        this.signatureLength = signatureLength;
        this.signature = signature;
    }
}

module.exports = Input;