const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

app.get('/getBlock/:blockIndex', (req, res) => {
    var index = req.params.blockIndex;
    var path = 'blocks/block' + index + '.dat';
    var data = fs.readFileSync(path);
    res.send(data);
});

app.get('/getPendingTransactions', (req, res) => {
    var pendingTransaction = fs.readFileSync('transactions/pendingTransactions.json', 'utf8');
    res.send(pendingTransaction);
});

app.listen(8000, () => {
    console.log('Server started on port 8000');
});