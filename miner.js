const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');
const Block = require('./blockchain/block');
const cryptoHash = require('./utilities/crypto-hash.js')
const { Int32ToBytes, Int64ToBytes, ByteToInt, HexToByteArray, ByteArrayToHex, HashToNumber } = require('./utilities/index');
const now = require('nano-time');
const util = require('util');

console.log('Started Miner');
const REWARD = 100000n;
const TARGET = '0000004000000000000000000000000000000000000000000000000000000000';

var transactions, target, parentHash, unusedOutputs, startFindingNonce;
transactions = workerData.transactions;
target =  TARGET;
parentHash = workerData.parentHash;
unusedOutputs = workerData.unusedOutputs;
startFindingNonce = workerData.startFindingNonce;

// FINDING THE VALID TRANSACTIONS
var minerFees = 0n;
var tempOutputsArray = {};
var transactionsToMine = [];

//116 for block Header
// Each transaction will take data.length + 4 bytes 

//Total limit is 1000000 + 116
//Will stop considering new transactions to mine if length exceeds 998000

const LIMIT = 998000;
var size = 0;

console.log('Finding transactions to mine');
for(let j=0; j<transactions.length; j++) {
    var obj = Transaction.isValidTransaction({transaction:transactions[j], unusedOutputs, tempOutputsArray});
    size += transactions[j].data.length + 4;
    if(obj.isValid && size<998000) {
        transactionsToMine.push(transactions[j]);
        minerFees += obj.transactionFees;
    }
}
console.log('Found transactions to mine');

/********** ADD COINBASE TRANSASCTION **********/
const myPublicKey = fs.readFileSync('./Keys/myPublicKey.pem', 'utf-8');
var output = new Output({coins:minerFees+REWARD,
                        publicKey:myPublicKey, 
                        publicKeyLength:myPublicKey.length});
var outputs = [];
outputs.push(output);
var coinbaseTransaction = new Transaction({inputs:[], outputs:outputs});
transactionsToMine.splice(0, 0, coinbaseTransaction);

//console.log(util.inspect(transactionsToMine, true, null, true));

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

    buf = Buffer.from(transactionsToMine[j].data);
    list = [buffer, buf];
    buffer = Buffer.concat(list);
}
var transactionByteArray = buffer;
var hashedBlockData = cryptoHash(buffer);

var blockHeader = Buffer.alloc(116);
var pos = 0;

var files = fs.readdirSync('./blocks');
var index = files.length; 
buf = Buffer.from(Int32ToBytes(index));
blockHeader.write(buf.toString('hex'), pos, 4, 'hex');
pos += 4;

buf = Buffer.from(HexToByteArray(parentHash));
blockHeader.write(buf.toString('hex'), pos, 32, 'hex');
pos += 32;

blockHeader.write(hashedBlockData.toString('hex'), pos, 32, 'hex');
pos += 32;

buf = Buffer.from(HexToByteArray(target));
blockHeader.write(buf.toString('hex'), pos, 32, 'hex');
pos += 32;

// FIND NONCE
const targetValue = HashToNumber(target);
if(startFindingNonce && transactionsToMine.length>1) {
    console.log('Finding Nonce')
    var header = mineBlock({blockHeader, targetValue});
    var list = [header, transactionByteArray];
    var blockBinaryData = Buffer.concat(list);
    let block = new Block({blockBinaryData});
    parentPort.postMessage({minedBlock : blockBinaryData});
}
else if(startFindingNonce){
    console.log('Can start finding nonce but have no transactions');
}
else {
    console.log('No thumbs up for finding nonce');
}

//console.log(util.inspect(block, false, null, true));


function mineBlock({blockHeader, targetValue}) {
    var nonce = 0n;
    var timestamp;
    var buf;
    do {
        nonce += 1n;

        timestamp = BigInt(now());
        buf = Buffer.from(Int64ToBytes(timestamp));
        blockHeader.write(buf.toString('hex'), 100, 8, 'hex');

        buf = Buffer.from(Int64ToBytes(nonce));
        blockHeader.write(buf.toString('hex'), 108, 8, 'hex');

        var hash = cryptoHash(blockHeader);
        var hashNum = HashToNumber(hash);

        if(nonce%10000n == 0n) {
           console.log(nonce, hash);
        }

    } while(hashNum >= targetValue);
    console.log('Found ', nonce);
    return blockHeader;
}
