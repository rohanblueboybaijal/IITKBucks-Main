const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const readlineSync = require('readline-sync');
const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');
const Block = require('./blockchain/block');
const {getIndexOf} =  require('./utilities');
const { Worker, isMainThread, workerData } = require('worker_threads');
const util = require('util');
const cryptoHash = require('./utilities/crypto-hash');

const TARGET = '00000f0000000000000000000000000000000000000000000000000000000000';
var upToDate = false;
var blockNum = (fs.readdirSync('./blocks')).length;
var minerNode;
var miningInterval;
var isMining = false;

/********** LOADING UNUSED OUTPUTS FOR EACH PEER **********/

var peerOutputs = {};
var peerOutputsString = fs.readFileSync('./peerOutputs.json', 'utf-8');
if(peerOutputsString) {
    peerOutputs = JSON.parse(peerOutputsString);
}

/**********  LOADING PEERS FROM FILE  ***********/ 

const MyURL = 'rohanblueboybaijal';
var PEERS = [];

PEERS.push('https://iitkbucks.pclub.in');

var potentialPeers = [];
const peerString = fs.readFileSync('peers.json','utf8');
if(peerString) {
    var data = JSON.parse(peerString);
    for (peer of data) {
        PEERS.push(peer);
    }
}

/***********  LOADING PENDING TRANSACTIONS FROM FILE ***********/ 

const pendingString = fs.readFileSync('./pending.json', 'utf8');
var pendingTransactions = [];
if(pendingString) {
    var tempArray = JSON.parse(pendingString);
    for(let object of tempArray) {
        
        var inputs = [];
        for(input of object.inputs) {
            var tempInput = new Input({
                            transactionId : input.transactionId,
                            index : input.index,
                            signatureLength : input.signatureLength,
                            signature : input.signatureLength
                        });
            inputs.push(tempInput);
        }
        var outputs = [];
        for(output of object.outputs) {
            var tempOutput = new Output({
                            coins : output.coins,
                            publicKeyLength : output.publicKeyLength,
                            publicKey : output.publicKey
                        });
            outputs.push(tempOutput);
        }
        var temp = new Transaction({inputs:inputs, outputs:outputs, data:null});
        pendingTransactions.push(temp);
    }
}

/***********  LOADING UNUSED OUTPUTS FROM FILE ***********/

var unusedOutputs = {};
const unusedOutputString = fs.readFileSync('./unusedOutputs.json', 'utf8') ;
if(unusedOutputString) {
    unusedOutputs = JSON.parse(unusedOutputString);
    for(let key of Object.keys(unusedOutputs)) {
        var val = new Output({
                        coins : unusedOutputs[key].coins,
                        publicKeyLength : unusedOutputs[key].publicKeyLength,
                        publicKey : unusedOutputs[key].publicKey
                    });
        unusedOutputs[key] = val;

        if(val.publicKey in peerOutputs) {
            peerOutputs[val.publicKey].push(val);
        }
        else {
            peerOutputs[val.publicKey] = [];
            peerOutputs[val.publicKey].push(val);
        }
    }
}

/********** A MAP OF ALIAS MAPPING TO ITS PUBLIC KEY **********/
var aliasMap = {}
var aliasMapString = fs.readFileSync('aliasMap.json', 'utf8');
if(aliasMapString) {
    aliasMap = JSON.parse(aliasMapString);
}

/********** UTILITY ARRAY FOR EASY ACCESS TO PARENT HASH **********/
var parentHashArray = [];
parentHashArray.push('0'.repeat(64));
var parentHashString = fs.readFileSync('parentHash.json', 'utf8');
if(parentHashString) {
    parentHashArray = JSON.parse(parentHashString);
}

/********** INSTANTIATE THE MINER **********/

/*var minerNode;
minerNode = new Worker('./miner.js', { workerData : { transactions : pendingTransactions, 
                                                    target : TARGET,
                                                    parentHash : parentHashArray[parentHashArray.length -1], 
                                                    unusedOutputs : unusedOutputs} });*/
                     
                                                    
// minerNode.postMessage({ transactions : pendingTransactions, 
//                     target : target, 
//                     parentHash : parentHashArray[parentHashArray.length -1], 
//                     unusedOutputs : unusedOutputs});



 /*********** START THE APP ***********/

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

app.listen(8000, () => {
    console.log('Server started on port 8000');
    requestBlock(blockNum, PEERS[0]);
});


