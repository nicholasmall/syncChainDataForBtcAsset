'use strict';
// var SafeApi = require("bitcoind-rpc");
var SafeApi = require("qtumd-rpc");
var callStack = [];
var processingCount = 0;

/**
 * 安全调用RPC的类
 */
function SafedRPC(config, limit) {
    this.api = new SafeApi(config);
    this.limit = undefined == limit ? 30 : limit;
}

/**
 * 无需声明任何的参数，所有的参数将按照特定的方法进行
 */
SafedRPC.prototype.safedCall = function () {
    var args = Array.prototype.slice.call(arguments);
    //var middleCallback=this.safedCallback.bind(this,args[args.length-1]);
    var middleCallback = this.safedCallback.bind(this, args[args.length - 1]);

    args[args.length - 1] = middleCallback;

    //console.log(args);
    //console.log(JSON.stringify(args.slice(1)));
    if (processingCount > this.limit) {
        callStack.push(args);
        //console.log("waiting statck lenght is:"+callStack.length);
    } else {
        processingCount = processingCount + 1;
        //console.log("ready to processing:"+processingCount);
        this.api[args[0]].apply(this.api, args.slice(1));
    }
};

/**
 * 管理回掉函数，处理函数调用
 */
SafedRPC.prototype.safedCallback = function () {
    processingCount = processingCount - 1;
    //console.log("回掉释放之后："+processingCount)
    var args = Array.prototype.slice.call(arguments);
    args[0].apply(this, args.slice(1));//调用真正的回调函数
    if (callStack.length > 0) {
        var callArr = callStack.reverse().pop();//弹出第一个元素，需要考虑到数组如果太大会不会出现异常
        callStack.reverse();//将排队元素重新归位
        processingCount = processingCount + 1;
        //console.log("添加调用之后："+processingCount)
        this.api[callArr[0]].apply(this.api, callArr.slice(1));
    }
};

module.exports = SafedRPC;