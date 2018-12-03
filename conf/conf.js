"use strict";
module.exports = {
    rpcconf: {
        protocol: 'http',
        host: "10.0.0.86",
        port: "18332",
        user: "rpcuser",
        pass: "rpcpass"
    }, assetRpcConf: {
        protocol: 'http',
        host: "10.0.0.86",
        port: "18332",
        user: "rpcuser",
        pass: "rpcpass"
    }, mysqlConf: {
        "host": "10.0.0.66",
        "port": 3306,
        "user": "maots",
        "password": "123456",
        "database": "BTCChain",
        'useConnectionPooling': true
    }, assetMysqlConf: {
        "host": "10.0.0.86",
        "port": 3306,
        "user": "maots",
        "password": "123456",
        "database": "BTCAssetChain",
        'useConnectionPooling': true
    }
};