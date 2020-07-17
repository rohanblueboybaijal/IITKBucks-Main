const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');
const fs = require('fs');
const readlineSync = require('readline-sync');
const axios = require('axios');
const crypto = require('crypto');
const { Int32ToBytes, Int64ToBytes, HexToByteArray, ByteToInt, ByteArrayToHex, HashToNumber, signData } = require('./utilities');
const cryptoHash = require('./utilities/crypto-hash');
const e = require('express');

const URL = "https://iitkbucks.pclub.in";
const myURL = 'http://localhost:8000';

var aliasMapString = fs.readFileSync('./aliasMap.json', 'utf8');
var aliasMap = {};
if(aliasMapString) {
    aliasMap = JSON.parse(aliasMapString);
}

const TASKS = ["Check Balance", "Generate Keys", "Transfer Coins", "Add Alias"];
var task = readlineSync.keyInSelect(TASKS, 'Which task?');
// appears 1 indexed but returns (ans-1)

switch (task) {
    case 0:
        checkBalance();
        break;
    case 1:
        generateKeys();
        break;
    case 2:
        transferCoins();
        break;
    case 3:
        addAlias();
        break;
}

function checkBalance() {
    let options = ["Public Key", "Alias"];
    let ind = readlineSync.keyInSelect(options, 'Select the option that you want to provide:');
    var publicKey, alias, balance=0, unusedOutputs;

    if(ind === 0) {
        let publicKeyPath = readlineSync.question('Enter public key path : ');
        publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
        let obj = getUnusedOutputs({publicKey:publicKey, alias:undefined});
        // balance = obj.balance;
        // unusedOutputs = obj.unusedOutputs;
    }
    else {
        alias = readlineSync.question('Enter the alias : ');
        let obj = getUnusedOutputs({publicKey:undefined, alias:alias});
        // balance = obj.balance;
        // unusedOutputs = obj.unusedOutputs;
    }
}

function generateKeys() {
    crypto.generateKeyPair('rsa', {
        modulusLength : 2048,
        publicKeyEncoding : {
            type : 'spki',
            format : 'pem'
        },
        privateKeyEncoding : {
            type : 'pkcs8',
            format : 'pem',
        }
    }, (err, publicKey, privateKey) => {
        if(!err) {
            console.log("publicKey : ", publicKey.toString('hex'));
            console.log("privateKey : ", privateKey.toString('hex'));

            fs.writeFileSync('./Keys/public.pem', publicKey);
            fs.writeFileSync('./Keys/private.pem', privateKey);
        }
        else {
            console.log('KeyPair generation error : ', err );
        }
    });
}

function addAlias() {
    let alias = readlineSync.question('Enter the alias : ');
    let publickKeyPath = readlineSync.question('Enter the publicKey path');
    let publicKey = fs.readFileSync(publickKeyPath, 'utf-8');

    axios.post(URL + '/addAlias', {alias:alias, publicKey:publicKey})
    .then((res) => {
        console.log('alias request sent');
    })
    .catch((err) => {
        console.log('Error while sending alias request', err);
    });
}

// function transferCoins() {
//     let publicKeyPath = readlineSync.question('Enter your publicKey path : ');
//     let privateKeyPath = readlineSync.question('Enter your privateKey path : ');
//     let publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
//     let privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

//     let obj = getUnusedOutputs({publicKey:publicKey, alias:undefined});
//     console.log(obj);
//     let coinsSpent = 0n;
//     let inputs=[], outputs=[];

//     let numOutputs = Number(readlineSync.question('Enter the number of outputs : '));

//     for(let i=0; i<numOutputs; i++) {
//         let options = ['Public Key', 'Alias'];
//         let option = readlineSync.keyInSelect(options, 'Select the option : ');
//         let recipient;
//         if(option===0) {
//             let recipientKeyPath = readlineSync.question('Enter public Key path for recipient');
//             recipient = fs.readFileSync(recipientKeyPath, 'utf-8');
//         }
//         else {
//             let alias = readlineSync.question('Enter the alias for the recipient');
//             axios.post(URL + '/getPublicKey', {alias:alias})
//             .then((res) => {
//                 recipient = res.data.publicKey;
//                 console.log(recipient);
//             })
//             .catch((err) => {
//                 console.log('Could not retrieve publicKey ', err);
//                 return;
//             });
//         }
//         let coins = BigInt(readlineSync.question('Enter the number of coins : '));
//         coinsSpent += coins;
//         let output = new Output({coins:coins, publicKeyLength:recipient.length, publicKey:recipient});
//         outputs.push(output);
//     }

