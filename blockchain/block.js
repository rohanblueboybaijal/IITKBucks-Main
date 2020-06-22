const Transaction = require('../transaction/transaction');
const Input = require('../transaction/input');
const Output = require('../transaction/output');
const cryptoHash = require('../util/crypto-hash');
const { Int32ToBytes, HexToByteArray, ByteToInt, ByteArrayToHex } = require('../util');

class Block {
    constructor({ index, parentHash, /*hash,*/ target, /*timestamp, nonce,*/ transactions, blockBinaryData }) {
            this.index = index;
            this.parentHash = parentHash;
            this.hash = null;
            this.target = target;
            this.timestamp = null;
            this.nonce = null;
            this.transactions = transactions;
            this.blockBinaryData = blockBinaryData;

            if(blockBinaryData) {
                this.byteArrayToBlock();
            }

    }

    blockToByteArray() {
        var buffer = Buffer.alloc(0);
        var buf;
        var list = [buffer, buf];

        buf = Buffer.from(Int32ToBytes(this.index));
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        buf = Buffer.from(HexToByteArray(this.parentHash));
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        buf = Buffer.from(HexToByteArray(this.hash));
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        buf = Buffer.from(HexToByteArray(this.target));
        list = [buffer, buf];
        buffer = Buffer.concat(list);
    }

    byteArrayToBlock() {
        var buffer = Buffer.from(this.blockBinaryData);
        var buf;
        var i=0;

        buf = buffer.slice(i, i+4);
        i = i+4;
        buf = Uint8Array.from(buf);
        this.index = ByteToInt(buf);

        buf = buffer.slice(i, i+32);
        i = i+32;
        this.parentHash = ByteArrayToHex(buf);

        buf = buffer.slice(i, i+32);
        i = i+32;
        this.hash = ByteArrayToHex(buf);

        buf = buffer.slice(i ,i+32);
        i = i+32;
        this.target = ByteArrayToHex(buf);

        buf = buffer.slice(i, i+8);
        i = i+8;
        this.timestamp = ByteToInt(buf);

        buf = buffer.slice(i, i+8);
        i = i+8;
        this.nonce = ByteToInt(buf);

        buf = buffer.slice(i, i+4);
        i = i+4;
        const numTransactions = ByteToInt(buf);
        var transactions = [];

        for(let j=0; j<numTransactions; j++) {
            buf = buffer.slice(i, i+4);
            i = i+4;
            var size = ByteToInt(buf);

            buf = buffer.slice(i, i+size);
            i = i+size;
            var transaction = new Transaction({inputs:null, outputs:null, data:buf});
            transactions.push(transaction);
        }

        this.data = transactions;
    }

}

module.exports = Block;