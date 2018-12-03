"use strict";
var conf = require("../conf/conf");
var Mysql = require("../utils/MysqlUtils");
var RpcApi = require("../utils/safedsaferpc");
var GetBtcAssetAddress = require("./GetBTCAssetAddress");

var async = require("async");
var bTime = new Date().getTime();

function AsyncAddressTx() {
    this.startHeight = 1;
    this.endHeight = 9999999;
    this.step = 10;
    this.DB = new Mysql(conf.mysqlConf);
    this.api = new RpcApi(conf.rpcconf, 5);

    this.asset = new GetBtcAssetAddress();
}

AsyncAddressTx.prototype.error = function (err, msg) {
    if (JSON.stringify(err) === "{}" || err.code === -28) {
        console.log("节点程序未启动或者正在启动，请稍等。1分钟后再次尝试连接。");
        this.timer();
    } else {
        console.error(err);
        console.log(msg);
        process.exit();
    }
};

/**
 * 开始程序，并获取BD中的已经同步的高度
 */
AsyncAddressTx.prototype.start = function () {
    var self = this;
    self.DB.getCurrentBlockHeight(function (err, result) {
        if (err) {
            return self.error(err, "get current block height err");
        }
        console.log("db block height : " + JSON.stringify(result));
        if (result && result.height > 0) {
            self.startHeight = parseInt(result.height);
        }
        self.getBlockChianHeight();
    })
};

AsyncAddressTx.prototype.getBlockChianHeight = function () {
    var self = this;
    self.api.safedCall("getBlockchainInfo", function (err, info) {
        if (err) {
            return self.error(err, "get block chian info err");
        }
        console.log("chain block height : " + info.result.blocks);
        self.endHeight = info.result.blocks;
        if (self.startHeight === 1) {
            self.startHeight = info.result.blocks - 1000;
        }
        self.initAsyncHeight()
    })
};

/**
 * 循环当前同步的高度和最高区块之间的50个
 */
AsyncAddressTx.prototype.initAsyncHeight = function () {
    var self = this;
    var theEndHeight = self.startHeight + self.step > self.endHeight ? self.endHeight : self.startHeight + self.step;
    self.eachBlockHeight(self.startHeight, theEndHeight, function (currentHeight) {
        self.startHeight = currentHeight;
        self.DB.updateBlockHeight(currentHeight, function (err) {
            if (err) {
                return self.error(err, "update async block height err : ");
            }
            if (self.startHeight === self.endHeight) {
                console.log("全部同步结束，等待下一次同步。");
                self.timer();
            } else {
                self.initAsyncHeight();
            }
        });
    })
};

/**
 * 解析从start开始到end 的区块，获取其中的地址
 * 查询DB是否存在，如果不存在获取地址的金额，并插入数据库中去
 */
AsyncAddressTx.prototype.eachBlockHeight = function (start, end, doneCb) {
    var self = this;
    var begin = new Date().getTime();
    var beginHeight = start;
    async.whilst(function () {
        return start < end;
    }, function (eachCB) {
        self.getBlockDetailByHeight(start, function () {
            start++;
            eachCB();
        });
    }, function () {
        var currTime = new Date().getTime();
        var processTime = currTime - begin;
        var totalTime = getSpendTimeDesc(currTime - bTime);
        console.log("****************************************************************");
        console.log("[" + beginHeight + "-" + end + "]已经处理完 耗时:" + processTime + "总运行时长:" + totalTime);
        console.log("****************************************************************");
        doneCb(start);
    })
};

/**
 * 将区块高度对应的区块解析出来，获取其中的地址
 * 查询数据库，如果存在，不做处理，如果不存在插入到数据库中去
 */
AsyncAddressTx.prototype.getBlockDetailByHeight = function (height, cb) {
    var self = this;
    self.api.safedCall("getBlockHash", height, function (err, result) {
        if (err) {
            return self.error(err, "ERROR 根据高度获取区块hash:" + height);
        }
        var blockHash = result.result;
        self.api.safedCall("getBlock", blockHash, true, function (err, rs) {
            if (err) {
                return self.error(err, "ERROR get block height : " + blockHash);
            }

            self.getTransactionJson(rs.result.tx, height, function (addressList) {
                async.each(addressList, function (item, eachCB) {
                    self.insertAddress(item, function () {
                        eachCB();
                    })
                }, function () {
                    cb();
                });
            });
        });
    });
};

/**
 * 传入参数 block的JSON对象
 * 解析这个JSON对象，获取其中的地址
 * 根据地址查询DB，如果存在，那么不错处理，如果不存在，那么处理这个地址
 */
