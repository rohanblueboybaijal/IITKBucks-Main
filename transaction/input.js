class Input {
    constructor({ id, index, signatureLength, signature }) {
        this.id = id; //Transaction ID where the Output lies
        this.index = index; //Index of the  Output in the Transaction
        this.signatureLength = signatureLength;
        this.signature = signature;
    }
}

module.exports = Input;