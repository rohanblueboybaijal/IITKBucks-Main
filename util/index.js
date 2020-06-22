function Int32ToBytes (num) {
    var byteArray = new ArrayBuffer(4);
    var view = new DataView(byteArray);
    view.setUint32(0, num, false);
    return byteArray;
}

function Int64ToBytes(num) {
    var byteArray = new Uint8Array(8);
    for(let i=0; i<8; i++) {
        byteArray[7-i] = parseInt(num%256n);
        num = num/256n;
    }
    return byteArray;
}

function ByteToInt(byteArray) {
    if(byteArray.length == 4) {
        var value = 0;
        for(i=0; i<4; i++) {
            value = value*256 + byteArray[i];
        }
        return value;
    }
    else {
        value = 0n;
        for(i=0; i<byteArray.length; i++) {
            value = value*(256n) + BigInt(byteArray[i]);
        }
        return value;
    }
}

function HexToByteArray(str) {
    const len = str.length;
    const size = Math.floor(len/2);
    var byteArray = new Uint8Array(size);
    

    for(let i=0; i<len ;i+=2) {
        var byte = 0;
        if(str[i]>='0' && str[i] <='9') {
            byte += 16*(str[i] - '0' );
        }
        else {
            byte += 16*(str[i].charCodeAt(0) - 97 + 10);
        }

        if(str[i+1]>='0' && str[i+1] <='9') {
            byte += (str[i+1] - '0' );
        }
        else {
            byte += (str[i+1].charCodeAt(0) - 97 + 10);
        }
        var index = Math.floor(i/2);
        byteArray[index] = byte;
    }
    return byteArray;
}

function ByteArrayToHex(byteArray) {
    var str = '';
    const len = byteArray.length;
    var num;
    for(let i=0; i< len; i++) {
        num = byteArray[i];
        var num1 = Math.floor(num/16);
        if(num1>=0 && num1<=9) {
            str = str + num1;
        }
        else {
            var ch = 97 + num1 - 10;
            ch = String.fromCharCode(ch);
            str = str + ch;
        }
        var num2 = num - 16*num1;
        if(num2>=0 && num2 <=9) {
            str = str + num2;
        }
        else {
            var ch = 97 + num2 - 10;
            ch = String.fromCharCode(ch);
            str = str + ch;
        }
    }
    
    return str;
}

function HashToNumber(hash) {
    
    length = hash.length;
    var ans = BigInt(0);
    for(let i=0; i<length ; i++) {
        if(hash[i]>='0' && hash[i]<='9') {
            let x = hash[i] - '0';
            x = BigInt(x);
            ans = ans*BigInt(16) + x;
        }
        else {
            let x = hash[i].charCodeAt(0) - 97 + 10;
            x = BigInt(x);
            ans = ans*BigInt(16) + x;
        }
    }
    return ans;
}

function isValidSignature({data, signature, publicKey}) {

    const isVerified = crypto.verify(
        'sha256',
        Buffer.from(data), {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS_PSS_PADDING,
        },
        Buffer.from(signature, 'hex')
    );

    return isVerified;
}

function getIndexOf({object, array}) {
    var index = -1;
    var objectString = JSON.stringify(object);
    for(let i=0; i<array.length; i++) {
        if(objectString == JSON.stringify(array[i])) {
            return i;
        }
    }
    return index;
}

module.exports = { Int32ToBytes, Int64ToBytes, ByteToInt, HexToByteArray, ByteArrayToHex, HashToNumber, isValidSignature, getIndexOf };