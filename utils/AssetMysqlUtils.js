"use strict";
var mysql = require("mysql");

function AssetMysqlUtils(mysqlConf) {
    this.connection = mysql.createConnection(mysqlConf);
    this.connection.connect();
}

/**
 * 添加交易详情
 * @param params
 * @param cb
 */
AssetMysqlUtils.prototype.insertAssetTransactionDetail = function (params, cb) {
    var tableSuffix = this.subStrLastTowTurnUpperCase(params.txId);
    var sql = "INSERT INTO BTC_TX_" + tableSuffix + " VALUES(?, ?, ?)";
    var option = [params.txId, params.detail, params.propertyid];
    this.sql(sql, option, function (err, result) {
        if (err) {
            return cb(err, result);
        }
        cb(null, result);
    })
};

/**
 * 添加地址信息
 * @param params
 * @param cb
 */
AssetMysqlUtils.prototype.insertAddressTxId = function (params, cb) {
    var tableSuffix = this.subStrLastTowTurnUpperCase(params.address);
    var sql = "INSERT INTO BTC_ADDR_" + tableSuffix + " VALUE(?, ?, ?, ?, ?, ?,?)";
    var option = [params.address, params.txId, params.outputIndex, params.time, params.txidIndex, params.blockHeight, params.propertyid];
    this.sql(sql, option, function (err, result) {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return cb(null, result);
            }
            return cb(err)
        }
        cb(err, result);
    })
};

AssetMysqlUtils.prototype.sql = function (sql, option, cb) {
    this.connection.query(sql, option, function (err, result) {
        if (err) {
            if (err.errno !== 1062) {
                console.log("mysql Utils insert err :" + err);
                return cb(err);
            }
        }
        cb(null, result);
    })
};

AssetMysqlUtils.prototype.subStrLastTowTurnUpperCase = function (str) {
    return str.substr(str.length - 2, str.length).toLocaleUpperCase()
};

module.exports = AssetMysqlUtils;