"use strict";

var conf = require("../conf/conf");
var RpcApi = require("../utils/safedsaferpc");
var api = new RpcApi(conf.rpcconf);
var GetBTCAssetAddress = require("../route/GetBTCAssetAddress");

var asset = new GetBTCAssetAddress();


var txId = "22e1aa48d6b1b21ecf048650bdc7bb53f1a8270da91495a83246f3db943f99f7";

// api.safedCall("getrawtransaction", txId, 1, function (err, tx) {
//     tx = tx.result;
//     tx.vout.forEach(function (out) {
//         // 如果当前交易是资产类型
//         if (judgeAssetTransactionForVout(out)) {
//             api.safedCall("omni_gettransaction", txId, function (err, tx) {
//                 if (err) {
//                     return self.error(err, "get asset err :" + txId);
//                 }
//
//                 // console.log(tx)
//                 asset.saveTransactionByAsset(tx.result,1,function () {
//                     console.log("end");
//                 })
//             })
//         }
//     });
// });

// console.log(judgeAssetTransactionForVout({
//     "value": 0.01098989,
//     "n": 0,
//     "scriptPubKey": {
//         "asm": "0 5db20dfa4653523f4228c10273b0a8d0473e18e4",
//         "hex": "00145db20dfa4653523f4228c10273b0a8d0473e18e4",
//         "type": "witness_v0_keyhash"
//     }
// }));

// var hex = "00145db20dfa4653523f4228c10273b0a8d0473e18e4";
// console.log(hex.substr(26, 2));


// var hex = new Buffer("6a146f6d6e69000000000000001f000000000bebc200", "hex");

console.log(judgeAssetTransactionForVout({
    "value": 0.00000000,
    "n": 1,
    "scriptPubKey": {
        "asm": "OP_RETURN 6f6d6e690000000000000002000000000bebc200",
        "hex": "6a146f6d6e60000000000000002000000000bebc2009",
        "type": "nulldata"
    }
}));

function judgeAssetTransactionForVout(out) {
    if (!out.scriptPubKey.addresses) {
        if (out.scriptPubKey.hex && out.value === 0) {
            var hex = new Buffer(out.scriptPubKey.hex, "hex");
            var assetId = parseInt(hex.slice(6, 14).toString("hex"), 16);
            var assetKey = hex.slice(0, 1).toString("hex");
            var assetName = hex.slice(2, 6).toString();

            if (assetKey === "6a" && assetId === 2 && assetName === "omni") {
                return true;
            }
        }
    }
    return false;
}
