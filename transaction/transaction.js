const Input = require('./input');
const Output = require('./output');

const cryptoHash = require('../util/crypto-hash');
const { Int32ToBytes, Int64ToBytes, ByteToInt, HexToByteArray, ByteArrayToHex } = require('../util/index');

class Transaction {
    constructor({ inputs, outputs, data }) {
        if(!data) {
            this.inputs = inputs;
            this.outputs = outputs;

            var buffer = this.transactionToByteArray();
            this.data = Uint8Array.from(buffer);
            this.id = cryptoHash(this.data);
        }
        else {
            this.data = data;
            const {inputs, outputs} = this.byteArrayToTransaction();
            this.inputs = inputs;
            this.outputs = outputs;
            this.id = cryptoHash(this.data);
        }
    }

    transactionToByteArray() {
        var buf1;
        var buffer = Buffer.alloc(0);
        var list = [buffer, buf1];
        const inputs = this.inputs;
        const outputs = this.outputs;

        const inputLength = inputs.length;
        buf1 = Buffer.from( Int32ToBytes(inputLength) );
        list = [buffer, buf1];
        buffer = Buffer.concat(list);

        for(let i=0; i<inputLength; i++) {

            buf1 = Buffer.from(HexToByteArray(inputs[i].id));
            list = [buffer, buf1];
            buffer = Buffer.concat(list);

            buf1 = Buffer.from(Int32ToBytes(inputs[i].index));
            list = [buffer, buf1];
            buffer = Buffer.concat(list);

            buf1 = Buffer.from(Int32ToBytes(inputs[i].signatureLength));
            list = [buffer, buf1];
            buffer = Buffer.concat(list);

            buf1 = Buffer.from(HexToByteArray(inputs[i].signature));
            list = [buffer, buf1];
            buffer = Buffer.concat(list);
        }

        const outputLength = outputs.length;
        buf1 = Buffer.from(Int32ToBytes(outputLength));
        list = [buffer, buf1];
        buffer = Buffer.concat(list);

        for(let i=0; i<outputLength; i++) {

            buf1 = Buffer.from(Int64ToBytes(BigInt(outputs[i].coins)));
            list = [buffer, buf1];
            buffer = Buffer.concat(list);

            buf1 = Buffer.from(Int32ToBytes(outputs[i].publicKeyLength));
            list = [buffer, buf1];
            buffer = Buffer.concat(list);

            buf1 = Buffer.from(outputs[i].publicKey);
            list = [buffer,buf1];
            buffer = Buffer.concat(list);
        }

        return buffer;
    }

    byteArrayToTransaction() {
        const buffer = Buffer.from(this.data);
        var i=0;
        var buf = buffer.slice(i, i+4);
        i=i+4;
        buf = Uint8Array.from(buf);
        var numInput = ByteToInt(buf);
        var inputs = [];

        for(let j=0; j<numInput; j++) {
            console.log(i);

            buf = buffer.slice(i, i+32);
            i = i+32;
            var id = ByteArrayToHex(buf);

            buf = buffer.slice(i, i+4);
            i = i+4;
            buf = Uint8Array.from(buf);
            var index = ByteToInt(buf);

            buf = buffer.slice(i, i+4);
            i = i+4;
            buf = Uint8Array.from(buf);
            var signatureLength = ByteToInt(buf);

            buf = buffer.slice(i, i + signatureLength);
            i = i + signatureLength;
            var signature = ByteArrayToHex(buf);

            var input = new Input({ id, index, signatureLength, signature });
            inputs.push(input);
        }

        buf = buffer.slice(i, i+4);
        i = i+4;
        buf = Uint8Array.from(buf);
        var numOutput = ByteToInt(buf);
        var outputs = [];

        for(let j=0; j<numOutput; j++) {
            console.log(i);

            buf = buffer.slice(i, i+8);
            i = i+8;
            buf = Uint8Array.from(buf);
            var coins = parseInt(ByteToInt(buf));

            buf = buffer.slice(i, i+4);
            i = i+4;
            buf = Uint8Array.from(buf);
            var publicKeyLength = ByteToInt(buf);

            buf = buffer.slice(i, i+publicKeyLength);
            i = i + publicKeyLength;
            var publicKey = buf.toString();

            var output = new Output({ coins, publicKeyLength, publicKey });
            outputs.push(output);
        }

        return {inputs, outputs};
    }
}

module.exports = Transaction;