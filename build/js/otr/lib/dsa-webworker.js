/*global DSA */
;(function (root) {
  "use strict";

  root.OTR = {}
  root.crypto = {}
  root.DSA = {};

  // default imports
  var imports = [
      'vendor/salsa20.js'
    , 'vendor/bigint.js'
    , 'vendor/crypto.js'
    , 'vendor/eventemitter.js'
    , 'lib/const.js'
    , 'lib/helpers.js'
    , 'lib/dsa.js'
  ]

  function sendMsg(type, val) {
    postMessage({ type: type, val: val })
  }

  onmessage = function (e) {
    var data = e.data;

    root.crypto.randomBytes = function () {
      return data.seed
    }

    if (data.imports) imports = data.imports
    importScripts.apply(root, imports);

    if (data.debug) sendMsg('debug', 'DSA key creation started')
    var dsa = new DSA()
    if (data.debug) sendMsg('debug', 'DSA key creation finished')
    sendMsg('data', dsa.packPrivate())
  }

}(this))