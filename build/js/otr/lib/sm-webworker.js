;(function (root) {
  "use strict";

  root.OTR = {}
  root.crypto = {}

  // default imports
  var imports = [
      'vendor/salsa20.js'
    , 'vendor/bigint.js'
    , 'vendor/crypto.js'
    , 'vendor/eventemitter.js'
    , 'lib/const.js'
    , 'lib/helpers.js'
    , 'lib/sm.js'
  ]

  function wrapPostMessage(method) {
    return function () {
      postMessage({
          method: method
        , args: Array.prototype.slice.call(arguments, 0)
      })
    }
  }

  var sm
  onmessage = function (e) {
    var data = e.data
    switch (data.type) {
      case 'seed':
        root.crypto.randomBytes = function () {
          return data.seed
        }
        if (data.imports) imports = data.imports
        importScripts.apply(root, imports)
        break
      case 'init':
        sm = new root.OTR.SM(data.reqs)
        ;['trust','question', 'send', 'abort'].forEach(function (m) {
          sm.on(m, wrapPostMessage(m));
        })
        break
      case 'method':
        sm[data.method].apply(sm, data.args)
        break
    }
  }

}(this))