class Output {
    constructor({ coins, publicKeyLength, publicKey }) {
        this.coins = coins;
        this.publicKeyLength = publicKeyLength;
        this.publicKey = publicKey;
    }

    outputToByteArray() {
        var buf;
        var buffer = Buffer.alloc(0);
        var list = [buffer, buf];

        buf = Buffer.from(Int64ToBytes(BigInt(this.coins)));
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        buf = Buffer.from(Int32ToBytes(this.publicKeyLength));
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        buf = Buffer.from(this.publicKey);
        list = [buffer,buf];
        buffer = Buffer.concat(list);

        return buffer;
    }
}

module.exports = Output;