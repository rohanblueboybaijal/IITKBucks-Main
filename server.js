const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const Input = require('./transaction/input');
const Output = require('./transaction/output');
const Transaction = require('./transaction/transaction');


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
    const jsonString = fs.readFileSync('./pendingTransactions.json', 'utf8');
    var pendingTransactions = [];
    if(jsonString) {
        var tempArray = JSON.parse(jsonString);
        for(let object of tempArray) {
            var temp = [];
            temp["inputs"] = object.inputs;
            temp["outputs"] = object.outputs;
            pendingTransactions.push(temp);
        }
    }
    res.set('Content-Type', 'application/json');
    res.send(pendingTransactions);
});

app.listen(8000, () => {
    console.log('Server started on port 8000');
});