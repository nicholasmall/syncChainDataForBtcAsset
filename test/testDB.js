"use strict";

var conf = require("../conf/conf");
var mysql = require("../utils/MysqlUtils");
var db = new mysql(conf.assetMysqlConf);

db.getCurrentBlockHeight(function (err, block) {
    console.log(block)
});