//     console.log(balance, coinsSpent);
//     let transactionFees = BigInt(readlineSync.question('Enter the Transaction Fees you want to leave : '));
//     coinsSpent += transactionFees;
//     if(coinsSpent>balance) {
//         console.log('Not enough Moneyz ');
//         return;
//     }
//     let remainder = balance - coinsSpent;
//     let returnOutput = new Output({coins:remainder,
//                                     publicKeyLength:publicKey.length, 
//                                     publicKey:publicKey });
//     outputs.push(returnOutput);
//     let outputByteData = Transaction.outputByteArray(outputs);
//     let outputHash = cryptoHash(outputByteData);

//     let dataToBeSigned = Buffer.alloc(68);
//     dataToBeSigned.write(outputHash.toString('hex'), 36, 'hex');
//     for(let i=0; i<unusedOutputs.length; i++) {
//         let transactionId = unusedOutputs[i].transactionId;
//         let index = unusedOutputs[i].index;

//         dataToBeSigned.write((HexToByteArray(transactionId)).toString('hex'), 0, 'hex');
//         dataToBeSigned.write((Int32ToBytes(index)).toString('hex'), 32, 'hex');
        
//         let signature = signData({message:dataToBeSigned, privateKey:privateKey});
//         let input = new Input({transactionId, index, signature, signatureLength:Math.froor(signature.length/2)});
//         inputs.push(input);
//     }

//     let transaction = new Transaction({inputs, outputs});
//     let pendingTransactionsString = fs.readFileSync('./pending.json');
//     let pendingTransactions = [];
//     if(pendingTransactionsString) {
//         pendingTransactions = JSON.parse(pendingTransactionsString);
//     }
//     pendingTransactions.push(transaction);

//     let dataInputs = [];
//     for(let input of inputs) {
//         let obj = {transactionId:input.transactionId, index:input.index, signature:input.signature};
//         dataInputs.push(obj);
//     }
//     let dataOutputs = [];
//     for(let output of outputs) {
//         let obj = {amount:output.coins, recipient:output.publicKey};
//         dataOutputs.push(obj);
//     }

//     axios.post(URL + '/newTransaction', {"inputs":dataInputs, "outputs":dataOutputs})
//     .then((res) => {
//         console.log('Transaction sent succesfully');
//     })
//     .catch((err) => {
//         console.log('Error while sending the Transaction ', err);
//     })

//     fs.writeFileSync('./pending.json', JSON.stringify(pendingTransactions));
// }


function transferCoins() {
    let publicKeyPath = readlineSync.question('Enter your publicKey path : ');
    let privateKeyPath = readlineSync.question('Enter your privateKey path : ');
    let publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
    let privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

    axios.post(URL + '/getUnusedOutputs', {publicKey:publicKey})
    .then((res) => {
        var unusedOutputs = res.data.unusedOutputs;
        var balance = 0n;
        for(output of unusedOutputs) {
            balance += BigInt(output.amount);
        }
        getDetails(balance, unusedOutputs, publicKey, privateKey);
    })
    .catch((err) => {
        console.log('Error while getting unusedOutputs ', err);
    })
    
}

/********** UTILITY FUNCTIONS **********/

function getUnusedOutputs({publicKey, alias}) {
    var unusedOutputs, balance=0n;
    if(publicKey) {
        axios.post(URL + '/getUnusedOutputs', {publicKey : publicKey})
        .then((res) => {
            unusedOutputs = res.data.unusedOutputs;
            for(output of unusedOutputs) {
                balance += BigInt(output.amount);
            }
            console.log(balance);
            return {balance:balance, unusedOutputs:unusedOutputs};
        })  
        .catch((err) => {
            console.log(err);
        }); 
    }
    else {
        axios.post(URL + '/getUnusedOutputs', {alias : alias})
        .then((res) => {
            unusedOutputs = res.data.unusedOutputs;
            for(output of unusedOutputs) {
                balance += BigInt(output.amount);
            }
            console.log(balance);
            return {balance:balance, unusedOutputs:unusedOutputs};
        })  
        .catch((err) => {
            console.log(err);
        }); 
    }
}

