"use strict";
var async = require("async");
var start = 0;
var end = 50;
var array = [];

function testReturn() {
    setTimeout(function () {
        return 1+2;
    },500)
}

function testCB(cb) {
    setTimeout(function () {
        cb(1+2);
    })
}

var num = testReturn();
console.log(num);

testCB(function (num) {
    console.log(num)
});