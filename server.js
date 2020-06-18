const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');

var PEERS = [];
peerString = fs.readFileSync('peers.json','utf8');
if(peerString) {
    var data = JSON.parse(peerString);
    for (peer of data) {
        PEERS.push(peer);
    }
}

const pendingString = fs.readFileSync('./pending.json', 'utf8');
var pendingTransactions = [];
if(pendingString) {
    var tempArray = JSON.parse(pendingString);
    for(let object of tempArray) {
        var temp = {};
        temp["inputs"] = object.inputs;
        temp["outputs"] = object.outputs;
        pendingTransactions.push(temp);
    }
}

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

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
    res.send(`Received ${peer}`);
    PEERS.push(peer);
    var jsonString = JSON.stringify(PEERS);
    fs.appendFileSync('./peers.json',jsonString);
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
    res.send("Received");
});

app.post('/newTransaction', (req,res) => {
    var data = req.body;
    var temp = {};
    temp["inputs"] = data.inputs;
    temp["outputs"] = data.outputs;
    pendingTransactions.push(temp);
    var jsonString = JSON.stringify(pendingTransactions);
    fs.writeFileSync('pending.json', jsonString);
    res.send("Received Transaction");
});

app.listen(8000, () => {
    console.log('Server started on port 8000');
});