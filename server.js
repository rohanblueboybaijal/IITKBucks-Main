const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const readlineSync = require('readline-sync');
const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');
const Block = require('./blockchain/block');
const {getIndexOf, Int32ToBytes, HexToByteArray, ByteArrayToHex, Int64ToBytes} =  require('./utilities');
const { Worker, isMainThread, workerData } = require('worker_threads');
const util = require('util');
const cryptoHash = require('./utilities/crypto-hash');

const TARGET = '0000004000000000000000000000000000000000000000000000000000000000';
const INTERVAL = 480000;
const REWARD = 100000n;
var upToDate = false;
var blockNum = (fs.readdirSync('./blocks')).length;

var worker = new Worker('./miner.js');
var isMining = false;
var miningInterval;

/**********  LOADING PEERS FROM FILE  ***********/ 

const MyURL = 'http://4843daa6552f.ngrok.io';
const URL = 'https://iitkbucks.pclub.in';
var PEERS = ['https://iitkbucks.pclub.in'];
;
//PEERS.push('https://iitkbucks.pclub.in');

var potentialPeers = ['https://iitkbucks.pclub.in'];
var triedPeers = [];

var pendingTransactions = [];
var unusedOutputs = {};
var peerOutputs = {};

/********** A MAP OF ALIAS MAPPING TO ITS PUBLIC KEY **********/
var aliasMap = {}
var aliasMapString = fs.readFileSync('aliasMap.json', 'utf8');
if(aliasMapString) {
    aliasMap = JSON.parse(aliasMapString);
}

var parentHashArray = [];
parentHashArray.push('0'.repeat(64));

for(let i=0;i <blockNum; i++) {
    let blockData = fs.readFileSync('./blocks/block' + i +'.dat');
    let block = new Block({blockBinaryData:blockData});
    tempRequestBlock(i, block);
    // console.log(`************************ block ${i} ****************************`);
    // console.log(unusedOutputs);
    // console.log('****************************************************************');
}

 /*********** START THE APP ***********/

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

app.listen(8000, () => {
    console.log('Server started on port 8000');
    addPeer(potentialPeers.pop());
    console.log('Out of peer loop');
    requestBlock(blockNum, URL);
});

/*********** UTILITY FOR SENDING REQUEST TO OTHERS TO ADD US AS PEERS ***********/ 

function addPeer(potentialPeer) {
    let obj = {url : MyURL};
    console.log('potential peers ', potentialPeers);
    if(!triedPeers.includes(potentialPeer)) {
        triedPeers.push(potentialPeer);
    }

    axios.post(potentialPeer + '/newPeer', JSON.stringify(obj))
    .then((res) => {
        if(res.status===200) {
            console.log('Added ', potentialPeer);
            if(!PEERS.includes(potentialPeer)) {
                PEERS.push(potentialPeer);
            }
            fs.writeFileSync('./peers.json', JSON.stringify(PEERS));
        }
        else {
            console.log(`${potentialPeer} is full`);
        }
        if(!triedPeers.includes(potentialPeer)) {
            triedPeers.push(potentialPeer);
        }

        axios.get(potentialPeer + '/getPeers')
            .then((res) => {
                let yetAnotherPeerList = res.data.peers;
                for(let yetAnotherPeer of yetAnotherPeerList) {
                    if(!potentialPeers.includes(yetAnotherPeer) && !triedPeers.includes(yetAnotherPeer)) {
                        triedPeers.push(yetAnotherPeer);
                        if(yetAnotherPeer !== MyURL) {
                            potentialPeers.push(yetAnotherPeer);
                        }
                    }
                }
                if(PEERS.length<5 && potentialPeers.length>0) {
                    let p = potentialPeers.pop();
                    addPeer(p);
                }
            })
            .catch((err) => {
                console.log('Error occurred while contacting peer ',potentialPeer, 'for more peers');
                console.log(err);
            })
    })
    .catch((err) => {
        console.log('Error occurred while contacting peer', potentialPeer);
        triedPeers.push(potentialPeer);
        if(potentialPeers.length>0) {
            let p = potentialPeers.pop();
            addPeer(p);
        }
    })
}

/***********  ENDPOINTS FOR COMMUNICATION ***********/