// minerNode.on('message', (data) => {
//     console.log('Mined a Block');
//     const blockBinaryData = data.blockBinaryData;
//     const block = new Block({blockBinaryData:blockBinaryData});
//     var tempOutputsArray = {};

//     if(Block.isValidBlock({block:block, 
//                 unusedOutputs:unusedOutputs, 
//                 tempOutputsArray:tempOutputsArray, 
//                 parentHash:parentHashArray[parentHashArray.length-1]})) {
//         processBlock(block);

//         for(peer in PEERS) {
//             axios({
//                 method : 'post',
//                 url : peer + '/newBlock',
//                 data : block.blockBinaryData
//             });
//         }
//     }

// })



/*********** UTILITY FOR SENDING REQUEST TO OTHERS TO ADD US AS PEERS ***********/ 

function addPeers() {
    while(PEERS.length<5 && potentialPeers.length>0) {
        let potentialPeer = potentialPeers.pop();
        let obj = {};
        obj["url"] = MyURL;
        axios.post(potentialPeer + '/newPeer', obj)
            .then((res) => {
                if(res.status==200) {
                    PEERS.push(potentialPeer);
                }
                else {
                    const response = axios.get(potentialPeer + '/getPeers');
                    let yetAnotherPeerList =  JSON.parse(response.data);
                    for(let yetAnotherPeer of yetAnotherPeerList) {
                        if(!potentialPeers.includes(yetAnotherPeer)) {
                            potentialPeers.push(yetAnotherPeer);
                        }
                    }
                }
            })
            .catch((err) => {
                console.log('Error occurred while contacting peer');
                console.log(err);
            })
    }
    fs.writeFile('peers.json', JSON.stringify(PEERS), function(err) {
        console.log(err);
    });
}

/***********  ENDPOINTS FOR COMMUNICATION ***********/

app.get('/getBlock/:blockIndex', (req, res) => {
    var index = req.params.blockIndex;
    var path = 'blocks/block' + index + '.dat';

    if(fs.existsSync(path)) {
        let data = fs.readFileSync(path);
        data = Uint8Array.from(data);
        res.set('Content-Type', 'application/octet-stream');
        res.status(200).send(data);
    }
    else {
        res.sendStatus(404);
    }
});


app.get('/getPendingTransactions', (req, res) => {
    res.set('Content-Type', 'application/json');
    let pendingTransactionsList = [];
    for(let temp of pendingTransactions) {
        let pendingInputs = [];
        let pendingOutputs = [];
        for(let input of temp.inputs)  {
            let obj = {transactionId:input.transactionId, index:input.index, signature:input.signature};
            pendingInputs.push(obj);
        }
        for(let output of temp.outputs) {
            let obj = {amount:output.coins, recipient:output.publicKey};
            pendingOutputs.push(obj);
        }
        let pendingTransaction = {inputs:pendingInputs, outputs:pendingOutputs};
        pendingTransactionsList.push(pendingTransaction);
    }
    let data = JSON.stringify(pendingTransactionsList);
    res.status(200).send(data);
});

app.post('/newPeer', (req, res) => {
    const peer = req.body.url;
    if(PEERS.length<5) {
        res.status(200);
        res.send(`Received ${peer}`);
        PEERS.push(peer);
        var jsonString = JSON.stringify(PEERS);
        fs.writeFileSync('./peers.json',jsonString);
    }
    else {
        res.status(500);
        res.send('Peer list full');
    }
});


app.get('/getPeers', (req, res) => {
    var peerList = {};
    peerList["peers"] = PEERS;
    res.status(200).send(JSON.stringify(peerList));
});


var binaryParser = bodyParser.raw({limit:1000000, type:'application/octet-stream'});
app.post('/newBlock', binaryParser, (req,res) => {
    const blockData = req.body;
    let files = fs.readdirSync('./blocks');
    blockNum = files.length;
    const block = new Block({index:null, parentHash:null, target:null,
                            transactions:null, blockBinaryData : blockData });
    
    var tempOutputsArray = {};
    var result = Block.isValidBlock({block:block, 
                            unusedOutputs:unusedOutputs,
                            tempOutputsArray : tempOutputsArray,
                            parentHash : parentHashArray[parentHashArray.length-1] });
    if(result) {
        res.send('Block is valid');
        processBlock(block);

        if(isMining) {
            minerNode.terminate();
        }
        clearInterval(miningInterval);
        miningInterval = setInterval(startMining, 900000);
    }
    else {
        console.log('Block is invalid');
    }
});


