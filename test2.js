const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');
const fs = require('fs');

const pendingString = fs.readFileSync('./pending.json', 'utf8');
var pendingTransactions = [];
if(pendingString) {
    var tempArray = JSON.parse(pendingString);
    var i=0;
    for(let object of tempArray) {
        var temp = {};
        temp["inputs"] = object.inputs;
        temp["outputs"] = object.outputs;
        pendingTransactions.push(temp);
        console.log(pendingTransactions[i++]);
    }
}