AsyncAddressTx.prototype.getTransactionJson = function (txIds, height, cb) {
    var self = this;
    var addressTxList = [];
    var index = 1;
    async.each(txIds, function (txId, eachCB) {
        var txidIndex = index++;
        self.api.safedCall("getrawtransaction", txId, 1, function (err, tx) {
            tx = tx.result;
            // eachSeries
            async.each(tx.vin, function (input, asyncCB) {
                if (input.coinbase) {
                    return asyncCB();
                }
                var scriptPubKey = {};
                //在 tx 中查找已经保存的交易信息
                self.DB.getAddressByTxAndIndex({
                    txId: input.txid,
                    outputIndex: input.vout
                }, function (err, scriptPubKey) {
                    if (err) {
                        return self.error(err, "get address by txId err");
                    }
                    //如果不到交易说明上一个交易在当前区块的后面的交易中，
                    //需要提前查找交易信息
                    if (scriptPubKey === null) {
                        self.api.safedCall("getrawtransaction", input.txid, 1, function (err, previousTx) {
                            if (err) {
                                return self.error(err, "get previous transaction err by :" + input.txid);
                            }

                            previousTx = previousTx.result;
                            // 判断上一个交易的vout index 是不是在相同的下标中
                            if (previousTx.vout[input.vout].n === input.vout) {
                                scriptPubKey = previousTx.vout[input.vout].scriptPubKey;
                            } else { //如果不在each 查找
                                previousTx.vout.forEach(function (out) {
                                    if (out.n === input.vout) {
                                        scriptPubKey = out.scriptPubKey;
                                    }
                                })
                            }
                            addressTxList.push({
                                address: self.getAddressByScriptPubKey(scriptPubKey),
                                txId: tx.txid,
                                time: tx.time,
                                outputIndex: -1,
                                txidIndex: txidIndex,
                                blockHeight: height
                            });
                            asyncCB();
                        })
                    } else {
                        addressTxList.push({
                            address: self.getAddressByScriptPubKey(scriptPubKey),
                            txId: tx.txid,
                            time: tx.time,
                            outputIndex: -1
                        });
                        asyncCB();
                    }
                })
            }, function () {
                tx.vout.forEach(function (out) {
                    addressTxList.push({
                        address: self.getAddressByScriptPubKey(out.scriptPubKey),
                        txId: tx.txid,
                        time: tx.time,
                        outputIndex: out.n,
                        txidIndex: txidIndex,
                        blockHeight: height
                    });
                    // 如果当前交易是资产类型
                    if (self.judgeAssetTransactionForVout(out)) {
                        self.api.safedCall("omni_gettransaction", txId, function (err, tx) {
                            if (!err) {
                                self.asset.saveTransactionByAsset(tx.result, txidIndex, function (err) {
                                    if (err) {
                                        return self.error(err, "save asset tx err :" + txId);
                                    }
                                })
                            }
                        })
                    }
                });
                //  添加一个交易详情到DB
                self.DB.insertTransactionDetail({txId: tx.txid, detail: JSON.stringify(tx)}, function (err, result) {
                    if (err) {
                        return eachCB();
                    }
                    eachCB();
                });
            })
        })
    }, function () {
        cb(addressTxList);
    });
};

AsyncAddressTx.prototype.getAddressByScriptPubKey = function (pubKey) {
    //判断当前交易的交易类型是不是脚本交易
    if (pubKey && pubKey.addresses) {
        return pubKey.addresses[0];
    } else {
        //如果是脚本交易保存交易的asm和hex 并保存在BTC_ADDR_11表中
        var random = parseInt(Math.random() * 10);// 创建随机数，
        return pubKey.asm + "_" + pubKey.hex + "_" + random + random;
    }
};

AsyncAddressTx.prototype.judgeAssetTransactionForVout = function (out) {
    if (!out.scriptPubKey.addresses) {
        if (out.scriptPubKey.hex && out.value === 0) {
            var hex = new Buffer(out.scriptPubKey.hex, "hex");
            var assetId = parseInt(hex.slice(6, 14).toString("hex"), 16);
            var assetKey = hex.slice(0, 1).toString("hex");
            var assetName = hex.slice(2, 6).toString();

            if (assetKey === "6a" && assetName === "omni" && assetId === 2) { // todo assetId === 31 正式环境
                return true;
            }
        }
    }
    return false;
};

/**
 * 处理某个某个地址
 * 查询数据库，检查这个地址存不存在，存在不做处理
 * 不存在那么将调用RPC获取地址的余额，之后将数据存放到DB中去
 */
AsyncAddressTx.prototype.insertAddress = function (address, cb) {
    this.DB.insertAddressTxId(address, cb);
};

/**
 * 定时器，当同步完成所有区块是启动
 */
AsyncAddressTx.prototype.timer = function () {
    var self = this;
    setTimeout(function () {
        self.getBlockChianHeight();
    }, 60 * 1000)
};

/**
 * 获取总的耗时
 * 多少小时，多少分钟，多少秒
 */
function getSpendTimeDesc(time) {
    var h = parseInt(time / (60 * 60 * 1000));
    var m = parseInt((time - h * 60 * 60 * 1000) / (60 * 1000));
    var s = parseInt((time - h * 60 * 60 * 1000 - m * 60 * 1000) / (1000));
    return h + "小时" + m + "分钟" + s + "秒";
}

module.exports = AsyncAddressTx;