app.get('/getBlock/:blockIndex', (req, res) => {
    var index = req.params.blockIndex;
    var path = 'blocks/block' + index + '.dat';

    if(fs.existsSync(path)) {
        let data = fs.readFileSync(path);
        data = Buffer.from(data);
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



var binaryParser = bodyParser.raw({limit:1000000, type:'application/octet-stream'});
app.post('/newBlock', binaryParser, (req,res) => {
    const blockData = req.body;
    let files = fs.readdirSync('./blocks');
    var b = files.length;
    const block = new Block({index:null, parentHash:null, target:null,
                            transactions:null, blockBinaryData : blockData });
    console.log(`BLOCK : ${block.index} from peer `);
    
    var tempOutputsArray = {};
    var result = false;
    if(block.index >= b) {
        result = Block.isValidBlock({block:block, 
                                    unusedOutputs:unusedOutputs,
                                    tempOutputsArray : tempOutputsArray,
                                    parentHash : parentHashArray[block.index] });
    }
    if(result) {
        res.status(200).send('Block is valid');
        console.log('BLOCK : Valid', block.index);

        for(peer of PEERS) {
            axios({ method : 'post', url : peer + '/newBlock', data : block.blockBinaryData})
            .then((res) => {
                console.log(`Sending block ${block.index} to ${peer}`);
            })
            .catch((err) => {
                //console.log(`Error while sending block ${block.index} to ${peer}`);
            })
        }

        if(blockNum<=files.length) {
            processBlock(block);
        }
        worker.terminate();
        isMining = false;
        clearInterval(miningInterval);
        miningInterval = setIntervalAndExecute(mineBlock, INTERVAL);

    }
    else if(block.index<b) {
        let bi = fs.readFileSync('./blocks/block' + block.index + '.dat');
        let check = Buffer.compare(bi, block.blockBinaryData);
        if(!check) {
            console.log(`BLOCK : ${block.index} exists and is valid`);
            res.status(200).send('Block is valid');
        }
        else {
            console.log(`BLOCK : ${block.index} exists; received invalid block`);
            res.status(400).send('Block already exists and yours is invalid');
        }
    }
    else {
        console.log('BLOCK : Invalid block', block.index);
        res.status(400).send('Block is invalid');
    }
});


app.post('/newTransaction', (req,res) => {
    var data = req.body;
    var inputs = [];
    for(let temp of data.inputs) {
        var input = new Input({ transactionId : temp.transactionId, index : temp.index,
                        signatureLength : Math.floor((temp.signature.length)/2),
                        signature : temp.signature});
        inputs.push(input);
    }

    var outputs = [];
    for(let temp of data.outputs) {
        var output = new Output({ coins : temp.amount, publicKeyLength : temp.recipient.length,
                        publicKey : temp.recipient});
        outputs.push(output);
    }
    var transaction = new Transaction({ inputs:inputs, outputs:outputs});
    console.log('TRANSACTION : Received ', transaction.id);
    if((getIndexOf({object:transaction, array:pendingTransactions}) === -1) && Transaction.isValidTransaction({transaction, unusedOutputs, tempOutputsArray:{}})) {
        res.status(200).send('Received Transaction');

        console.log('TRANSACTION : Verified ', transaction.id);

        for(peer of PEERS) {
            axios({method : 'post', url : peer + '/newTransaction', data : JSON.stringify(data)})
            .then((res) => {
                if(res.status===200) {
                    console.log(`Sent ${transaction.id} to ${peer}`);
                }
             })
            .catch((err) => {
            })
        }
        console.log('PENDING : after new transaction : ', pendingTransactions.length);
        if(!pendingTransactions.length) {
            pendingTransactions.push(transaction);
            isMining = false;
            worker.terminate();
            clearInterval(miningInterval);
            miningInterval = setIntervalAndExecute(mineBlock, INTERVAL);
        }   
        else {
            pendingTransactions.push(transaction);
        }
    }
    else {
        res.sendStatus(400);
    }
    if(getIndexOf({object:transaction, array:pendingTransactions}) !== -1) {
        console.log(`TRANSACTION : ${transaction.id} exists`);
    }
    if(!Transaction.isValidTransaction({transaction, unusedOutputs, tempOutputsArray:{}})){
        console.log(`TRANSACTION : invalid ${transaction.id}`);
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
    fs.writeFileSync('./unusedOutputs.json', JSON.stringify(unusedOutputs));
    fs.writeFileSync('./parentHash.json', JSON.stringify(parentHashArray));
    fs.writeFileSync('./blocks/block' + block.index + '.dat', block.blockBinaryData);
}

function requestBlock(blockIndex, peer) {
    const url = peer + '/getBlock/' + blockIndex;
    console.log(url);
    axios({
        method: 'get',
        url : url,
        responseType:'arraybuffer'
    })
        .then(function(res) {
            let block = new Block({blockBinaryData : res.data});
            tempOutputsArray = {};
            console.log('BLOCK : Requesting ', blockIndex);
            if(!blockIndex || Block.isValidBlock({
                        block:block,
                        unusedOutputs:unusedOutputs,
                        tempOutputsArray:tempOutputsArray,
                        parentHash:parentHashArray[blockIndex]}) && blockIndex == block.index) {
                
                let f = fs.readdirSync('./blocks');
                let b = f.length;
                
                if(b>=block.index) {
                    processBlock(block);
                    console.log(`BLOCK : ${blockIndex} verified`);

                    if(!upToDate) {
                        blockIndex += 1;
                        requestBlock(blockIndex, PEERS[0]);
                    }
                }
            }
            else {
                console.log(`BLOCK : ${blockNum} not verified`);
                if(!upToDate) {
                    blockIndex += 1;
                    requestBlock(blockIndex, PEERS[0]);
                }
                upToDate = true;
            }
        })
        .catch( function(err) {
            console.log(err);
            getPendingTransactions();
            console.log(`BLOCK : ${blockIndex} does not exist`);
            upToDate = true;
        });
}

function getPendingTransactions() {
    let pendingTransactionsList = [];
    console.log('PENDING : Ask Peer');
    axios({
            method: 'get',
            url: URL + '/getPendingTransactions'
        })
        .then((res) => {
            if(!res.data.length) {
                pendingTransactionsList = res.data;
                for(let transaction of pendingTransactionsList) {
                    let inputs = [], outputs = [];
                    for(let obj of transaction.inputs) {
                        let input = new Input({transactionId:obj.transactionId, index:obj.index, signatureLength:Math.floor((obj.signature.length)/2), signature:obj.signature});
                        inputs.push(input);
                    }
                    for(let obj of transaction.outputs) {
                        let key = obj.recipient;
                        let output = new Output({coins:obj.amount, publicKey:obj.recipient, publicKeyLength:key.length});
                        outputs.push(output);
                    }
                    let t = new Transaction({inputs, outputs});
                    if(getIndexOf({object:t, array:pendingTransactions}) == -1) {
                        if(Transaction.isValidTransaction({transaction:t, unusedOutputs, tempOutputsArray:{}})) {
                            pendingTransactions.push(t);
                        }
                    }
                }
            }

            console.log('PENDING : Number after asking ', pendingTransactions.length);
            miningInterval = setIntervalAndExecute(mineBlock, INTERVAL);
        })
        .catch((err) => {
            console.log('PENDING : Error while asking ', err);
        });
}

function setIntervalAndExecute(fn, t) {
    fn();
    return(setInterval(fn, t));
}

/********** Checking existing blocks and Mining new Blocks **********/

function tempRequestBlock(blockIndex, block) {
    let tempOutputsArray = {};

    var buf = block.blockBinaryData.slice(0,116);
    var blockHash = cryptoHash(buf);
    if(!blockIndex|| Block.isValidBlock({
            block:block,
            unusedOutputs:unusedOutputs,
            tempOutputsArray:tempOutputsArray,
            parentHash:parentHashArray[blockIndex]})
    ) {
        processBlock(block);
        console.log(`LOCAL BLOCK : ${blockIndex} verified`);
    }
    else {
        console.log(`LOCAL BLOCK : ${blockIndex} not verified`);
        upToDate = true;
    }
}

function mineBlock() {
    let transactions, target;
    transactions = pendingTransactions;
    target =  TARGET;
    parentHash = parentHashArray[parentHashArray.length -1];
    // FINDING THE VALID TRANSACTIONS
    var minerFees = 0n;
    var tempOutputsArray = {};
    var transactionsToMine = [];

    const LIMIT = 998000;
    var size = 0;

    console.log('MINING 1 : Pending at start ', pendingTransactions.length);

    console.log('MINING 2 : Find transactions');
    for(let j=0; j<transactions.length; j++) {
        var obj = Transaction.isValidTransaction({transaction:transactions[j], unusedOutputs, tempOutputsArray});
        size += transactions[j].data.length + 4;
        if(obj.isValid && size<LIMIT) {
            transactionsToMine.push(transactions[j]);
            minerFees += obj.transactionFees;
        }
    }
    pendingTransactions = transactionsToMine;
    console.log('MINING 3 : Found transactions');

    /********** ADD COINBASE TRANSASCTION **********/
    const myPublicKey = fs.readFileSync('./Keys/public.pem', 'utf-8');
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

    if(isMining) {
        worker.terminate().then((res) => {
            console.log('terminate worker');
        });
    }
    worker = new Worker('./miner.js');
    isMining = true;
    if(transactionsToMine.length>1) {
        console.log('MINING 4 : Worker can start');
        worker.postMessage({blockHeader : blockHeader, transactionByteArray});
    }
    else {
        console.log('MINING 4 : Not enough transactions');
    }

    // Need this because pendingTransactions is just a reference to transactionsToMine and it will now include coinbase transaction
    if(pendingTransactions.length) {
        pendingTransactions.splice(0,1);
    }
    console.log('After finding transactions for mining : ', pendingTransactions.length);

    worker.on('message', (data) => {
        console.log('MINING BLOCK : Mined a Block!!');
        const blockBinaryData = Buffer.from(data.minedBlock);
        const block = new Block({blockBinaryData:blockBinaryData});
        var tempOutputsArray = {};
        let processed = false;

        if(Block.isValidBlock({block:block, 
                    unusedOutputs:unusedOutputs, 
                    tempOutputsArray:tempOutputsArray, 
                    parentHash:parentHashArray[parentHashArray.length-1]})) {
            console.log(`MINING BLOCK : Mined block ${block.index} is correct!`);
            console.log(block);
            processBlock(block);

            for(peer of PEERS) {
                axios({ method : 'post', url : peer + '/newBlock', data : blockBinaryData})
                .then((res) => {
                    if(res.status === 200) {
                        console.log(`MINING BLOCK : Sent block ${block.index} to ${peer}`);
                    }
                    else {
                        console.log('MINING BLOCK : Block not accepted ');
                        console.log(res);
                    }
                })
                .catch((err) => {
                    console.log('MINING BLOCK : Error while sending request ', peer);
                })
            }
        }
        else {
            console.log('MINING BLOCK : Mined block is invalid');
        }
    })
}