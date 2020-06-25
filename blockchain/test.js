const Block = require('./block');
const Transaction = require('../transaction/transaction');
const fs = require('fs');
const { Int32ToBytes, HexToByteArray, ByteToInt, ByteArrayToHex, getIndexOf } = require('../util');
const { json } = require('express');
const Output = require('../transaction/output');

var data = fs.readFileSync('../015.dat');
var i = 0;

var buffer = Buffer.from(data);
var buf;

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

var unusedOutputs = new Map();
var transaction = transactions[0];
var outputs = transaction.outputs;

for(let i=0; i<outputs.length; i++) {
    var tup = JSON.stringify([transaction.id, i]);
    unusedOutputs.set(tup, outputs[i]);
}


var jsonText = JSON.stringify(Array.from(unusedOutputs.entries()));
//console.log(jsonText);

var map = new Map(JSON.parse(jsonText));
console.log(map);
for([key, val] of map) {
    var tempVal = new Output({ 
                        coins : val.coins,
                        publicKeyLength : val.publicKeyLength,
                        publicKey : val.publicKey
                    });
    map.set(key, tempVal);
}
console.log(map);

var temp = new Transaction({data:transactions[0].data});

var index = getIndexOf({object:temp, array:transactions});
console.log(index);