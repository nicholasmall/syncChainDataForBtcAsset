"use strict";

var mysql = require("mysql");

function MysqlUtils(mysqlConf) {
    this.connection = mysql.createConnection(mysqlConf);
    this.connection.connect();
}

/**
 * 截取地址或者交易的最后两位并转换成大写
 * @param str
 * @return {string}
 */
MysqlUtils.prototype.subStrLastTowTurnUpperCase = function (str) {
    return str.substr(str.length - 2, str.length).toLocaleUpperCase()
};

/**
 *
 * @param cb
 */
MysqlUtils.prototype.getCurrentBlockHeight = function (cb) {
    var sql = "select * from block";
    this.sql(sql, [], function (err, result) {
        if (err) {
            return cb(err);
        }
        cb(null, result[0]);
    });
};

MysqlUtils.prototype.updateBlockHeight = function (height, cb) {
    var sql = "update block set height = ?";
    var option = [height];
    var self = this;
    self.sql(sql, option, function (err, result) {
        if (err) {
            console.log("update async block height err  : " + JSON.stringify(err))
        }
        if (result) {
            if (result.affectedRows === 0) {
                sql = "insert into block(height) value(?)";
                self.sql(sql, option, function (err, result) {
                    if (err) {
                        console.log("insert async block height err  : " + JSON.stringify(err))
                    }
                    cb(null, result);
                })
            } else {
                cb(null, result);
            }
        }
        else {
            cb(null, result);
        }
    })
};

/**
 * 添加
 * @param params
 * @param cb
 */
MysqlUtils.prototype.insertAddressTxId = function (params, cb) {
    var tableSuffix = this.subStrLastTowTurnUpperCase(params.address);
    var sql = "INSERT INTO BTC_ADDR_" + tableSuffix + " VALUE(?, ?, ?, ?, ?, ?)";
    var option = [params.address, params.txId, params.outputIndex, params.time, params.txidIndex, params.blockHeight];
    this.sql(sql, option, function (err, result) {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return cb(null, result);
            }
            return cb(err);
        }
        cb(err, result);
    })
};

MysqlUtils.prototype.getAddressByTxAndIndex = function (params, cb) {
    var tableSuffix = this.subStrLastTowTurnUpperCase(params.txId);
    var sql = "SELECT * FROM BTC_TX_" + tableSuffix + " WHERE txId=? ";
    var option = [params.txId];
    this.sql(sql, option, function (err, result) {
        if (err) {
            return cb(err);
        }

        if (result && result[0] && result[0].details) {
            var json = JSON.parse(result[0].details);

            if (json.vout[params.outputIndex].n === params.outputIndex) {
                cb(null, json.vout[params.outputIndex].scriptPubKey);
            } else {
                json.vout.forEach(function (out) {
                    if (out.n === params.outputIndex) {
                        cb(null, out.scriptPubKey);
                    }
                })
            }
        } else {
            cb(null, null);
        }
    })
};

MysqlUtils.prototype.insertTransactionDetail = function (params, cb) {
    var tableSuffix = this.subStrLastTowTurnUpperCase(params.txId);
    var sql = "INSERT INTO BTC_TX_" + tableSuffix + " VALUES(?, ?)";
    var option = [params.txId, params.detail];
    this.sql(sql, option, function (err, result) {
        if (err) {
            return cb(err, result);
        }
        cb(null, result);
    })
};

MysqlUtils.prototype.sql = function (sql, option, cb) {
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



module.exports = MysqlUtils;