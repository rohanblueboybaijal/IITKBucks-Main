const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');
const Block = require('./blockchain/block');
const { Int32ToBytes, Int64ToBytes, HexToByteArray, ByteToInt, ByteArrayToHex, HashToNumber } = require('util/index');
const crptoHash = require('./util/crypto-hash')
const { isValidBlock } = require('./blockchain/block');
const { isValidTransaction } = require('./transaction/transaction');
const now = require('nano-time');
const cryptoHash = require('./util/crypto-hash');
const { worker } = require('cluster');

var transactions, target, parentHash, unusedOutputs;
transactions = workerData.transactions;
target =  workerData.target;
parentHash = workerData.parentHash;
unusedOutputs = workerData.unusedOutputs;

parentPort.on('message', (newData) => {
    transactions = newData.transactions;
    target = newData.target;
    parentHash = newData.parentHash;
    unusedOutputs = newData.unusedOutputs;
})

// FINDING THE VALID TRANSACTIONS
var minerFees = 0;
var tempOutputsArray = new Map();
var transactionsToMine = [];

for(var temp of transactions) {
    var obj = isValidTransaction({transaction:temp, unusedOutputs, tempOutputsArray});
    if(obj.isValid) {
        transactionsToMine.push(temp);
        minerFees += obj.transactionFees;
    }
}

// ADDING COINBASE TRANSASCTION 
const myPublicKey = fs.readFileSync('rohan.pem', 'utf-8');
var output = new Output({coins:minerFees+REWARD,
                        publicKey:myPublicKey, 
                        publicKeyLength:myPublicKey.length});
var outputs = [];
outputs.push(output);
var coinbaseTransaction = new Transaction({inputs:[], outputs:outputs});
transactionsToMine.splice(0, 0, coinbaseTransaction);

//PREPARING TRANSACTION BYTE ARRAY AND BLOCK HEADER FOR MINING

var buffer = Buffer.alloc(0);
var buf;

var numTransactions = transactionsToMine.length;
buf = Buffer.from(Int32ToBytes(numTransactions));
list = [buffer, buf];
buffer = Buffer.concat(list);

for(let j=0; j<numTransactions; j++) {
    var transactionSize = transactionsToMine[j].data.length;
    buf = Buffer.from(Int32ToBytes(transactionSize));
    list = [buffer, buf];
    buffer = Buffer.concat(list);
}
var transactionByteArray = buffer;
var hashedBlockData = crptoHash(buffer);

var blockHeader = Buffer.alloc(116);
var pos = 0;

var files = fs.readdirSync('./blocks');
var index = files.length + 1; // Clarify block indexing. Is index 0 GENESIS?
buf = Buffer.from(Int32ToBytes(index));
blockHeader.write(buf.toString('hex'), pos, 'hex');
pos += 4;

buf = Buffer.from(HexToByteArray(parentHash));
blockHeader.write(buf.toString('hex'), pos, 'hex');
pos += 32;

blockHeader.write(transactionByteArray.toString('hex'), pos, 'hex');
pos += 32;

buf = Buffer.from(HexToByteArray(target));
blockHeader.write(buf.toString('hex'), pos, 'hex');
pos += 32;

// FIND NONCE
const targetValue = HashToNumber(target);
var header = mineBlock({blockHeader, targetValue});
var hash = cryptoHash(blockHeader);
var buf = Buffer.from(HexToByteArray(hash));

blockHeader.write(hash.toString('hex'), 36, 'hex');
var list = [blockHeader, transactionByteArray];
var blockBinaryData = Buffer.concat(list);

//var minedBlock = new Block({blockBinaryData:blockBinaryData});

parentPort.postMessage({minedBlock : blockBinaryData});


function mineBlock({blockHeader, targetValue}) {
    var nonce = 0n;
    var timestamp;
    var buf;
    do {
        nonce += 1n;

        timestamp = BigInt(now());
        buf = Buffer.from(Int64ToBytes(timestamp));
        blockHeader.write(buf.toString('hex'), 100, 'hex');

        buf = Buffer.from(Int64ToBytes(nonce));
        blockHeader.write(buf.toString('hex'), 108, 'hex');

        var hash = cryptoHash(blockHeader);
        var hashNum = HashToNumber(hash);

    } while(hashNum >= targetValue);

    return blockHeader;
}