function getDetails(balance, unusedOutputs, publicKey, privateKey) {
    let coinsSpent = 0n;
    let inputs=[], outputs=[];
    console.log(unusedOutputs);

    let numOutputs = Number(readlineSync.question('Enter the number of outputs : '));

    for(let i=0; i<numOutputs; i++) {
        let options = ['Public Key', 'Alias'];
        let option = readlineSync.keyInSelect(options, 'Select the option : ');
        if(option===0) {
            let recipientKeyPath = readlineSync.question('Enter public Key path for recipient');
            recipient = fs.readFileSync(recipientKeyPath, 'utf-8');
            let coins = BigInt(readlineSync.question('Enter the number of coins : '));
            coinsSpent += coins;
            let output = new Output({coins:coins, publicKeyLength:recipient.length, publicKey:recipient});
            outputs.push(output);

        }
        else {
            let alias = readlineSync.question('Enter the alias for the recipient');
            axios.post(URL + '/getPublicKey', {alias:alias})
            .then((res) => {
                recipient = res.data.publibalance = obj.balance;
                unusedOutputs = obj.unusedOutputs;cKey;
                let coins = BigInt(readlineSync.question('Enter the number of coins : '));
                coinsSpent += coins;
                let output = new Output({coins:coins, publicKeyLength:recipient.length, publicKey:recipient});
                outputs.push(output);
            })
            .catch((err) => {
                console.log('Could not retrieve publicKey ', err);
                return;
            });
        }
    }

    console.log(balance, coinsSpent);
    let transactionFees = BigInt(readlineSync.question('Enter the Transaction Fees you want to leave : '));
    coinsSpent += transactionFees;
    if(coinsSpent>balance) {
        console.log('Not enough Moneyz ');
        return;
    }
    let remainder = balance - coinsSpent;
    let returnOutput = new Output({coins:remainder,
                                        publicKeyLength:publicKey.length, 
                                        publicKey:publicKey });
    outputs.push(returnOutput);
    let outputByteData = Transaction.outputByteArray(outputs);
    let outputHash = cryptoHash(outputByteData);

    let dataToBeSigned = Buffer.alloc(68);
    dataToBeSigned.write(outputHash.toString('hex'), 36, 32, 'hex');
    for(let i=0; i<unusedOutputs.length; i++) {
        let transactionId = unusedOutputs[i].transactionId;
        console.log(transactionId);
        let index = unusedOutputs[i].index;

        dataToBeSigned.write((Buffer.from((HexToByteArray(transactionId)))).toString('hex'), 0, 32,'hex');
        dataToBeSigned.write((Buffer.from((Int32ToBytes(index)))).toString('hex'), 32, 4, 'hex');
        console.log(dataToBeSigned.toString('hex'));

        let signature = signData({message:dataToBeSigned, privateKey:privateKey});
        let input = new Input({transactionId:transactionId, index:index, signature:signature, signatureLength:Math.floor(signature.length/2)});
        inputs.push(input);
        console.log(input);
    }
    

    let transaction = new Transaction({inputs, outputs});
    console.log(transaction);
    // const pendingString = fs.readFileSync('./pending.json', 'utf8');
    // var pendingTransactions = [];
    // if(pendingString) {
    //     let tempArray = JSON.parse(pendingString);
    //     pendingTransactions = tempArray;
    // }
    // pendingTransactions.push(transaction);

    let dataInputs = [];
    for(let input of inputs) {
        let obj = {transactionId:input.transactionId, index:input.index, signature:input.signature};
        dataInputs.push(obj);
    }
    let dataOutputs = [];
    for(let output of outputs) {
        let obj = {amount:output.coins, recipient:output.publicKey};
        dataOutputs.push(obj);
    }

    axios.post(myURL + '/newTransaction', {"inputs":dataInputs, "outputs":dataOutputs})
    .then((res) => {
        console.log('Transaction sent succesfully');
        //console.log(res);
    })
    .catch((err) => {
        console.log('Error while sending the Transaction ', err);
    })

    //fs.writeFileSync('./pending.json', JSON.stringify(pendingTransactions));
}

