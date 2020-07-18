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

parentPort.on('message', (message) => {

    console.log('Inside the miner after message');
    const targetValue = HashToNumber(TARGET);
    var blockHeader = Buffer.from(message.blockHeader);
    var transactionByteArray = Buffer.from(message.transactionByteArray);
    var header = findNonce({blockHeader, targetValue});
    var list = [header, transactionByteArray];
    var blockBinaryData = Buffer.concat(list);
    console.log(blockHeader.length);
    parentPort.postMessage({minedBlock : blockBinaryData});

})


function findNonce({blockHeader, targetValue}) {
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

    } while(hashNum >= targetValue);
    var hash = cryptoHash(blockHeader);
    return blockHeader;
}
