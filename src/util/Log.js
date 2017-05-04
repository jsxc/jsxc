"use strict";
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Debug"] = 0] = "Debug";
    LogLevel[LogLevel["Info"] = 1] = "Info";
    LogLevel[LogLevel["Warn"] = 2] = "Warn";
    LogLevel[LogLevel["Error"] = 3] = "Error";
})(LogLevel || (LogLevel = {}));
;
var Log = (function () {
    function Log() {
    }
    Log.info = function (message, data) {
        console.log(message, data);
    };
    Log.debug = function (message, data) {
        console.log(message, data);
    };
    Log.warn = function (message, data) {
        console.warn(message, data);
    };
    Log.error = function (message, data) {
        console.error(message, data);
    };
    Log.getPrefix = function (level) {
        return '[' + LogLevel[level] + ']';
    };
    return Log;
}());
exports.__esModule = true;
exports["default"] = Log;
