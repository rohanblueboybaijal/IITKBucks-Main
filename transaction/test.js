const Transaction = require('./transaction');
const Output = require('./output');
const Input = require('./input');
const fs = require('fs');
const readlineSync = require('readline-sync');
const { Int32ToBytes, Int64ToBytes, ByteToInt, HexToByteArray, ByteArrayToHex } = require('../util/index');

var inputs = [];
var outputs = [];

var numInput = readlineSync.question('Enter the number of inputs') - 0;

var id, index, signature;
for(let i=0; i < numInput; i++) {
    id = readlineSync.question('Enter the id ');
    index = readlineSync.question('Enter the index ') - 0;
    signature = readlineSync.question('Enter the signature ');
    input = new Input({
        id: id,
        index: index,
        signature: signature,
        signatureLength: Math.floor(signature.length/2)
    });
    inputs.push(input);
}

var numOutput = readlineSync.question('Enter the number  of outputs') - 0;

var coins, publicKey, publicKeyPath;
for(let i=0; i< numOutput; i++) {
    coins = readlineSync.question('Enter the number of coins ') - 0;
    publicKeyPath = readlineSync.question('Enter publicKeyPath ');
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
   //publicKey = readlineSync.question('Enter the public Key ');
    output = new Output({
        coins: coins,
        publicKeyLength: publicKey.length,
        publicKey: publicKey
    });
    outputs.push(output);
}

const data = fs.readFileSync('./010.dat');
console.log(data);

var t1 = new Transaction({data:data});
var t2 = new Transaction({inputs:null, outputs:null, data:data});

console.log(JSON.stringify(t1)==JSON.stringify(t2));