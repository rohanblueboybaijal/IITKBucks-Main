const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');
const fs = require('fs');
const readlineSync = require('readline-sync');

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

var pendingTransactions = [];
try {
    const jsonString = fs.readFileSync('pending.json','utf8');
    if(jsonString) {
        var tempArray = JSON.parse(jsonString);
        for(let object of tempArray) {
            var temp = {};
            temp["inputs"] = object.inputs;
            temp["outputs"] = object.outputs;
            //console.log(temp);

            // var inputs = [];
            // for(let input of object.inputs) {
            //     var inputObj = new Input({id : input.id, index : input.index,
            //                         signature: input.signature,
            //                         signatureLength:input.signatureLength});
            //     inputs.push(inputObj);
            // }
            // var outputs = [];
            // for(let output of object.outputs) {
            //     var outputObj = new Output({ coins : output.coins,
            //                             publicKeyLength: output.publicKeyLength,
            //                             publicKey: output.publicKey});
            //     outputs.push(outputObj);
            // }
            // var transaction = new Transaction({ inputs, outputs, data:null });

            pendingTransactions.push(temp);
        }
    }
} catch(err) {
    console.log(err);
}

//console.log(pendingTransactions);
var transaction;
if(inputs.length && outputs.length) {
    transaction = new Transaction({ inputs:inputs, outputs:outputs, data:null });
    var temp = {};
temp["inputs"] = transaction.inputs;
temp["outputs"] = transaction.outputs;

pendingTransactions.push(temp);
}

var jsonString = JSON.stringify(pendingTransactions);
console.log(jsonString);
fs.writeFileSync('pending.json', jsonString);