const Transaction = require('../transaction/transaction');
const Input = require('../transaction/input');
const Output = require('../transaction/output');
const cryptoHash = require('../utilities/crypto-hash');
const { Int32ToBytes, Int64ToBytes, HexToByteArray, ByteToInt, ByteArrayToHex, HashToNumber } = require('../utilities');
const TARGET = '0000004000000000000000000000000000000000000000000000000000000000';

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

        buf = Buffer.from(Int64ToBytes(BigInt(this.timestamp)));
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        buf = Buffer.from(Int64ToBytes(BigInt(this.nonce)));
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        const numTransactions = this.transactions.length;
        buf = Buffer.from(Int32ToBytes(numTransactions));
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        for(let j=0; j<numTransactions; j++) {
            buf = Buffer.from(Int32ToBytes(this.transactions[j].data.length));
            list = [buffer, buf];
            buffer = Buffer.concat(list);

            buf = this.transactions[j].data;
            list = [buffer, buf];
            buffer = Buffer.concat(list);
        }

        this.blockBinaryData = buffer;

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

        this.transactions = transactions;
    }

    static isValidBlock({block, unusedOutputs, tempOutputsArray, parentHash}) {
        var minerFees = 0n;
        if(block.parentHash!=parentHash) {
            console.log(`CHECK BLOCK : ${block.index} parentHash does not match`);
            return false;
        }

        // CHECK THE BLOCK HEADER AND VALID HASH 
        var buffer = Buffer.alloc(0);
        var buf, i=0;
        var list = [buffer, buf];

        //index
        buf = block.blockBinaryData.slice(i, i+4);
        i+=4;
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        //parentHash
        buf = block.blockBinaryData.slice(i, i+32);
        i+=32;
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        // 116 bytes are the block header
        const size = block.blockBinaryData.length;
        const blockData = block.blockBinaryData.slice(116, size);
        const bodyHash = cryptoHash(blockData);
        if(block.hash!=bodyHash) {
            console.log(`CHECK BLOCK : ${block.index} bodyHash does not match`);
            return false;
        }
        buf = Buffer.from(HexToByteArray(bodyHash));
        i+=32;
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        //target
        buf = block.blockBinaryData.slice(i, i+32);
        i+=32;
        list = [buffer, buf];
        buffer = Buffer.concat(list);
        const targetValue = HashToNumber(block.target);

        //timestamp
        buf = block.blockBinaryData.slice(i, i+8);
        i+=8;
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        //nonce 
        buf = block.blockBinaryData.slice(i, i+8);
        i+=8;
        list = [buffer, buf];
        buffer = Buffer.concat(list);

        const hash = cryptoHash(buffer);
        const hashValue = HashToNumber(hash);

        const actualTargetValue = HashToNumber(TARGET);
        if(actualTargetValue != targetValue ) {
            console.log(`BLOCK CHECK : ${block.index} Wrong target`);
            return false;
        }
        
        //if(hash != block.hash) return false; hash is the BODY HASH!!
        if(hashValue >= targetValue) {
            //console.log(block.index, 'hash is not below target',hash, hashValue, block.target);
            console.log(`BLOCK CHECK : ${block.index} : Big Hash : ${hash}`)
            return false;
        }

        //CHECK THE TRANSACTIONS 
        const numTransactions = block.transactions.length;
        for(let j=0; j<numTransactions; j++) {
            if(j==0) {
                // Coinbase transaction is verified in another way
                continue;
            }
            var obj = Transaction.isValidTransaction({
                            transaction : block.transactions[j],
                            unusedOutputs : unusedOutputs,
                            tempOutputsArray : tempOutputsArray
                        });
            if(!obj.isValid) {
                console.log(`BLOCK CHECK : ${block.index} : transaction ${j} not valid`);
                return false;
            }
            else {
                minerFees += obj.transactionFees;
            }
        }

        if(BigInt(block.transactions[0].outputs[0].coins) > minerFees + 100000n) {
            console.log(`BLOCK CHECK : ${block.index} : miner Fees invalid`);
            return false;
        }
        
        return true;
    }
}

module.exports = Block;
