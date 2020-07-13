const { Int32ToBytes, Int64ToBytes, HexToByteArray, ByteToInt, ByteArrayToHex, HashToNumber } = require('../util');

var buffer = Buffer.from(Int32ToBytes(50));
console.log(buffer.length)