app.post('/newTransaction', (req,res) => {
    var data = req.body;
    var inputs = [];
    for(let temp of data.inputs) {
        var input = new Input({
                        transactionId : temp.transactionId,
                        index : temp.index,
                        signatureLength : Math.floor((temp.signature.length)/2),
                        signature : temp.signature
                    });
        inputs.push(input);
    }

    var outputs = [];
    for(let temp of data.outputs) {
        var output = new Output({
                        coins : temp.amount,
                        publicKeyLength : temp.recipient.length,
                        publicKey : temp.recipient
                    });
        outputs.push(output);
    }

    var transaction = new Transaction({ 
                        inputs:inputs,
                        outputs:outputs,
                        data:null
                    });
    if(getIndexOf({object:transaction, array:pendingTransaction}) == -1) {
        pendingTransactions.push(transaction);
        var jsonString = JSON.stringify(pendingTransactions);
        fs.writeFileSync('pending.json', jsonString);
    }
    res.send("Received Transaction");
});

app.post('/addAlias', (req, res) => {
    var alias = req.body.alias;
    var publicKey = req.body.publicKey;

    if(alias in aliasMap) {
        res.sendStatus(400);
    }
    else {
        aliasMap[alias] = publicKey;
        res.sendStatus(200);
    }
});

app.get('getPublicKey', (req, res) => {
    var alias = res.body.alias;
    if(alias in aliasMap) {
        res.set('Content-Type', 'application/json');
        var obj = {};
        obj["publicKey"] = aliasMap[alias];
        res.status(200).send(obj);
    }
    else {
        res.status(404);
        res.send("Alias not found");
    }
});

app.get('/getUnusedOutputs', (req, res) => {
    var alias = req.body.alias;
    var publicKey = req.body.publicKey;
    var obj = {};
    res.set('Content-Type', 'application/json');

    if(publicKey !== undefined) {
        if(publicKey in peerOutputs) {
            obj["unusedOutputs"] = peerOutputs[publicKey];
            res.status(200).send(obj);
        }
        else {
            res.sendStatus(404);
        }
    }
    else {
        if(alias in aliasMap) {
            publicKey = aliasMap[alias];
            if(publicKey in peerOutputs) {
                obj["unusedOutputs"] = peerOutputs[publicKey];
                res.status(200).send(obj);
            }
            else {
                res.sendStatus(404);
            }
        }
        else {
            res.sendStatus(404);
        }
    }
});

/*********** FUNCTIONS FOR PROCESSING BLOCKS AND TRANSACTIONS  ***********/ 

function processBlock(block) {
    for(transaction of block.transactions) {
        var index = getIndexOf({object:transaction, array:pendingTransactions});
        if(index != -1) {
            pendingTransactions.splice(index, 1);
        }
        for(input of transaction.inputs) {
            let key = JSON.stringify([input.transactionId, input.index]);

            let obj = {transactionId : input.transactionId, index: input.index, amount: unusedOutputs[key].amount };
            let publicKey = unusedOutputs[key].publicKey;
            let ind = getIndexOf({object:obj, array:peerOutputs[publicKey]});
            peerOutputs[publicKey].splice(ind,1);

            delete unusedOutputs[key];
        }
        var outputs = transaction.outputs;
        for(let j=0; j<outputs.length; j++) {
            var key = JSON.stringify([transaction.id, j]);
            unusedOutputs[key] = outputs[j];

            let peerOutput = {};
            peerOutput["transactionId"] = transaction.id;
            peerOutput["index"] = j;
            peerOutput["amount"] = (outputs[j].coins);
            if(outputs[j].publicKey in peerOutputs) {
                peerOutputs[outputs[j].publicKey].push(peerOutput);
            }
            else {
                peerOutputs[outputs[j].publicKey] = [];
                peerOutputs[outputs[j].publicKey].push(peerOutput);
            }
        }
    }

    var buf = block.blockBinaryData.slice(0,116);
    var blockHash = cryptoHash(buf);
    parentHashArray.push(blockHash);
    console.log(blockNum, block.parentHash);
    console.log(blockNum, blockHash);
    // fs.writeFileSync('./parentHash.json', JSON.stringify(parentHashArray));
    // fs.writeFileSync('./blockData/block' + block.index + '.dat', block.blockBinaryData);
    // fs.writeFileSync('./unusedOutputs.json', JSON.stringify(unusedOutputs));
    // fs.writeFileSync('./peerOutputs.json', JSON.stringify(peerOutputs));
}

