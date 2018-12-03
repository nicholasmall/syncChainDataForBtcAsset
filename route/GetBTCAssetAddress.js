"use strict";

var conf = require("../conf/conf");
var AssetMysqlUtils = require("../utils/AssetMysqlUtils");
var async = require("async");

function GetBTCAssetAddress() {
    this.db = new AssetMysqlUtils(conf.assetMysqlConf);
}

/**
 * 保存交易数据
 * @param tx
 * @param txidIndex
 * @param cb
 */
GetBTCAssetAddress.prototype.saveTransactionByAsset = function (tx, txidIndex, cb) {
    var self = this;
    var txData = {
        txId: tx.txid,
        detail: JSON.stringify(tx),
        propertyid: tx.propertyid
    };
    this.db.insertAssetTransactionDetail(txData, function (err) {
        if (err) {
            return cb(err);
        }
        var addresses = [{
            propertyid: tx.propertyid,
            txId: tx.txid,
            time: tx.blocktime,
            txidIndex:txidIndex,
            blockHeight: tx.block,
            address:tx.sendingaddress,
            outputIndex:-1
        },{
            propertyid: tx.propertyid,
            txId: tx.txid,
            time: tx.blocktime,
            blockHeight: tx.block,
            address:tx.referenceaddress,
            outputIndex:1
        }];
        self.saveAddressDetail(addresses, cb);
    })
};

/**
 * 保存地址数据
 * @param addresses
 * @param cb
 */
GetBTCAssetAddress.prototype.saveAddressDetail = function (addresses, cb) {
    var self = this;
    async.each(addresses, function (address, eachCB) {
        self.db.insertAddressTxId(address, eachCB);
    }, function (err) {
        cb(err);
    })
};

module.exports = GetBTCAssetAddress;