;(function(root) {
    "use strict";

    root.OTR = {}
    root.crypto = {}
    root.DSA = {};

    // default imports
    var imports = [
        'vendor/salsa20.js', 
        'vendor/bigint.js',
        'vendor/crypto.js',
        'vendor/eventemitter.js',
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
        
        if (data.imports)
            imports = data.imports
        
        importScripts.apply(self, imports);
        
        sendMsg('debug', 'DSA key creation started')
        
        var dsa = new DSA()
        
        sendMsg('debug', 'DSA key creation finished')
        
        sendMsg('data', {key: dsa.packPrivate()})
    }

}(this))