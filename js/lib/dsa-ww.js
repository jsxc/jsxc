;
(function(root) {
    "use strict";

    root.OTR = {}
    root.crypto = {}
    root.DSA = {};

    // default imports
    var imports = [
        'build/dep/salsa20.js',
        'build/dep/bigint.js',
        'build/dep/crypto.js',
        'build/dep/eventemitter.js',
        'lib/const.js',
        'lib/helpers.js',
        'lib/dsa.js',
    ]

    function sendMsg(type, data) {
        postMessage({
            type: type,
            data: data,
        })
    }

    self.onmessage = function(e) {
        var data = e.data;

        root.crypto = {
            getRandomValues: function() {
                var buf = data.random;
            }
        };

        if (data.imports)
            imports = data.imports

        importScripts.apply(self, imports);

        sendMsg('debug', 'DSA key creation started')

        var dsa = new DSA()

        sendMsg('debug', 'DSA key creation finished')

        sendMsg('data', {key: dsa.packPrivate()})
    }

}(this))