function requestBlock(blockNum, peer) {
    const url = peer + '/getBlock/' + blockNum;
    axios({
        method: 'get',
        url : url,
        responseType:'arraybuffer'
    })
        .then(function(res) {
            var block = new Block({blockBinaryData : res.data});
            tempOutputsArray = {};
            //fs.writeFileSync('./blocks/block' + blockNum + '.dat', res.data);
            console.log(blockNum);

            //console.log(parentHashArray);
            //console.log(unusedOutputs);
            //console.log(util.inspect(block, false, null, true /* enable colors */));

            if(Block.isValidBlock({
                        block:block,
                        unusedOutputs:unusedOutputs,
                        tempOutputsArray:tempOutputsArray,
                        parentHash:parentHashArray[blockNum]})
            ) {
                processBlock(block);
                console.log(`Block ${blockNum} verified`);

                if(!upToDate) {
                    blockNum +=1;
                    requestBlock(blockNum, PEERS[0]);
                }
            }
            else {
                console.log(`Block ${blockNum} not verified`);

                if(!upToDate) {
                    blockNum +=1;
                    requestBlock(blockNum, PEERS[0]);
                }
                //upToDate = true;
            }
        })
        .catch( function(err) {
            getPendingTransactions();
            miningInterval = setInterval(startMining, 900000)
            console.log('Got no block');
            console.log(err);
            upToDate = true;
        });
}

function getPendingTransactions() {
    let pendingTransactionsList = [];
    axios({
            method: 'get',
            url: PEERS[0] + '/getPendingTransactions'
        })
        .then((res) => {
            if(!res.data.length) {
                return;
            }
            pendingTransactionsList = res.data;
            for(let transaction of pendingTransactionsList) {
                let inputs = [], outputs = [];
                for(let obj of transaction.inputs) {
                    let input = new Input({transactionId:obj.transactionId, index:obj.index, signatureLength:Math.floor((obj.signature.length)/2), signature:obj.signature});
                    inputs.push(input);
                }
                for(let obj of transaction.outputs) {
                    let output = new Output({coins:obj.amount, publicKey:obj.publicKey, publicKeyLength:obj.publicKey.length});
                    outputs.push(output);
                }
            }
            let transaction = new Transaction({inputs, outputs});
            if(getIndexOf(transaction, pendingTransactions) == -1) {
                pendingTransactions.push(transaction);
            }
        })
        .catch((err) => {
            console.log('Error while getting pendingTransactions : ', err);
        });
}

function startMining() {
    if(isMining) {
        minerNode.terminate();
    }
    minerNode = new Worker('./miner.js', { workerData : { transactions : pendingTransactions, 
                                                            target : TARGET, 
                                                            parentHash : parentHashArray[parentHashArray.length -1], 
                                                            unusedOutputs : unusedOutputs} });
}

function setIntervalAndExecute(fn, t) {
    fn();
    return(setInterval(fn, t));
}



/******************************* TESTING **********************************/

function tempRequestBlock(blockNum, block) {
    let tempOutputsArray = {};
    //console.log(util.inspect(block, false, null, true /* enable colors */));
    // var buf = block.blockBinaryData.slice(0,116);
    // var blockHash = cryptoHash(buf);
    // parentHashArray.push(blockHash);
    // console.log(parentHashArray);
    if(!blockNum || Block.isValidBlock({
            block:block,
            unusedOutputs:unusedOutputs,
            tempOutputsArray:tempOutputsArray,
            parentHash:parentHashArray[blockNum]})
    ) {
        processBlock(block);
        console.log(`Block ${blockNum} verified`);
    }
    else {
        console.log(`Block ${blockNum} not verified`);
        upToDate = true;
    }
    //console.log(util.inspect(block.transactions, false, null, true /* enable colors */));
    console.log(unusedOutputs);
}

for(let i=0; i<0; i++) {
    let blockBinaryData = fs.readFileSync('./blockData/Block' + i + '.dat');
    let block = new Block({blockBinaryData});
    tempRequestBlock(i, block);
}