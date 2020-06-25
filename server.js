const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const readlineSync = require('readline-sync');
const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');
const Block = require('./blockchain/block');
const {getIndexOf} =  require('./util');


/**********  LOADING PEERS FROM FILE  ***********/ 

const MyURL = 'rohanblueboybaijal';
var PEERS = [];
var potentialPeers = ['http://localhost:3000'];
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
                            id : input.id,
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

var unusedOutputs = new Map();
const unusedOutputString = fs.readFileSync('./unusedOutputs.json', 'utf8') ;
if(unusedOutputString) {
    unusedOutputs = new Map(JSON.parse(unusedOutputString));
    for([key, temp] of unusedOutputs) {
        var val = new Output({
                        coins : temp.coins,
                        publicKeyLength : temp.publicKeyLength,
                        publicKey : temp.publicKey
                    });
        unusedOutputs.set(key, val);
    }
}

 /*********** START THE APP ***********/

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));



/*********** UTILITY FOR SENDING REQUEST TO OTHERS TO ADD US AS PEERS ***********/ 

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

/***********  ENDPOINTS FOR COMMUNICATION ***********/

app.get('/getBlock/:blockIndex', (req, res) => {
    var index = req.params.blockIndex;
    var path = 'blocks/block' + index + '.dat';
    var data = fs.readFileSync(path);
    res.set('Content-Type', 'application/octet-stream');
    res.send(data);
});


app.get('/getPendingTransactions', (req, res) => {
    res.set('Content-Type', 'application/json');
    var data = JSON.stringify(pendingTransactions);
    res.send(data);
});


app.post('/newPeer', (req, res) => {
    const peer = req.body.url;
    if(PEERS.length<5) {
        res.status(200);
        res.send(`Received ${peer}`);
        PEERS.push(peer);
        var jsonString = JSON.stringify(PEERS);
        fs.appendFileSync('./peers.json',jsonString);
    }
    else {
        res.status(500);
        res.send('Peer list full');
    }
});


app.get('/getPeers', (req, res) => {
    var peerList = {};
    peerList["peers"] = PEERS;
    res.send(JSON.stringify(peerList));
});


var binaryParser = bodyParser.raw({limit:1000000, type:'application/octet-stream'});
app.post('/newBlock', binaryParser, (req,res) => {
    const blockData = req.body;
    let files = fs.readdirSync('./blocks');
    const blockNum = files.length + 1;
    fs.writeFileSync('./blocks/block' + blockNum.toString() + '.dat', blockData);
    const block = new Block({index:null, parentHash:null, target:null,
                            transactions:null, blockBinaryData : blockData });
    processBlock(block); //function should be called once block has been validated
    res.send("Received");
});


app.post('/newTransaction', (req,res) => {
    var data = req.body;
    var inputs = [];
    for(let temp of data.inputs) {
        var input = new Input({
                        id : temp.id,
                        index : temp.index,
                        signatureLength : temp.signatureLength,
                        signature : temp.signature
                    });
        inputs.push(input);
    }

    var outputs = [];
    for(let temp of data.outputs) {
        var output = new Output({
                        coins : temp.coins,
                        publicKeyLength : temp.publicKeyLength,
                        publicKey : temp.publicKey
                    });
        outputs.push(output);
    }

    var transaction = new Transaction({ 
                        inputs:inputs,
                        outputs:outputs,
                        data:null
                    });
    pendingTransactions.push(transaction);
    var jsonString = JSON.stringify(pendingTransactions);
    fs.writeFileSync('pending.json', jsonString);
    res.send("Received Transaction");
});


app.listen(8000, () => {
    console.log('Server started on port 8000');
});

/*********** FUNCTIONS FOR PROCESSING BLOCKS AND TRANSACTIONS  ***********/ 

function processBlock(block) {
    for(transaction of block.transactions) {
        var index = getIndexOf(transaction, pendingTransactions);
        if(index != -1) {
            pendingTransactions.splice(index, 1);

            for(input of transaction.inputs) {
                var key = JSON.stringify([input.id, input.index]);
                unusedOutputs.delete(key);
            }

            var outputs = transaction.outputs;
            for(let j=0; j<outputs.length; j++) {
                var key = JSON.stringify([transaction.id, j]);
                unusedOutputs.set(key, outputs[j]);
            }
       }
    }
}

function requestBlock(blockNum, peer) {
    const url = peer + '/getBlock/' + blockNum;
    axios({
        method: 'get',
        url : url,
        responseType:'application/octet-stream'
    })
        .then(function(res) {
            console.log(res);
        })
        .catch( function(err) {
            console.log(err);
        });
}

//requestBlock(1, 'http://localhost:3000');