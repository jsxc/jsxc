/*!
 * jsxc v1.1.0 - 2015-03-08
 * 
 * This file concatenates all dependencies of jsxc.
 * 
 */

/*!
 * Source: build/lib/strophe.js, license: multiple, url: http://strophe.im/strophejs/ */
/**
 * Modified by
 * Klaus Herberth, 2014
 */

/*! This code was written by Tyler Akins and has been placed in the
   public domain.  It would be nice if you left this header intact.
   Base64 code from Tyler Akins -- http://rumkin.com
*/

var Base64 = (function () {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    var obj = {
        /**
         * Encodes a string in base64
         * @param {String} input The string to encode in base64.
         */
        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            do {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                    keyStr.charAt(enc3) + keyStr.charAt(enc4);
            } while (i < input.length);

            return output;
        },

        /**
         * Decodes a base64 string.
         * @param {String} input The string to decode.
         */
        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            } while (i < input.length);

            return output;
        }
    };

    return obj;
})();

/*!
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/* Some functions and variables have been stripped for use with Strophe */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function b64_sha1(s){return binb2b64(core_sha1(str2binb(s),s.length * 8));}
function str_sha1(s){return binb2str(core_sha1(str2binb(s),s.length * 8));}
function b64_hmac_sha1(key, data){ return binb2b64(core_hmac_sha1(key, data));}
function str_hmac_sha1(key, data){ return binb2str(core_hmac_sha1(key, data));}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = new Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  var i, j, t, olda, oldb, oldc, oldd, olde;
  for (i = 0; i < x.length; i += 16)
  {
    olda = a;
    oldb = b;
    oldc = c;
    oldd = d;
    olde = e;

    for (j = 0; j < 80; j++)
    {
      if (j < 16) { w[j] = x[i + j]; }
      else { w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1); }
      t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return [a, b, c, d, e];
}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if (t < 20) { return (b & c) | ((~b) & d); }
  if (t < 40) { return b ^ c ^ d; }
  if (t < 60) { return (b & c) | (b & d) | (c & d); }
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data)
{
  var bkey = str2binb(key);
  if (bkey.length > 16) { bkey = core_sha1(bkey, key.length * 8); }

  var ipad = new Array(16), opad = new Array(16);
  for (var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * 8);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str)
{
  var bin = [];
  var mask = 255;
  for (var i = 0; i < str.length * 8; i += 8)
  {
    bin[i>>5] |= (str.charCodeAt(i / 8) & mask) << (24 - i%32);
  }
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  var str = "";
  var mask = 255;
  for (var i = 0; i < bin.length * 32; i += 8)
  {
    str += String.fromCharCode((bin[i>>5] >>> (24 - i%32)) & mask);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  var triplet, j;
  for (var i = 0; i < binarray.length * 4; i += 3)
  {
    triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16) |
              (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 ) |
               ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
    for (j = 0; j < 4; j++)
    {
      if (i * 8 + j * 6 > binarray.length * 32) { str += "="; }
      else { str += tab.charAt((triplet >> 6*(3-j)) & 0x3F); }
    }
  }
  return str;
}

/*!
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Everything that isn't used by Strophe has been stripped here!
 */

var MD5 = (function () {
    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */
    var safe_add = function (x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    };

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    var bit_rol = function (num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    };

    /*
     * Convert a string to an array of little-endian words
     */
    var str2binl = function (str) {
        var bin = [];
        for(var i = 0; i < str.length * 8; i += 8)
        {
            bin[i>>5] |= (str.charCodeAt(i / 8) & 255) << (i%32);
        }
        return bin;
    };

    /*
     * Convert an array of little-endian words to a string
     */
    var binl2str = function (bin) {
        var str = "";
        for(var i = 0; i < bin.length * 32; i += 8)
        {
            str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & 255);
        }
        return str;
    };

    /*
     * Convert an array of little-endian words to a hex string.
     */
    var binl2hex = function (binarray) {
        var hex_tab = "0123456789abcdef";
        var str = "";
        for(var i = 0; i < binarray.length * 4; i++)
        {
            str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
                hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
        }
        return str;
    };

    /*
     * These functions implement the four basic operations the algorithm uses.
     */
    var md5_cmn = function (q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q),safe_add(x, t)), s),b);
    };

    var md5_ff = function (a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    };

    var md5_gg = function (a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    };

    var md5_hh = function (a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    };

    var md5_ii = function (a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    };

    /*
     * Calculate the MD5 of an array of little-endian words, and a bit length
     */
    var core_md5 = function (x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var a =  1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d =  271733878;

        var olda, oldb, oldc, oldd;
        for (var i = 0; i < x.length; i += 16)
        {
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;

            a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

            a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

            a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

            a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return [a, b, c, d];
    };


    var obj = {
        /*
         * These are the functions you'll usually want to call.
         * They take string arguments and return either hex or base-64 encoded
         * strings.
         */
        hexdigest: function (s) {
            return binl2hex(core_md5(str2binl(s), s.length * 8));
        },

        hash: function (s) {
            return binl2str(core_md5(str2binl(s), s.length * 8));
        }
    };

    return obj;
})();

/*!
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2008, OGG, LLC
*/

/* jshint undef: true, unused: true:, noarg: true, latedef: true */
/*global document, window, setTimeout, clearTimeout, console,
    ActiveXObject, Base64, MD5, DOMParser */
// from sha1.js
/*global core_hmac_sha1, binb2str, str_hmac_sha1, str_sha1, b64_hmac_sha1*/

/** File: strophe.js
 *  A JavaScript library for XMPP BOSH/XMPP over Websocket.
 *
 *  This is the JavaScript version of the Strophe library.  Since JavaScript
 *  had no facilities for persistent TCP connections, this library uses
 *  Bidirectional-streams Over Synchronous HTTP (BOSH) to emulate
 *  a persistent, stateful, two-way connection to an XMPP server.  More
 *  information on BOSH can be found in XEP 124.
 *
 *  This version of Strophe also works with WebSockets.
 *  For more information on XMPP-over WebSocket see this RFC draft:
 *  http://tools.ietf.org/html/draft-ietf-xmpp-websocket-00
 */

/** PrivateFunction: Function.prototype.bind
 *  Bind a function to an instance.
 *
 *  This Function object extension method creates a bound method similar
 *  to those in Python.  This means that the 'this' object will point
 *  to the instance you want.  See
 *  <a href='https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind'>MDC's bind() documentation</a> and
 *  <a href='http://benjamin.smedbergs.us/blog/2007-01-03/bound-functions-and-function-imports-in-javascript/'>Bound Functions and Function Imports in JavaScript</a>
 *  for a complete explanation.
 *
 *  This extension already exists in some browsers (namely, Firefox 3), but
 *  we provide it to support those that don't.
 *
 *  Parameters:
 *    (Object) obj - The object that will become 'this' in the bound function.
 *    (Object) argN - An option argument that will be prepended to the
 *      arguments given for the function call
 *
 *  Returns:
 *    The bound function.
 */
if (!Function.prototype.bind) {
    Function.prototype.bind = function (obj /*, arg1, arg2, ... */)
    {
        var func = this;
        var _slice = Array.prototype.slice;
        var _concat = Array.prototype.concat;
        var _args = _slice.call(arguments, 1);

        return function () {
            return func.apply(obj ? obj : this,
                              _concat.call(_args,
                                           _slice.call(arguments, 0)));
        };
    };
}

/** PrivateFunction: Array.prototype.indexOf
 *  Return the index of an object in an array.
 *
 *  This function is not supplied by some JavaScript implementations, so
 *  we provide it if it is missing.  This code is from:
 *  http://developer.mozilla.org/En/Core_JavaScript_1.5_Reference:Objects:Array:indexOf
 *
 *  Parameters:
 *    (Object) elt - The object to look for.
 *    (Integer) from - The index from which to start looking. (optional).
 *
 *  Returns:
 *    The index of elt in the array or -1 if not found.
 */
if (!Array.prototype.indexOf)
{
    Array.prototype.indexOf = function(elt /*, from*/)
    {
        var len = this.length;

        var from = Number(arguments[1]) || 0;
        from = (from < 0) ? Math.ceil(from) : Math.floor(from);
        if (from < 0) {
            from += len;
        }

        for (; from < len; from++) {
            if (from in this && this[from] === elt) {
                return from;
            }
        }

        return -1;
    };
}

/* All of the Strophe globals are defined in this special function below so
 * that references to the globals become closures.  This will ensure that
 * on page reload, these references will still be available to callbacks
 * that are still executing.
 */

(function (callback) {
var Strophe;

/** Function: $build
 *  Create a Strophe.Builder.
 *  This is an alias for 'new Strophe.Builder(name, attrs)'.
 *
 *  Parameters:
 *    (String) name - The root element name.
 *    (Object) attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $build(name, attrs) { return new Strophe.Builder(name, attrs); }
/** Function: $msg
 *  Create a Strophe.Builder with a <message/> element as the root.
 *
 *  Parmaeters:
 *    (Object) attrs - The <message/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $msg(attrs) { return new Strophe.Builder("message", attrs); }
/** Function: $iq
 *  Create a Strophe.Builder with an <iq/> element as the root.
 *
 *  Parameters:
 *    (Object) attrs - The <iq/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $iq(attrs) { return new Strophe.Builder("iq", attrs); }
/** Function: $pres
 *  Create a Strophe.Builder with a <presence/> element as the root.
 *
 *  Parameters:
 *    (Object) attrs - The <presence/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $pres(attrs) { return new Strophe.Builder("presence", attrs); }

/** Class: Strophe
 *  An object container for all Strophe library functions.
 *
 *  This class is just a container for all the objects and constants
 *  used in the library.  It is not meant to be instantiated, but to
 *  provide a namespace for library objects, constants, and functions.
 */
Strophe = {
    /** Constant: VERSION
     *  The version of the Strophe library. Unreleased builds will have
     *  a version of head-HASH where HASH is a partial revision.
     */
    VERSION: "1.1.3",

    /** Constants: XMPP Namespace Constants
     *  Common namespace constants from the XMPP RFCs and XEPs.
     *
     *  NS.HTTPBIND - HTTP BIND namespace from XEP 124.
     *  NS.BOSH - BOSH namespace from XEP 206.
     *  NS.CLIENT - Main XMPP client namespace.
     *  NS.AUTH - Legacy authentication namespace.
     *  NS.ROSTER - Roster operations namespace.
     *  NS.PROFILE - Profile namespace.
     *  NS.DISCO_INFO - Service discovery info namespace from XEP 30.
     *  NS.DISCO_ITEMS - Service discovery items namespace from XEP 30.
     *  NS.MUC - Multi-User Chat namespace from XEP 45.
     *  NS.SASL - XMPP SASL namespace from RFC 3920.
     *  NS.STREAM - XMPP Streams namespace from RFC 3920.
     *  NS.BIND - XMPP Binding namespace from RFC 3920.
     *  NS.SESSION - XMPP Session namespace from RFC 3920.
     *  NS.XHTML_IM - XHTML-IM namespace from XEP 71.
     *  NS.XHTML - XHTML body namespace from XEP 71.
     */
    NS: {
        HTTPBIND: "http://jabber.org/protocol/httpbind",
        BOSH: "urn:xmpp:xbosh",
        CLIENT: "jabber:client",
        AUTH: "jabber:iq:auth",
        ROSTER: "jabber:iq:roster",
        PROFILE: "jabber:iq:profile",
        DISCO_INFO: "http://jabber.org/protocol/disco#info",
        DISCO_ITEMS: "http://jabber.org/protocol/disco#items",
        MUC: "http://jabber.org/protocol/muc",
        SASL: "urn:ietf:params:xml:ns:xmpp-sasl",
        STREAM: "http://etherx.jabber.org/streams",
        BIND: "urn:ietf:params:xml:ns:xmpp-bind",
        SESSION: "urn:ietf:params:xml:ns:xmpp-session",
        VERSION: "jabber:iq:version",
        STANZAS: "urn:ietf:params:xml:ns:xmpp-stanzas",
        XHTML_IM: "http://jabber.org/protocol/xhtml-im",
        XHTML: "http://www.w3.org/1999/xhtml"
    },


    /** Constants: XHTML_IM Namespace
     *  contains allowed tags, tag attributes, and css properties.
     *  Used in the createHtml function to filter incoming html into the allowed XHTML-IM subset.
     *  See http://xmpp.org/extensions/xep-0071.html#profile-summary for the list of recommended
     *  allowed tags and their attributes.
     */
    XHTML: {
                tags: ['a','blockquote','br','cite','em','img','li','ol','p','span','strong','ul','body'],
                attributes: {
                        'a':          ['href'],
                        'blockquote': ['style'],
                        'br':         [],
                        'cite':       ['style'],
                        'em':         [],
                        'img':        ['src', 'alt', 'style', 'height', 'width'],
                        'li':         ['style'],
                        'ol':         ['style'],
                        'p':          ['style'],
                        'span':       ['style'],
                        'strong':     [],
                        'ul':         ['style'],
                        'body':       []
                },
                css: ['background-color','color','font-family','font-size','font-style','font-weight','margin-left','margin-right','text-align','text-decoration'],
                validTag: function(tag)
                {
                        for(var i = 0; i < Strophe.XHTML.tags.length; i++) {
                                if(tag == Strophe.XHTML.tags[i]) {
                                        return true;
                                }
                        }
                        return false;
                },
                validAttribute: function(tag, attribute)
                {
                        if(typeof Strophe.XHTML.attributes[tag] !== 'undefined' && Strophe.XHTML.attributes[tag].length > 0) {
                                for(var i = 0; i < Strophe.XHTML.attributes[tag].length; i++) {
                                        if(attribute == Strophe.XHTML.attributes[tag][i]) {
                                                return true;
                                        }
                                }
                        }
                        return false;
                },
                validCSS: function(style)
                {
                        for(var i = 0; i < Strophe.XHTML.css.length; i++) {
                                if(style == Strophe.XHTML.css[i]) {
                                        return true;
                                }
                        }
                        return false;
                }
    },

    /** Constants: Connection Status Constants
     *  Connection status constants for use by the connection handler
     *  callback.
     *
     *  Status.ERROR - An error has occurred
     *  Status.CONNECTING - The connection is currently being made
     *  Status.CONNFAIL - The connection attempt failed
     *  Status.AUTHENTICATING - The connection is authenticating
     *  Status.AUTHFAIL - The authentication attempt failed
     *  Status.CONNECTED - The connection has succeeded
     *  Status.DISCONNECTED - The connection has been terminated
     *  Status.DISCONNECTING - The connection is currently being terminated
     *  Status.ATTACHED - The connection has been attached
     */
    Status: {
        ERROR: 0,
        CONNECTING: 1,
        CONNFAIL: 2,
        AUTHENTICATING: 3,
        AUTHFAIL: 4,
        CONNECTED: 5,
        DISCONNECTED: 6,
        DISCONNECTING: 7,
        ATTACHED: 8
    },

    /** Constants: Log Level Constants
     *  Logging level indicators.
     *
     *  LogLevel.DEBUG - Debug output
     *  LogLevel.INFO - Informational output
     *  LogLevel.WARN - Warnings
     *  LogLevel.ERROR - Errors
     *  LogLevel.FATAL - Fatal errors
     */
    LogLevel: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    },

    /** PrivateConstants: DOM Element Type Constants
     *  DOM element types.
     *
     *  ElementType.NORMAL - Normal element.
     *  ElementType.TEXT - Text data element.
     *  ElementType.FRAGMENT - XHTML fragment element.
     */
    ElementType: {
        NORMAL: 1,
        TEXT: 3,
        CDATA: 4,
        FRAGMENT: 11
    },

    /** PrivateConstants: Timeout Values
     *  Timeout values for error states.  These values are in seconds.
     *  These should not be changed unless you know exactly what you are
     *  doing.
     *
     *  TIMEOUT - Timeout multiplier. A waiting request will be considered
     *      failed after Math.floor(TIMEOUT * wait) seconds have elapsed.
     *      This defaults to 1.1, and with default wait, 66 seconds.
     *  SECONDARY_TIMEOUT - Secondary timeout multiplier. In cases where
     *      Strophe can detect early failure, it will consider the request
     *      failed if it doesn't return after
     *      Math.floor(SECONDARY_TIMEOUT * wait) seconds have elapsed.
     *      This defaults to 0.1, and with default wait, 6 seconds.
     */
    TIMEOUT: 1.1,
    SECONDARY_TIMEOUT: 0.1,

    /** Function: addNamespace
     *  This function is used to extend the current namespaces in
     *  Strophe.NS.  It takes a key and a value with the key being the
     *  name of the new namespace, with its actual value.
     *  For example:
     *  Strophe.addNamespace('PUBSUB', "http://jabber.org/protocol/pubsub");
     *
     *  Parameters:
     *    (String) name - The name under which the namespace will be
     *      referenced under Strophe.NS
     *    (String) value - The actual namespace.
     */
    addNamespace: function (name, value)
    {
      Strophe.NS[name] = value;
    },

    /** Function: forEachChild
     *  Map a function over some or all child elements of a given element.
     *
     *  This is a small convenience function for mapping a function over
     *  some or all of the children of an element.  If elemName is null, all
     *  children will be passed to the function, otherwise only children
     *  whose tag names match elemName will be passed.
     *
     *  Parameters:
     *    (XMLElement) elem - The element to operate on.
     *    (String) elemName - The child element tag name filter.
     *    (Function) func - The function to apply to each child.  This
     *      function should take a single argument, a DOM element.
     */
    forEachChild: function (elem, elemName, func)
    {
        var i, childNode;

        for (i = 0; i < elem.childNodes.length; i++) {
            childNode = elem.childNodes[i];
            if (childNode.nodeType == Strophe.ElementType.NORMAL &&
                (!elemName || this.isTagEqual(childNode, elemName))) {
                func(childNode);
            }
        }
    },

    /** Function: isTagEqual
     *  Compare an element's tag name with a string.
     *
     *  This function is case insensitive.
     *
     *  Parameters:
     *    (XMLElement) el - A DOM element.
     *    (String) name - The element name.
     *
     *  Returns:
     *    true if the element's tag name matches _el_, and false
     *    otherwise.
     */
    isTagEqual: function (el, name)
    {
        return el.tagName.toLowerCase() == name.toLowerCase();
    },

    /** PrivateVariable: _xmlGenerator
     *  _Private_ variable that caches a DOM document to
     *  generate elements.
     */
    _xmlGenerator: null,

    /** PrivateFunction: _makeGenerator
     *  _Private_ function that creates a dummy XML DOM document to serve as
     *  an element and text node generator.
     */
    _makeGenerator: function () {
        var doc;

        // IE9 does implement createDocument(); however, using it will cause the browser to leak memory on page unload.
        // Here, we test for presence of createDocument() plus IE's proprietary documentMode attribute, which would be
                // less than 10 in the case of IE9 and below.
        if (document.implementation.createDocument === undefined ||
                        document.implementation.createDocument && document.documentMode && document.documentMode < 10) {
            doc = this._getIEXmlDom();
            doc.appendChild(doc.createElement('strophe'));
        } else {
            doc = document.implementation
                .createDocument('jabber:client', 'strophe', null);
        }

        return doc;
    },

    /** Function: xmlGenerator
     *  Get the DOM document to generate elements.
     *
     *  Returns:
     *    The currently used DOM document.
     */
    xmlGenerator: function () {
        if (!Strophe._xmlGenerator) {
            Strophe._xmlGenerator = Strophe._makeGenerator();
        }
        return Strophe._xmlGenerator;
    },

    /** PrivateFunction: _getIEXmlDom
     *  Gets IE xml doc object
     *
     *  Returns:
     *    A Microsoft XML DOM Object
     *  See Also:
     *    http://msdn.microsoft.com/en-us/library/ms757837%28VS.85%29.aspx
     */
    _getIEXmlDom : function() {
        var doc = null;
        var docStrings = [
            "Msxml2.DOMDocument.6.0",
            "Msxml2.DOMDocument.5.0",
            "Msxml2.DOMDocument.4.0",
            "MSXML2.DOMDocument.3.0",
            "MSXML2.DOMDocument",
            "MSXML.DOMDocument",
            "Microsoft.XMLDOM"
        ];

        for (var d = 0; d < docStrings.length; d++) {
            if (doc === null) {
                try {
                    doc = new ActiveXObject(docStrings[d]);
                } catch (e) {
                    doc = null;
                }
            } else {
                break;
            }
        }

        return doc;
    },

    /** Function: xmlElement
     *  Create an XML DOM element.
     *
     *  This function creates an XML DOM element correctly across all
     *  implementations. Note that these are not HTML DOM elements, which
     *  aren't appropriate for XMPP stanzas.
     *
     *  Parameters:
     *    (String) name - The name for the element.
     *    (Array|Object) attrs - An optional array or object containing
     *      key/value pairs to use as element attributes. The object should
     *      be in the format {'key': 'value'} or {key: 'value'}. The array
     *      should have the format [['key1', 'value1'], ['key2', 'value2']].
     *    (String) text - The text child data for the element.
     *
     *  Returns:
     *    A new XML DOM element.
     */
    xmlElement: function (name)
    {
        if (!name) { return null; }

        var node = Strophe.xmlGenerator().createElement(name);

        // FIXME: this should throw errors if args are the wrong type or
        // there are more than two optional args
        var a, i, k;
        for (a = 1; a < arguments.length; a++) {
            if (!arguments[a]) { continue; }
            if (typeof(arguments[a]) == "string" ||
                typeof(arguments[a]) == "number") {
                node.appendChild(Strophe.xmlTextNode(arguments[a]));
            } else if (typeof(arguments[a]) == "object" &&
                       typeof(arguments[a].sort) == "function") {
                for (i = 0; i < arguments[a].length; i++) {
                    if (typeof(arguments[a][i]) == "object" &&
                        typeof(arguments[a][i].sort) == "function") {
                        node.setAttribute(arguments[a][i][0],
                                          arguments[a][i][1]);
                    }
                }
            } else if (typeof(arguments[a]) == "object") {
                for (k in arguments[a]) {
                    if (arguments[a].hasOwnProperty(k)) {
                        node.setAttribute(k, arguments[a][k]);
                    }
                }
            }
        }

        return node;
    },

    /*  Function: xmlescape
     *  Excapes invalid xml characters.
     *
     *  Parameters:
     *     (String) text - text to escape.
     *
     *  Returns:
     *      Escaped text.
     */
    xmlescape: function(text)
    {
        text = text.replace(/\&/g, "&amp;");
        text = text.replace(/</g,  "&lt;");
        text = text.replace(/>/g,  "&gt;");
        text = text.replace(/'/g,  "&apos;");
        text = text.replace(/"/g,  "&quot;");
        return text;
    },

    /** Function: xmlTextNode
     *  Creates an XML DOM text node.
     *
     *  Provides a cross implementation version of document.createTextNode.
     *
     *  Parameters:
     *    (String) text - The content of the text node.
     *
     *  Returns:
     *    A new XML DOM text node.
     */
    xmlTextNode: function (text)
    {
        return Strophe.xmlGenerator().createTextNode(text);
    },

    /** Function: xmlHtmlNode
     *  Creates an XML DOM html node.
     *
     *  Parameters:
     *    (String) html - The content of the html node.
     *
     *  Returns:
     *    A new XML DOM text node.
     */
    xmlHtmlNode: function (html)
    {
        var node;
        //ensure text is escaped
        if (window.DOMParser) {
            var parser = new DOMParser();
            node = parser.parseFromString(html, "text/xml");
        } else {
            node = new ActiveXObject("Microsoft.XMLDOM");
            node.async="false";
            node.loadXML(html);
        }
        return node;
    },

    /** Function: getText
     *  Get the concatenation of all text children of an element.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    A String with the concatenated text of all text element children.
     */
    getText: function (elem)
    {
        if (!elem) { return null; }

        var str = "";
        if (elem.childNodes.length === 0 && elem.nodeType ==
            Strophe.ElementType.TEXT) {
            str += elem.nodeValue;
        }

        for (var i = 0; i < elem.childNodes.length; i++) {
            if (elem.childNodes[i].nodeType == Strophe.ElementType.TEXT) {
                str += elem.childNodes[i].nodeValue;
            }
        }

        return Strophe.xmlescape(str);
    },

    /** Function: copyElement
     *  Copy an XML DOM element.
     *
     *  This function copies a DOM element and all its descendants and returns
     *  the new copy.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    A new, copied DOM element tree.
     */
    copyElement: function (elem)
    {
        var i, el;
        if (elem.nodeType == Strophe.ElementType.NORMAL) {
            el = Strophe.xmlElement(elem.tagName);

            for (i = 0; i < elem.attributes.length; i++) {
                el.setAttribute(elem.attributes[i].nodeName.toLowerCase(),
                                elem.attributes[i].value);
            }

            for (i = 0; i < elem.childNodes.length; i++) {
                el.appendChild(Strophe.copyElement(elem.childNodes[i]));
            }
        } else if (elem.nodeType == Strophe.ElementType.TEXT) {
            el = Strophe.xmlGenerator().createTextNode(elem.nodeValue);
        }

        return el;
    },


    /** Function: createHtml
     *  Copy an HTML DOM element into an XML DOM.
     *
     *  This function copies a DOM element and all its descendants and returns
     *  the new copy.
     *
     *  Parameters:
     *    (HTMLElement) elem - A DOM element.
     *
     *  Returns:
     *    A new, copied DOM element tree.
     */
    createHtml: function (elem)
    {
        var i, el, j, tag, attribute, value, css, cssAttrs, attr, cssName, cssValue;
        if (elem.nodeType == Strophe.ElementType.NORMAL) {
            tag = elem.nodeName.toLowerCase();
            if(Strophe.XHTML.validTag(tag)) {
                try {
                    el = Strophe.xmlElement(tag);
                    for(i = 0; i < Strophe.XHTML.attributes[tag].length; i++) {
                        attribute = Strophe.XHTML.attributes[tag][i];
                        value = elem.getAttribute(attribute);
                        if(typeof value == 'undefined' || value === null || value === '' || value === false || value === 0) {
                            continue;
                        }
                        if(attribute == 'style' && typeof value == 'object') {
                            if(typeof value.cssText != 'undefined') {
                                value = value.cssText; // we're dealing with IE, need to get CSS out
                            }
                        }
                        // filter out invalid css styles
                        if(attribute == 'style') {
                            css = [];
                            cssAttrs = value.split(';');
                            for(j = 0; j < cssAttrs.length; j++) {
                                attr = cssAttrs[j].split(':');
                                cssName = attr[0].replace(/^\s*/, "").replace(/\s*$/, "").toLowerCase();
                                if(Strophe.XHTML.validCSS(cssName)) {
                                    cssValue = attr[1].replace(/^\s*/, "").replace(/\s*$/, "");
                                    css.push(cssName + ': ' + cssValue);
                                }
                            }
                            if(css.length > 0) {
                                value = css.join('; ');
                                el.setAttribute(attribute, value);
                            }
                        } else {
                            el.setAttribute(attribute, value);
                        }
                    }

                    for (i = 0; i < elem.childNodes.length; i++) {
                        el.appendChild(Strophe.createHtml(elem.childNodes[i]));
                    }
                } catch(e) { // invalid elements
                  el = Strophe.xmlTextNode('');
                }
            } else {
                el = Strophe.xmlGenerator().createDocumentFragment();
                for (i = 0; i < elem.childNodes.length; i++) {
                    el.appendChild(Strophe.createHtml(elem.childNodes[i]));
                }
            }
        } else if (elem.nodeType == Strophe.ElementType.FRAGMENT) {
            el = Strophe.xmlGenerator().createDocumentFragment();
            for (i = 0; i < elem.childNodes.length; i++) {
                el.appendChild(Strophe.createHtml(elem.childNodes[i]));
            }
        } else if (elem.nodeType == Strophe.ElementType.TEXT) {
            el = Strophe.xmlTextNode(elem.nodeValue);
        }

        return el;
    },

    /** Function: escapeNode
     *  Escape the node part (also called local part) of a JID.
     *
     *  Parameters:
     *    (String) node - A node (or local part).
     *
     *  Returns:
     *    An escaped node (or local part).
     */
    escapeNode: function (node)
    {
        return node.replace(/^\s+|\s+$/g, '')
            .replace(/\\/g,  "\\5c")
            .replace(/ /g,   "\\20")
            .replace(/\"/g,  "\\22")
            .replace(/\&/g,  "\\26")
            .replace(/\'/g,  "\\27")
            .replace(/\//g,  "\\2f")
            .replace(/:/g,   "\\3a")
            .replace(/</g,   "\\3c")
            .replace(/>/g,   "\\3e")
            .replace(/@/g,   "\\40");
    },

    /** Function: unescapeNode
     *  Unescape a node part (also called local part) of a JID.
     *
     *  Parameters:
     *    (String) node - A node (or local part).
     *
     *  Returns:
     *    An unescaped node (or local part).
     */
    unescapeNode: function (node)
    {
        return node.replace(/\\20/g, " ")
            .replace(/\\22/g, '"')
            .replace(/\\26/g, "&")
            .replace(/\\27/g, "'")
            .replace(/\\2f/g, "/")
            .replace(/\\3a/g, ":")
            .replace(/\\3c/g, "<")
            .replace(/\\3e/g, ">")
            .replace(/\\40/g, "@")
            .replace(/\\5c/g, "\\");
    },

    /** Function: getNodeFromJid
     *  Get the node portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the node.
     */
    getNodeFromJid: function (jid)
    {
        if (jid.indexOf("@") < 0) { return null; }
        return jid.split("@")[0];
    },

    /** Function: getDomainFromJid
     *  Get the domain portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the domain.
     */
    getDomainFromJid: function (jid)
    {
        var bare = Strophe.getBareJidFromJid(jid);
        if (bare.indexOf("@") < 0) {
            return bare;
        } else {
            var parts = bare.split("@");
            parts.splice(0, 1);
            return parts.join('@');
        }
    },

    /** Function: getResourceFromJid
     *  Get the resource portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the resource.
     */
    getResourceFromJid: function (jid)
    {
        var s = jid.split("/");
        if (s.length < 2) { return null; }
        s.splice(0, 1);
        return s.join('/');
    },

    /** Function: getBareJidFromJid
     *  Get the bare JID from a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the bare JID.
     */
    getBareJidFromJid: function (jid)
    {
        return jid ? jid.split("/")[0] : null;
    },

    /** Function: log
     *  User overrideable logging function.
     *
     *  This function is called whenever the Strophe library calls any
     *  of the logging functions.  The default implementation of this
     *  function does nothing.  If client code wishes to handle the logging
     *  messages, it should override this with
     *  > Strophe.log = function (level, msg) {
     *  >   (user code here)
     *  > };
     *
     *  Please note that data sent and received over the wire is logged
     *  via Strophe.Connection.rawInput() and Strophe.Connection.rawOutput().
     *
     *  The different levels and their meanings are
     *
     *    DEBUG - Messages useful for debugging purposes.
     *    INFO - Informational messages.  This is mostly information like
     *      'disconnect was called' or 'SASL auth succeeded'.
     *    WARN - Warnings about potential problems.  This is mostly used
     *      to report transient connection errors like request timeouts.
     *    ERROR - Some error occurred.
     *    FATAL - A non-recoverable fatal error occurred.
     *
     *  Parameters:
     *    (Integer) level - The log level of the log message.  This will
     *      be one of the values in Strophe.LogLevel.
     *    (String) msg - The log message.
     */
    /* jshint ignore:start */
    log: function (level, msg)
    {
        return;
    },
    /* jshint ignore:end */

    /** Function: debug
     *  Log a message at the Strophe.LogLevel.DEBUG level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    debug: function(msg)
    {
        this.log(this.LogLevel.DEBUG, msg);
    },

    /** Function: info
     *  Log a message at the Strophe.LogLevel.INFO level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    info: function (msg)
    {
        this.log(this.LogLevel.INFO, msg);
    },

    /** Function: warn
     *  Log a message at the Strophe.LogLevel.WARN level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    warn: function (msg)
    {
        this.log(this.LogLevel.WARN, msg);
    },

    /** Function: error
     *  Log a message at the Strophe.LogLevel.ERROR level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    error: function (msg)
    {
        this.log(this.LogLevel.ERROR, msg);
    },

    /** Function: fatal
     *  Log a message at the Strophe.LogLevel.FATAL level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    fatal: function (msg)
    {
        this.log(this.LogLevel.FATAL, msg);
    },

    /** Function: serialize
     *  Render a DOM element and all descendants to a String.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    The serialized element tree as a String.
     */
    serialize: function (elem)
    {
        var result;

        if (!elem) { return null; }

        if (typeof(elem.tree) === "function") {
            elem = elem.tree();
        }

        var nodeName = elem.nodeName;
        var i, child;

        if (elem.getAttribute("_realname")) {
            nodeName = elem.getAttribute("_realname");
        }

        result = "<" + nodeName;
        for (i = 0; i < elem.attributes.length; i++) {
               if(elem.attributes[i].nodeName != "_realname") {
                 result += " " + elem.attributes[i].nodeName.toLowerCase() +
                "='" + elem.attributes[i].value
                    .replace(/&/g, "&amp;")
                       .replace(/\'/g, "&apos;")
                       .replace(/>/g, "&gt;")
                       .replace(/</g, "&lt;") + "'";
               }
        }

        if (elem.childNodes.length > 0) {
            result += ">";
            for (i = 0; i < elem.childNodes.length; i++) {
                child = elem.childNodes[i];
                switch( child.nodeType ){
                  case Strophe.ElementType.NORMAL:
                    // normal element, so recurse
                    result += Strophe.serialize(child);
                    break;
                  case Strophe.ElementType.TEXT:
                    // text element to escape values
                    result += Strophe.xmlescape(child.nodeValue);
                    break;
                  case Strophe.ElementType.CDATA:
                    // cdata section so don't escape values
                    result += "<![CDATA["+child.nodeValue+"]]>";
                }
            }
            result += "</" + nodeName + ">";
        } else {
            result += "/>";
        }

        return result;
    },

    /** PrivateVariable: _requestId
     *  _Private_ variable that keeps track of the request ids for
     *  connections.
     */
    _requestId: 0,

    /** PrivateVariable: Strophe.connectionPlugins
     *  _Private_ variable Used to store plugin names that need
     *  initialization on Strophe.Connection construction.
     */
    _connectionPlugins: {},

    /** Function: addConnectionPlugin
     *  Extends the Strophe.Connection object with the given plugin.
     *
     *  Parameters:
     *    (String) name - The name of the extension.
     *    (Object) ptype - The plugin's prototype.
     */
    addConnectionPlugin: function (name, ptype)
    {
        Strophe._connectionPlugins[name] = ptype;
    }
};

/** Class: Strophe.Builder
 *  XML DOM builder.
 *
 *  This object provides an interface similar to JQuery but for building
 *  DOM element easily and rapidly.  All the functions except for toString()
 *  and tree() return the object, so calls can be chained.  Here's an
 *  example using the $iq() builder helper.
 *  > $iq({to: 'you', from: 'me', type: 'get', id: '1'})
 *  >     .c('query', {xmlns: 'strophe:example'})
 *  >     .c('example')
 *  >     .toString()
 *  The above generates this XML fragment
 *  > <iq to='you' from='me' type='get' id='1'>
 *  >   <query xmlns='strophe:example'>
 *  >     <example/>
 *  >   </query>
 *  > </iq>
 *  The corresponding DOM manipulations to get a similar fragment would be
 *  a lot more tedious and probably involve several helper variables.
 *
 *  Since adding children makes new operations operate on the child, up()
 *  is provided to traverse up the tree.  To add two children, do
 *  > builder.c('child1', ...).up().c('child2', ...)
 *  The next operation on the Builder will be relative to the second child.
 */

/** Constructor: Strophe.Builder
 *  Create a Strophe.Builder object.
 *
 *  The attributes should be passed in object notation.  For example
 *  > var b = new Builder('message', {to: 'you', from: 'me'});
 *  or
 *  > var b = new Builder('messsage', {'xml:lang': 'en'});
 *
 *  Parameters:
 *    (String) name - The name of the root element.
 *    (Object) attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder.
 */
Strophe.Builder = function (name, attrs)
{
    // Set correct namespace for jabber:client elements
    if (name == "presence" || name == "message" || name == "iq") {
        if (attrs && !attrs.xmlns) {
            attrs.xmlns = Strophe.NS.CLIENT;
        } else if (!attrs) {
            attrs = {xmlns: Strophe.NS.CLIENT};
        }
    }

    // Holds the tree being built.
    this.nodeTree = Strophe.xmlElement(name, attrs);

    // Points to the current operation node.
    this.node = this.nodeTree;
};

Strophe.Builder.prototype = {
    /** Function: tree
     *  Return the DOM tree.
     *
     *  This function returns the current DOM tree as an element object.  This
     *  is suitable for passing to functions like Strophe.Connection.send().
     *
     *  Returns:
     *    The DOM tree as a element object.
     */
    tree: function ()
    {
        return this.nodeTree;
    },

    /** Function: toString
     *  Serialize the DOM tree to a String.
     *
     *  This function returns a string serialization of the current DOM
     *  tree.  It is often used internally to pass data to a
     *  Strophe.Request object.
     *
     *  Returns:
     *    The serialized DOM tree in a String.
     */
    toString: function ()
    {
        return Strophe.serialize(this.nodeTree);
    },

    /** Function: up
     *  Make the current parent element the new current element.
     *
     *  This function is often used after c() to traverse back up the tree.
     *  For example, to add two children to the same element
     *  > builder.c('child1', {}).up().c('child2', {});
     *
     *  Returns:
     *    The Stophe.Builder object.
     */
    up: function ()
    {
        this.node = this.node.parentNode;
        return this;
    },

    /** Function: attrs
     *  Add or modify attributes of the current element.
     *
     *  The attributes should be passed in object notation.  This function
     *  does not move the current element pointer.
     *
     *  Parameters:
     *    (Object) moreattrs - The attributes to add/modify in object notation.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    attrs: function (moreattrs)
    {
        for (var k in moreattrs) {
            if (moreattrs.hasOwnProperty(k)) {
                this.node.setAttribute(k, moreattrs[k]);
            }
        }
        return this;
    },

    /** Function: c
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function moves the current element pointer to the child,
     *  unless text is provided.  If you need to add another child, it
     *  is necessary to use up() to go back to the parent in the tree.
     *
     *  Parameters:
     *    (String) name - The name of the child.
     *    (Object) attrs - The attributes of the child in object notation.
     *    (String) text - The text to add to the child.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    c: function (name, attrs, text)
    {
        var child = Strophe.xmlElement(name, attrs, text);
        this.node.appendChild(child);
        if (!text) {
            this.node = child;
        }
        return this;
    },

    /** Function: cnode
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function is the same as c() except that instead of using a
     *  name and an attributes object to create the child it uses an
     *  existing DOM element object.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    cnode: function (elem)
    {
        var impNode;
        var xmlGen = Strophe.xmlGenerator();
        try {
            impNode = (xmlGen.importNode !== undefined);
        }
        catch (e) {
            impNode = false;
        }
        var newElem = impNode ?
                      xmlGen.importNode(elem, true) :
                      Strophe.copyElement(elem);
        this.node.appendChild(newElem);
        this.node = newElem;
        return this;
    },

    /** Function: t
     *  Add a child text element.
     *
     *  This *does not* make the child the new current element since there
     *  are no children of text elements.
     *
     *  Parameters:
     *    (String) text - The text data to append to the current element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    t: function (text)
    {
        var child = Strophe.xmlTextNode(text);
        this.node.appendChild(child);
        return this;
    },

    /** Function: h
     *  Replace current element contents with the HTML passed in.
     *
     *  This *does not* make the child the new current element
     *
     *  Parameters:
     *    (String) html - The html to insert as contents of current element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    h: function (html)
    {
        var fragment = document.createElement('body');

        // force the browser to try and fix any invalid HTML tags
        fragment.innerHTML = html;

        // copy cleaned html into an xml dom
        var xhtml = Strophe.createHtml(fragment);

        while(xhtml.childNodes.length > 0) {
            this.node.appendChild(xhtml.childNodes[0]);
        }
        return this;
    }
};

/** PrivateClass: Strophe.Handler
 *  _Private_ helper class for managing stanza handlers.
 *
 *  A Strophe.Handler encapsulates a user provided callback function to be
 *  executed when matching stanzas are received by the connection.
 *  Handlers can be either one-off or persistant depending on their
 *  return value. Returning true will cause a Handler to remain active, and
 *  returning false will remove the Handler.
 *
 *  Users will not use Strophe.Handler objects directly, but instead they
 *  will use Strophe.Connection.addHandler() and
 *  Strophe.Connection.deleteHandler().
 */

/** PrivateConstructor: Strophe.Handler
 *  Create and initialize a new Strophe.Handler.
 *
 *  Parameters:
 *    (Function) handler - A function to be executed when the handler is run.
 *    (String) ns - The namespace to match.
 *    (String) name - The element name to match.
 *    (String) type - The element type to match.
 *    (String) id - The element id attribute to match.
 *    (String) from - The element from attribute to match.
 *    (Object) options - Handler options
 *
 *  Returns:
 *    A new Strophe.Handler object.
 */
Strophe.Handler = function (handler, ns, name, type, id, from, options)
{
    this.handler = handler;
    this.ns = ns;
    this.name = name;
    this.type = type;
    this.id = id;
    this.options = options || {matchBare: false};

    // default matchBare to false if undefined
    if (!this.options.matchBare) {
        this.options.matchBare = false;
    }

    if (this.options.matchBare) {
        this.from = from ? Strophe.getBareJidFromJid(from) : null;
    } else {
        this.from = from;
    }

    // whether the handler is a user handler or a system handler
    this.user = true;
};

Strophe.Handler.prototype = {
    /** PrivateFunction: isMatch
     *  Tests if a stanza matches the Strophe.Handler.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML element to test.
     *
     *  Returns:
     *    true if the stanza matches and false otherwise.
     */
    isMatch: function (elem)
    {
        var nsMatch;
        var from = null;

        if (this.options.matchBare) {
            from = Strophe.getBareJidFromJid(elem.getAttribute('from'));
        } else {
            from = elem.getAttribute('from');
        }

        nsMatch = false;
        if (!this.ns) {
            nsMatch = true;
        } else {
            var that = this;
            Strophe.forEachChild(elem, null, function (elem) {
                if (elem.getAttribute("xmlns") == that.ns) {
                    nsMatch = true;
                }
            });

            nsMatch = nsMatch || elem.getAttribute("xmlns") == this.ns;
        }

        if (nsMatch &&
            (!this.name || Strophe.isTagEqual(elem, this.name)) &&
            (!this.type || elem.getAttribute("type") == this.type) &&
            (!this.id || elem.getAttribute("id") == this.id) &&
            (!this.from || from == this.from)) {
                return true;
        }

        return false;
    },

    /** PrivateFunction: run
     *  Run the callback on a matching stanza.
     *
     *  Parameters:
     *    (XMLElement) elem - The DOM element that triggered the
     *      Strophe.Handler.
     *
     *  Returns:
     *    A boolean indicating if the handler should remain active.
     */
    run: function (elem)
    {
        var result = null;
        try {
            result = this.handler(elem);
        } catch (e) {
            if (e.sourceURL) {
                Strophe.fatal("error: " + this.handler +
                              " " + e.sourceURL + ":" +
                              e.line + " - " + e.name + ": " + e.message);
            } else if (e.fileName) {
                if (typeof(console) != "undefined") {
                    console.trace();
                    console.error(this.handler, " - error - ", e, e.message);
                }
                Strophe.fatal("error: " + this.handler + " " +
                              e.fileName + ":" + e.lineNumber + " - " +
                              e.name + ": " + e.message);
            } else {
                Strophe.fatal("error: " + e.message + "\n" + e.stack);
            }

            throw e;
        }

        return result;
    },

    /** PrivateFunction: toString
     *  Get a String representation of the Strophe.Handler object.
     *
     *  Returns:
     *    A String.
     */
    toString: function ()
    {
        return "{Handler: " + this.handler + "(" + this.name + "," +
            this.id + "," + this.ns + ")}";
    }
};

/** PrivateClass: Strophe.TimedHandler
 *  _Private_ helper class for managing timed handlers.
 *
 *  A Strophe.TimedHandler encapsulates a user provided callback that
 *  should be called after a certain period of time or at regular
 *  intervals.  The return value of the callback determines whether the
 *  Strophe.TimedHandler will continue to fire.
 *
 *  Users will not use Strophe.TimedHandler objects directly, but instead
 *  they will use Strophe.Connection.addTimedHandler() and
 *  Strophe.Connection.deleteTimedHandler().
 */

/** PrivateConstructor: Strophe.TimedHandler
 *  Create and initialize a new Strophe.TimedHandler object.
 *
 *  Parameters:
 *    (Integer) period - The number of milliseconds to wait before the
 *      handler is called.
 *    (Function) handler - The callback to run when the handler fires.  This
 *      function should take no arguments.
 *
 *  Returns:
 *    A new Strophe.TimedHandler object.
 */
Strophe.TimedHandler = function (period, handler)
{
    this.period = period;
    this.handler = handler;

    this.lastCalled = new Date().getTime();
    this.user = true;
};

Strophe.TimedHandler.prototype = {
    /** PrivateFunction: run
     *  Run the callback for the Strophe.TimedHandler.
     *
     *  Returns:
     *    true if the Strophe.TimedHandler should be called again, and false
     *      otherwise.
     */
    run: function ()
    {
        this.lastCalled = new Date().getTime();
        return this.handler();
    },

    /** PrivateFunction: reset
     *  Reset the last called time for the Strophe.TimedHandler.
     */
    reset: function ()
    {
        this.lastCalled = new Date().getTime();
    },

    /** PrivateFunction: toString
     *  Get a string representation of the Strophe.TimedHandler object.
     *
     *  Returns:
     *    The string representation.
     */
    toString: function ()
    {
        return "{TimedHandler: " + this.handler + "(" + this.period +")}";
    }
};

/** Class: Strophe.Connection
 *  XMPP Connection manager.
 *
 *  This class is the main part of Strophe.  It manages a BOSH connection
 *  to an XMPP server and dispatches events to the user callbacks as
 *  data arrives.  It supports SASL PLAIN, SASL DIGEST-MD5, SASL SCRAM-SHA1
 *  and legacy authentication.
 *
 *  After creating a Strophe.Connection object, the user will typically
 *  call connect() with a user supplied callback to handle connection level
 *  events like authentication failure, disconnection, or connection
 *  complete.
 *
 *  The user will also have several event handlers defined by using
 *  addHandler() and addTimedHandler().  These will allow the user code to
 *  respond to interesting stanzas or do something periodically with the
 *  connection.  These handlers will be active once authentication is
 *  finished.
 *
 *  To send data to the connection, use send().
 */

/** Constructor: Strophe.Connection
 *  Create and initialize a Strophe.Connection object.
 *
 *  The transport-protocol for this connection will be chosen automatically
 *  based on the given service parameter. URLs starting with "ws://" or
 *  "wss://" will use WebSockets, URLs starting with "http://", "https://"
 *  or without a protocol will use BOSH.
 *
 *  To make Strophe connect to the current host you can leave out the protocol
 *  and host part and just pass the path, e.g.
 *
 *  > var conn = new Strophe.Connection("/http-bind/");
 *
 *  WebSocket options:
 *
 *  If you want to connect to the current host with a WebSocket connection you
 *  can tell Strophe to use WebSockets through a "protocol" attribute in the
 *  optional options parameter. Valid values are "ws" for WebSocket and "wss"
 *  for Secure WebSocket.
 *  So to connect to "wss://CURRENT_HOSTNAME/xmpp-websocket" you would call
 *
 *  > var conn = new Strophe.Connection("/xmpp-websocket/", {protocol: "wss"});
 *
 *  Note that relative URLs _NOT_ starting with a "/" will also include the path
 *  of the current site.
 *
 *  Also because downgrading security is not permitted by browsers, when using
 *  relative URLs both BOSH and WebSocket connections will use their secure
 *  variants if the current connection to the site is also secure (https).
 *
 *  BOSH options:
 *
 *  by adding "sync" to the options, you can control if requests will
 *  be made synchronously or not. The default behaviour is asynchronous.
 *  If you want to make requests synchronous, make "sync" evaluate to true:
 *  > var conn = new Strophe.Connection("/http-bind/", {sync: true});
 *  You can also toggle this on an already established connection:
 *  > conn.options.sync = true;
 *
 *
 *  Parameters:
 *    (String) service - The BOSH or WebSocket service URL.
 *    (Object) options - A hash of configuration options
 *
 *  Returns:
 *    A new Strophe.Connection object.
 */
Strophe.Connection = function (service, options)
{
    // The service URL
    this.service = service;

    // Configuration options
    this.options = options || {};
    var proto = this.options.protocol || "";

    // Select protocal based on service or options
    if (service.indexOf("ws:") === 0 || service.indexOf("wss:") === 0 ||
            proto.indexOf("ws") === 0) {
        this._proto = new Strophe.Websocket(this);
    } else {
        this._proto = new Strophe.Bosh(this);
    }
    /* The connected JID. */
    this.jid = "";
    /* the JIDs domain */
    this.domain = null;
    /* stream:features */
    this.features = null;

    // SASL
    this._sasl_data = {};
    this.do_session = false;
    this.do_bind = false;

    // handler lists
    this.timedHandlers = [];
    this.handlers = [];
    this.removeTimeds = [];
    this.removeHandlers = [];
    this.addTimeds = [];
    this.addHandlers = [];

    this._authentication = {};
    this._idleTimeout = null;
    this._disconnectTimeout = null;

    this.do_authentication = true;
    this.authenticated = false;
    this.disconnecting = false;
    this.connected = false;

    this.errors = 0;

    this.paused = false;

    this._data = [];
    this._uniqueId = 0;

    this._sasl_success_handler = null;
    this._sasl_failure_handler = null;
    this._sasl_challenge_handler = null;

    // Max retries before disconnecting
    this.maxRetries = 5;

    // setup onIdle callback every 1/10th of a second
    this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);

    // initialize plugins
    for (var k in Strophe._connectionPlugins) {
        if (Strophe._connectionPlugins.hasOwnProperty(k)) {
            var ptype = Strophe._connectionPlugins[k];
            // jslint complaints about the below line, but this is fine
            var F = function () {}; // jshint ignore:line
            F.prototype = ptype;
            this[k] = new F();
            this[k].init(this);
        }
    }
};

Strophe.Connection.prototype = {
    /** Function: reset
     *  Reset the connection.
     *
     *  This function should be called after a connection is disconnected
     *  before that connection is reused.
     */
    reset: function ()
    {
        this._proto._reset();

        // SASL
        this.do_session = false;
        this.do_bind = false;

        // handler lists
        this.timedHandlers = [];
        this.handlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];
        this._authentication = {};

        this.authenticated = false;
        this.disconnecting = false;
        this.connected = false;

        this.errors = 0;

        this._requests = [];
        this._uniqueId = 0;
    },

    /** Function: pause
     *  Pause the request manager.
     *
     *  This will prevent Strophe from sending any more requests to the
     *  server.  This is very useful for temporarily pausing
     *  BOSH-Connections while a lot of send() calls are happening quickly.
     *  This causes Strophe to send the data in a single request, saving
     *  many request trips.
     */
    pause: function ()
    {
        this.paused = true;
    },

    /** Function: resume
     *  Resume the request manager.
     *
     *  This resumes after pause() has been called.
     */
    resume: function ()
    {
        this.paused = false;
    },

    /** Function: getUniqueId
     *  Generate a unique ID for use in <iq/> elements.
     *
     *  All <iq/> stanzas are required to have unique id attributes.  This
     *  function makes creating these easy.  Each connection instance has
     *  a counter which starts from zero, and the value of this counter
     *  plus a colon followed by the suffix becomes the unique id. If no
     *  suffix is supplied, the counter is used as the unique id.
     *
     *  Suffixes are used to make debugging easier when reading the stream
     *  data, and their use is recommended.  The counter resets to 0 for
     *  every new connection for the same reason.  For connections to the
     *  same server that authenticate the same way, all the ids should be
     *  the same, which makes it easy to see changes.  This is useful for
     *  automated testing as well.
     *
     *  Parameters:
     *    (String) suffix - A optional suffix to append to the id.
     *
     *  Returns:
     *    A unique string to be used for the id attribute.
     */
    getUniqueId: function (suffix)
    {
        if (typeof(suffix) == "string" || typeof(suffix) == "number") {
            return ++this._uniqueId + ":" + suffix;
        } else {
            return ++this._uniqueId + "";
        }
    },

    /** Function: connect
     *  Starts the connection process.
     *
     *  As the connection process proceeds, the user supplied callback will
     *  be triggered multiple times with status updates.  The callback
     *  should take two arguments - the status code and the error condition.
     *
     *  The status code will be one of the values in the Strophe.Status
     *  constants.  The error condition will be one of the conditions
     *  defined in RFC 3920 or the condition 'strophe-parsererror'.
     *
     *  The Parameters _wait_, _hold_ and _route_ are optional and only relevant
     *  for BOSH connections. Please see XEP 124 for a more detailed explanation
     *  of the optional parameters.
     *
     *  Parameters:
     *    (String) jid - The user's JID.  This may be a bare JID,
     *      or a full JID.  If a node is not supplied, SASL ANONYMOUS
     *      authentication will be attempted.
     *    (String) pass - The user's password.
     *    (Function) callback - The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (String) route - The optional route value.
     */
    connect: function (jid, pass, callback, wait, hold, route)
    {
        this.jid = jid;
        /** Variable: authzid
         *  Authorization identity.
         */
        this.authzid = Strophe.getBareJidFromJid(this.jid);
        /** Variable: authcid
         *  Authentication identity (User name).
         */
        this.authcid = Strophe.getNodeFromJid(this.jid);
        /** Variable: pass
         *  Authentication identity (User password).
         */
        this.pass = pass;
        /** Variable: servtype
         *  Digest MD5 compatibility.
         */
        this.servtype = "xmpp";
        this.connect_callback = callback;
        this.disconnecting = false;
        this.connected = false;
        this.authenticated = false;
        this.errors = 0;

        // parse jid for domain
        this.domain = Strophe.getDomainFromJid(this.jid);

        this._changeConnectStatus(Strophe.Status.CONNECTING, null);

        this._proto._connect(wait, hold, route);
    },

    /** Function: attach
     *  Attach to an already created and authenticated BOSH session.
     *
     *  This function is provided to allow Strophe to attach to BOSH
     *  sessions which have been created externally, perhaps by a Web
     *  application.  This is often used to support auto-login type features
     *  without putting user credentials into the page.
     *
     *  Parameters:
     *    (String) jid - The full JID that is bound by the session.
     *    (String) sid - The SID of the BOSH session.
     *    (String) rid - The current RID of the BOSH session.  This RID
     *      will be used by the next request.
     *    (Function) callback The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *      Other settings will require tweaks to the Strophe.TIMEOUT value.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (Integer) wind - The optional HTTBIND window value.  This is the
     *      allowed range of request ids that are valid.  The default is 5.
     */
    attach: function (jid, sid, rid, callback, wait, hold, wind)
    {
        this._proto._attach(jid, sid, rid, callback, wait, hold, wind);
    },

    /** Function: xmlInput
     *  User overrideable function that receives XML data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlInput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Due to limitations of current Browsers' XML-Parsers the opening and closing
     *  <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     *  BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     *  <Strophe.Bosh.strip> if you want to strip this tag.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML data received by the connection.
     */
    /* jshint unused:false */
    xmlInput: function (elem)
    {
        return;
    },
    /* jshint unused:true */

    /** Function: xmlOutput
     *  User overrideable function that receives XML data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlOutput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Due to limitations of current Browsers' XML-Parsers the opening and closing
     *  <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     *  BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     *  <Strophe.Bosh.strip> if you want to strip this tag.
     *
     *  Parameters:
     *    (XMLElement) elem - The XMLdata sent by the connection.
     */
    /* jshint unused:false */
    xmlOutput: function (elem)
    {
        return;
    },
    /* jshint unused:true */

    /** Function: rawInput
     *  User overrideable function that receives raw data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawInput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data received by the connection.
     */
    /* jshint unused:false */
    rawInput: function (data)
    {
        return;
    },
    /* jshint unused:true */

    /** Function: rawOutput
     *  User overrideable function that receives raw data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawOutput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data sent by the connection.
     */
    /* jshint unused:false */
    rawOutput: function (data)
    {
        return;
    },
    /* jshint unused:true */

    /** Function: send
     *  Send a stanza.
     *
     *  This function is called to push data onto the send queue to
     *  go out over the wire.  Whenever a request is sent to the BOSH
     *  server, all pending data is sent and the queue is flushed.
     *
     *  Parameters:
     *    (XMLElement |
     *     [XMLElement] |
     *     Strophe.Builder) elem - The stanza to send.
     */
    send: function (elem)
    {
        if (elem === null) { return ; }
        if (typeof(elem.sort) === "function") {
            for (var i = 0; i < elem.length; i++) {
                this._queueData(elem[i]);
            }
        } else if (typeof(elem.tree) === "function") {
            this._queueData(elem.tree());
        } else {
            this._queueData(elem);
        }

        this._proto._send();
    },

    /** Function: flush
     *  Immediately send any pending outgoing data.
     *
     *  Normally send() queues outgoing data until the next idle period
     *  (100ms), which optimizes network use in the common cases when
     *  several send()s are called in succession. flush() can be used to
     *  immediately send all pending data.
     */
    flush: function ()
    {
        // cancel the pending idle period and run the idle function
        // immediately
        clearTimeout(this._idleTimeout);
        this._onIdle();
    },

    /** Function: sendIQ
     *  Helper function to send IQ stanzas.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza to send.
     *    (Function) callback - The callback function for a successful request.
     *    (Function) errback - The callback function for a failed or timed
     *      out request.  On timeout, the stanza will be null.
     *    (Integer) timeout - The time specified in milliseconds for a
     *      timeout to occur.
     *
     *  Returns:
     *    The id used to send the IQ.
    */
    sendIQ: function(elem, callback, errback, timeout) {
        var timeoutHandler = null;
        var that = this;

        if (typeof(elem.tree) === "function") {
            elem = elem.tree();
        }
        var id = elem.getAttribute('id');

        // inject id if not found
        if (!id) {
            id = this.getUniqueId("sendIQ");
            elem.setAttribute("id", id);
        }

        var handler = this.addHandler(function (stanza) {
            // remove timeout handler if there is one
            if (timeoutHandler) {
                that.deleteTimedHandler(timeoutHandler);
            }

            var iqtype = stanza.getAttribute('type');
            if (iqtype == 'result') {
                if (callback) {
                    callback(stanza);
                }
            } else if (iqtype == 'error') {
                if (errback) {
                    errback(stanza);
                }
            } else {
                throw {
                    name: "StropheError",
            message: "Got bad IQ type of " + iqtype
                };
            }
        }, null, 'iq', null, id);

        // if timeout specified, setup timeout handler.
        if (timeout) {
            timeoutHandler = this.addTimedHandler(timeout, function () {
                // get rid of normal handler
                that.deleteHandler(handler);

                // call errback on timeout with null stanza
                if (errback) {
                    errback(null);
                }
                return false;
            });
        }

        this.send(elem);

        return id;
    },

    /** PrivateFunction: _queueData
     *  Queue outgoing data for later sending.  Also ensures that the data
     *  is a DOMElement.
     */
    _queueData: function (element) {
        if (element === null ||
            !element.tagName ||
            !element.childNodes) {
            throw {
                name: "StropheError",
                message: "Cannot queue non-DOMElement."
            };
        }

        this._data.push(element);
    },

    /** PrivateFunction: _sendRestart
     *  Send an xmpp:restart stanza.
     */
    _sendRestart: function ()
    {
        this._data.push("restart");

        this._proto._sendRestart();

        this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);
    },

    /** Function: addTimedHandler
     *  Add a timed handler to the connection.
     *
     *  This function adds a timed handler.  The provided handler will
     *  be called every period milliseconds until it returns false,
     *  the connection is terminated, or the handler is removed.  Handlers
     *  that wish to continue being invoked should return true.
     *
     *  Because of method binding it is necessary to save the result of
     *  this function if you wish to remove a handler with
     *  deleteTimedHandler().
     *
     *  Note that user handlers are not active until authentication is
     *  successful.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addTimedHandler: function (period, handler)
    {
        var thand = new Strophe.TimedHandler(period, handler);
        this.addTimeds.push(thand);
        return thand;
    },

    /** Function: deleteTimedHandler
     *  Delete a timed handler for a connection.
     *
     *  This function removes a timed handler from the connection.  The
     *  handRef parameter is *not* the function passed to addTimedHandler(),
     *  but is the reference returned from addTimedHandler().
     *
     *  Parameters:
     *    (Strophe.TimedHandler) handRef - The handler reference.
     */
    deleteTimedHandler: function (handRef)
    {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeTimeds.push(handRef);
    },

    /** Function: addHandler
     *  Add a stanza handler for the connection.
     *
     *  This function adds a stanza handler to the connection.  The
     *  handler callback will be called for any stanza that matches
     *  the parameters.  Note that if multiple parameters are supplied,
     *  they must all match for the handler to be invoked.
     *
     *  The handler will receive the stanza that triggered it as its argument.
     *  The handler should return true if it is to be invoked again;
     *  returning false will remove the handler after it returns.
     *
     *  As a convenience, the ns parameters applies to the top level element
     *  and also any of its immediate children.  This is primarily to make
     *  matching /iq/query elements easy.
     *
     *  The options argument contains handler matching flags that affect how
     *  matches are determined. Currently the only flag is matchBare (a
     *  boolean). When matchBare is true, the from parameter and the from
     *  attribute on the stanza will be matched as bare JIDs instead of
     *  full JIDs. To use this, pass {matchBare: true} as the value of
     *  options. The default value for matchBare is false.
     *
     *  The return value should be saved if you wish to remove the handler
     *  with deleteHandler().
     *
     *  Parameters:
     *    (Function) handler - The user callback.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String) type - The stanza type attribute to match.
     *    (String) id - The stanza id attribute to match.
     *    (String) from - The stanza from attribute to match.
     *    (String) options - The handler options
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addHandler: function (handler, ns, name, type, id, from, options)
    {
        var hand = new Strophe.Handler(handler, ns, name, type, id, from, options);
        this.addHandlers.push(hand);
        return hand;
    },

    /** Function: deleteHandler
     *  Delete a stanza handler for a connection.
     *
     *  This function removes a stanza handler from the connection.  The
     *  handRef parameter is *not* the function passed to addHandler(),
     *  but is the reference returned from addHandler().
     *
     *  Parameters:
     *    (Strophe.Handler) handRef - The handler reference.
     */
    deleteHandler: function (handRef)
    {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeHandlers.push(handRef);
    },

    /** Function: disconnect
     *  Start the graceful disconnection process.
     *
     *  This function starts the disconnection process.  This process starts
     *  by sending unavailable presence and sending BOSH body of type
     *  terminate.  A timeout handler makes sure that disconnection happens
     *  even if the BOSH server does not respond.
     *
     *  The user supplied connection callback will be notified of the
     *  progress as this process happens.
     *
     *  Parameters:
     *    (String) reason - The reason the disconnect is occuring.
     */
    disconnect: function (reason)
    {
        this._changeConnectStatus(Strophe.Status.DISCONNECTING, reason);

        Strophe.info("Disconnect was called because: " + reason);
        if (this.connected) {
            var pres = false;
            this.disconnecting = true;
            if (this.authenticated) {
                pres = $pres({
                    xmlns: Strophe.NS.CLIENT,
                    type: 'unavailable'
                });
            }
            // setup timeout handler
            this._disconnectTimeout = this._addSysTimedHandler(
                3000, this._onDisconnectTimeout.bind(this));
            this._proto._disconnect(pres);
        }
    },

    /** PrivateFunction: _changeConnectStatus
     *  _Private_ helper function that makes sure plugins and the user's
     *  callback are notified of connection status changes.
     *
     *  Parameters:
     *    (Integer) status - the new connection status, one of the values
     *      in Strophe.Status
     *    (String) condition - the error condition or null
     */
    _changeConnectStatus: function (status, condition)
    {
        // notify all plugins listening for status changes
        for (var k in Strophe._connectionPlugins) {
            if (Strophe._connectionPlugins.hasOwnProperty(k)) {
                var plugin = this[k];
                if (plugin.statusChanged) {
                    try {
                        plugin.statusChanged(status, condition);
                    } catch (err) {
                        Strophe.error("" + k + " plugin caused an exception " +
                                      "changing status: " + err);
                    }
                }
            }
        }

        // notify the user's callback
        if (this.connect_callback) {
            try {
                this.connect_callback(status, condition);
            } catch (e) {
                Strophe.error("User connection callback caused an " +
                              "exception: " + e);
            }
        }
    },

    /** PrivateFunction: _doDisconnect
     *  _Private_ function to disconnect.
     *
     *  This is the last piece of the disconnection logic.  This resets the
     *  connection and alerts the user's connection callback.
     */
    _doDisconnect: function ()
    {
        // Cancel Disconnect Timeout
        if (this._disconnectTimeout !== null) {
            this.deleteTimedHandler(this._disconnectTimeout);
            this._disconnectTimeout = null;
        }

        Strophe.info("_doDisconnect was called");
        this._proto._doDisconnect();

        this.authenticated = false;
        this.disconnecting = false;

        // delete handlers
        this.handlers = [];
        this.timedHandlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];

        // tell the parent we disconnected
        this._changeConnectStatus(Strophe.Status.DISCONNECTED, null);
        this.connected = false;
    },

    /** PrivateFunction: _dataRecv
     *  _Private_ handler to processes incoming data from the the connection.
     *
     *  Except for _connect_cb handling the initial connection request,
     *  this function handles the incoming data for all requests.  This
     *  function also fires stanza handlers that match each incoming
     *  stanza.
     *
     *  Parameters:
     *    (Strophe.Request) req - The request that has data ready.
     *    (string) req - The stanza a raw string (optiona).
     */
    _dataRecv: function (req, raw)
    {
        Strophe.info("_dataRecv called");
        var elem = this._proto._reqToData(req);
        if (elem === null) { return; }

        if (this.xmlInput !== Strophe.Connection.prototype.xmlInput) {
            if (elem.nodeName === this._proto.strip && elem.childNodes.length) {
                this.xmlInput(elem.childNodes[0]);
            } else {
                this.xmlInput(elem);
            }
        }
        if (this.rawInput !== Strophe.Connection.prototype.rawInput) {
            if (raw) {
                this.rawInput(raw);
            } else {
                this.rawInput(Strophe.serialize(elem));
            }
        }

        // remove handlers scheduled for deletion
        var i, hand;
        while (this.removeHandlers.length > 0) {
            hand = this.removeHandlers.pop();
            i = this.handlers.indexOf(hand);
            if (i >= 0) {
                this.handlers.splice(i, 1);
            }
        }

        // add handlers scheduled for addition
        while (this.addHandlers.length > 0) {
            this.handlers.push(this.addHandlers.pop());
        }

        // handle graceful disconnect
        if (this.disconnecting && this._proto._emptyQueue()) {
            this._doDisconnect();
            return;
        }

        var typ = elem.getAttribute("type");
        var cond, conflict;
        if (typ !== null && typ == "terminate") {
            // Don't process stanzas that come in after disconnect
            if (this.disconnecting) {
                return;
            }

            // an error occurred
            cond = elem.getAttribute("condition");
            conflict = elem.getElementsByTagName("conflict");
            if (cond !== null) {
                if (cond == "remote-stream-error" && conflict.length > 0) {
                    cond = "conflict";
                }
                this._changeConnectStatus(Strophe.Status.CONNFAIL, cond);
            } else {
                this._changeConnectStatus(Strophe.Status.CONNFAIL, "unknown");
            }
            this.disconnect('unknown stream-error');
            return;
        }

        // send each incoming stanza through the handler chain
        var that = this;
        Strophe.forEachChild(elem, null, function (child) {
            var i, newList;
            // process handlers
            newList = that.handlers;
            that.handlers = [];
            for (i = 0; i < newList.length; i++) {
                var hand = newList[i];
                // encapsulate 'handler.run' not to lose the whole handler list if
                // one of the handlers throws an exception
                try {
                    if (hand.isMatch(child) &&
                        (that.authenticated || !hand.user)) {
                        if (hand.run(child)) {
                            that.handlers.push(hand);
                        }
                    } else {
                        that.handlers.push(hand);
                    }
                } catch(e) {
                    // if the handler throws an exception, we consider it as false
                    Strophe.warn('Removing Strophe handlers due to uncaught exception: ' + e.message);
                }
            }
        });
    },


    /** Attribute: mechanisms
     *  SASL Mechanisms available for Conncection.
     */
    mechanisms: {},

    /** PrivateFunction: _connect_cb
     *  _Private_ handler for initial connection request.
     *
     *  This handler is used to process the initial connection request
     *  response from the BOSH server. It is used to set up authentication
     *  handlers and start the authentication process.
     *
     *  SASL authentication will be attempted if available, otherwise
     *  the code will fall back to legacy authentication.
     *
     *  Parameters:
     *    (Strophe.Request) req - The current request.
     *    (Function) _callback - low level (xmpp) connect callback function.
     *      Useful for plugins with their own xmpp connect callback (when their)
     *      want to do something special).
     */
    _connect_cb: function (req, _callback, raw)
    {
        Strophe.info("_connect_cb was called");

        this.connected = true;

        var bodyWrap = this._proto._reqToData(req);
        if (!bodyWrap) { return; }

        if (this.xmlInput !== Strophe.Connection.prototype.xmlInput) {
            if (bodyWrap.nodeName === this._proto.strip && bodyWrap.childNodes.length) {
                this.xmlInput(bodyWrap.childNodes[0]);
            } else {
                this.xmlInput(bodyWrap);
            }
        }
        if (this.rawInput !== Strophe.Connection.prototype.rawInput) {
            if (raw) {
                this.rawInput(raw);
            } else {
                this.rawInput(Strophe.serialize(bodyWrap));
            }
        }

        var conncheck = this._proto._connect_cb(bodyWrap);
        if (conncheck === Strophe.Status.CONNFAIL) {
            return;
        }

        this._authentication.sasl_scram_sha1 = false;
        this._authentication.sasl_plain = false;
        this._authentication.sasl_digest_md5 = false;
        this._authentication.sasl_anonymous = false;

        this._authentication.legacy_auth = false;

        // Check for the stream:features tag
        var hasFeatures = bodyWrap.getElementsByTagName("stream:features").length > 0;
        if (!hasFeatures) {
            hasFeatures = bodyWrap.getElementsByTagName("features").length > 0;
        }
        var mechanisms = bodyWrap.getElementsByTagName("mechanism");
        var matched = [];
        var i, mech, found_authentication = false;
        if (!hasFeatures) {
            this._proto._no_auth_received(_callback);
            return;
        }
        if (mechanisms.length > 0) {
            for (i = 0; i < mechanisms.length; i++) {
                mech = Strophe.getText(mechanisms[i]);
                if (this.mechanisms[mech]) matched.push(this.mechanisms[mech]);
            }
        }
        this._authentication.legacy_auth =
            bodyWrap.getElementsByTagName("auth").length > 0;
        found_authentication = this._authentication.legacy_auth ||
            matched.length > 0;
        if (!found_authentication) {
            this._proto._no_auth_received(_callback);
            return;
        }
        if (this.do_authentication !== false)
            this.authenticate(matched);
    },

    /** Function: authenticate
     * Set up authentication
     *
     *  Contiunues the initial connection request by setting up authentication
     *  handlers and start the authentication process.
     *
     *  SASL authentication will be attempted if available, otherwise
     *  the code will fall back to legacy authentication.
     *
     */
    authenticate: function (matched)
    {
      var i;
      // Sorting matched mechanisms according to priority.
      for (i = 0; i < matched.length - 1; ++i) {
        var higher = i;
        for (var j = i + 1; j < matched.length; ++j) {
          if (matched[j].prototype.priority > matched[higher].prototype.priority) {
            higher = j;
          }
        }
        if (higher != i) {
          var swap = matched[i];
          matched[i] = matched[higher];
          matched[higher] = swap;
        }
      }

      // run each mechanism
      var mechanism_found = false;
      for (i = 0; i < matched.length; ++i) {
        if (!matched[i].test(this)) continue;

        this._sasl_success_handler = this._addSysHandler(
          this._sasl_success_cb.bind(this), null,
          "success", null, null);
        this._sasl_failure_handler = this._addSysHandler(
          this._sasl_failure_cb.bind(this), null,
          "failure", null, null);
        this._sasl_challenge_handler = this._addSysHandler(
          this._sasl_challenge_cb.bind(this), null,
          "challenge", null, null);

        this._sasl_mechanism = new matched[i]();
        this._sasl_mechanism.onStart(this);

        var request_auth_exchange = $build("auth", {
          xmlns: Strophe.NS.SASL,
          mechanism: this._sasl_mechanism.name
        });

        if (this._sasl_mechanism.isClientFirst) {
          var response = this._sasl_mechanism.onChallenge(this, null);
          request_auth_exchange.t(Base64.encode(response));
        }

        this.send(request_auth_exchange.tree());

        mechanism_found = true;
        break;
      }

      if (!mechanism_found) {
        // if none of the mechanism worked
        if (Strophe.getNodeFromJid(this.jid) === null) {
            // we don't have a node, which is required for non-anonymous
            // client connections
            this._changeConnectStatus(Strophe.Status.CONNFAIL,
                                      'x-strophe-bad-non-anon-jid');
            this.disconnect('x-strophe-bad-non-anon-jid');
        } else {
          // fall back to legacy authentication
          this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
          this._addSysHandler(this._auth1_cb.bind(this), null, null,
                              null, "_auth_1");

          this.send($iq({
            type: "get",
            to: this.domain,
            id: "_auth_1"
          }).c("query", {
            xmlns: Strophe.NS.AUTH
          }).c("username", {}).t(Strophe.getNodeFromJid(this.jid)).tree());
        }
      }

    },

    _sasl_challenge_cb: function(elem) {
      var challenge = Base64.decode(Strophe.getText(elem));
      var response = this._sasl_mechanism.onChallenge(this, challenge);

      var stanza = $build('response', {
          xmlns: Strophe.NS.SASL
      });
      if (response !== "") {
        stanza.t(Base64.encode(response));
      }
      this.send(stanza.tree());

      return true;
    },

    /** PrivateFunction: _auth1_cb
     *  _Private_ handler for legacy authentication.
     *
     *  This handler is called in response to the initial <iq type='get'/>
     *  for legacy authentication.  It builds an authentication <iq/> and
     *  sends it, creating a handler (calling back to _auth2_cb()) to
     *  handle the result
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    /* jshint unused:false */
    _auth1_cb: function (elem)
    {
        // build plaintext auth iq
        var iq = $iq({type: "set", id: "_auth_2"})
            .c('query', {xmlns: Strophe.NS.AUTH})
            .c('username', {}).t(Strophe.getNodeFromJid(this.jid))
            .up()
            .c('password').t(this.pass);

        if (!Strophe.getResourceFromJid(this.jid)) {
            // since the user has not supplied a resource, we pick
            // a default one here.  unlike other auth methods, the server
            // cannot do this for us.
            this.jid = Strophe.getBareJidFromJid(this.jid) + '/strophe';
        }
        iq.up().c('resource', {}).t(Strophe.getResourceFromJid(this.jid));

        this._addSysHandler(this._auth2_cb.bind(this), null,
                            null, null, "_auth_2");

        this.send(iq.tree());

        return false;
    },
    /* jshint unused:true */

    /** PrivateFunction: _sasl_success_cb
     *  _Private_ handler for succesful SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_success_cb: function (elem)
    {
        if (this._sasl_data["server-signature"]) {
            var serverSignature;
            var success = Base64.decode(Strophe.getText(elem));
            var attribMatch = /([a-z]+)=([^,]+)(,|$)/;
            var matches = success.match(attribMatch);
            if (matches[1] == "v") {
                serverSignature = matches[2];
            }

            if (serverSignature != this._sasl_data["server-signature"]) {
              // remove old handlers
              this.deleteHandler(this._sasl_failure_handler);
              this._sasl_failure_handler = null;
              if (this._sasl_challenge_handler) {
                this.deleteHandler(this._sasl_challenge_handler);
                this._sasl_challenge_handler = null;
              }

              this._sasl_data = {};
              return this._sasl_failure_cb(null);
            }
        }

        Strophe.info("SASL authentication succeeded.");

        if(this._sasl_mechanism)
          this._sasl_mechanism.onSuccess();

        // remove old handlers
        this.deleteHandler(this._sasl_failure_handler);
        this._sasl_failure_handler = null;
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }

        this._addSysHandler(this._sasl_auth1_cb.bind(this), null,
                            "stream:features", null, null);

        // we must send an xmpp:restart now
        this._sendRestart();

        return false;
    },

    /** PrivateFunction: _sasl_auth1_cb
     *  _Private_ handler to start stream binding.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_auth1_cb: function (elem)
    {
        // save stream:features for future usage
        this.features = elem;

        var i, child;

        for (i = 0; i < elem.childNodes.length; i++) {
            child = elem.childNodes[i];
            if (child.nodeName == 'bind') {
                this.do_bind = true;
            }

            if (child.nodeName == 'session') {
                this.do_session = true;
            }
        }

        if (!this.do_bind) {
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        } else {
            this._addSysHandler(this._sasl_bind_cb.bind(this), null, null,
                                null, "_bind_auth_2");

            var resource = Strophe.getResourceFromJid(this.jid);
            if (resource) {
                this.send($iq({type: "set", id: "_bind_auth_2"})
                          .c('bind', {xmlns: Strophe.NS.BIND})
                          .c('resource', {}).t(resource).tree());
            } else {
                this.send($iq({type: "set", id: "_bind_auth_2"})
                          .c('bind', {xmlns: Strophe.NS.BIND})
                          .tree());
            }
        }

        return false;
    },

    /** PrivateFunction: _sasl_bind_cb
     *  _Private_ handler for binding result and session start.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_bind_cb: function (elem)
    {
        if (elem.getAttribute("type") == "error") {
            Strophe.info("SASL binding failed.");
            var conflict = elem.getElementsByTagName("conflict"), condition;
            if (conflict.length > 0) {
                condition = 'conflict';
            }
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, condition);
            return false;
        }

        // TODO - need to grab errors
        var bind = elem.getElementsByTagName("bind");
        var jidNode;
        if (bind.length > 0) {
            // Grab jid
            jidNode = bind[0].getElementsByTagName("jid");
            if (jidNode.length > 0) {
                this.jid = Strophe.getText(jidNode[0]);

                if (this.do_session) {
                    this._addSysHandler(this._sasl_session_cb.bind(this),
                                        null, null, null, "_session_auth_2");

                    this.send($iq({type: "set", id: "_session_auth_2"})
                                  .c('session', {xmlns: Strophe.NS.SESSION})
                                  .tree());
                } else {
                    this.authenticated = true;
                    this._changeConnectStatus(Strophe.Status.CONNECTED, null);
                }
            }
        } else {
            Strophe.info("SASL binding failed.");
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        }
    },

    /** PrivateFunction: _sasl_session_cb
     *  _Private_ handler to finish successful SASL connection.
     *
     *  This sets Connection.authenticated to true on success, which
     *  starts the processing of user handlers.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_session_cb: function (elem)
    {
        if (elem.getAttribute("type") == "result") {
            this.authenticated = true;
            this._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else if (elem.getAttribute("type") == "error") {
            Strophe.info("Session creation failed.");
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        }

        return false;
    },

    /** PrivateFunction: _sasl_failure_cb
     *  _Private_ handler for SASL authentication failure.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    /* jshint unused:false */
    _sasl_failure_cb: function (elem)
    {
        // delete unneeded handlers
        if (this._sasl_success_handler) {
            this.deleteHandler(this._sasl_success_handler);
            this._sasl_success_handler = null;
        }
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }

        if(this._sasl_mechanism)
          this._sasl_mechanism.onFailure();
        this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
        return false;
    },
    /* jshint unused:true */

    /** PrivateFunction: _auth2_cb
     *  _Private_ handler to finish legacy authentication.
     *
     *  This handler is called when the result from the jabber:iq:auth
     *  <iq/> stanza is returned.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _auth2_cb: function (elem)
    {
        if (elem.getAttribute("type") == "result") {
            this.authenticated = true;
            this._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else if (elem.getAttribute("type") == "error") {
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            this.disconnect('authentication failed');
        }

        return false;
    },

    /** PrivateFunction: _addSysTimedHandler
     *  _Private_ function to add a system level timed handler.
     *
     *  This function is used to add a Strophe.TimedHandler for the
     *  library code.  System timed handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     */
    _addSysTimedHandler: function (period, handler)
    {
        var thand = new Strophe.TimedHandler(period, handler);
        thand.user = false;
        this.addTimeds.push(thand);
        return thand;
    },

    /** PrivateFunction: _addSysHandler
     *  _Private_ function to add a system level stanza handler.
     *
     *  This function is used to add a Strophe.Handler for the
     *  library code.  System stanza handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Function) handler - The callback function.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String) type - The stanza type attribute to match.
     *    (String) id - The stanza id attribute to match.
     */
    _addSysHandler: function (handler, ns, name, type, id)
    {
        var hand = new Strophe.Handler(handler, ns, name, type, id);
        hand.user = false;
        this.addHandlers.push(hand);
        return hand;
    },

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  If the graceful disconnect process does not complete within the
     *  time allotted, this handler finishes the disconnect anyway.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onDisconnectTimeout: function ()
    {
        Strophe.info("_onDisconnectTimeout was called");

        this._proto._onDisconnectTimeout();

        // actually disconnect
        this._doDisconnect();

        return false;
    },

    /** PrivateFunction: _onIdle
     *  _Private_ handler to process events during idle cycle.
     *
     *  This handler is called every 100ms to fire timed handlers that
     *  are ready and keep poll requests going.
     */
    _onIdle: function ()
    {
        var i, thand, since, newList;

        // add timed handlers scheduled for addition
        // NOTE: we add before remove in the case a timed handler is
        // added and then deleted before the next _onIdle() call.
        while (this.addTimeds.length > 0) {
            this.timedHandlers.push(this.addTimeds.pop());
        }

        // remove timed handlers that have been scheduled for deletion
        while (this.removeTimeds.length > 0) {
            thand = this.removeTimeds.pop();
            i = this.timedHandlers.indexOf(thand);
            if (i >= 0) {
                this.timedHandlers.splice(i, 1);
            }
        }

        // call ready timed handlers
        var now = new Date().getTime();
        newList = [];
        for (i = 0; i < this.timedHandlers.length; i++) {
            thand = this.timedHandlers[i];
            if (this.authenticated || !thand.user) {
                since = thand.lastCalled + thand.period;
                if (since - now <= 0) {
                    if (thand.run()) {
                        newList.push(thand);
                    }
                } else {
                    newList.push(thand);
                }
            }
        }
        this.timedHandlers = newList;

        clearTimeout(this._idleTimeout);

        this._proto._onIdle();

        // reactivate the timer only if connected
        if (this.connected) {
            this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);
        }
    }
};

if (callback) {
    callback(Strophe, $build, $msg, $iq, $pres);
}

/** Class: Strophe.SASLMechanism
 *
 *  encapsulates SASL authentication mechanisms.
 *
 *  User code may override the priority for each mechanism or disable it completely.
 *  See <priority> for information about changing priority and <test> for informatian on
 *  how to disable a mechanism.
 *
 *  By default, all mechanisms are enabled and the priorities are
 *
 *  SCRAM-SHA1 - 40
 *  DIGEST-MD5 - 30
 *  Plain - 20
 */

/**
 * PrivateConstructor: Strophe.SASLMechanism
 * SASL auth mechanism abstraction.
 *
 *  Parameters:
 *    (String) name - SASL Mechanism name.
 *    (Boolean) isClientFirst - If client should send response first without challenge.
 *    (Number) priority - Priority.
 *
 *  Returns:
 *    A new Strophe.SASLMechanism object.
 */
Strophe.SASLMechanism = function(name, isClientFirst, priority) {
  /** PrivateVariable: name
   *  Mechanism name.
   */
  this.name = name;
  /** PrivateVariable: isClientFirst
   *  If client sends response without initial server challenge.
   */
  this.isClientFirst = isClientFirst;
  /** Variable: priority
   *  Determines which <SASLMechanism> is chosen for authentication (Higher is better).
   *  Users may override this to prioritize mechanisms differently.
   *
   *  In the default configuration the priorities are
   *
   *  SCRAM-SHA1 - 40
   *  DIGEST-MD5 - 30
   *  Plain - 20
   *
   *  Example: (This will cause Strophe to choose the mechanism that the server sent first)
   *
   *  > Strophe.SASLMD5.priority = Strophe.SASLSHA1.priority;
   *
   *  See <SASL mechanisms> for a list of available mechanisms.
   *
   */
  this.priority = priority;
};

Strophe.SASLMechanism.prototype = {
  /**
   *  Function: test
   *  Checks if mechanism able to run.
   *  To disable a mechanism, make this return false;
   *
   *  To disable plain authentication run
   *  > Strophe.SASLPlain.test = function() {
   *  >   return false;
   *  > }
   *
   *  See <SASL mechanisms> for a list of available mechanisms.
   *
   *  Parameters:
   *    (Strophe.Connection) connection - Target Connection.
   *
   *  Returns:
   *    (Boolean) If mechanism was able to run.
   */
  /* jshint unused:false */
  test: function(connection) {
    return true;
  },
  /* jshint unused:true */

  /** PrivateFunction: onStart
   *  Called before starting mechanism on some connection.
   *
   *  Parameters:
   *    (Strophe.Connection) connection - Target Connection.
   */
  onStart: function(connection)
  {
    this._connection = connection;
  },

  /** PrivateFunction: onChallenge
   *  Called by protocol implementation on incoming challenge. If client is
   *  first (isClientFirst == true) challenge will be null on the first call.
   *
   *  Parameters:
   *    (Strophe.Connection) connection - Target Connection.
   *    (String) challenge - current challenge to handle.
   *
   *  Returns:
   *    (String) Mechanism response.
   */
  /* jshint unused:false */
  onChallenge: function(connection, challenge) {
    throw new Error("You should implement challenge handling!");
  },
  /* jshint unused:true */

  /** PrivateFunction: onFailure
   *  Protocol informs mechanism implementation about SASL failure.
   */
  onFailure: function() {
    this._connection = null;
  },

  /** PrivateFunction: onSuccess
   *  Protocol informs mechanism implementation about SASL success.
   */
  onSuccess: function() {
    this._connection = null;
  }
};

  /** Constants: SASL mechanisms
   *  Available authentication mechanisms
   *
   *  Strophe.SASLAnonymous - SASL Anonymous authentication.
   *  Strophe.SASLPlain - SASL Plain authentication.
   *  Strophe.SASLMD5 - SASL Digest-MD5 authentication
   *  Strophe.SASLSHA1 - SASL SCRAM-SHA1 authentication
   */

// Building SASL callbacks

/** PrivateConstructor: SASLAnonymous
 *  SASL Anonymous authentication.
 */
Strophe.SASLAnonymous = function() {};

Strophe.SASLAnonymous.prototype = new Strophe.SASLMechanism("ANONYMOUS", false, 10);

Strophe.SASLAnonymous.test = function(connection) {
  return connection.authcid === null;
};

Strophe.Connection.prototype.mechanisms[Strophe.SASLAnonymous.prototype.name] = Strophe.SASLAnonymous;

/** PrivateConstructor: SASLPlain
 *  SASL Plain authentication.
 */
Strophe.SASLPlain = function() {};

Strophe.SASLPlain.prototype = new Strophe.SASLMechanism("PLAIN", true, 20);

Strophe.SASLPlain.test = function(connection) {
  return connection.authcid !== null;
};

Strophe.SASLPlain.prototype.onChallenge = function(connection) {
  var auth_str = connection.authzid;
  auth_str = auth_str + "\u0000";
  auth_str = auth_str + connection.authcid;
  auth_str = auth_str + "\u0000";
  auth_str = auth_str + connection.pass;
  return auth_str;
};

Strophe.Connection.prototype.mechanisms[Strophe.SASLPlain.prototype.name] = Strophe.SASLPlain;

/** PrivateConstructor: SASLSHA1
 *  SASL SCRAM SHA 1 authentication.
 */
Strophe.SASLSHA1 = function() {};

/* TEST:
 * This is a simple example of a SCRAM-SHA-1 authentication exchange
 * when the client doesn't support channel bindings (username 'user' and
 * password 'pencil' are used):
 *
 * C: n,,n=user,r=fyko+d2lbbFgONRv9qkxdawL
 * S: r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,s=QSXCR+Q6sek8bf92,
 * i=4096
 * C: c=biws,r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,
 * p=v0X8v3Bz2T0CJGbJQyF0X+HI4Ts=
 * S: v=rmF9pqV8S7suAoZWja4dJRkFsKQ=
 *
 */

Strophe.SASLSHA1.prototype = new Strophe.SASLMechanism("SCRAM-SHA-1", true, 40);

Strophe.SASLSHA1.test = function(connection) {
  return connection.authcid !== null;
};

Strophe.SASLSHA1.prototype.onChallenge = function(connection, challenge, test_cnonce) {
  var cnonce = test_cnonce || MD5.hexdigest(Math.random() * 1234567890);

  var auth_str = "n=" + connection.authcid;
  auth_str += ",r=";
  auth_str += cnonce;

  connection._sasl_data.cnonce = cnonce;
  connection._sasl_data["client-first-message-bare"] = auth_str;

  auth_str = "n,," + auth_str;

  this.onChallenge = function (connection, challenge)
  {
    var nonce, salt, iter, Hi, U, U_old, i, k;
    var clientKey, serverKey, clientSignature;
    var responseText = "c=biws,";
    var authMessage = connection._sasl_data["client-first-message-bare"] + "," +
      challenge + ",";
    var cnonce = connection._sasl_data.cnonce;
    var attribMatch = /([a-z]+)=([^,]+)(,|$)/;

    while (challenge.match(attribMatch)) {
      var matches = challenge.match(attribMatch);
      challenge = challenge.replace(matches[0], "");
      switch (matches[1]) {
      case "r":
        nonce = matches[2];
        break;
      case "s":
        salt = matches[2];
        break;
      case "i":
        iter = matches[2];
        break;
      }
    }

    if (nonce.substr(0, cnonce.length) !== cnonce) {
      connection._sasl_data = {};
      return connection._sasl_failure_cb();
    }

    responseText += "r=" + nonce;
    authMessage += responseText;

    salt = Base64.decode(salt);
    salt += "\x00\x00\x00\x01";

    Hi = U_old = core_hmac_sha1(connection.pass, salt);
    for (i = 1; i < iter; i++) {
      U = core_hmac_sha1(connection.pass, binb2str(U_old));
      for (k = 0; k < 5; k++) {
        Hi[k] ^= U[k];
      }
      U_old = U;
    }
    Hi = binb2str(Hi);

    clientKey = core_hmac_sha1(Hi, "Client Key");
    serverKey = str_hmac_sha1(Hi, "Server Key");
    clientSignature = core_hmac_sha1(str_sha1(binb2str(clientKey)), authMessage);
    connection._sasl_data["server-signature"] = b64_hmac_sha1(serverKey, authMessage);

    for (k = 0; k < 5; k++) {
      clientKey[k] ^= clientSignature[k];
    }

    responseText += ",p=" + Base64.encode(binb2str(clientKey));

    return responseText;
  }.bind(this);

  return auth_str;
};

Strophe.Connection.prototype.mechanisms[Strophe.SASLSHA1.prototype.name] = Strophe.SASLSHA1;

/** PrivateConstructor: SASLMD5
 *  SASL DIGEST MD5 authentication.
 */
Strophe.SASLMD5 = function() {};

Strophe.SASLMD5.prototype = new Strophe.SASLMechanism("DIGEST-MD5", false, 30);

Strophe.SASLMD5.test = function(connection) {
  return connection.authcid !== null;
};

/** PrivateFunction: _quote
 *  _Private_ utility function to backslash escape and quote strings.
 *
 *  Parameters:
 *    (String) str - The string to be quoted.
 *
 *  Returns:
 *    quoted string
 */
Strophe.SASLMD5.prototype._quote = function (str)
  {
    return '"' + str.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    //" end string workaround for emacs
  };


Strophe.SASLMD5.prototype.onChallenge = function(connection, challenge, test_cnonce) {
  var attribMatch = /([a-z]+)=("[^"]+"|[^,"]+)(?:,|$)/;
  var cnonce = test_cnonce || MD5.hexdigest("" + (Math.random() * 1234567890));
  var realm = "";
  var host = null;
  var nonce = "";
  var qop = "";
  var matches;

  while (challenge.match(attribMatch)) {
    matches = challenge.match(attribMatch);
    challenge = challenge.replace(matches[0], "");
    matches[2] = matches[2].replace(/^"(.+)"$/, "$1");
    switch (matches[1]) {
    case "realm":
      realm = matches[2];
      break;
    case "nonce":
      nonce = matches[2];
      break;
    case "qop":
      qop = matches[2];
      break;
    case "host":
      host = matches[2];
      break;
    }
  }

  var digest_uri = connection.servtype + "/" + connection.domain;
  if (host !== null) {
    digest_uri = digest_uri + "/" + host;
  }

  var A1 = MD5.hash(connection.authcid +
                    ":" + realm + ":" + this._connection.pass) +
    ":" + nonce + ":" + cnonce;
  var A2 = 'AUTHENTICATE:' + digest_uri;

  var responseText = "";
  responseText += 'charset=utf-8,';
  responseText += 'username=' +
    this._quote(connection.authcid) + ',';
  responseText += 'realm=' + this._quote(realm) + ',';
  responseText += 'nonce=' + this._quote(nonce) + ',';
  responseText += 'nc=00000001,';
  responseText += 'cnonce=' + this._quote(cnonce) + ',';
  responseText += 'digest-uri=' + this._quote(digest_uri) + ',';
  responseText += 'response=' + MD5.hexdigest(MD5.hexdigest(A1) + ":" +
                                              nonce + ":00000001:" +
                                              cnonce + ":auth:" +
                                              MD5.hexdigest(A2)) + ",";
  responseText += 'qop=auth';

  this.onChallenge = function ()
  {
    return "";
  }.bind(this);

  return responseText;
};

Strophe.Connection.prototype.mechanisms[Strophe.SASLMD5.prototype.name] = Strophe.SASLMD5;

})(function () {
    window.Strophe = arguments[0];
    window.$build = arguments[1];
    window.$msg = arguments[2];
    window.$iq = arguments[3];
    window.$pres = arguments[4];
});

/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2008, OGG, LLC
*/

/* jshint undef: true, unused: true:, noarg: true, latedef: true */
/*global window, setTimeout, clearTimeout,
    XMLHttpRequest, ActiveXObject,
    Strophe, $build */


/** PrivateClass: Strophe.Request
 *  _Private_ helper class that provides a cross implementation abstraction
 *  for a BOSH related XMLHttpRequest.
 *
 *  The Strophe.Request class is used internally to encapsulate BOSH request
 *  information.  It is not meant to be used from user's code.
 */

/** PrivateConstructor: Strophe.Request
 *  Create and initialize a new Strophe.Request object.
 *
 *  Parameters:
 *    (XMLElement) elem - The XML data to be sent in the request.
 *    (Function) func - The function that will be called when the
 *      XMLHttpRequest readyState changes.
 *    (Integer) rid - The BOSH rid attribute associated with this request.
 *    (Integer) sends - The number of times this same request has been
 *      sent.
 */
Strophe.Request = function (elem, func, rid, sends)
{
    this.id = ++Strophe._requestId;
    this.xmlData = elem;
    this.data = Strophe.serialize(elem);
    // save original function in case we need to make a new request
    // from this one.
    this.origFunc = func;
    this.func = func;
    this.rid = rid;
    this.date = NaN;
    this.sends = sends || 0;
    this.abort = false;
    this.dead = null;

    this.age = function () {
        if (!this.date) { return 0; }
        var now = new Date();
        return (now - this.date) / 1000;
    };
    this.timeDead = function () {
        if (!this.dead) { return 0; }
        var now = new Date();
        return (now - this.dead) / 1000;
    };
    this.xhr = this._newXHR();
};

Strophe.Request.prototype = {
    /** PrivateFunction: getResponse
     *  Get a response from the underlying XMLHttpRequest.
     *
     *  This function attempts to get a response from the request and checks
     *  for errors.
     *
     *  Throws:
     *    "parsererror" - A parser error occured.
     *
     *  Returns:
     *    The DOM element tree of the response.
     */
    getResponse: function ()
    {
        var node = null;
        if (this.xhr.responseXML && this.xhr.responseXML.documentElement) {
            node = this.xhr.responseXML.documentElement;
            if (node.tagName == "parsererror") {
                Strophe.error("invalid response received");
                Strophe.error("responseText: " + this.xhr.responseText);
                Strophe.error("responseXML: " +
                              Strophe.serialize(this.xhr.responseXML));
                throw "parsererror";
            }
        } else if (this.xhr.responseText) {
            Strophe.error("invalid response received");
            Strophe.error("responseText: " + this.xhr.responseText);
            Strophe.error("responseXML: " +
                          Strophe.serialize(this.xhr.responseXML));
        }

        return node;
    },

    /** PrivateFunction: _newXHR
     *  _Private_ helper function to create XMLHttpRequests.
     *
     *  This function creates XMLHttpRequests across all implementations.
     *
     *  Returns:
     *    A new XMLHttpRequest.
     */
    _newXHR: function ()
    {
        var xhr = null;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType("text/xml");
            }
        } else if (window.ActiveXObject) {
            xhr = new ActiveXObject("Microsoft.XMLHTTP");
        }

        // use Function.bind() to prepend ourselves as an argument
        xhr.onreadystatechange = this.func.bind(null, this);

        return xhr;
    }
};

/** Class: Strophe.Bosh
 *  _Private_ helper class that handles BOSH Connections
 *
 *  The Strophe.Bosh class is used internally by Strophe.Connection
 *  to encapsulate BOSH sessions. It is not meant to be used from user's code.
 */

/** File: bosh.js
 *  A JavaScript library to enable BOSH in Strophejs.
 *
 *  this library uses Bidirectional-streams Over Synchronous HTTP (BOSH)
 *  to emulate a persistent, stateful, two-way connection to an XMPP server.
 *  More information on BOSH can be found in XEP 124.
 */

/** PrivateConstructor: Strophe.Bosh
 *  Create and initialize a Strophe.Bosh object.
 *
 *  Parameters:
 *    (Strophe.Connection) connection - The Strophe.Connection that will use BOSH.
 *
 *  Returns:
 *    A new Strophe.Bosh object.
 */
Strophe.Bosh = function(connection) {
    this._conn = connection;
    /* request id for body tags */
    this.rid = Math.floor(Math.random() * 4294967295);
    /* The current session ID. */
    this.sid = null;

    // default BOSH values
    this.hold = 1;
    this.wait = 60;
    this.window = 5;

    this._requests = [];
};

Strophe.Bosh.prototype = {
    /** Variable: strip
     *
     *  BOSH-Connections will have all stanzas wrapped in a <body> tag when
     *  passed to <Strophe.Connection.xmlInput> or <Strophe.Connection.xmlOutput>.
     *  To strip this tag, User code can set <Strophe.Bosh.strip> to "body":
     *
     *  > Strophe.Bosh.prototype.strip = "body";
     *
     *  This will enable stripping of the body tag in both
     *  <Strophe.Connection.xmlInput> and <Strophe.Connection.xmlOutput>.
     */
    strip: null,

    /** PrivateFunction: _buildBody
     *  _Private_ helper function to generate the <body/> wrapper for BOSH.
     *
     *  Returns:
     *    A Strophe.Builder with a <body/> element.
     */
    _buildBody: function ()
    {
        var bodyWrap = $build('body', {
            rid: this.rid++,
            xmlns: Strophe.NS.HTTPBIND
        });

        if (this.sid !== null) {
            bodyWrap.attrs({sid: this.sid});
        }

        return bodyWrap;
    },

    /** PrivateFunction: _reset
     *  Reset the connection.
     *
     *  This function is called by the reset function of the Strophe Connection
     */
    _reset: function ()
    {
        this.rid = Math.floor(Math.random() * 4294967295);
        this.sid = null;
        
        jQuery(document).trigger('ridChange', {rid: this.rid});
    },

    /** PrivateFunction: _connect
     *  _Private_ function that initializes the BOSH connection.
     *
     *  Creates and sends the Request that initializes the BOSH connection.
     */
    _connect: function (wait, hold, route)
    {
        this.wait = wait || this.wait;
        this.hold = hold || this.hold;

        // build the body tag
        var body = this._buildBody().attrs({
            to: this._conn.domain,
            "xml:lang": "en",
            wait: this.wait,
            hold: this.hold,
            content: "text/xml; charset=utf-8",
            ver: "1.6",
            "xmpp:version": "1.0",
            "xmlns:xmpp": Strophe.NS.BOSH
        });

        if(route){
            body.attrs({
                route: route
            });
        }

        var _connect_cb = this._conn._connect_cb;

        this._requests.push(
            new Strophe.Request(body.tree(),
                                this._onRequestStateChange.bind(
                                    this, _connect_cb.bind(this._conn)),
                                body.tree().getAttribute("rid")));
        this._throttledRequestHandler();
    },

    /** PrivateFunction: _attach
     *  Attach to an already created and authenticated BOSH session.
     *
     *  This function is provided to allow Strophe to attach to BOSH
     *  sessions which have been created externally, perhaps by a Web
     *  application.  This is often used to support auto-login type features
     *  without putting user credentials into the page.
     *
     *  Parameters:
     *    (String) jid - The full JID that is bound by the session.
     *    (String) sid - The SID of the BOSH session.
     *    (String) rid - The current RID of the BOSH session.  This RID
     *      will be used by the next request.
     *    (Function) callback The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *      Other settings will require tweaks to the Strophe.TIMEOUT value.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (Integer) wind - The optional HTTBIND window value.  This is the
     *      allowed range of request ids that are valid.  The default is 5.
     */
    _attach: function (jid, sid, rid, callback, wait, hold, wind)
    {
        this._conn.jid = jid;
        this.sid = sid;
        this.rid = rid;

        this._conn.connect_callback = callback;

        this._conn.domain = Strophe.getDomainFromJid(this._conn.jid);

        this._conn.authenticated = true;
        this._conn.connected = true;

        this.wait = wait || this.wait;
        this.hold = hold || this.hold;
        this.window = wind || this.window;

        this._conn._changeConnectStatus(Strophe.Status.ATTACHED, null);
    },

    /** PrivateFunction: _connect_cb
     *  _Private_ handler for initial connection request.
     *
     *  This handler is used to process the Bosh-part of the initial request.
     *  Parameters:
     *    (Strophe.Request) bodyWrap - The received stanza.
     */
    _connect_cb: function (bodyWrap)
    {
        var typ = bodyWrap.getAttribute("type");
        var cond, conflict;
        if (typ !== null && typ == "terminate") {
            // an error occurred
            Strophe.error("BOSH-Connection failed: " + cond);
            cond = bodyWrap.getAttribute("condition");
            conflict = bodyWrap.getElementsByTagName("conflict");
            if (cond !== null) {
                if (cond == "remote-stream-error" && conflict.length > 0) {
                    cond = "conflict";
                }
                this._conn._changeConnectStatus(Strophe.Status.CONNFAIL, cond);
            } else {
                this._conn._changeConnectStatus(Strophe.Status.CONNFAIL, "unknown");
            }
            this._conn._doDisconnect();
            return Strophe.Status.CONNFAIL;
        }

        // check to make sure we don't overwrite these if _connect_cb is
        // called multiple times in the case of missing stream:features
        if (!this.sid) {
            this.sid = bodyWrap.getAttribute("sid");
        }
        var wind = bodyWrap.getAttribute('requests');
        if (wind) { this.window = parseInt(wind, 10); }
        var hold = bodyWrap.getAttribute('hold');
        if (hold) { this.hold = parseInt(hold, 10); }
        var wait = bodyWrap.getAttribute('wait');
        if (wait) { this.wait = parseInt(wait, 10); }
    },

    /** PrivateFunction: _disconnect
     *  _Private_ part of Connection.disconnect for Bosh
     *
     *  Parameters:
     *    (Request) pres - This stanza will be sent before disconnecting.
     */
    _disconnect: function (pres)
    {
        this._sendTerminate(pres);
    },

    /** PrivateFunction: _doDisconnect
     *  _Private_ function to disconnect.
     *
     *  Resets the SID and RID.
     */
    _doDisconnect: function ()
    {
        this.sid = null;
        this.rid = Math.floor(Math.random() * 4294967295);
        
        jQuery(document).trigger('ridChange', {rid: this.rid});
    },

    /** PrivateFunction: _emptyQueue
     * _Private_ function to check if the Request queue is empty.
     *
     *  Returns:
     *    True, if there are no Requests queued, False otherwise.
     */
    _emptyQueue: function ()
    {
        return this._requests.length === 0;
    },

    /** PrivateFunction: _hitError
     *  _Private_ function to handle the error count.
     *
     *  Requests are resent automatically until their error count reaches
     *  5.  Each time an error is encountered, this function is called to
     *  increment the count and disconnect if the count is too high.
     *
     *  Parameters:
     *    (Integer) reqStatus - The request status.
     */
    _hitError: function (reqStatus)
    {
        this.errors++;
        Strophe.warn("request errored, status: " + reqStatus +
                     ", number of errors: " + this.errors);
        if (this.errors > 4) {
            this._onDisconnectTimeout();
        }
    },

    /** PrivateFunction: _no_auth_received
     *
     * Called on stream start/restart when no stream:features
     * has been received and sends a blank poll request.
     */
    _no_auth_received: function (_callback)
    {
        if (_callback) {
            _callback = _callback.bind(this._conn);
        } else {
            _callback = this._conn._connect_cb.bind(this._conn);
        }
        var body = this._buildBody();
        this._requests.push(
                new Strophe.Request(body.tree(),
                    this._onRequestStateChange.bind(
                        this, _callback.bind(this._conn)),
                    body.tree().getAttribute("rid")));
        this._throttledRequestHandler();
    },

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  Cancels all remaining Requests and clears the queue.
     */
    _onDisconnectTimeout: function ()
    {
        var req;
        while (this._requests.length > 0) {
            req = this._requests.pop();
            req.abort = true;
            req.xhr.abort();
            // jslint complains, but this is fine. setting to empty func
            // is necessary for IE6
            req.xhr.onreadystatechange = function () {}; // jshint ignore:line
        }
    },

    /** PrivateFunction: _onIdle
     *  _Private_ handler called by Strophe.Connection._onIdle
     *
     *  Sends all queued Requests or polls with empty Request if there are none.
     */
    _onIdle: function () {
        var data = this._conn._data;

        // if no requests are in progress, poll
        if (this._conn.authenticated && this._requests.length === 0 &&
            data.length === 0 && !this._conn.disconnecting) {
            Strophe.info("no requests during idle cycle, sending " +
                         "blank request");
            data.push(null);
        }

        if (this._requests.length < 2 && data.length > 0 &&
            !this._conn.paused) {
            var body = this._buildBody();
            for (var i = 0; i < data.length; i++) {
                if (data[i] !== null) {
                    if (data[i] === "restart") {
                        body.attrs({
                            to: this._conn.domain,
                            "xml:lang": "en",
                            "xmpp:restart": "true",
                            "xmlns:xmpp": Strophe.NS.BOSH
                        });
                    } else {
                        body.cnode(data[i]).up();
                    }
                }
            }
            delete this._conn._data;
            this._conn._data = [];
            this._requests.push(
                new Strophe.Request(body.tree(),
                                    this._onRequestStateChange.bind(
                                        this, this._conn._dataRecv.bind(this._conn)),
                                    body.tree().getAttribute("rid")));
            this._processRequest(this._requests.length - 1);
        }

        if (this._requests.length > 0) {
            var time_elapsed = this._requests[0].age();
            if (this._requests[0].dead !== null) {
                if (this._requests[0].timeDead() >
                    Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait)) {
                    this._throttledRequestHandler();
                }
            }

            if (time_elapsed > Math.floor(Strophe.TIMEOUT * this.wait)) {
                Strophe.warn("Request " +
                             this._requests[0].id +
                             " timed out, over " + Math.floor(Strophe.TIMEOUT * this.wait) +
                             " seconds since last activity");
                this._throttledRequestHandler();
            }
        }
    },

    /** PrivateFunction: _onRequestStateChange
     *  _Private_ handler for Strophe.Request state changes.
     *
     *  This function is called when the XMLHttpRequest readyState changes.
     *  It contains a lot of error handling logic for the many ways that
     *  requests can fail, and calls the request callback when requests
     *  succeed.
     *
     *  Parameters:
     *    (Function) func - The handler for the request.
     *    (Strophe.Request) req - The request that is changing readyState.
     */
    _onRequestStateChange: function (func, req)
    {
        Strophe.debug("request id " + req.id +
                      "." + req.sends + " state changed to " +
                      req.xhr.readyState);

        if (req.abort) {
            req.abort = false;
            return;
        }

        if(req.xhr.readyState == 2){ 
           jQuery(document).trigger('ridChange', {rid: Number(req.rid)+1});
        }
        
        // request complete
        var reqStatus;
        if (req.xhr.readyState == 4) {
            reqStatus = 0;
            try {
                reqStatus = req.xhr.status;
            } catch (e) {
                // ignore errors from undefined status attribute.  works
                // around a browser bug
            }

            if (typeof(reqStatus) == "undefined") {
                reqStatus = 0;
            }

            if (this.disconnecting) {
                if (reqStatus >= 400) {
                    this._hitError(reqStatus);
                    return;
                }
            }

            var reqIs0 = (this._requests[0] == req);
            var reqIs1 = (this._requests[1] == req);

            if ((reqStatus > 0 && reqStatus < 500) || req.sends > 5) {
                // remove from internal queue
                this._removeRequest(req);
                Strophe.debug("request id " +
                              req.id +
                              " should now be removed");
            }

            // request succeeded
            if (reqStatus == 200) {
                // if request 1 finished, or request 0 finished and request
                // 1 is over Strophe.SECONDARY_TIMEOUT seconds old, we need to
                // restart the other - both will be in the first spot, as the
                // completed request has been removed from the queue already
                if (reqIs1 ||
                    (reqIs0 && this._requests.length > 0 &&
                     this._requests[0].age() > Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait))) {
                    this._restartRequest(0);
                }
                // call handler
                Strophe.debug("request id " +
                              req.id + "." +
                              req.sends + " got 200");
                func(req);
                this.errors = 0;
            } else {
                Strophe.error("request id " +
                              req.id + "." +
                              req.sends + " error " + reqStatus +
                              " happened");
                if (reqStatus === 0 ||
                    (reqStatus >= 400 && reqStatus < 600) ||
                    reqStatus >= 12000) {
                    this._hitError(reqStatus);
                    if (reqStatus >= 400 && reqStatus < 500) {
                        this._conn._changeConnectStatus(Strophe.Status.DISCONNECTING,
                                                  null);
                        this._conn._doDisconnect();
                    }
                }
            }

            if (!((reqStatus > 0 && reqStatus < 500) ||
                  req.sends > 5)) {
                this._throttledRequestHandler();
            }
        }
    },

    /** PrivateFunction: _processRequest
     *  _Private_ function to process a request in the queue.
     *
     *  This function takes requests off the queue and sends them and
     *  restarts dead requests.
     *
     *  Parameters:
     *    (Integer) i - The index of the request in the queue.
     */
    _processRequest: function (i)
    {
        var self = this;
        var req = this._requests[i];
        var reqStatus = -1;

        try {
            if (req.xhr.readyState == 4) {
                reqStatus = req.xhr.status;
            }
        } catch (e) {
            Strophe.error("caught an error in _requests[" + i +
                          "], reqStatus: " + reqStatus);
        }

        if (typeof(reqStatus) == "undefined") {
            reqStatus = -1;
        }

        // make sure we limit the number of retries
        if (req.sends > this.maxRetries) {
            this._onDisconnectTimeout();
            return;
        }

        var time_elapsed = req.age();
        var primaryTimeout = (!isNaN(time_elapsed) &&
                              time_elapsed > Math.floor(Strophe.TIMEOUT * this.wait));
        var secondaryTimeout = (req.dead !== null &&
                                req.timeDead() > Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait));
        var requestCompletedWithServerError = (req.xhr.readyState == 4 &&
                                               (reqStatus < 1 ||
                                                reqStatus >= 500));
        if (primaryTimeout || secondaryTimeout ||
            requestCompletedWithServerError) {
            if (secondaryTimeout) {
                Strophe.error("Request " +
                              this._requests[i].id +
                              " timed out (secondary), restarting");
            }
            req.abort = true;
            req.xhr.abort();
            // setting to null fails on IE6, so set to empty function
            req.xhr.onreadystatechange = function () {};
            this._requests[i] = new Strophe.Request(req.xmlData,
                                                    req.origFunc,
                                                    req.rid,
                                                    req.sends);
            req = this._requests[i];
        }

        if (req.xhr.readyState === 0) {
            Strophe.debug("request id " + req.id +
                          "." + req.sends + " posting");

            try {
                req.xhr.open("POST", this._conn.service, this._conn.options.sync ? false : true);
            } catch (e2) {
                Strophe.error("XHR open failed.");
                if (!this._conn.connected) {
                    this._conn._changeConnectStatus(Strophe.Status.CONNFAIL,
                                              "bad-service");
                }
                this._conn.disconnect();
                return;
            }

            // Fires the XHR request -- may be invoked immediately
            // or on a gradually expanding retry window for reconnects
            var sendFunc = function () {
                req.date = new Date();
                if (self._conn.options.customHeaders){
                    var headers = self._conn.options.customHeaders;
                    for (var header in headers) {
                        if (headers.hasOwnProperty(header)) {
                            req.xhr.setRequestHeader(header, headers[header]);
                        }
                    }
                }
                req.xhr.send(req.data);
            };

            // Implement progressive backoff for reconnects --
            // First retry (send == 1) should also be instantaneous
            if (req.sends > 1) {
                // Using a cube of the retry number creates a nicely
                // expanding retry window
                var backoff = Math.min(Math.floor(Strophe.TIMEOUT * this.wait),
                                       Math.pow(req.sends, 3)) * 1000;
                setTimeout(sendFunc, backoff);
            } else {
                sendFunc();
            }

            req.sends++;

            if (this._conn.xmlOutput !== Strophe.Connection.prototype.xmlOutput) {
                if (req.xmlData.nodeName === this.strip && req.xmlData.childNodes.length) {
                    this._conn.xmlOutput(req.xmlData.childNodes[0]);
                } else {
                    this._conn.xmlOutput(req.xmlData);
                }
            }
            if (this._conn.rawOutput !== Strophe.Connection.prototype.rawOutput) {
                this._conn.rawOutput(req.data);
            }
        } else {
            Strophe.debug("_processRequest: " +
                          (i === 0 ? "first" : "second") +
                          " request has readyState of " +
                          req.xhr.readyState);
        }
    },

    /** PrivateFunction: _removeRequest
     *  _Private_ function to remove a request from the queue.
     *
     *  Parameters:
     *    (Strophe.Request) req - The request to remove.
     */
    _removeRequest: function (req)
    {
        Strophe.debug("removing request");

        var i;
        for (i = this._requests.length - 1; i >= 0; i--) {
            if (req == this._requests[i]) {
                this._requests.splice(i, 1);
            }
        }

        // IE6 fails on setting to null, so set to empty function
        req.xhr.onreadystatechange = function () {};

        this._throttledRequestHandler();
    },

    /** PrivateFunction: _restartRequest
     *  _Private_ function to restart a request that is presumed dead.
     *
     *  Parameters:
     *    (Integer) i - The index of the request in the queue.
     */
    _restartRequest: function (i)
    {
        var req = this._requests[i];
        if (req.dead === null) {
            req.dead = new Date();
        }

        this._processRequest(i);
    },

    /** PrivateFunction: _reqToData
     * _Private_ function to get a stanza out of a request.
     *
     * Tries to extract a stanza out of a Request Object.
     * When this fails the current connection will be disconnected.
     *
     *  Parameters:
     *    (Object) req - The Request.
     *
     *  Returns:
     *    The stanza that was passed.
     */
    _reqToData: function (req)
    {
        try {
            return req.getResponse();
        } catch (e) {
            if (e != "parsererror") { throw e; }
            this._conn.disconnect("strophe-parsererror");
        }
    },

    /** PrivateFunction: _sendTerminate
     *  _Private_ function to send initial disconnect sequence.
     *
     *  This is the first step in a graceful disconnect.  It sends
     *  the BOSH server a terminate body and includes an unavailable
     *  presence if authentication has completed.
     */
    _sendTerminate: function (pres)
    {
        Strophe.info("_sendTerminate was called");
        var body = this._buildBody().attrs({type: "terminate"});

        if (pres) {
            body.cnode(pres.tree());
        }

        var req = new Strophe.Request(body.tree(),
                                      this._onRequestStateChange.bind(
                                          this, this._conn._dataRecv.bind(this._conn)),
                                      body.tree().getAttribute("rid"));

        this._requests.push(req);
        this._throttledRequestHandler();
    },

    /** PrivateFunction: _send
     *  _Private_ part of the Connection.send function for BOSH
     *
     * Just triggers the RequestHandler to send the messages that are in the queue
     */
    _send: function () {
        clearTimeout(this._conn._idleTimeout);
        this._throttledRequestHandler();
        this._conn._idleTimeout = setTimeout(this._conn._onIdle.bind(this._conn), 100);
    },

    /** PrivateFunction: _sendRestart
     *
     *  Send an xmpp:restart stanza.
     */
    _sendRestart: function ()
    {
        this._throttledRequestHandler();
        clearTimeout(this._conn._idleTimeout);
    },

    /** PrivateFunction: _throttledRequestHandler
     *  _Private_ function to throttle requests to the connection window.
     *
     *  This function makes sure we don't send requests so fast that the
     *  request ids overflow the connection window in the case that one
     *  request died.
     */
    _throttledRequestHandler: function ()
    {
        if (!this._requests) {
            Strophe.debug("_throttledRequestHandler called with " +
                          "undefined requests");
        } else {
            Strophe.debug("_throttledRequestHandler called with " +
                          this._requests.length + " requests");
        }

        if (!this._requests || this._requests.length === 0) {
            return;
        }

        if (this._requests.length > 0) {
            this._processRequest(0);
        }

        if (this._requests.length > 1 &&
            Math.abs(this._requests[0].rid -
                     this._requests[1].rid) < this.window) {
            this._processRequest(1);
        }
    }
};

/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2008, OGG, LLC
*/

/* jshint undef: true, unused: true:, noarg: true, latedef: true */
/*global document, window, clearTimeout, WebSocket,
    DOMParser, Strophe, $build */

/** Class: Strophe.WebSocket
 *  _Private_ helper class that handles WebSocket Connections
 *
 *  The Strophe.WebSocket class is used internally by Strophe.Connection
 *  to encapsulate WebSocket sessions. It is not meant to be used from user's code.
 */

/** File: websocket.js
 *  A JavaScript library to enable XMPP over Websocket in Strophejs.
 *
 *  This file implements XMPP over WebSockets for Strophejs.
 *  If a Connection is established with a Websocket url (ws://...)
 *  Strophe will use WebSockets.
 *  For more information on XMPP-over WebSocket see this RFC draft:
 *  http://tools.ietf.org/html/draft-ietf-xmpp-websocket-00
 *
 *  WebSocket support implemented by Andreas Guth (andreas.guth@rwth-aachen.de)
 */

/** PrivateConstructor: Strophe.Websocket
 *  Create and initialize a Strophe.WebSocket object.
 *  Currently only sets the connection Object.
 *
 *  Parameters:
 *    (Strophe.Connection) connection - The Strophe.Connection that will use WebSockets.
 *
 *  Returns:
 *    A new Strophe.WebSocket object.
 */
Strophe.Websocket = function(connection) {
    this._conn = connection;
    this.strip = "stream:stream";

    var service = connection.service;
    if (service.indexOf("ws:") !== 0 && service.indexOf("wss:") !== 0) {
        // If the service is not an absolute URL, assume it is a path and put the absolute
        // URL together from options, current URL and the path.
        var new_service = "";

        if (connection.options.protocol === "ws" && window.location.protocol !== "https:") {
            new_service += "ws";
        } else {
            new_service += "wss";
        }

        new_service += "://" + window.location.host;

        if (service.indexOf("/") !== 0) {
            new_service += window.location.pathname + service;
        } else {
            new_service += service;
        }

        connection.service = new_service;
    }
};

Strophe.Websocket.prototype = {
    /** PrivateFunction: _buildStream
     *  _Private_ helper function to generate the <stream> start tag for WebSockets
     *
     *  Returns:
     *    A Strophe.Builder with a <stream> element.
     */
    _buildStream: function ()
    {
        return $build("stream:stream", {
            "to": this._conn.domain,
            "xmlns": Strophe.NS.CLIENT,
            "xmlns:stream": Strophe.NS.STREAM,
            "version": '1.0'
        });
    },

    /** PrivateFunction: _check_streamerror
     * _Private_ checks a message for stream:error
     *
     *  Parameters:
     *    (Strophe.Request) bodyWrap - The received stanza.
     *    connectstatus - The ConnectStatus that will be set on error.
     *  Returns:
     *     true if there was a streamerror, false otherwise.
     */
    _check_streamerror: function (bodyWrap, connectstatus) {
        var errors = bodyWrap.getElementsByTagName("stream:error");
        if (errors.length === 0) {
            return false;
        }
        var error = errors[0];

        var condition = "";
        var text = "";

        var ns = "urn:ietf:params:xml:ns:xmpp-streams";
        for (var i = 0; i < error.childNodes.length; i++) {
            var e = error.childNodes[i];
            if (e.getAttribute("xmlns") !== ns) {
                break;
            } if (e.nodeName === "text") {
                text = e.textContent;
            } else {
                condition = e.nodeName;
            }
        }

        var errorString = "WebSocket stream error: ";

        if (condition) {
            errorString += condition;
        } else {
            errorString += "unknown";
        }

        if (text) {
            errorString += " - " + condition;
        }

        Strophe.error(errorString);

        // close the connection on stream_error
        this._conn._changeConnectStatus(connectstatus, condition);
        this._conn._doDisconnect();
        return true;
    },

    /** PrivateFunction: _reset
     *  Reset the connection.
     *
     *  This function is called by the reset function of the Strophe Connection.
     *  Is not needed by WebSockets.
     */
    _reset: function ()
    {
        return;
    },

    /** PrivateFunction: _connect
     *  _Private_ function called by Strophe.Connection.connect
     *
     *  Creates a WebSocket for a connection and assigns Callbacks to it.
     *  Does nothing if there already is a WebSocket.
     */
    _connect: function () {
        // Ensure that there is no open WebSocket from a previous Connection.
        this._closeSocket();

        // Create the new WobSocket
        this.socket = new WebSocket(this._conn.service, "xmpp");
        this.socket.onopen = this._onOpen.bind(this);
        this.socket.onerror = this._onError.bind(this);
        this.socket.onclose = this._onClose.bind(this);
        this.socket.onmessage = this._connect_cb_wrapper.bind(this);
    },

    /** PrivateFunction: _connect_cb
     *  _Private_ function called by Strophe.Connection._connect_cb
     *
     * checks for stream:error
     *
     *  Parameters:
     *    (Strophe.Request) bodyWrap - The received stanza.
     */
    _connect_cb: function(bodyWrap) {
        var error = this._check_streamerror(bodyWrap, Strophe.Status.CONNFAIL);
        if (error) {
            return Strophe.Status.CONNFAIL;
        }
    },

    /** PrivateFunction: _handleStreamStart
     * _Private_ function that checks the opening stream:stream tag for errors.
     *
     * Disconnects if there is an error and returns false, true otherwise.
     *
     *  Parameters:
     *    (Node) message - Stanza containing the stream:stream.
     */
    _handleStreamStart: function(message) {
        var error = false;
        // Check for errors in the stream:stream tag
        var ns = message.getAttribute("xmlns");
        if (typeof ns !== "string") {
            error = "Missing xmlns in stream:stream";
        } else if (ns !== Strophe.NS.CLIENT) {
            error = "Wrong xmlns in stream:stream: " + ns;
        }

        var ns_stream = message.namespaceURI;
        if (typeof ns_stream !== "string") {
            error = "Missing xmlns:stream in stream:stream";
        } else if (ns_stream !== Strophe.NS.STREAM) {
            error = "Wrong xmlns:stream in stream:stream: " + ns_stream;
        }

        var ver = message.getAttribute("version");
        if (typeof ver !== "string") {
            error = "Missing version in stream:stream";
        } else if (ver !== "1.0") {
            error = "Wrong version in stream:stream: " + ver;
        }

        if (error) {
            this._conn._changeConnectStatus(Strophe.Status.CONNFAIL, error);
            this._conn._doDisconnect();
            return false;
        }

        return true;
    },

    /** PrivateFunction: _connect_cb_wrapper
     * _Private_ function that handles the first connection messages.
     *
     * On receiving an opening stream tag this callback replaces itself with the real
     * message handler. On receiving a stream error the connection is terminated.
     */
    _connect_cb_wrapper: function(message) {
        if (message.data.indexOf("<stream:stream ") === 0 || message.data.indexOf("<?xml") === 0) {
            // Strip the XML Declaration, if there is one
            var data = message.data.replace(/^(<\?.*?\?>\s*)*/, "");
            if (data === '') return;

            //Make the initial stream:stream selfclosing to parse it without a SAX parser.
            data = message.data.replace(/<stream:stream (.*[^\/])>/, "<stream:stream $1/>");

            var streamStart = new DOMParser().parseFromString(data, "text/xml").documentElement;
            this._conn.xmlInput(streamStart);
            this._conn.rawInput(message.data);

            //_handleStreamSteart will check for XML errors and disconnect on error
            if (this._handleStreamStart(streamStart)) {

                //_connect_cb will check for stream:error and disconnect on error
                this._connect_cb(streamStart);

                // ensure received stream:stream is NOT selfclosing and save it for following messages
                this.streamStart = message.data.replace(/^<stream:(.*)\/>$/, "<stream:$1>");
            }
        } else if (message.data === "</stream:stream>") {
            this._conn.rawInput(message.data);
            this._conn.xmlInput(document.createElement("stream:stream"));
            this._conn._changeConnectStatus(Strophe.Status.CONNFAIL, "Received closing stream");
            this._conn._doDisconnect();
            return;
        } else {
            var string = this._streamWrap(message.data);
            var elem = new DOMParser().parseFromString(string, "text/xml").documentElement;
            this.socket.onmessage = this._onMessage.bind(this);
            this._conn._connect_cb(elem, null, message.data);
        }
    },

    /** PrivateFunction: _disconnect
     *  _Private_ function called by Strophe.Connection.disconnect
     *
     *  Disconnects and sends a last stanza if one is given
     *
     *  Parameters:
     *    (Request) pres - This stanza will be sent before disconnecting.
     */
    _disconnect: function (pres)
    {
        if (this.socket.readyState !== WebSocket.CLOSED) {
            if (pres) {
                this._conn.send(pres);
            }
            var close = '</stream:stream>';
            this._conn.xmlOutput(document.createElement("stream:stream"));
            this._conn.rawOutput(close);
            try {
                this.socket.send(close);
            } catch (e) {
                Strophe.info("Couldn't send closing stream tag.");
            }
        }

        this._conn._doDisconnect();
    },

    /** PrivateFunction: _doDisconnect
     *  _Private_ function to disconnect.
     *
     *  Just closes the Socket for WebSockets
     */
    _doDisconnect: function ()
    {
        Strophe.info("WebSockets _doDisconnect was called");
        this._closeSocket();
    },

    /** PrivateFunction _streamWrap
     *  _Private_ helper function to wrap a stanza in a <stream> tag.
     *  This is used so Strophe can process stanzas from WebSockets like BOSH
     */
    _streamWrap: function (stanza)
    {
        return this.streamStart + stanza + '</stream:stream>';
    },


    /** PrivateFunction: _closeSocket
     *  _Private_ function to close the WebSocket.
     *
     *  Closes the socket if it is still open and deletes it
     */
    _closeSocket: function ()
    {
        if (this.socket) { try {
            this.socket.close();
        } catch (e) {} }
        this.socket = null;
    },

    /** PrivateFunction: _emptyQueue
     * _Private_ function to check if the message queue is empty.
     *
     *  Returns:
     *    True, because WebSocket messages are send immediately after queueing.
     */
    _emptyQueue: function ()
    {
        return true;
    },

    /** PrivateFunction: _onClose
     * _Private_ function to handle websockets closing.
     *
     * Nothing to do here for WebSockets
     */
    _onClose: function() {
        if(this._conn.connected && !this._conn.disconnecting) {
            Strophe.error("Websocket closed unexcectedly");
            this._conn._doDisconnect();
        } else {
            Strophe.info("Websocket closed");
        }
    },

    /** PrivateFunction: _no_auth_received
     *
     * Called on stream start/restart when no stream:features
     * has been received.
     */
    _no_auth_received: function (_callback)
    {
        Strophe.error("Server did not send any auth methods");
        this._conn._changeConnectStatus(Strophe.Status.CONNFAIL, "Server did not send any auth methods");
        if (_callback) {
            _callback = _callback.bind(this._conn);
            _callback();
        }
        this._conn._doDisconnect();
    },

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  This does nothing for WebSockets
     */
    _onDisconnectTimeout: function () {},

    /** PrivateFunction: _onError
     * _Private_ function to handle websockets errors.
     *
     * Parameters:
     * (Object) error - The websocket error.
     */
    _onError: function(error) {
        Strophe.error("Websocket error " + error);
        this._conn._changeConnectStatus(Strophe.Status.CONNFAIL, "The WebSocket connection could not be established was disconnected.");
        this._disconnect();
    },

    /** PrivateFunction: _onIdle
     *  _Private_ function called by Strophe.Connection._onIdle
     *
     *  sends all queued stanzas
     */
    _onIdle: function () {
        var data = this._conn._data;
        if (data.length > 0 && !this._conn.paused) {
            for (var i = 0; i < data.length; i++) {
                if (data[i] !== null) {
                    var stanza, rawStanza;
                    if (data[i] === "restart") {
                        stanza = this._buildStream();
                        rawStanza = this._removeClosingTag(stanza);
                        stanza = stanza.tree();
                    } else {
                        stanza = data[i];
                        rawStanza = Strophe.serialize(stanza);
                    }
                    this._conn.xmlOutput(stanza);
                    this._conn.rawOutput(rawStanza);
                    this.socket.send(rawStanza);
                }
            }
            this._conn._data = [];
        }
    },

    /** PrivateFunction: _onMessage
     * _Private_ function to handle websockets messages.
     *
     * This function parses each of the messages as if they are full documents. [TODO : We may actually want to use a SAX Push parser].
     *
     * Since all XMPP traffic starts with "<stream:stream version='1.0' xml:lang='en' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' id='3697395463' from='SERVER'>"
     * The first stanza will always fail to be parsed...
     * Addtionnaly, the seconds stanza will always be a <stream:features> with the stream NS defined in the previous stanza... so we need to 'force' the inclusion of the NS in this stanza!
     *
     * Parameters:
     * (string) message - The websocket message.
     */
    _onMessage: function(message) {
        var elem, data;
        // check for closing stream
        if (message.data === "</stream:stream>") {
            var close = "</stream:stream>";
            this._conn.rawInput(close);
            this._conn.xmlInput(document.createElement("stream:stream"));
            if (!this._conn.disconnecting) {
                this._conn._doDisconnect();
            }
            return;
        } else if (message.data.search("<stream:stream ") === 0) {
            //Make the initial stream:stream selfclosing to parse it without a SAX parser.
            data = message.data.replace(/<stream:stream (.*[^\/])>/, "<stream:stream $1/>");
            elem = new DOMParser().parseFromString(data, "text/xml").documentElement;

            if (!this._handleStreamStart(elem)) {
                return;
            }
        } else {
            data = this._streamWrap(message.data);
            elem = new DOMParser().parseFromString(data, "text/xml").documentElement;
        }

        if (this._check_streamerror(elem, Strophe.Status.ERROR)) {
            return;
        }

        //handle unavailable presence stanza before disconnecting
        if (this._conn.disconnecting &&
                elem.firstChild.nodeName === "presence" &&
                elem.firstChild.getAttribute("type") === "unavailable") {
            this._conn.xmlInput(elem);
            this._conn.rawInput(Strophe.serialize(elem));
            // if we are already disconnecting we will ignore the unavailable stanza and
            // wait for the </stream:stream> tag before we close the connection
            return;
        }
        this._conn._dataRecv(elem, message.data);
    },

    /** PrivateFunction: _onOpen
     * _Private_ function to handle websockets connection setup.
     *
     * The opening stream tag is sent here.
     */
    _onOpen: function() {
        Strophe.info("Websocket open");
        var start = this._buildStream();
        this._conn.xmlOutput(start.tree());

        var startString = this._removeClosingTag(start);
        this._conn.rawOutput(startString);
        this.socket.send(startString);
    },

    /** PrivateFunction: _removeClosingTag
     *  _Private_ function to Make the first <stream:stream> non-selfclosing
     *
     *  Parameters:
     *      (Object) elem - The <stream:stream> tag.
     *
     *  Returns:
     *      The stream:stream tag as String
     */
    _removeClosingTag: function(elem) {
        var string = Strophe.serialize(elem);
        string = string.replace(/<(stream:stream .*[^\/])\/>$/, "<$1>");
        return string;
    },

    /** PrivateFunction: _reqToData
     * _Private_ function to get a stanza out of a request.
     *
     * WebSockets don't use requests, so the passed argument is just returned.
     *
     *  Parameters:
     *    (Object) stanza - The stanza.
     *
     *  Returns:
     *    The stanza that was passed.
     */
    _reqToData: function (stanza)
    {
        return stanza;
    },

    /** PrivateFunction: _send
     *  _Private_ part of the Connection.send function for WebSocket
     *
     * Just flushes the messages that are in the queue
     */
    _send: function () {
        this._conn.flush();
    },

    /** PrivateFunction: _sendRestart
     *
     *  Send an xmpp:restart stanza.
     */
    _sendRestart: function ()
    {
        clearTimeout(this._conn._idleTimeout);
        this._conn._onIdle.bind(this._conn)();
    }
};

/*!
 * Source: build/lib/strophe.muc.js, license: MIT, url: https://github.com/strophe/strophejs-plugins */
// Generated by CoffeeScript 1.3.3
/*
 *Plugin to implement the MUC extension.
   http://xmpp.org/extensions/xep-0045.html
 *Previous Author:
    Nathan Zorn <nathan.zorn@gmail.com>
 *Complete CoffeeScript rewrite:
    Andreas Guth <guth@dbis.rwth-aachen.de>
*/

var Occupant, RoomConfig, XmppRoom,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Strophe.addConnectionPlugin('muc', {
  _connection: null,
  rooms: {},
  roomNames: [],
  /*Function 
  Initialize the MUC plugin. Sets the correct connection object and
  extends the namesace.
  */

  init: function(conn) {
    this._connection = conn;
    this._muc_handler = null;
    Strophe.addNamespace('MUC_OWNER', Strophe.NS.MUC + "#owner");
    Strophe.addNamespace('MUC_ADMIN', Strophe.NS.MUC + "#admin");
    Strophe.addNamespace('MUC_USER', Strophe.NS.MUC + "#user");
    return Strophe.addNamespace('MUC_ROOMCONF', Strophe.NS.MUC + "#roomconfig");
  },
  /*Function
  Join a multi-user chat room
  Parameters:
  (String) room - The multi-user chat room to join.
  (String) nick - The nickname to use in the chat room. Optional
  (Function) msg_handler_cb - The function call to handle messages from the
  specified chat room.
  (Function) pres_handler_cb - The function call back to handle presence
  in the chat room.
  (Function) roster_cb - The function call to handle roster info in the chat room
  (String) password - The optional password to use. (password protected
  rooms only)
  (Object) history_attrs - Optional attributes for retrieving history
  (XML DOM Element) extended_presence - Optional XML for extending presence
  */

  join: function(room, nick, msg_handler_cb, pres_handler_cb, roster_cb, password, history_attrs, extended_presence) {
    var msg, room_nick, _ref,
      _this = this;
    room_nick = this.test_append_nick(room, nick);
    msg = $pres({
      from: this._connection.jid,
      to: room_nick
    }).c("x", {
      xmlns: Strophe.NS.MUC
    });
    if (history_attrs != null) {
      msg = msg.c("history", history_attrs).up();
    }
    if (password != null) {
      msg.cnode(Strophe.xmlElement("password", [], password));
    }
    if (extended_presence != null) {
      msg.up().cnode(extended_presence);
    }
    if ((_ref = this._muc_handler) == null) {
      this._muc_handler = this._connection.addHandler(function(stanza) {
        var from, handler, handlers, id, roomname, x, xmlns, xquery, _i, _len;
        from = stanza.getAttribute('from');
        if (!from) {
          return true;
        }
        roomname = from.split("/")[0];
        if (!_this.rooms[roomname]) {
          return true;
        }
        room = _this.rooms[roomname];
        handlers = {};
        if (stanza.nodeName === "message") {
          handlers = room._message_handlers;
        } else if (stanza.nodeName === "presence") {
          xquery = stanza.getElementsByTagName("x");
          if (xquery.length > 0) {
            for (_i = 0, _len = xquery.length; _i < _len; _i++) {
              x = xquery[_i];
              xmlns = x.getAttribute("xmlns");
              if (xmlns && xmlns.match(Strophe.NS.MUC)) {
                handlers = room._presence_handlers;
                break;
              }
            }
          }
        }
        for (id in handlers) {
          handler = handlers[id];
          if (!handler(stanza, room)) {
            delete handlers[id];
          }
        }
        return true;
      });
    }
    if (!this.rooms.hasOwnProperty(room)) {
      this.rooms[room] = new XmppRoom(this, room, nick, password);
      this.roomNames.push(room);
    }
    if (pres_handler_cb) {
      this.rooms[room].addHandler('presence', pres_handler_cb);
    }
    if (msg_handler_cb) {
      this.rooms[room].addHandler('message', msg_handler_cb);
    }
    if (roster_cb) {
      this.rooms[room].addHandler('roster', roster_cb);
    }
    return this._connection.send(msg);
  },
  /*Function
  Leave a multi-user chat room
  Parameters:
  (String) room - The multi-user chat room to leave.
  (String) nick - The nick name used in the room.
  (Function) handler_cb - Optional function to handle the successful leave.
  (String) exit_msg - optional exit message.
  Returns:
  iqid - The unique id for the room leave.
  */

  leave: function(room, nick, handler_cb, exit_msg) {
    var id, presence, presenceid, room_nick;
    id = this.roomNames.indexOf(room);
    delete this.rooms[room];
    if (id >= 0) {
      this.roomNames.splice(id, 1);
      if (this.roomNames.length === 0) {
        this._connection.deleteHandler(this._muc_handler);
        this._muc_handler = null;
      }
    }
    room_nick = this.test_append_nick(room, nick);
    presenceid = this._connection.getUniqueId();
    presence = $pres({
      type: "unavailable",
      id: presenceid,
      from: this._connection.jid,
      to: room_nick
    });
    if (exit_msg != null) {
      presence.c("status", exit_msg);
    }
    if (handler_cb != null) {
      this._connection.addHandler(handler_cb, null, "presence", null, presenceid);
    }
    this._connection.send(presence);
    return presenceid;
  },
  /*Function
  Parameters:
  (String) room - The multi-user chat room name.
  (String) nick - The nick name used in the chat room.
  (String) message - The plaintext message to send to the room.
  (String) html_message - The message to send to the room with html markup.
  (String) type - "groupchat" for group chat messages o
                  "chat" for private chat messages
  Returns:
  msgiq - the unique id used to send the message
  */

  message: function(room, nick, message, html_message, type) {
    var msg, msgid, parent, room_nick;
    room_nick = this.test_append_nick(room, nick);
    type = type || (nick != null ? "chat" : "groupchat");
    msgid = this._connection.getUniqueId();
    msg = $msg({
      to: room_nick,
      from: this._connection.jid,
      type: type,
      id: msgid
    }).c("body", {
      xmlns: Strophe.NS.CLIENT
    }).t(message);
    msg.up();
    if (html_message != null) {
      msg.c("html", {
        xmlns: Strophe.NS.XHTML_IM
      }).c("body", {
        xmlns: Strophe.NS.XHTML
      }).t(html_message);
      if (msg.node.childNodes.length === 0) {
        parent = msg.node.parentNode;
        msg.up().up();
        msg.node.removeChild(parent);
      } else {
        msg.up().up();
      }
    }
    msg.c("x", {
      xmlns: "jabber:x:event"
    }).c("composing");
    this._connection.send(msg);
    return msgid;
  },
  /*Function
  Convenience Function to send a Message to all Occupants
  Parameters:
  (String) room - The multi-user chat room name.
  (String) message - The plaintext message to send to the room.
  (String) html_message - The message to send to the room with html markup.
  Returns:
  msgiq - the unique id used to send the message
  */

  groupchat: function(room, message, html_message) {
    return this.message(room, null, message, html_message);
  },
  /*Function
  Send a mediated invitation.
  Parameters:
  (String) room - The multi-user chat room name.
  (String) receiver - The invitation's receiver.
  (String) reason - Optional reason for joining the room.
  Returns:
  msgiq - the unique id used to send the invitation
  */

  invite: function(room, receiver, reason) {
    var invitation, msgid;
    msgid = this._connection.getUniqueId();
    invitation = $msg({
      from: this._connection.jid,
      to: room,
      id: msgid
    }).c('x', {
      xmlns: Strophe.NS.MUC_USER
    }).c('invite', {
      to: receiver
    });
    if (reason != null) {
      invitation.c('reason', reason);
    }
    this._connection.send(invitation);
    return msgid;
  },
  /*Function
  Send a direct invitation.
  Parameters:
  (String) room - The multi-user chat room name.
  (String) receiver - The invitation's receiver.
  (String) reason - Optional reason for joining the room.
  (String) password - Optional password for the room.
  Returns:
  msgiq - the unique id used to send the invitation
  */

  directInvite: function(room, receiver, reason, password) {
    var attrs, invitation, msgid;
    msgid = this._connection.getUniqueId();
    attrs = {
      xmlns: 'jabber:x:conference',
      jid: room
    };
    if (reason != null) {
      attrs.reason = reason;
    }
    if (password != null) {
      attrs.password = password;
    }
    invitation = $msg({
      from: this._connection.jid,
      to: receiver,
      id: msgid
    }).c('x', attrs);
    this._connection.send(invitation);
    return msgid;
  },
  /*Function
  Queries a room for a list of occupants
  (String) room - The multi-user chat room name.
  (Function) success_cb - Optional function to handle the info.
  (Function) error_cb - Optional function to handle an error.
  Returns:
  id - the unique id used to send the info request
  */

  queryOccupants: function(room, success_cb, error_cb) {
    var attrs, info;
    attrs = {
      xmlns: Strophe.NS.DISCO_ITEMS
    };
    info = $iq({
      from: this._connection.jid,
      to: room,
      type: 'get'
    }).c('query', attrs);
    return this._connection.sendIQ(info, success_cb, error_cb);
  },
  /*Function
  Start a room configuration.
  Parameters:
  (String) room - The multi-user chat room name.
  (Function) handler_cb - Optional function to handle the config form.
  Returns:
  id - the unique id used to send the configuration request
  */

  configure: function(room, handler_cb, error_cb) {
    var config, stanza;
    config = $iq({
      to: room,
      type: "get"
    }).c("query", {
      xmlns: Strophe.NS.MUC_OWNER
    });
    stanza = config.tree();
    return this._connection.sendIQ(stanza, handler_cb, error_cb);
  },
  /*Function
  Cancel the room configuration
  Parameters:
  (String) room - The multi-user chat room name.
  Returns:
  id - the unique id used to cancel the configuration.
  */

  cancelConfigure: function(room) {
    var config, stanza;
    config = $iq({
      to: room,
      type: "set"
    }).c("query", {
      xmlns: Strophe.NS.MUC_OWNER
    }).c("x", {
      xmlns: "jabber:x:data",
      type: "cancel"
    });
    stanza = config.tree();
    return this._connection.sendIQ(stanza);
  },
  /*Function
  Save a room configuration.
  Parameters:
  (String) room - The multi-user chat room name.
  (Array) config- Form Object or an array of form elements used to configure the room.
  Returns:
  id - the unique id used to save the configuration.
  */

  saveConfiguration: function(room, config, success_cb, error_cb) {
    var conf, iq, stanza, _i, _len;
    iq = $iq({
      to: room,
      type: "set"
    }).c("query", {
      xmlns: Strophe.NS.MUC_OWNER
    });
    if (config instanceof Form) {
      config.type = "submit";
      iq.cnode(config.toXML());
    } else {
      iq.c("x", {
        xmlns: "jabber:x:data",
        type: "submit"
      });
      for (_i = 0, _len = config.length; _i < _len; _i++) {
        conf = config[_i];
        iq.cnode(conf).up();
      }
    }
    stanza = iq.tree();
    return this._connection.sendIQ(stanza, success_cb, error_cb);
  },
  /*Function
  Parameters:
  (String) room - The multi-user chat room name.
  Returns:
  id - the unique id used to create the chat room.
  */

  createInstantRoom: function(room, success_cb, error_cb) {
    var roomiq;
    roomiq = $iq({
      to: room,
      type: "set"
    }).c("query", {
      xmlns: Strophe.NS.MUC_OWNER
    }).c("x", {
      xmlns: "jabber:x:data",
      type: "submit"
    });
    return this._connection.sendIQ(roomiq.tree(), success_cb, error_cb);
  },
  /*Function
  Set the topic of the chat room.
  Parameters:
  (String) room - The multi-user chat room name.
  (String) topic - Topic message.
  */

  setTopic: function(room, topic) {
    var msg;
    msg = $msg({
      to: room,
      from: this._connection.jid,
      type: "groupchat"
    }).c("subject", {
      xmlns: "jabber:client"
    }).t(topic);
    return this._connection.send(msg.tree());
  },
  /*Function
  Internal Function that Changes the role or affiliation of a member
  of a MUC room. This function is used by modifyRole and modifyAffiliation.
  The modification can only be done by a room moderator. An error will be
  returned if the user doesn't have permission.
  Parameters:
  (String) room - The multi-user chat room name.
  (Object) item - Object with nick and role or jid and affiliation attribute
  (String) reason - Optional reason for the change.
  (Function) handler_cb - Optional callback for success
  (Function) error_cb - Optional callback for error
  Returns:
  iq - the id of the mode change request.
  */

  _modifyPrivilege: function(room, item, reason, handler_cb, error_cb) {
    var iq;
    iq = $iq({
      to: room,
      type: "set"
    }).c("query", {
      xmlns: Strophe.NS.MUC_ADMIN
    }).cnode(item.node);
    if (reason != null) {
      iq.c("reason", reason);
    }
    return this._connection.sendIQ(iq.tree(), handler_cb, error_cb);
  },
  /*Function
  Changes the role of a member of a MUC room.
  The modification can only be done by a room moderator. An error will be
  returned if the user doesn't have permission.
  Parameters:
  (String) room - The multi-user chat room name.
  (String) nick - The nick name of the user to modify.
  (String) role - The new role of the user.
  (String) affiliation - The new affiliation of the user.
  (String) reason - Optional reason for the change.
  (Function) handler_cb - Optional callback for success
  (Function) error_cb - Optional callback for error
  Returns:
  iq - the id of the mode change request.
  */

  modifyRole: function(room, nick, role, reason, handler_cb, error_cb) {
    var item;
    item = $build("item", {
      nick: nick,
      role: role
    });
    return this._modifyPrivilege(room, item, reason, handler_cb, error_cb);
  },
  kick: function(room, nick, reason, handler_cb, error_cb) {
    return this.modifyRole(room, nick, 'none', reason, handler_cb, error_cb);
  },
  voice: function(room, nick, reason, handler_cb, error_cb) {
    return this.modifyRole(room, nick, 'participant', reason, handler_cb, error_cb);
  },
  mute: function(room, nick, reason, handler_cb, error_cb) {
    return this.modifyRole(room, nick, 'visitor', reason, handler_cb, error_cb);
  },
  op: function(room, nick, reason, handler_cb, error_cb) {
    return this.modifyRole(room, nick, 'moderator', reason, handler_cb, error_cb);
  },
  deop: function(room, nick, reason, handler_cb, error_cb) {
    return this.modifyRole(room, nick, 'participant', reason, handler_cb, error_cb);
  },
  /*Function
  Changes the affiliation of a member of a MUC room.
  The modification can only be done by a room moderator. An error will be
  returned if the user doesn't have permission.
  Parameters:
  (String) room - The multi-user chat room name.
  (String) jid  - The jid of the user to modify.
  (String) affiliation - The new affiliation of the user.
  (String) reason - Optional reason for the change.
  (Function) handler_cb - Optional callback for success
  (Function) error_cb - Optional callback for error
  Returns:
  iq - the id of the mode change request.
  */

  modifyAffiliation: function(room, jid, affiliation, reason, handler_cb, error_cb) {
    var item;
    item = $build("item", {
      jid: jid,
      affiliation: affiliation
    });
    return this._modifyPrivilege(room, item, reason, handler_cb, error_cb);
  },
  ban: function(room, jid, reason, handler_cb, error_cb) {
    return this.modifyAffiliation(room, jid, 'outcast', reason, handler_cb, error_cb);
  },
  member: function(room, jid, reason, handler_cb, error_cb) {
    return this.modifyAffiliation(room, jid, 'member', reason, handler_cb, error_cb);
  },
  revoke: function(room, jid, reason, handler_cb, error_cb) {
    return this.modifyAffiliation(room, jid, 'none', reason, handler_cb, error_cb);
  },
  owner: function(room, jid, reason, handler_cb, error_cb) {
    return this.modifyAffiliation(room, jid, 'owner', reason, handler_cb, error_cb);
  },
  admin: function(room, jid, reason, handler_cb, error_cb) {
    return this.modifyAffiliation(room, jid, 'admin', reason, handler_cb, error_cb);
  },
  /*Function
  Change the current users nick name.
  Parameters:
  (String) room - The multi-user chat room name.
  (String) user - The new nick name.
  */

  changeNick: function(room, user) {
    var presence, room_nick;
    room_nick = this.test_append_nick(room, user);
    presence = $pres({
      from: this._connection.jid,
      to: room_nick,
      id: this._connection.getUniqueId()
    });
    return this._connection.send(presence.tree());
  },
  /*Function
  Change the current users status.
  Parameters:
  (String) room - The multi-user chat room name.
  (String) user - The current nick.
  (String) show - The new show-text.
  (String) status - The new status-text.
  */

  setStatus: function(room, user, show, status) {
    var presence, room_nick;
    room_nick = this.test_append_nick(room, user);
    presence = $pres({
      from: this._connection.jid,
      to: room_nick
    });
    if (show != null) {
      presence.c('show', show).up();
    }
    if (status != null) {
      presence.c('status', status);
    }
    return this._connection.send(presence.tree());
  },
  /*Function
  List all chat room available on a server.
  Parameters:
  (String) server - name of chat server.
  (String) handle_cb - Function to call for room list return.
  (String) error_cb - Function to call on error.
  */

  listRooms: function(server, handle_cb, error_cb) {
    var iq;
    iq = $iq({
      to: server,
      from: this._connection.jid,
      type: "get"
    }).c("query", {
      xmlns: Strophe.NS.DISCO_ITEMS
    });
    return this._connection.sendIQ(iq, handle_cb, error_cb);
  },
  test_append_nick: function(room, nick) {
    return room + (nick != null ? "/" + (Strophe.escapeNode(nick)) : "");
  }
});

XmppRoom = (function() {

  function XmppRoom(client, name, nick, password) {
    this.client = client;
    this.name = name;
    this.nick = nick;
    this.password = password;
    this._roomRosterHandler = __bind(this._roomRosterHandler, this);

    this._addOccupant = __bind(this._addOccupant, this);

    this.roster = {};
    this._message_handlers = {};
    this._presence_handlers = {};
    this._roster_handlers = {};
    this._handler_ids = 0;
    if (client.muc) {
      this.client = client.muc;
    }
    this.name = Strophe.getBareJidFromJid(name);
    this.addHandler('presence', this._roomRosterHandler);
  }

  XmppRoom.prototype.join = function(msg_handler_cb, pres_handler_cb, roster_cb) {
    return this.client.join(this.name, this.nick, msg_handler_cb, pres_handler_cb, roster_cb, this.password);
  };

  XmppRoom.prototype.leave = function(handler_cb, message) {
    this.client.leave(this.name, this.nick, handler_cb, message);
    return delete this.client.rooms[this.name];
  };

  XmppRoom.prototype.message = function(nick, message, html_message, type) {
    return this.client.message(this.name, nick, message, html_message, type);
  };

  XmppRoom.prototype.groupchat = function(message, html_message) {
    return this.client.groupchat(this.name, message, html_message);
  };

  XmppRoom.prototype.invite = function(receiver, reason) {
    return this.client.invite(this.name, receiver, reason);
  };

  XmppRoom.prototype.directInvite = function(receiver, reason) {
    return this.client.directInvite(this.name, receiver, reason, this.password);
  };

  XmppRoom.prototype.configure = function(handler_cb) {
    return this.client.configure(this.name, handler_cb);
  };

  XmppRoom.prototype.cancelConfigure = function() {
    return this.client.cancelConfigure(this.name);
  };

  XmppRoom.prototype.saveConfiguration = function(config) {
    return this.client.saveConfiguration(this.name, config);
  };

  XmppRoom.prototype.queryOccupants = function(success_cb, error_cb) {
    return this.client.queryOccupants(this.name, success_cb, error_cb);
  };

  XmppRoom.prototype.setTopic = function(topic) {
    return this.client.setTopic(this.name, topic);
  };

  XmppRoom.prototype.modifyRole = function(nick, role, reason, success_cb, error_cb) {
    return this.client.modifyRole(this.name, nick, role, reason, success_cb, error_cb);
  };

  XmppRoom.prototype.kick = function(nick, reason, handler_cb, error_cb) {
    return this.client.kick(this.name, nick, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.voice = function(nick, reason, handler_cb, error_cb) {
    return this.client.voice(this.name, nick, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.mute = function(nick, reason, handler_cb, error_cb) {
    return this.client.mute(this.name, nick, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.op = function(nick, reason, handler_cb, error_cb) {
    return this.client.op(this.name, nick, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.deop = function(nick, reason, handler_cb, error_cb) {
    return this.client.deop(this.name, nick, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.modifyAffiliation = function(jid, affiliation, reason, success_cb, error_cb) {
    return this.client.modifyAffiliation(this.name, jid, affiliation, reason, success_cb, error_cb);
  };

  XmppRoom.prototype.ban = function(jid, reason, handler_cb, error_cb) {
    return this.client.ban(this.name, jid, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.member = function(jid, reason, handler_cb, error_cb) {
    return this.client.member(this.name, jid, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.revoke = function(jid, reason, handler_cb, error_cb) {
    return this.client.revoke(this.name, jid, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.owner = function(jid, reason, handler_cb, error_cb) {
    return this.client.owner(this.name, jid, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.admin = function(jid, reason, handler_cb, error_cb) {
    return this.client.admin(this.name, jid, reason, handler_cb, error_cb);
  };

  XmppRoom.prototype.changeNick = function(nick) {
    this.nick = nick;
    return this.client.changeNick(this.name, nick);
  };

  XmppRoom.prototype.setStatus = function(show, status) {
    return this.client.setStatus(this.name, this.nick, show, status);
  };

  /*Function
  Adds a handler to the MUC room.
    Parameters:
  (String) handler_type - 'message', 'presence' or 'roster'.
  (Function) handler - The handler function.
  Returns:
  id - the id of handler.
  */


  XmppRoom.prototype.addHandler = function(handler_type, handler) {
    var id;
    id = this._handler_ids++;
    switch (handler_type) {
      case 'presence':
        this._presence_handlers[id] = handler;
        break;
      case 'message':
        this._message_handlers[id] = handler;
        break;
      case 'roster':
        this._roster_handlers[id] = handler;
        break;
      default:
        this._handler_ids--;
        return null;
    }
    return id;
  };

  /*Function
  Removes a handler from the MUC room.
  This function takes ONLY ids returned by the addHandler function
  of this room. passing handler ids returned by connection.addHandler
  may brake things!
    Parameters:
  (number) id - the id of the handler
  */


  XmppRoom.prototype.removeHandler = function(id) {
    delete this._presence_handlers[id];
    delete this._message_handlers[id];
    return delete this._roster_handlers[id];
  };

  /*Function
  Creates and adds an Occupant to the Room Roster.
    Parameters:
  (Object) data - the data the Occupant is filled with
  Returns:
  occ - the created Occupant.
  */


  XmppRoom.prototype._addOccupant = function(data) {
    var occ;
    occ = new Occupant(data, this);
    this.roster[occ.nick] = occ;
    return occ;
  };

  /*Function
  The standard handler that managed the Room Roster.
    Parameters:
  (Object) pres - the presence stanza containing user information
  */


  XmppRoom.prototype._roomRosterHandler = function(pres) {
    var data, handler, id, newnick, nick, _ref;
    data = XmppRoom._parsePresence(pres);
    nick = data.nick;
    newnick = data.newnick || null;
    switch (data.type) {
      case 'error':
        return;
      case 'unavailable':
        if (newnick) {
          data.nick = newnick;
          if (this.roster[nick] && this.roster[newnick]) {
            this.roster[nick].update(this.roster[newnick]);
            this.roster[newnick] = this.roster[nick];
          }
          if (this.roster[nick] && !this.roster[newnick]) {
            this.roster[newnick] = this.roster[nick].update(data);
          }
        }
        delete this.roster[nick];
        break;
      default:
        if (this.roster[nick]) {
          this.roster[nick].update(data);
        } else {
          this._addOccupant(data);
        }
    }
    _ref = this._roster_handlers;
    for (id in _ref) {
      handler = _ref[id];
      if (!handler(this.roster, this)) {
        delete this._roster_handlers[id];
      }
    }
    return true;
  };

  /*Function
  Parses a presence stanza
    Parameters:
  (Object) data - the data extracted from the presence stanza
  */


  XmppRoom._parsePresence = function(pres) {
    var a, c, c2, data, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
    data = {};
    a = pres.attributes;
    data.nick = Strophe.getResourceFromJid(a.from.textContent);
    data.type = ((_ref = a.type) != null ? _ref.textContent : void 0) || null;
    data.states = [];
    _ref1 = pres.childNodes;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      c = _ref1[_i];
      switch (c.nodeName) {
        case "status":
          data.status = c.textContent || null;
          break;
        case "show":
          data.show = c.textContent || null;
          break;
        case "x":
          a = c.attributes;
          if (((_ref2 = a.xmlns) != null ? _ref2.textContent : void 0) === Strophe.NS.MUC_USER) {
            _ref3 = c.childNodes;
            for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
              c2 = _ref3[_j];
              switch (c2.nodeName) {
                case "item":
                  a = c2.attributes;
                  data.affiliation = ((_ref4 = a.affiliation) != null ? _ref4.textContent : void 0) || null;
                  data.role = ((_ref5 = a.role) != null ? _ref5.textContent : void 0) || null;
                  data.jid = ((_ref6 = a.jid) != null ? _ref6.textContent : void 0) || null;
                  data.newnick = ((_ref7 = a.nick) != null ? _ref7.textContent : void 0) || null;
                  break;
                case "status":
                  if (c2.attributes.code) {
                    data.states.push(c2.attributes.code.textContent);
                  }
              }
            }
          }
      }
    }
    return data;
  };

  return XmppRoom;

})();

RoomConfig = (function() {

  function RoomConfig(info) {
    this.parse = __bind(this.parse, this);
    if (info != null) {
      this.parse(info);
    }
  }

  RoomConfig.prototype.parse = function(result) {
    var attr, attrs, child, field, identity, query, _i, _j, _k, _len, _len1, _len2, _ref;
    query = result.getElementsByTagName("query")[0].childNodes;
    this.identities = [];
    this.features = [];
    this.x = [];
    for (_i = 0, _len = query.length; _i < _len; _i++) {
      child = query[_i];
      attrs = child.attributes;
      switch (child.nodeName) {
        case "identity":
          identity = {};
          for (_j = 0, _len1 = attrs.length; _j < _len1; _j++) {
            attr = attrs[_j];
            identity[attr.name] = attr.textContent;
          }
          this.identities.push(identity);
          break;
        case "feature":
          this.features.push(attrs["var"].textContent);
          break;
        case "x":
          attrs = child.childNodes[0].attributes;
          if ((!attrs["var"].textContent === 'FORM_TYPE') || (!attrs.type.textContent === 'hidden')) {
            break;
          }
          _ref = child.childNodes;
          for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
            field = _ref[_k];
            if (!(!field.attributes.type)) {
              continue;
            }
            attrs = field.attributes;
            this.x.push({
              "var": attrs["var"].textContent,
              label: attrs.label.textContent || "",
              value: field.firstChild.textContent || ""
            });
          }
      }
    }
    return {
      "identities": this.identities,
      "features": this.features,
      "x": this.x
    };
  };

  return RoomConfig;

})();

Occupant = (function() {

  function Occupant(data, room) {
    this.room = room;
    this.update = __bind(this.update, this);

    this.admin = __bind(this.admin, this);

    this.owner = __bind(this.owner, this);

    this.revoke = __bind(this.revoke, this);

    this.member = __bind(this.member, this);

    this.ban = __bind(this.ban, this);

    this.modifyAffiliation = __bind(this.modifyAffiliation, this);

    this.deop = __bind(this.deop, this);

    this.op = __bind(this.op, this);

    this.mute = __bind(this.mute, this);

    this.voice = __bind(this.voice, this);

    this.kick = __bind(this.kick, this);

    this.modifyRole = __bind(this.modifyRole, this);

    this.update(data);
  }

  Occupant.prototype.modifyRole = function(role, reason, success_cb, error_cb) {
    return this.room.modifyRole(this.nick, role, reason, success_cb, error_cb);
  };

  Occupant.prototype.kick = function(reason, handler_cb, error_cb) {
    return this.room.kick(this.nick, reason, handler_cb, error_cb);
  };

  Occupant.prototype.voice = function(reason, handler_cb, error_cb) {
    return this.room.voice(this.nick, reason, handler_cb, error_cb);
  };

  Occupant.prototype.mute = function(reason, handler_cb, error_cb) {
    return this.room.mute(this.nick, reason, handler_cb, error_cb);
  };

  Occupant.prototype.op = function(reason, handler_cb, error_cb) {
    return this.room.op(this.nick, reason, handler_cb, error_cb);
  };

  Occupant.prototype.deop = function(reason, handler_cb, error_cb) {
    return this.room.deop(this.nick, reason, handler_cb, error_cb);
  };

  Occupant.prototype.modifyAffiliation = function(affiliation, reason, success_cb, error_cb) {
    return this.room.modifyAffiliation(this.jid, affiliation, reason, success_cb, error_cb);
  };

  Occupant.prototype.ban = function(reason, handler_cb, error_cb) {
    return this.room.ban(this.jid, reason, handler_cb, error_cb);
  };

  Occupant.prototype.member = function(reason, handler_cb, error_cb) {
    return this.room.member(this.jid, reason, handler_cb, error_cb);
  };

  Occupant.prototype.revoke = function(reason, handler_cb, error_cb) {
    return this.room.revoke(this.jid, reason, handler_cb, error_cb);
  };

  Occupant.prototype.owner = function(reason, handler_cb, error_cb) {
    return this.room.owner(this.jid, reason, handler_cb, error_cb);
  };

  Occupant.prototype.admin = function(reason, handler_cb, error_cb) {
    return this.room.admin(this.jid, reason, handler_cb, error_cb);
  };

  Occupant.prototype.update = function(data) {
    this.nick = data.nick || null;
    this.affiliation = data.affiliation || null;
    this.role = data.role || null;
    this.jid = data.jid || null;
    this.status = data.status || null;
    this.show = data.show || null;
    return this;
  };

  return Occupant;

})();
/*!
 * Source: build/lib/strophe.disco.js, license: MIT, url: https://github.com/strophe/strophejs-plugins */
/*
  Copyright 2010, François de Metz <francois@2metz.fr>
*/

/**
 * Disco Strophe Plugin
 * Implement http://xmpp.org/extensions/xep-0030.html
 * TODO: manage node hierarchies, and node on info request
 */
Strophe.addConnectionPlugin('disco',
{
    _connection: null,
    _identities : [],
    _features : [],
    _items : [],
    /** Function: init
     * Plugin init
     *
     * Parameters:
     *   (Strophe.Connection) conn - Strophe connection
     */
    init: function(conn)
    {
    this._connection = conn;
        this._identities = [];
        this._features   = [];
        this._items      = [];
        // disco info
        conn.addHandler(this._onDiscoInfo.bind(this), Strophe.NS.DISCO_INFO, 'iq', 'get', null, null);
        // disco items
        conn.addHandler(this._onDiscoItems.bind(this), Strophe.NS.DISCO_ITEMS, 'iq', 'get', null, null);
    },
    /** Function: addIdentity
     * See http://xmpp.org/registrar/disco-categories.html
     * Parameters:
     *   (String) category - category of identity (like client, automation, etc ...)
     *   (String) type - type of identity (like pc, web, bot , etc ...)
     *   (String) name - name of identity in natural language
     *   (String) lang - lang of name parameter
     *
     * Returns:
     *   Boolean
     */
    addIdentity: function(category, type, name, lang)
    {
        for (var i=0; i<this._identities.length; i++)
        {
            if (this._identities[i].category == category &&
                this._identities[i].type == type &&
                this._identities[i].name == name &&
                this._identities[i].lang == lang)
            {
                return false;
            }
        }
        this._identities.push({category: category, type: type, name: name, lang: lang});
        return true;
    },
    /** Function: addFeature
     *
     * Parameters:
     *   (String) var_name - feature name (like jabber:iq:version)
     *
     * Returns:
     *   boolean
     */
    addFeature: function(var_name)
    {
        for (var i=0; i<this._features.length; i++)
        {
             if (this._features[i] == var_name)
                 return false;
        }
        this._features.push(var_name);
        return true;
    },
    /** Function: removeFeature
     *
     * Parameters:
     *   (String) var_name - feature name (like jabber:iq:version)
     *
     * Returns:
     *   boolean
     */
    removeFeature: function(var_name)
    {
        for (var i=0; i<this._features.length; i++)
        {
             if (this._features[i] === var_name){
                 this._features.splice(i,1)
                 return true;
             }
        }
        return false;
    },
    /** Function: addItem
     *
     * Parameters:
     *   (String) jid
     *   (String) name
     *   (String) node
     *   (Function) call_back
     *
     * Returns:
     *   boolean
     */
    addItem: function(jid, name, node, call_back)
    {
        if (node && !call_back)
            return false;
        this._items.push({jid: jid, name: name, node: node, call_back: call_back});
        return true;
    },
    /** Function: info
     * Info query
     *
     * Parameters:
     *   (Function) call_back
     *   (String) jid
     *   (String) node
     */
    info: function(jid, node, success, error, timeout)
    {
        var attrs = {xmlns: Strophe.NS.DISCO_INFO};
        if (node)
            attrs.node = node;

        var info = $iq({from:this._connection.jid,
                         to:jid, type:'get'}).c('query', attrs);
        this._connection.sendIQ(info, success, error, timeout);
    },
    /** Function: items
     * Items query
     *
     * Parameters:
     *   (Function) call_back
     *   (String) jid
     *   (String) node
     */
    items: function(jid, node, success, error, timeout)
    {
        var attrs = {xmlns: Strophe.NS.DISCO_ITEMS};
        if (node)
            attrs.node = node;

        var items = $iq({from:this._connection.jid,
                         to:jid, type:'get'}).c('query', attrs);
        this._connection.sendIQ(items, success, error, timeout);
    },

    /** PrivateFunction: _buildIQResult
     */
    _buildIQResult: function(stanza, query_attrs)
    {
        var id   =  stanza.getAttribute('id');
        var from = stanza.getAttribute('from');
        var iqresult = $iq({type: 'result', id: id});

        if (from !== null) {
            iqresult.attrs({to: from});
        }

        return iqresult.c('query', query_attrs);
    },

    /** PrivateFunction: _onDiscoInfo
     * Called when receive info request
     */
    _onDiscoInfo: function(stanza)
    {
        var node = stanza.getElementsByTagName('query')[0].getAttribute('node');
        var attrs = {xmlns: Strophe.NS.DISCO_INFO};
        if (node)
        {
            attrs.node = node;
        }
        var iqresult = this._buildIQResult(stanza, attrs);
        for (var i=0; i<this._identities.length; i++)
        {
            var attrs = {category: this._identities[i].category,
                         type    : this._identities[i].type};
            if (this._identities[i].name)
                attrs.name = this._identities[i].name;
            if (this._identities[i].lang)
                attrs['xml:lang'] = this._identities[i].lang;
            iqresult.c('identity', attrs).up();
        }
        for (var i=0; i<this._features.length; i++)
        {
            iqresult.c('feature', {'var':this._features[i]}).up();
        }
        this._connection.send(iqresult.tree());
        return true;
    },
    /** PrivateFunction: _onDiscoItems
     * Called when receive items request
     */
    _onDiscoItems: function(stanza)
    {
        var query_attrs = {xmlns: Strophe.NS.DISCO_ITEMS};
        var node = stanza.getElementsByTagName('query')[0].getAttribute('node');
        if (node)
        {
            query_attrs.node = node;
            var items = [];
            for (var i = 0; i < this._items.length; i++)
            {
                if (this._items[i].node == node)
                {
                    items = this._items[i].call_back(stanza);
                    break;
                }
            }
        }
        else
        {
            var items = this._items;
        }
        var iqresult = this._buildIQResult(stanza, query_attrs);
        for (var i = 0; i < items.length; i++)
        {
            var attrs = {jid:  items[i].jid};
            if (items[i].name)
                attrs.name = items[i].name;
            if (items[i].node)
                attrs.node = items[i].node;
            iqresult.c('item', attrs).up();
        }
        this._connection.send(iqresult.tree());
        return true;
    }
});

/*!
 * Source: build/lib/strophe.caps.js, license: MIT, url: https://github.com/strophe/strophejs-plugins */
/**
 * Entity Capabilities (XEP-0115)
 * 
 * Depends on disco plugin.
 * 
 * See: http://xmpp.org/extensions/xep-0115.html
 * 
 * Authors: - Michael Weibel <michael.weibel@gmail.com> - Klaus Herberth <klaus@jsxc.org>
 * Copyright: - Michael Weibel <michael.weibel@gmail.com>
 * 
 * @license MIT
 */

(function($) {
   Strophe.addConnectionPlugin('caps', {
      /**
       * Constant: HASH Hash used
       * 
       * Currently only sha-1 is supported.
       */
      HASH: 'sha-1',
      /**
       * Variable: node Client which is being used.
       * 
       * Can be overwritten as soon as Strophe has been initialized.
       */
      node: 'http://strophe.im/strophejs/',
      /**
       * PrivateVariable: _ver Own generated version string
       */
      _ver: '',
      /**
       * PrivateVariable: _connection Strophe connection
       */
      _connection: null,
      /**
       * PrivateVariable: _knownCapabilities A hashtable containing
       * version-strings and their capabilities, serialized as string.
       * 
       * TODO: Maybe those caps shouldn't be serialized.
       */
      _knownCapabilities: JSON.parse(localStorage.getItem('strophe.caps._knownCapabilities')) || {},

      /**
       * PrivateVariable: _jidVerIndex A hashtable containing jids and their
       * versions for better lookup of capabilities.
       */
      _jidVerIndex: JSON.parse(localStorage.getItem('strophe.caps._jidVerIndex')) || {},

      /**
       * Function: init Initialize plugin: - Add caps namespace - Add caps
       * feature to disco plugin - Add handler for caps stanzas
       * 
       * Parameters: (Strophe.Connection) conn - Strophe connection
       */
      init: function(conn) {
         this._connection = conn;

         Strophe.addNamespace('CAPS', 'http://jabber.org/protocol/caps');

         if (!this._connection.disco) {
            throw "Caps plugin requires the disco plugin to be installed.";
         }

         this._connection.disco.addFeature(Strophe.NS.CAPS);
         this._connection.addHandler(this._delegateCapabilities.bind(this), Strophe.NS.CAPS);
      },

      /**
       * Function: generateCapsAttrs Returns the attributes for generating the
       * "c"-stanza containing the own version
       * 
       * Returns: (Object) - attributes
       */
      generateCapsAttrs: function() {
         return {
            'xmlns': Strophe.NS.CAPS,
            'hash': this.HASH,
            'node': this.node,
            'ver': this.generateVer()
         };
      },

      /**
       * Function: generateVer Returns the base64 encoded version string
       * (encoded itself with sha1)
       * 
       * Returns: (String) - version
       */
      generateVer: function() {
         if (this._ver !== "") {
            return this._ver;
         }

         var ver = "", identities = this._connection.disco._identities.sort(this._sortIdentities), identitiesLen = identities.length, features = this._connection.disco._features.sort(), featuresLen = features.length;
         for (var i = 0; i < identitiesLen; i++) {
            var curIdent = identities[i];
            ver += curIdent.category + "/" + curIdent.type + "/" + curIdent.lang + "/" + curIdent.name + "<";
         }
         for (var i = 0; i < featuresLen; i++) {
            ver += features[i] + '<';
         }

         this._ver = b64_sha1(ver);
         return this._ver;
      },

      /**
       * Function: getCapabilitiesByJid Returns serialized capabilities of a jid
       * (if available). Otherwise null.
       * 
       * Parameters: (String) jid - Jabber id
       * 
       * Returns: (String|null) - capabilities, serialized; or null when not
       * available.
       */
      getCapabilitiesByJid: function(jid) {
         if (this._jidVerIndex[jid]) {
            return this._knownCapabilities[this._jidVerIndex[jid]];
         }
         return null;
      },
      hasFeatureByJid: function(jid, feature) {
         if (this._jidVerIndex[jid] && feature !== null && typeof feature !== 'undefined') {
            if(!$.isArray(feature)){
               feature = $.makeArray(feature);
            };
            
            var i;
            for (i = 0; i < feature.length; i++) {
               if (this._knownCapabilities[this._jidVerIndex[jid]]['features'].indexOf(feature[i]) < 0)
                  return false;
            }
            return true;
         }
         return false;
      },

      /**
       * PrivateFunction: _delegateCapabilities Checks if the version has
       * already been saved. If yes: do nothing. If no: Request capabilities
       * 
       * Parameters: (Strophe.Builder) stanza - Stanza
       * 
       * Returns: (Boolean)
       */
      _delegateCapabilities: function(stanza) {
         var from = stanza.getAttribute('from'), c = stanza.querySelector('c'), ver = c.getAttribute('ver'), node = c.getAttribute('node');
         if (!this._knownCapabilities[ver]) {
            return this._requestCapabilities(from, node, ver);
         } else {
            this._jidVerIndex[from] = ver;
         }
         if (!this._jidVerIndex[from] || !this._jidVerIndex[from] !== ver) {
            this._jidVerIndex[from] = ver;
         }

         localStorage.setItem('strophe.caps._jidVerIndex', JSON.stringify(this._jidVerIndex));
         $(document).trigger('caps.strophe', [ from ]);

         return true;
      },

      /**
       * PrivateFunction: _requestCapabilities Requests capabilities from the
       * one which sent the caps-info stanza. This is done using disco info.
       * 
       * Additionally, it registers a handler for handling the reply.
       * 
       * Parameters: (String) to - Destination jid (String) node - Node
       * attribute of the caps-stanza (String) ver - Version of the caps-stanza
       * 
       * Returns: (Boolean) - true
       */
      _requestCapabilities: function(to, node, ver) {
         if (to !== this._connection.jid) {
            var id = this._connection.disco.info(to, node + '#' + ver);
            this._connection.addHandler(this._handleDiscoInfoReply.bind(this), Strophe.NS.DISCO_INFO, 'iq', 'result', id, to);
         }
         return true;
      },

      /**
       * PrivateFunction: _handleDiscoInfoReply Parses the disco info reply and
       * adds the version & it's capabilities to the _knownCapabilities
       * variable. Additionally, it adds the jid & the version to the
       * _jidVerIndex variable for a better lookup.
       * 
       * Parameters: (Strophe.Builder) stanza - Disco info stanza
       * 
       * Returns: (Boolean) - false, to automatically remove the handler.
       */
      _handleDiscoInfoReply: function(stanza) {
         var query = stanza.querySelector('query');
         var from = stanza.getAttribute('from');
         var node = query.getAttribute('node');
         var ver = (node)? node.split('#')[1] : this._jidVerIndex[from]; //fix open prosody issue

         if (!this._knownCapabilities[ver]) {
            var childNodes = query.childNodes, childNodesLen = childNodes.length;
            this._knownCapabilities[ver] = {
               features: [],
               identities: []
            };

            for (var i = 0; i < childNodesLen; i++) {
               var node = childNodes[i];
               if (node.nodeName == 'feature') {
                  this._knownCapabilities[ver]['features'].push(node.getAttribute('var'));
               } else if (node.nodeName == 'identity') {
                  this._knownCapabilities[ver]['identities'].push(this._attributesToJsObject(node.attributes));
               } else {
                  if (typeof this._knownCapabilities[ver][node.nodeName] === 'undefined')
                     this._knownCapabilities[ver][node.nodeName] = [];
                  this._knownCapabilities[ver][node.nodeName].push(this._attributesToJsObject(node.attributes));
               }

            }
            this._jidVerIndex[from] = ver;
         } else if (!this._jidVerIndex[from] || !this._jidVerIndex[from] !== ver) {
            this._jidVerIndex[from] = ver;
         }

         localStorage.setItem('strophe.caps._jidVerIndex', JSON.stringify(this._jidVerIndex));
         localStorage.setItem('strophe.caps._knownCapabilities', JSON.stringify(this._knownCapabilities));
         $(document).trigger('caps.strophe', [ from ]);

         return false;
      },

      _attributesToJsObject: function(attr) {
         var obj = {};

         for (i = 0; i < attr.length; i++)
            obj[attr[i].name] = attr[i].value;

         return obj;
      },

      /**
       * PrivateFunction: _sortIdentities Sorts two identities according the
       * sorting requirements in XEP-0115.
       * 
       * Parameters: (Object) a - Identity a (Object) b - Identity b
       * 
       * Returns: (Integer) - 1, 0 or -1; according to which one's greater.
       */
      _sortIdentities: function(a, b) {
         if (a.category > b.category) {
            return 1;
         }
         if (a.category < b.category) {
            return -1;
         }
         if (a.type > b.type) {
            return 1;
         }
         if (a.type < b.type) {
            return -1;
         }
         if (a.lang > b.lang) {
            return 1;
         }
         if (a.lang < b.lang) {
            return -1;
         }
         return 0;
      }
   });
}(jQuery));

/*!
 * Source: build/lib/strophe.vcard.js, license: MIT, url: https://github.com/strophe/strophejs-plugins */
// Generated by CoffeeScript 1.3.3
/*
Plugin to implement the vCard extension.
http://xmpp.org/extensions/xep-0054.html

Author: Nathan Zorn (nathan.zorn@gmail.com)
CoffeeScript port: Andreas Guth (guth@dbis.rwth-aachen.de)
*/

/* jslint configuration:
*/

/* global document, window, setTimeout, clearTimeout, console,
    XMLHttpRequest, ActiveXObject,
    Base64, MD5,
    Strophe, $build, $msg, $iq, $pres
*/

var buildIq;

buildIq = function(type, jid, vCardEl) {
  var iq;
  iq = $iq(jid ? {
    type: type,
    to: jid
  } : {
    type: type
  });
  iq.c("vCard", {
    xmlns: Strophe.NS.VCARD
  });
  if (vCardEl) {
    iq.cnode(vCardEl);
  }
  return iq;
};

Strophe.addConnectionPlugin('vcard', {
  _connection: null,
  init: function(conn) {
    this._connection = conn;
    return Strophe.addNamespace('VCARD', 'vcard-temp');
  },
  /*Function
    Retrieve a vCard for a JID/Entity
    Parameters:
    (Function) handler_cb - The callback function used to handle the request.
    (String) jid - optional - The name of the entity to request the vCard
       If no jid is given, this function retrieves the current user's vcard.
  */

  get: function(handler_cb, jid, error_cb) {
    var iq;
    iq = buildIq("get", jid);
    return this._connection.sendIQ(iq, handler_cb, error_cb);
  },
  /* Function
      Set an entity's vCard.
  */

  set: function(handler_cb, vCardEl, jid, error_cb) {
    var iq;
    iq = buildIq("set", jid, vCardEl);
    return this._connection.sendIQ(iq, handler_cb, error_rb);
  }
});
/*!
 * Source: build/lib/strophe.jingle/strophe.jingle.js, license: MIT, url: https://github.com/ESTOS/strophe.jingle */
/* jshint -W117 */
(function($){
Strophe.addConnectionPlugin('jingle', {
    connection: null,
    sessions: {},
    jid2session: {},
    ice_config: {iceServers: []},
    pc_constraints: {},
    media_constraints: {
        mandatory: {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        }
        // MozDontOfferDataChannel: true when this is firefox
    },
    localStream: null,

    init: function (conn) {
        this.connection = conn;
        if (this.connection.disco) {
            // http://xmpp.org/extensions/xep-0167.html#support
            // http://xmpp.org/extensions/xep-0176.html#support
            this.connection.disco.addFeature('urn:xmpp:jingle:1');
            this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:1');
            this.connection.disco.addFeature('urn:xmpp:jingle:transports:ice-udp:1');
            this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:audio');
            this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:video');


            // this is dealt with by SDP O/A so we don't need to annouce this
            //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtcp-fb:0'); // XEP-0293
            //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtp-hdrext:0'); // XEP-0294
            this.connection.disco.addFeature('urn:ietf:rfc:5761'); // rtcp-mux
            //this.connection.disco.addFeature('urn:ietf:rfc:5888'); // a=group, e.g. bundle
            //this.connection.disco.addFeature('urn:ietf:rfc:5576'); // a=ssrc
        }
        this.connection.addHandler(this.onJingle.bind(this), 'urn:xmpp:jingle:1', 'iq', 'set', null, null);
    },
    onJingle: function (iq) {
        var sid = $(iq).find('jingle').attr('sid');
        var action = $(iq).find('jingle').attr('action');
        // send ack first
        var ack = $iq({type: 'result',
              to: iq.getAttribute('from'),
              id: iq.getAttribute('id')
        });
        console.log('on jingle ' + action);
        var sess = this.sessions[sid];
        if ('session-initiate' != action) {
            if (sess === null) {
                ack.type = 'error';
                ack.c('error', {type: 'cancel'})
                   .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                   .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                this.connection.send(ack);
                return true;
            }
            // compare from to sess.peerjid (bare jid comparison for later compat with message-mode)
            // local jid is not checked
            if (Strophe.getBareJidFromJid(iq.getAttribute('from')) != Strophe.getBareJidFromJid(sess.peerjid)) {
                console.warn('jid mismatch for session id', sid, iq.getAttribute('from'), sess.peerjid);
                ack.type = 'error';
                ack.c('error', {type: 'cancel'})
                   .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                   .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                this.connection.send(ack);
                return true;
            }
        } else if (sess !== undefined) {
            // existing session with same session id
            // this might be out-of-order if the sess.peerjid is the same as from
            ack.type = 'error';
            ack.c('error', {type: 'cancel'})
               .c('service-unavailable', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up();
            console.warn('duplicate session id', sid);
            this.connection.send(ack);
            return true;
        }
        // FIXME: check for a defined action
        this.connection.send(ack);
        // see http://xmpp.org/extensions/xep-0166.html#concepts-session
        switch (action) {
        case 'session-initiate':
            sess = new JingleSession($(iq).attr('to'), $(iq).find('jingle').attr('sid'), this.connection);
            // configure session
            if (this.localStream) {
                sess.localStreams.push(this.localStream);
            }
            sess.media_constraints = this.media_constraints;
            sess.pc_constraints = this.pc_constraints;
            sess.ice_config = this.ice_config;

            sess.initiate($(iq).attr('from'), false);
            sess.setRemoteDescription($(iq).find('>jingle'), 'offer');

            if ($(iq).find('>jingle>muted[xmlns="http://jitsi.org/protocol/meet#startmuted"]').length) {
                console.log('got a request to start muted');
                sess.startmuted = true;
            }

            this.sessions[sess.sid] = sess;
            this.jid2session[sess.peerjid] = sess;

            // the callback should either 
            // .sendAnswer and .accept
            // or .sendTerminate -- not necessarily synchronus
            $(document).trigger('callincoming.jingle', [sess.sid]);
            break;
        case 'session-accept':
            sess.setRemoteDescription($(iq).find('>jingle'), 'answer');
            sess.accept();
            $(document).trigger('callaccepted.jingle', [sess.sid]);
            break;
        case 'session-terminate':
            console.log('terminating...');
            sess.terminate();
            this.terminate(sess.sid);
            if ($(iq).find('>jingle>reason').length) {
                $(document).trigger('callterminated.jingle', [
                    sess.sid,
                    $(iq).find('>jingle>reason>:first')[0].tagName,
                    $(iq).find('>jingle>reason>text').text()
                ]);
            } else {
                $(document).trigger('callterminated.jingle', [sess.sid]);
            }
            break;
        case 'transport-info':
            sess.addIceCandidate($(iq).find('>jingle>content'));
            break;
        case 'session-info':
            var affected;
            if ($(iq).find('>jingle>ringing[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                $(document).trigger('ringing.jingle', [sess.sid]);
            } else if ($(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                affected = $(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                $(document).trigger('mute.jingle', [sess.sid, affected]);
            } else if ($(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                affected = $(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                $(document).trigger('unmute.jingle', [sess.sid, affected]);
            }
            break;
        case 'addsource': // FIXME: proprietary
            sess.addSource($(iq).find('>jingle>content'));
            break;
        case 'removesource': // FIXME: proprietary
            sess.removeSource($(iq).find('>jingle>content'));
            break;
        default:
            console.warn('jingle action not implemented', action);
            break;
        }
        return true;
    },
    initiate: function (peerjid, myjid) { // initiate a new jinglesession to peerjid
        var sess = new JingleSession(myjid || this.connection.jid,
                                     Math.random().toString(36).substr(2, 12), // random string
                                     this.connection);
        // configure session
        if (this.localStream) {
            sess.localStreams.push(this.localStream);
        }
        sess.media_constraints = this.media_constraints;
        sess.pc_constraints = this.pc_constraints;
        sess.ice_config = this.ice_config;

        sess.initiate(peerjid, true);
        this.sessions[sess.sid] = sess;
        this.jid2session[sess.peerjid] = sess;
        sess.sendOffer();
        return sess;
    },
    terminate: function (sid, reason, text) { // terminate by sessionid (or all sessions)
        if (sid === null || sid === undefined) {
            for (sid in this.sessions) {
                if (this.sessions[sid].state != 'ended') {
                    this.sessions[sid].sendTerminate(reason || (!this.sessions[sid].active()) ? 'cancel' : null, text);
                    this.sessions[sid].terminate();
                }
                delete this.jid2session[this.sessions[sid].peerjid];
                delete this.sessions[sid];
            }
        } else if (this.sessions.hasOwnProperty(sid)) {
            if (this.sessions[sid].state != 'ended') {
                this.sessions[sid].sendTerminate(reason || (!this.sessions[sid].active()) ? 'cancel' : null, text);
                this.sessions[sid].terminate();
            }
            delete this.jid2session[this.sessions[sid].peerjid];
            delete this.sessions[sid];
        }
    },
    terminateByJid: function (jid) {
        if (this.jid2session.hasOwnProperty(jid)) {
            var sess = this.jid2session[jid];
            if (sess) {
                sess.terminate();
                console.log('peer went away silently', jid);
                delete this.sessions[sess.sid];
                delete this.jid2session[jid];
                $(document).trigger('callterminated.jingle', [sess.sid, 'gone']);
            }
        }
    },
    getStunAndTurnCredentials: function () {
        // get stun and turn configuration from server via xep-0215
        // uses time-limited credentials as described in
        // http://tools.ietf.org/html/draft-uberti-behave-turn-rest-00
        //
        // see https://code.google.com/p/prosody-modules/source/browse/mod_turncredentials/mod_turncredentials.lua
        // for a prosody module which implements this
        //
        // currently, this doesn't work with updateIce and therefore credentials with a long
        // validity have to be fetched before creating the peerconnection
        // TODO: implement refresh via updateIce as described in
        //      https://code.google.com/p/webrtc/issues/detail?id=1650
        var self = this;
        this.connection.sendIQ(
            $iq({type: 'get', to: this.connection.domain})
                .c('services', {xmlns: 'urn:xmpp:extdisco:1'}).c('service', {host: 'turn.' + this.connection.domain}),
            function (res) {
                var iceservers = [];
                $(res).find('>services>service').each(function (idx, el) {
                    el = $(el);
                    var dict = {};
                    switch (el.attr('type')) {
                    case 'stun':
                        dict.url = 'stun:' + el.attr('host');
                        if (el.attr('port')) {
                            dict.url += ':' + el.attr('port');
                        }
                        iceservers.push(dict);
                        break;
                    case 'turn':
                        dict.url = 'turn:';
                        if (el.attr('username')) { // https://code.google.com/p/webrtc/issues/detail?id=1508
                            if (navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./) && parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10) < 28) {
                                dict.url += el.attr('username') + '@';
                            } else {
                                dict.username = el.attr('username'); // only works in M28
                            }
                        }
                        dict.url += el.attr('host');
                        if (el.attr('port') && el.attr('port') != '3478') {
                            dict.url += ':' + el.attr('port');
                        }
                        if (el.attr('transport') && el.attr('transport') != 'udp') {
                            dict.url += '?transport=' + el.attr('transport');
                        }
                        if (el.attr('password')) {
                            dict.credential = el.attr('password');
                        }
                        iceservers.push(dict);
                        break;
                    }
                });
                self.ice_config.iceServers = iceservers;
            },
            function (err) {
                console.warn('getting turn credentials failed', err);
                console.warn('is mod_turncredentials or similar installed?');
            }
        );
        // implement push?
    }
});
}(jQuery));

/*!
 * Source: build/lib/strophe.jingle/strophe.jingle.session.js, license: MIT, url: https://github.com/ESTOS/strophe.jingle */
/* jshint -W117 */
// Jingle stuff
var JingleSession;

(function($){
JingleSession = function(me, sid, connection) {
    this.me = me;
    this.sid = sid;
    this.connection = connection;
    this.initiator = null;
    this.responder = null;
    this.isInitiator = null;
    this.peerjid = null;
    this.state = null;
    this.peerconnection = null;
    this.remoteStream = null;
    this.localSDP = null;
    this.remoteSDP = null;
    this.localStreams = [];
    this.relayedStreams = [];
    this.remoteStreams = [];
    this.startTime = null;
    this.stopTime = null;
    this.media_constraints = null;
    this.pc_constraints = null;
    this.ice_config = {};
    this.drip_container = [];

    this.usetrickle = true;
    this.usepranswer = false; // early transport warmup -- mind you, this might fail. depends on webrtc issue 1718
    this.usedrip = false; // dripping is sending trickle candidates not one-by-one

    this.hadstuncandidate = false;
    this.hadturncandidate = false;
    this.lasticecandidate = false;

    this.statsinterval = null;

    this.reason = null;

    this.addssrc = [];
    this.removessrc = [];
    this.pendingop = null;

    this.wait = true;

    // XEP-0172 support, non-standard
    this.nickname = null;

    // non-standard "please start muted" support for colibri/meet
    this.startmuted = false;

    // Filter for testcases with ICE Candidates
    this.filter_candidates = null;
}

JingleSession.prototype.initiate = function (peerjid, isInitiator) {
    var self = this;
    if (this.state !== null) {
        console.error('attempt to initiate on session ' + this.sid +
                  'in state ' + this.state);
        return;
    }
    this.isInitiator = isInitiator;
    this.state = 'pending';
    this.initiator = isInitiator ? this.me : peerjid;
    this.responder = !isInitiator ? this.me : peerjid;
    this.peerjid = peerjid;
    //console.log('create PeerConnection ' + JSON.stringify(this.ice_config));
    try {
        this.peerconnection = new RTCPeerconnection(this.ice_config,
                                                     this.pc_constraints);
    } catch (e) {
        console.error('Failed to create PeerConnection, exception: ',
                      e.message);
        console.error(e);
        return;
    }
    this.hadstuncandidate = false;
    this.hadturncandidate = false;
    this.lasticecandidate = false;
    this.peerconnection.onicecandidate = function (event) {
        self.sendIceCandidate(event.candidate);
    };
    this.peerconnection.onaddstream = function (event) {
        self.remoteStream = event.stream;
        self.remoteStreams.push(event.stream);
        $(document).trigger('remotestreamadded.jingle', [event, self.sid]);
    };
    this.peerconnection.onremovestream = function (event) {
        self.remoteStream = null;
        // FIXME: remove from this.remoteStreams
        $(document).trigger('remotestreamremoved.jingle', [event, self.sid]);
    };
    this.peerconnection.onsignalingstatechange = function (event) {
        if (!(self && self.peerconnection)) return;
    };
    this.peerconnection.oniceconnectionstatechange = function (event) {
        if (!(self && self.peerconnection)) return;
        switch (self.peerconnection.iceConnectionState) {
        case 'connected':
            this.startTime = new Date();
            break;
        case 'disconnected':
            this.stopTime = new Date();
            break;
        }
        $(document).trigger('iceconnectionstatechange.jingle', [self.sid, self]);
    };
    // add any local and relayed stream
    this.localStreams.forEach(function(stream) {
        self.peerconnection.addStream(stream);
    });
    this.relayedStreams.forEach(function(stream) {
        self.peerconnection.addStream(stream);
    });
};

JingleSession.prototype.accept = function () {
    var self = this;
    this.state = 'active';

    var pranswer = this.peerconnection.localDescription;
    if (!pranswer || pranswer.type != 'pranswer') {
        return;
    }
    console.log('going from pranswer to answer');
    if (this.usetrickle) {
        // remove candidates already sent from session-accept
        var lines = SDPUtil.find_lines(pranswer.sdp, 'a=candidate:');
        for (var i = 0; i < lines.length; i++) {
            pranswer.sdp = pranswer.sdp.replace(lines[i] + '\r\n', '');
        }
    }
    while (SDPUtil.find_line(pranswer.sdp, 'a=inactive')) {
        // FIXME: change any inactive to sendrecv or whatever they were originally
        pranswer.sdp = pranswer.sdp.replace('a=inactive', 'a=sendrecv');
    }
    var prsdp = new SDP(pranswer.sdp);
    var accept = $iq({to: this.peerjid,
             type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-accept',
           initiator: this.initiator,
           responder: this.responder,
           sid: this.sid });
    prsdp.toJingle(accept, this.initiator == this.me ? 'initiator' : 'responder');
    this.connection.sendIQ(accept,
        function () {
            var ack = {};
            ack.source = 'answer';
            $(document).trigger('ack.jingle', [self.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName,
            }:{};
            error.source = 'answer';
            $(document).trigger('error.jingle', [self.sid, error]);
        },
    10000);

    var sdp = this.peerconnection.localDescription.sdp;
    while (SDPUtil.find_line(sdp, 'a=inactive')) {
        // FIXME: change any inactive to sendrecv or whatever they were originally
        sdp = sdp.replace('a=inactive', 'a=sendrecv');
    }
    this.peerconnection.setLocalDescription(new RTCSessionDescription({type: 'answer', sdp: sdp}),
        function () {
            //console.log('setLocalDescription success');
            $(document).trigger('setLocalDescription.jingle', [self.sid]);
        },
        function (e) {
            console.error('setLocalDescription failed', e);
        }
    );
};

JingleSession.prototype.terminate = function (reason) {
    this.state = 'ended';
    this.reason = reason;
    this.peerconnection.close();
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
};

JingleSession.prototype.active = function () {
    return this.state == 'active';
};

JingleSession.prototype.sendIceCandidate = function (candidate) {
    var self = this;
    if (candidate && !this.lasticecandidate) {
        var ice = SDPUtil.iceparams(this.localSDP.media[candidate.sdpMLineIndex], this.localSDP.session);
        var jcand = SDPUtil.candidateToJingle(candidate.candidate);
        if (!(ice && jcand)) {
            console.error('failed to get ice && jcand');
            return;
        }
        ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';

        if (jcand.type === 'srflx') {
            this.hadstuncandidate = true;
        } else if (jcand.type === 'relay') {
            this.hadturncandidate = true;
        }

        if(this.filter_candidates === null || jcand.type === this.filter_candidates) {
            if (this.usetrickle) {
                console.log('sendIceCandidate using trickle');
                if (this.usedrip) {
                    if (this.drip_container.length === 0) {
                        // start 20ms callout
                        window.setTimeout(function () {
                            console.log('sending drip container');
                            if (self.drip_container.length === 0) return;
                            self.sendIceCandidates(self.drip_container);
                            self.drip_container = [];
                        }, 20);

                    }
                    this.drip_container.push(event.candidate);
                    return;
                } else {
                    console.log('sending single candidate');
                    self.sendIceCandidates([event.candidate]);
                }
            }
        }
    } else {
        console.log('sendIceCandidate: last candidate...');
        if (!this.usetrickle) {
            console.log('should send full offer now...');
            var init = $iq({to: this.peerjid,
                       type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                   action: this.peerconnection.localDescription.type == 'offer' ? 'session-initiate' : 'session-accept',
                   initiator: this.initiator,
                   sid: this.sid});
            if (this.nickname != null) {
                init.c('nick', {xmlns:'http://jabber.org/protocol/nick'}).t(this.nickname).up();
            }
            if (this.startmuted) {
                init.c('muted', {xmlns:'http://jitsi.org/protocol/meet#startmuted'}).up();
            }
            this.localSDP = new SDP(this.peerconnection.localDescription.sdp);
            this.localSDP.toJingle(init, this.initiator == this.me ? 'initiator' : 'responder');
            console.log('try to send ack(offer)...');
            this.connection.sendIQ(init,
                function () {
                    console.log('Sent session initiate (ACK, offer)...');
                    var ack = {};
                    ack.source = 'offer';
                    $(document).trigger('ack.jingle', [self.sid, ack]);
                },
                function (stanza) {
                    self.state = 'error';
                    self.peerconnection.close();
                    var error = ($(stanza).find('error').length) ? {
                        code: $(stanza).find('error').attr('code'),
                        reason: $(stanza).find('error :first')[0].tagName,
                    }:{};
                    error.source = 'offer';
                    $(document).trigger('error.jingle', [self.sid, error]);
                },
            10000);
        }
        this.lasticecandidate = true;
        console.log('Have we encountered any srflx candidates? ' + this.hadstuncandidate);
        console.log('Have we encountered any relay candidates? ' + this.hadturncandidate);

        if (!(this.hadstuncandidate || this.hadturncandidate) && this.peerconnection.signalingState != 'closed') {
            console.log('no candidates found!');
            $(document).trigger('nostuncandidates.jingle', [this.sid]);
        }
    }
};

JingleSession.prototype.sendIceCandidates = function (candidates) {
    console.log('sendIceCandidates', candidates);
    var cand = $iq({to: this.peerjid, type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'transport-info',
           initiator: this.initiator,
           sid: this.sid});
    for (var mid = 0; mid < this.localSDP.media.length; mid++) {
        var cands = candidates.filter(function (el) { return el.sdpMLineIndex == mid; });
        if (cands.length > 0) {
            var ice = SDPUtil.iceparams(this.localSDP.media[mid], this.localSDP.session);
            ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';
            cand.c('content', {creator: this.initiator == this.me ? 'initiator' : 'responder',
                   name: cands[0].sdpMid
            }).c('transport', ice);
            for (var i = 0; i < cands.length; i++) {
                cand.c('candidate', SDPUtil.candidateToJingle(cands[i].candidate)).up();
            }
            // add fingerprint
            if (SDPUtil.find_line(this.localSDP.media[mid], 'a=fingerprint:', this.localSDP.session)) {
                var tmp = SDPUtil.parse_fingerprint(SDPUtil.find_line(this.localSDP.media[mid], 'a=fingerprint:', this.localSDP.session));
                tmp.required = true;
                cand.c('fingerprint').t(tmp.fingerprint);
                delete tmp.fingerprint;
                cand.attrs(tmp);
                cand.up();
            }
            cand.up(); // transport
            cand.up(); // content
        }
    }
    // might merge last-candidate notification into this, but it is called alot later. See webrtc issue #2340
    //console.log('was this the last candidate', this.lasticecandidate);
    console.log('try to send ack(transportinfo)...');
    this.connection.sendIQ(cand,
        function () {
            var ack = {};
            ack.source = 'transportinfo';
            console.log('Sent session initiate (ACK, transportinfo)...');
            $(document).trigger('ack.jingle', [this.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName,
            }:{};
            error.source = 'transportinfo';
            $(document).trigger('error.jingle', [this.sid, error]);
        },
    10000);
};


JingleSession.prototype.sendOffer = function () {
    //console.log('sendOffer...');
    var self = this;
    this.peerconnection.createOffer(function (sdp) {
            self.createdOffer(sdp);
        },
        function (e) {
            console.error('createOffer failed', e);
        },
        this.media_constraints
    );
};

JingleSession.prototype.createdOffer = function (sdp) {
    //console.log('createdOffer', sdp);
    var self = this;
    this.localSDP = new SDP(sdp.sdp);
    //this.localSDP.mangle();
    if (this.usetrickle) {
        var init = $iq({to: this.peerjid,
                   type: 'set'})
            .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
               action: 'session-initiate',
               initiator: this.initiator,
               sid: this.sid});
        if (this.nickname != null) {
            init.c('nick', {xmlns:'http://jabber.org/protocol/nick'}).t(this.nickname).up();
        }
        if (this.startmuted) {
            init.c('muted', {xmlns:'http://jitsi.org/protocol/meet#startmuted'}).up();
        }
        this.localSDP.toJingle(init, this.initiator == this.me ? 'initiator' : 'responder');
        this.connection.sendIQ(init,
            function () {
                var ack = {};
                ack.source = 'offer';
                $(document).trigger('ack.jingle', [self.sid, ack]);
            },
            function (stanza) {
                self.state = 'error';
                self.peerconnection.close();
                var error = ($(stanza).find('error').length) ? {
                    code: $(stanza).find('error').attr('code'),
                    reason: $(stanza).find('error :first')[0].tagName,
                }:{};
                error.source = 'offer';
                $(document).trigger('error.jingle', [self.sid, error]);
            },
        10000);
    }
    sdp.sdp = this.localSDP.raw;
    this.peerconnection.setLocalDescription(sdp, 
        function () {
            $(document).trigger('setLocalDescription.jingle', [self.sid]);
            //console.log('setLocalDescription success');
        },
        function (e) {
            console.error('setLocalDescription failed', e);
        }
    );
    var cands = SDPUtil.find_lines(this.localSDP.raw, 'a=candidate:');
    for (var i = 0; i < cands.length; i++) {
        var cand = SDPUtil.parse_icecandidate(cands[i]);
        if (cand.type == 'srflx') {
            this.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            this.hadturncandidate = true;
        }
    }
};

JingleSession.prototype.setRemoteDescription = function (elem, desctype) {
    //console.log('setting remote description... ', desctype);
    this.remoteSDP = new SDP('');
    this.remoteSDP.fromJingle(elem);
    if (this.peerconnection.remoteDescription !== null) {
        console.log('setRemoteDescription when remote description is not null, should be pranswer', this.peerconnection.remoteDescription);
        if (this.peerconnection.remoteDescription.type == 'pranswer') {
            var pranswer = new SDP(this.peerconnection.remoteDescription.sdp);
            for (var i = 0; i < pranswer.media.length; i++) {
                // make sure we have ice ufrag and pwd
                if (!SDPUtil.find_line(this.remoteSDP.media[i], 'a=ice-ufrag:', this.remoteSDP.session)) {
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session)) {
                        this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice ufrag?');
                    }
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session)) {
                        this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice pwd?');
                    }
                }
                // copy over candidates
                var lines = SDPUtil.find_lines(pranswer.media[i], 'a=candidate:');
                for (var j = 0; j < lines.length; j++) {
                    this.remoteSDP.media[i] += lines[j] + '\r\n';
                }
            }
            this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');
        }
    }
    var remotedesc = new RTCSessionDescription({type: desctype, sdp: this.remoteSDP.raw});
    
    this.peerconnection.setRemoteDescription(remotedesc,
        function () {
            //console.log('setRemoteDescription success');
        },
        function (e) {
            console.error('setRemoteDescription error', e);
        }
    );
};

JingleSession.prototype.addIceCandidate = function (elem) {
    var self = this;
    if (this.peerconnection.signalingState == 'closed') {
        return;
    }
    if (!this.peerconnection.remoteDescription && this.peerconnection.signalingState == 'have-local-offer') {
        console.log('trickle ice candidate arriving before session accept...');
        // create a PRANSWER for setRemoteDescription
        if (!this.remoteSDP) {
            var cobbled = 'v=0\r\n' +
                'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
                's=-\r\n' +
                't=0 0\r\n';
            // first, take some things from the local description
            for (var i = 0; i < this.localSDP.media.length; i++) {
                cobbled += SDPUtil.find_line(this.localSDP.media[i], 'm=') + '\r\n';
                cobbled += SDPUtil.find_lines(this.localSDP.media[i], 'a=rtpmap:').join('\r\n') + '\r\n';
                if (SDPUtil.find_line(this.localSDP.media[i], 'a=mid:')) {
                    cobbled += SDPUtil.find_line(this.localSDP.media[i], 'a=mid:') + '\r\n';
                }
                cobbled += 'a=inactive\r\n';
            }
            this.remoteSDP = new SDP(cobbled);
        }
        // then add things like ice and dtls from remote candidate
        elem.each(function () {
            for (var i = 0; i < self.remoteSDP.media.length; i++) {
                if (SDPUtil.find_line(self.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                        self.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                    if (!SDPUtil.find_line(self.remoteSDP.media[i], 'a=ice-ufrag:')) {
                        var tmp = $(this).find('transport');
                        self.remoteSDP.media[i] += 'a=ice-ufrag:' + tmp.attr('ufrag') + '\r\n';
                        self.remoteSDP.media[i] += 'a=ice-pwd:' + tmp.attr('pwd') + '\r\n';
                        tmp = $(this).find('transport>fingerprint');
                        if (tmp.length) {
                            self.remoteSDP.media[i] += 'a=fingerprint:' + tmp.attr('hash') + ' ' + tmp.text() + '\r\n';
                        } else {
                            console.log('no dtls fingerprint (webrtc issue #1718?)');
                            self.remoteSDP.media[i] += 'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:BAADBAADBAADBAADBAADBAADBAADBAADBAADBAAD\r\n';
                        }
                        break;
                    }
                }
            }
        });
        this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');

        // we need a complete SDP with ice-ufrag/ice-pwd in all parts
        // this makes the assumption that the PRANSWER is constructed such that the ice-ufrag is in all mediaparts
        // but it could be in the session part as well. since the code above constructs this sdp this can't happen however
        var iscomplete = this.remoteSDP.media.filter(function (mediapart) {
            return SDPUtil.find_line(mediapart, 'a=ice-ufrag:');
        }).length == this.remoteSDP.media.length;

        if (iscomplete) {
            console.log('setting pranswer');
            try {
                this.peerconnection.setRemoteDescription(new RTCSessionDescription({type: 'pranswer', sdp: this.remoteSDP.raw }),
                    function() {
                    },
                    function(e) {
                        console.log('setRemoteDescription pranswer failed', e.toString());
                    });
            } catch (e) {
                console.error('setting pranswer failed', e);
            }
        } else {
            //console.log('not yet setting pranswer');
        }
    }
    // operate on each content element
    elem.each(function () {
        // would love to deactivate this, but firefox still requires it
        var idx = -1;
        var i;
        for (i = 0; i < self.remoteSDP.media.length; i++) {
            if (SDPUtil.find_line(self.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                self.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                idx = i;
                break;
            }
        }
        if (idx == -1) { // fall back to localdescription
            for (i = 0; i < self.localSDP.media.length; i++) {
                if (SDPUtil.find_line(self.localSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                    self.localSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                    idx = i;
                    break;
                }
            }
        }
        var name = $(this).attr('name');
        // TODO: check ice-pwd and ice-ufrag?
        $(this).find('transport>candidate').each(function () {
            var line, candidate;
            line = SDPUtil.candidateFromJingle(this);
            candidate = new RTCIceCandidate({sdpMLineIndex: idx,
                                            sdpMid: name,
                                            candidate: line});
            try {
                self.peerconnection.addIceCandidate(candidate);
            } catch (e) {
                console.error('addIceCandidate failed', e.toString(), line);
            }
        });
    });
};

JingleSession.prototype.sendAnswer = function (provisional) {
    //console.log('createAnswer', provisional);
    var self = this;
    this.peerconnection.createAnswer(
        function (sdp) {
            self.createdAnswer(sdp, provisional);
        },
        function (e) {
            console.error('createAnswer failed', e);
        },
        this.media_constraints
    );
};

JingleSession.prototype.createdAnswer = function (sdp, provisional) {
    //console.log('createAnswer callback');
    var self = this;
    this.localSDP = new SDP(sdp.sdp);
    //this.localSDP.mangle();
    this.usepranswer = provisional === true;

    if (this.startmuted) {
        console.log('we got a request to start muted...');
        this.connection.jingle.localStream.getAudioTracks().forEach(function (track) {
            track.enabled = false;
        });
        // doing this freezes local video, too (which probably means it should be replaced
        // by a symbol
        this.connection.jingle.localStream.getVideoTracks().forEach(function (track) {
            track.enabled = false;
        });

        // set video to recvonly
        this.localSDP.media[1] = this.localSDP.media[1].replace('a=sendrecv', 'a=recvonly');
        // and remove a=ssrc lines. Weird things happen otherwise
        SDPUtil.find_lines(this.localSDP.media[1], 'a=ssrc:').forEach(function (line) {
            self.localSDP.media[1] = self.localSDP.media[1].replace(line + '\r\n', '');
        });
        this.localSDP.raw = this.localSDP.session + this.localSDP.media.join('');
    }

    if (this.usetrickle) {
        if (!this.usepranswer) {
            var accept = $iq({to: this.peerjid,
                     type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                   action: 'session-accept',
                   initiator: this.initiator,
                   responder: this.responder,
                   sid: this.sid });
            this.localSDP.toJingle(accept, this.initiator == this.me ? 'initiator' : 'responder');
            this.connection.sendIQ(accept,
                function () {
                    var ack = {};
                    ack.source = 'answer';
                    $(document).trigger('ack.jingle', [self.sid, ack]);
                },
                function (stanza) {
                    var error = ($(stanza).find('error').length) ? {
                        code: $(stanza).find('error').attr('code'),
                        reason: $(stanza).find('error :first')[0].tagName,
                    }:{};
                    error.source = 'answer';
                    $(document).trigger('error.jingle', [self.sid, error]);
                },
            10000);
        } else {
            sdp.type = 'pranswer';
            for (var i = 0; i < this.localSDP.media.length; i++) {
                this.localSDP.media[i] = this.localSDP.media[i].replace('a=sendrecv\r\n', 'a=inactive\r\n');
            }
            this.localSDP.raw = this.localSDP.session + this.localSDP.media.join('');
        }
    }
    sdp.sdp = this.localSDP.raw;
    this.peerconnection.setLocalDescription(sdp,
        function () {
            $(document).trigger('setLocalDescription.jingle', [self.sid]);
            //console.log('setLocalDescription success');
        },
        function (e) {
            console.error('setLocalDescription failed', e);
        }
    );
    var cands = SDPUtil.find_lines(this.localSDP.raw, 'a=candidate:');
    for (var j = 0; j < cands.length; j++) {
        var cand = SDPUtil.parse_icecandidate(cands[j]);
        if (cand.type == 'srflx') {
            this.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            this.hadturncandidate = true;
        }
    }
};

JingleSession.prototype.sendTerminate = function (reason, text) {
    var self = this,
        term = $iq({to: this.peerjid,
               type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-terminate',
           initiator: this.initiator,
           sid: this.sid})
        .c('reason')
        .c(reason || 'success');
        
    if (text) {
        term.up().c('text').t(text);
    }
    
    this.connection.sendIQ(term,
        function () {
            self.peerconnection.close();
            self.peerconnection = null;
            self.terminate();
            var ack = {};
            ack.source = 'terminate';
            $(document).trigger('ack.jingle', [self.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName,
            }:{};
            $(document).trigger('ack.jingle', [self.sid, error]);
        },
    10000);
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
};


JingleSession.prototype.addSource = function (elem) {
    console.log('addssrc', new Date().getTime());
    console.log('ice', this.peerconnection.iceConnectionState);
    var sdp = new SDP(this.peerconnection.remoteDescription.sdp);

    var self = this;
    $(elem).each(function (idx, content) {
        var name = $(content).attr('name');
        var lines = '';
        tmp = $(content).find('>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');
        tmp.each(function () {
            var ssrc = $(this).attr('ssrc');
            $(this).find('>parameter').each(function () {
                lines += 'a=ssrc:' + ssrc + ' ' + $(this).attr('name');
                if ($(this).attr('value') && $(this).attr('value').length)
                    lines += ':' + $(this).attr('value');
                lines += '\r\n';
            });
        });
        sdp.media.forEach(function(media, idx) {
            if (!SDPUtil.find_line(media, 'a=mid:' + name))
                return;
            sdp.media[idx] += lines;
            if (!self.addssrc[idx]) self.addssrc[idx] = '';
            self.addssrc[idx] += lines;
        });
        sdp.raw = sdp.session + sdp.media.join('');
    });
    this.modifySources();
};

JingleSession.prototype.removeSource = function (elem) {
    console.log('removessrc', new Date().getTime());
    console.log('ice', this.peerconnection.iceConnectionState);
    var sdp = new SDP(this.peerconnection.remoteDescription.sdp);

    var self = this;
    $(elem).each(function (idx, content) {
        var name = $(content).attr('name');
        var lines = '';
        tmp = $(content).find('>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');
        tmp.each(function () {
            var ssrc = $(this).attr('ssrc');
            $(this).find('>parameter').each(function () {
                lines += 'a=ssrc:' + ssrc + ' ' + $(this).attr('name');
                if ($(this).attr('value') && $(this).attr('value').length)
                    lines += ':' + $(this).attr('value');
                lines += '\r\n';
            });
        });
        sdp.media.forEach(function(media, idx) {
            if (!SDPUtil.find_line(media, 'a=mid:' + name))
                return;
            sdp.media[idx] += lines;
            if (!self.addssrc[idx]) self.removessrc[idx] = '';
            self.removessrc[idx] += lines;
        });
        sdp.raw = sdp.session + sdp.media.join('');
    });
    this.modifySources();
};

JingleSession.prototype.modifySources = function() {
    var self = this;
    if (this.peerconnection.signalingState == 'closed') return;
    if (!(this.addssrc.length || this.removessrc.length || this.pendingop !== null)) return;
    if (!(this.peerconnection.signalingState == 'stable' && this.peerconnection.iceConnectionState == 'connected')) {
        console.warn('modifySources not yet', this.peerconnection.signalingState, this.peerconnection.iceConnectionState);
        this.wait = true;
        window.setTimeout(function() { self.modifySources(); }, 250);
        return;
    }
    if (this.wait) {
        window.setTimeout(function() { self.modifySources(); }, 2500);
        this.wait = false;
        return;
    }

    var sdp = new SDP(this.peerconnection.remoteDescription.sdp);

    // add sources
    this.addssrc.forEach(function(lines, idx) {
        sdp.media[idx] += lines;
    });
    this.addssrc = [];

    // remove sources
    this.removessrc.forEach(function(lines, idx) {
        lines = lines.split('\r\n');
        lines.pop(); // remove empty last element;
        lines.forEach(function(line) {
            sdp.media[idx] = sdp.media[idx].replace(line + '\r\n', '');
        });
    });
    this.removessrc = [];

    sdp.raw = sdp.session + sdp.media.join('');
    this.peerconnection.setRemoteDescription(new RTCSessionDescription({type: 'offer', sdp: sdp.raw}),
        function() {
            self.peerconnection.createAnswer(
                function(modifiedAnswer) {
                    // change video direction, see https://github.com/jitsi/jitmeet/issues/41
                    if (self.pendingop !== null) {
                        var sdp = new SDP(modifiedAnswer.sdp);
                        if (sdp.media.length > 1) {
                            switch(self.pendingop) {
                            case 'mute':
                                sdp.media[1] = sdp.media[1].replace('a=sendrecv', 'a=recvonly');
                                break;
                            case 'unmute':
                                sdp.media[1] = sdp.media[1].replace('a=recvonly', 'a=sendrecv');
                                break;
                            }
                            sdp.raw = sdp.session + sdp.media.join('');
                            modifiedAnswer.sdp = sdp.raw;
                        }
                        self.pendingop = null;
                    }

                    self.peerconnection.setLocalDescription(modifiedAnswer,
                        function() {
                            //console.log('modified setLocalDescription ok');
                            $(document).trigger('setLocalDescription.jingle', [self.sid]);
                        },
                        function(error) {
                            console.log('modified setLocalDescription failed');
                        }
                    );
                },
                function(error) {
                    console.log('modified answer failed');
                }
            );
        },
        function(error) {
            console.log('modify failed');
        }
    );
};

// SDP-based mute by going recvonly/sendrecv
// FIXME: should probably black out the screen as well
JingleSession.prototype.hardMuteVideo = function (muted) {
    this.pendingop = muted ? 'mute' : 'unmute';
    this.modifySources();

    this.connection.jingle.localStream.getVideoTracks().forEach(function (track) {
        track.enabled = !muted;
    });
};

JingleSession.prototype.sendMute = function (muted, content) {
    var info = $iq({to: this.peerjid,
             type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-info',
           initiator: this.initiator,
           sid: this.sid });
    info.c(muted ? 'mute' : 'unmute', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    info.attrs({'creator': this.me == this.initiator ? 'creator' : 'responder'});
    if (content) {
        info.attrs({'name': content});
    }
    this.connection.send(info);
};

JingleSession.prototype.sendRinging = function () {
    var info = $iq({to: this.peerjid,
             type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
           action: 'session-info',
           initiator: this.initiator,
           sid: this.sid });
    info.c('ringing', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    this.connection.send(info);
};

JingleSession.prototype.getStats = function (interval) {
    var self = this;
    var recv = {audio: 0, video: 0};
    var lost = {audio: 0, video: 0};
    var lastrecv = {audio: 0, video: 0};
    var lastlost = {audio: 0, video: 0};
    var loss = {audio: 0, video: 0};
    var delta = {audio: 0, video: 0};
    this.statsinterval = window.setInterval(function () {
        if (self && self.peerconnection && self.peerconnection.getStats) {
            self.peerconnection.getStats(function (stats) {
                var results = stats.result();
                // TODO: there are so much statistics you can get from this..
                for (var i = 0; i < results.length; ++i) {
                    if (results[i].type == 'ssrc') {
                        var packetsrecv = results[i].stat('packetsReceived');
                        var packetslost = results[i].stat('packetsLost');
                        if (packetsrecv && packetslost) {
                            packetsrecv = parseInt(packetsrecv, 10);
                            packetslost = parseInt(packetslost, 10);
                            
                            if (results[i].stat('googFrameRateReceived')) {
                                lastlost.video = lost.video;
                                lastrecv.video = recv.video;
                                recv.video = packetsrecv;
                                lost.video = packetslost;
                            } else {
                                lastlost.audio = lost.audio;
                                lastrecv.audio = recv.audio;
                                recv.audio = packetsrecv;
                                lost.audio = packetslost;
                            }
                        }
                    }
                }
                delta.audio = recv.audio - lastrecv.audio;
                delta.video = recv.video - lastrecv.video;
                loss.audio = (delta.audio > 0) ? Math.ceil(100 * (lost.audio - lastlost.audio) / delta.audio) : 0;
                loss.video = (delta.video > 0) ? Math.ceil(100 * (lost.video - lastlost.video) / delta.video) : 0;
                $(document).trigger('packetloss.jingle', [self.sid, loss]);
            });
        }
    }, interval || 3000);
    return this.statsinterval;
};

}(jQuery));

/*!
 * Source: build/lib/strophe.jingle/strophe.jingle.sdp.js, license: MIT, url: https://github.com/ESTOS/strophe.jingle */
/* jshint -W117 */
var SDP;

(function($){
// SDP STUFF
SDP = function(sdp) {
    this.media = sdp.split('\r\nm=');
    for (var i = 1; i < this.media.length; i++) {
        this.media[i] = 'm=' + this.media[i];
        if (i != this.media.length - 1) {
            this.media[i] += '\r\n';
        }
    }
    this.session = this.media.shift() + '\r\n';
    this.raw = this.session + this.media.join('');
}

// remove iSAC and CN from SDP
SDP.prototype.mangle = function () {
    var i, j, mline, lines, rtpmap, newdesc;
    for (i = 0; i < this.media.length; i++) {
        lines = this.media[i].split('\r\n');
        lines.pop(); // remove empty last element
        mline = SDPUtil.parse_mline(lines.shift());
        if (mline.media != 'audio')
            continue;
        newdesc = '';
        mline.fmt.length = 0;
        for (j = 0; j < lines.length; j++) {
            if (lines[j].substr(0, 9) == 'a=rtpmap:') {
                rtpmap = SDPUtil.parse_rtpmap(lines[j]);
                if (rtpmap.name == 'CN' || rtpmap.name == 'ISAC')
                    continue;
                mline.fmt.push(rtpmap.id);
                newdesc += lines[j] + '\r\n';
            } else {
                newdesc += lines[j] + '\r\n';
            }
        }
        this.media[i] = SDPUtil.build_mline(mline) + '\r\n';
        this.media[i] += newdesc;
    }
    this.raw = this.session + this.media.join('');
};

// remove lines matching prefix from session section
SDP.prototype.removeSessionLines = function(prefix) {
    var self = this;
    var lines = SDPUtil.find_lines(this.session, prefix);
    lines.forEach(function(line) {
        self.session = self.session.replace(line + '\r\n', '');
    });
    this.raw = this.session + this.media.join('');
    return lines;
}
// remove lines matching prefix from a media section specified by mediaindex
// TODO: non-numeric mediaindex could match mid
SDP.prototype.removeMediaLines = function(mediaindex, prefix) {
    var self = this;
    var lines = SDPUtil.find_lines(this.media[mediaindex], prefix);
    lines.forEach(function(line) {
        self.media[mediaindex] = self.media[mediaindex].replace(line + '\r\n', '');
    });
    this.raw = this.session + this.media.join('');
    return lines;
}

// add content's to a jingle element
SDP.prototype.toJingle = function (elem, thecreator) {
    var i, j, k, mline, ssrc, rtpmap, tmp, line, lines;
    var self = this;
    // new bundle plan
    if (SDPUtil.find_line(this.session, 'a=group:')) {
        lines = SDPUtil.find_lines(this.session, 'a=group:');
        for (i = 0; i < lines.length; i++) {
            tmp = lines[i].split(' ');
            var semantics = tmp.shift().substr(8);
            elem.c('group', {xmlns: 'urn:xmpp:jingle:apps:grouping:0', semantics:semantics});
            for (j = 0; j < tmp.length; j++) {
                elem.c('content', {name: tmp[j]}).up();
            }
            elem.up();
        }
    }
    // old bundle plan, to be removed
    var bundle = [];
    if (SDPUtil.find_line(this.session, 'a=group:BUNDLE')) {
        bundle = SDPUtil.find_line(this.session, 'a=group:BUNDLE ').split(' ');
        bundle.shift();
    }
    for (i = 0; i < this.media.length; i++) {
        mline = SDPUtil.parse_mline(this.media[i].split('\r\n')[0]);
        if (!(mline.media == 'audio' || mline.media == 'video')) {
            continue;
        }
        if (SDPUtil.find_line(this.media[i], 'a=ssrc:')) {
            ssrc = SDPUtil.find_line(this.media[i], 'a=ssrc:').substring(7).split(' ')[0]; // take the first
        } else {
            ssrc = false;
        }

        elem.c('content', {creator: thecreator, name: mline.media});
        if (SDPUtil.find_line(this.media[i], 'a=mid:')) {
            // prefer identifier from a=mid if present
            var mid = SDPUtil.parse_mid(SDPUtil.find_line(this.media[i], 'a=mid:'));
            elem.attrs({ name: mid });

            // old BUNDLE plan, to be removed
            if (bundle.indexOf(mid) != -1) {
                elem.c('bundle', {xmlns: 'http://estos.de/ns/bundle'}).up();
                bundle.splice(bundle.indexOf(mid), 1);
            }
        }
        if (SDPUtil.find_line(this.media[i], 'a=rtpmap:').length) {
            elem.c('description',
                 {xmlns: 'urn:xmpp:jingle:apps:rtp:1',
                  media: mline.media });
            if (ssrc) {
                elem.attrs({ssrc: ssrc});
            }
            for (j = 0; j < mline.fmt.length; j++) {
                rtpmap = SDPUtil.find_line(this.media[i], 'a=rtpmap:' + mline.fmt[j]);
                elem.c('payload-type', SDPUtil.parse_rtpmap(rtpmap));
                // put any 'a=fmtp:' + mline.fmt[j] lines into <param name=foo value=bar/>
                if (SDPUtil.find_line(this.media[i], 'a=fmtp:' + mline.fmt[j])) {
                    tmp = SDPUtil.parse_fmtp(SDPUtil.find_line(this.media[i], 'a=fmtp:' + mline.fmt[j]));
                    for (k = 0; k < tmp.length; k++) {
                        elem.c('parameter', tmp[k]).up();
                    }
                }
                this.RtcpFbToJingle(i, elem, mline.fmt[j]); // XEP-0293 -- map a=rtcp-fb

                elem.up();
            }
            if (SDPUtil.find_line(this.media[i], 'a=crypto:', this.session)) {
                elem.c('encryption', {required: 1});
                var crypto = SDPUtil.find_lines(this.media[i], 'a=crypto:', this.session);
                crypto.forEach(function(line) {
                    elem.c('crypto', SDPUtil.parse_crypto(line)).up();
                });
                elem.up(); // end of encryption
            }

            if (ssrc) {
                // new style mapping
                elem.c('source', { ssrc: ssrc, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                // FIXME: group by ssrc and support multiple different ssrcs
                var ssrclines = SDPUtil.find_lines(this.media[i], 'a=ssrc:');
                ssrclines.forEach(function(line) {
                    idx = line.indexOf(' ');
                    var linessrc = line.substr(0, idx).substr(7);
                    if (linessrc != ssrc) {
                        elem.up();
                        ssrc = linessrc;
                        elem.c('source', { ssrc: ssrc, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                    }
                    var kv = line.substr(idx + 1);
                    elem.c('parameter');
                    if (kv.indexOf(':') == -1) {
                        elem.attrs({ name: kv });
                    } else {
                        elem.attrs({ name: kv.split(':', 2)[0] });
                        elem.attrs({ value: kv.split(':', 2)[1] });
                    }
                    elem.up();
                });
                elem.up();

                // old proprietary mapping, to be removed at some point
                tmp = SDPUtil.parse_ssrc(this.media[i]);
                tmp.xmlns = 'http://estos.de/ns/ssrc';
                tmp.ssrc = ssrc;
                elem.c('ssrc', tmp).up(); // ssrc is part of description
            }

            if (SDPUtil.find_line(this.media[i], 'a=rtcp-mux')) {
                elem.c('rtcp-mux').up();
            }

            // XEP-0293 -- map a=rtcp-fb:*
            this.RtcpFbToJingle(i, elem, '*');

            // XEP-0294
            if (SDPUtil.find_line(this.media[i], 'a=extmap:')) {
                lines = SDPUtil.find_lines(this.media[i], 'a=extmap:');
                for (j = 0; j < lines.length; j++) {
                    tmp = SDPUtil.parse_extmap(lines[j]);
                    elem.c('rtp-hdrext', { xmlns: 'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0',
                                    uri: tmp.uri,
                                    id: tmp.value });
                    if (tmp.hasOwnProperty('direction')) {
                        switch (tmp.direction) {
                        case 'sendonly':
                            elem.attrs({senders: 'responder'});
                            break;
                        case 'recvonly':
                            elem.attrs({senders: 'initiator'});
                            break;
                        case 'sendrecv':
                            elem.attrs({senders: 'both'});
                            break;
                        case 'inactive':
                            elem.attrs({senders: 'none'});
                            break;
                        }
                    }
                    // TODO: handle params
                    elem.up();
                }
            }
            elem.up(); // end of description
        }

        // map ice-ufrag/pwd, dtls fingerprint, candidates
        this.TransportToJingle(i, elem);

        if (SDPUtil.find_line(this.media[i], 'a=sendrecv', this.session)) {
            elem.attrs({senders: 'both'});
        } else if (SDPUtil.find_line(this.media[i], 'a=sendonly', this.session)) {
            elem.attrs({senders: 'initiator'});
        } else if (SDPUtil.find_line(this.media[i], 'a=recvonly', this.session)) {
            elem.attrs({senders: 'responder'});
        } else if (SDPUtil.find_line(this.media[i], 'a=inactive', this.session)) {
            elem.attrs({senders: 'none'});
        }
        if (mline.port == '0') {
            // estos hack to reject an m-line
            elem.attrs({senders: 'rejected'});
        }
        elem.up(); // end of content
    }
    elem.up();
    return elem;
};

SDP.prototype.TransportToJingle = function (mediaindex, elem) {
    var i = mediaindex;
    var tmp;
    var self = this;
    elem.c('transport');

    // XEP-0320
    var fingerprints = SDPUtil.find_lines(this.media[mediaindex], 'a=fingerprint:', this.session);
    fingerprints.forEach(function(line) {
        tmp = SDPUtil.parse_fingerprint(line);
        tmp.xmlns = 'urn:xmpp:tmp:jingle:apps:dtls:0';
        // tmp.xmlns = 'urn:xmpp:jingle:apps:dtls:0'; -- FIXME: update receivers first
        elem.c('fingerprint').t(tmp.fingerprint);
        delete tmp.fingerprint;
        line = SDPUtil.find_line(self.media[mediaindex], 'a=setup:', self.session);
        if (line) {
            tmp.setup = line.substr(8);
        }
        elem.attrs(tmp);
        elem.up(); // end of fingerprint
    });
    tmp = SDPUtil.iceparams(this.media[mediaindex], this.session);
    if (tmp) {
        tmp.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';
        elem.attrs(tmp);
        // XEP-0176
        if (SDPUtil.find_line(this.media[mediaindex], 'a=candidate:', this.session)) { // add any a=candidate lines
            var lines = SDPUtil.find_lines(this.media[mediaindex], 'a=candidate:', this.session);
            lines.forEach(function (line) {
                elem.c('candidate', SDPUtil.candidateToJingle(line)).up();
            });
        }
    }
    elem.up(); // end of transport
}

SDP.prototype.RtcpFbToJingle = function (mediaindex, elem, payloadtype) { // XEP-0293
    var lines = SDPUtil.find_lines(this.media[mediaindex], 'a=rtcp-fb:' + payloadtype);
    lines.forEach(function (line) {
        var tmp = SDPUtil.parse_rtcpfb(line);
        if (tmp.type == 'trr-int') {
            elem.c('rtcp-fb-trr-int', {xmlns: 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0', value: tmp.params[0]});
            elem.up();
        } else {
            elem.c('rtcp-fb', {xmlns: 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0', type: tmp.type});
            if (tmp.params.length > 0) {
                elem.attrs({'subtype': tmp.params[0]});
            }
            elem.up();
        }
    });
};

SDP.prototype.RtcpFbFromJingle = function (elem, payloadtype) { // XEP-0293
    var media = '';
    var tmp = elem.find('>rtcp-fb-trr-int[xmlns="urn:xmpp:jingle:apps:rtp:rtcp-fb:0"]');
    if (tmp.length) {
        media += 'a=rtcp-fb:' + '*' + ' ' + 'trr-int' + ' ';
        if (tmp.attr('value')) {
            media += tmp.attr('value');
        } else {
            media += '0';
        }
        media += '\r\n';
    }
    tmp = elem.find('>rtcp-fb[xmlns="urn:xmpp:jingle:apps:rtp:rtcp-fb:0"]');
    tmp.each(function () {
        media += 'a=rtcp-fb:' + payloadtype + ' ' + $(this).attr('type');
        if ($(this).attr('subtype')) {
            media += ' ' + $(this).attr('subtype');
        }
        media += '\r\n';
    });
    return media;
};

// construct an SDP from a jingle stanza
SDP.prototype.fromJingle = function (jingle) {
    var self = this;
    this.raw = 'v=0\r\n' +
        'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
        's=-\r\n' +
        't=0 0\r\n';
    // http://tools.ietf.org/html/draft-ietf-mmusic-sdp-bundle-negotiation-04#section-8
    if ($(jingle).find('>group[xmlns="urn:xmpp:jingle:apps:grouping:0"]').length) {
        $(jingle).find('>group[xmlns="urn:xmpp:jingle:apps:grouping:0"]').each(function (idx, group) {
            var contents = $(group).find('>content').map(function (idx, content) {
                return content.getAttribute('name');
            }).get();
            if (contents.length > 0) {
                self.raw += 'a=group:' + (group.getAttribute('semantics') || group.getAttribute('type')) + ' ' + contents.join(' ') + '\r\n';
            }
        });
    } else if ($(jingle).find('>group[xmlns="urn:ietf:rfc:5888"]').length) {
        // temporary namespace, not to be used. to be removed soon.
        $(jingle).find('>group[xmlns="urn:ietf:rfc:5888"]').each(function (idx, group) {
            var contents = $(group).find('>content').map(function (idx, content) {
                return content.getAttribute('name');
            }).get();
            if (group.getAttribute('type') !== null && contents.length > 0) {
                self.raw += 'a=group:' + group.getAttribute('type') + ' ' + contents.join(' ') + '\r\n';
            }
        });
    } else {
        // for backward compability, to be removed soon
        // assume all contents are in the same bundle group, can be improved upon later
        var bundle = $(jingle).find('>content').filter(function (idx, content) {
            //elem.c('bundle', {xmlns:'http://estos.de/ns/bundle'});
            return $(content).find('>bundle').length > 0;
        }).map(function (idx, content) {
            return content.getAttribute('name');
        }).get();
        if (bundle.length) {
            this.raw += 'a=group:BUNDLE ' + bundle.join(' ') + '\r\n';
        }
    }

    this.session = this.raw;
    jingle.find('>content').each(function () {
        var m = self.jingle2media($(this));
        self.media.push(m);
    });

    // reconstruct msid-semantic -- apparently not necessary
    /*
    var msid = SDPUtil.parse_ssrc(this.raw);
    if (msid.hasOwnProperty('mslabel')) {
        this.session += "a=msid-semantic: WMS " + msid.mslabel + "\r\n";
    }
    */

    this.raw = this.session + this.media.join('');
};

// translate a jingle content element into an an SDP media part
SDP.prototype.jingle2media = function (content) {
    var media = '',
        desc = content.find('description'),
        ssrc = desc.attr('ssrc'),
        self = this,
        tmp;

    tmp = { media: desc.attr('media') };
    tmp.port = '1';
    if (content.attr('senders') == 'rejected') {
        // estos hack to reject an m-line.
        tmp.port = '0';
    }
    if (content.find('>transport>fingerprint').length || desc.find('encryption').length) {
        tmp.proto = 'RTP/SAVPF';
    } else {
        tmp.proto = 'RTP/AVPF';
    }
    tmp.fmt = desc.find('payload-type').map(function () { return this.getAttribute('id'); }).get();
    media += SDPUtil.build_mline(tmp) + '\r\n';
    media += 'c=IN IP4 0.0.0.0\r\n';
    media += 'a=rtcp:1 IN IP4 0.0.0.0\r\n';
    tmp = content.find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
    if (tmp.length) {
        if (tmp.attr('ufrag')) {
            media += SDPUtil.build_iceufrag(tmp.attr('ufrag')) + '\r\n';
        }
        if (tmp.attr('pwd')) {
            media += SDPUtil.build_icepwd(tmp.attr('pwd')) + '\r\n';
        }
        tmp.find('>fingerprint').each(function () {
            // FIXME: check namespace at some point
            media += 'a=fingerprint:' + this.getAttribute('hash');
            media += ' ' + $(this).text();
            media += '\r\n';
            if (this.getAttribute('setup')) {
                media += 'a=setup:' + this.getAttribute('setup') + '\r\n';
            }
        });
    }
    switch (content.attr('senders')) {
    case 'initiator':
        media += 'a=sendonly\r\n';
        break;
    case 'responder':
        media += 'a=recvonly\r\n';
        break;
    case 'none':
        media += 'a=inactive\r\n';
        break;
    case 'both':
        media += 'a=sendrecv\r\n';
        break;
    }
    media += 'a=mid:' + content.attr('name') + '\r\n';

    // <description><rtcp-mux/></description>
    // see http://code.google.com/p/libjingle/issues/detail?id=309 -- no spec though
    // and http://mail.jabber.org/pipermail/jingle/2011-December/001761.html
    if (desc.find('rtcp-mux').length) {
        media += 'a=rtcp-mux\r\n';
    }

    if (desc.find('encryption').length) {
        desc.find('encryption>crypto').each(function () {
            media += 'a=crypto:' + this.getAttribute('tag');
            media += ' ' + this.getAttribute('crypto-suite');
            media += ' ' + this.getAttribute('key-params');
            if (this.getAttribute('session-params')) {
                media += ' ' + this.getAttribute('session-params');
            }
            media += '\r\n';
        });
    }
    desc.find('payload-type').each(function () {
        media += SDPUtil.build_rtpmap(this) + '\r\n';
        if ($(this).find('>parameter').length) {
            media += 'a=fmtp:' + this.getAttribute('id') + ' ';
            media += $(this).find('parameter').map(function () { return (this.getAttribute('name') ? (this.getAttribute('name') + '=') : '') + this.getAttribute('value'); }).get().join(';');
            media += '\r\n';
        }
        // xep-0293
        media += self.RtcpFbFromJingle($(this), this.getAttribute('id'));
    });

    // xep-0293
    media += self.RtcpFbFromJingle(desc, '*');

    // xep-0294
    tmp = desc.find('>rtp-hdrext[xmlns="urn:xmpp:jingle:apps:rtp:rtp-hdrext:0"]');
    tmp.each(function () {
        media += 'a=extmap:' + this.getAttribute('id') + ' ' + this.getAttribute('uri') + '\r\n';
    });

    content.find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]>candidate').each(function () {
        media += SDPUtil.candidateFromJingle(this);
    });

    tmp = content.find('description>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');
    tmp.each(function () {
        var ssrc = this.getAttribute('ssrc');
        $(this).find('>parameter').each(function () {
            media += 'a=ssrc:' + ssrc + ' ' + this.getAttribute('name');
            if (this.getAttribute('value') && this.getAttribute('value').length)
                media += ':' + this.getAttribute('value');
            media += '\r\n';
        });
    });

    if (tmp.length === 0) {
        // fallback to proprietary mapping of a=ssrc lines
        tmp = content.find('description>ssrc[xmlns="http://estos.de/ns/ssrc"]');
        if (tmp.length) {
            media += 'a=ssrc:' + ssrc + ' cname:' + tmp.attr('cname') + '\r\n';
            media += 'a=ssrc:' + ssrc + ' msid:' + tmp.attr('msid') + '\r\n';
            media += 'a=ssrc:' + ssrc + ' mslabel:' + tmp.attr('mslabel') + '\r\n';
            media += 'a=ssrc:' + ssrc + ' label:' + tmp.attr('label') + '\r\n';
        }
    }
    return media;
};

SDPUtil = {
    iceparams: function (mediadesc, sessiondesc) {
        var data = null;
        if (SDPUtil.find_line(mediadesc, 'a=ice-ufrag:', sessiondesc) &&
            SDPUtil.find_line(mediadesc, 'a=ice-pwd:', sessiondesc)) {
            data = {
                ufrag: SDPUtil.parse_iceufrag(SDPUtil.find_line(mediadesc, 'a=ice-ufrag:', sessiondesc)),
                pwd: SDPUtil.parse_icepwd(SDPUtil.find_line(mediadesc, 'a=ice-pwd:', sessiondesc))
            };
        }
        return data;
    },
    parse_iceufrag: function (line) {
        return line.substring(12);
    },
    build_iceufrag: function (frag) {
        return 'a=ice-ufrag:' + frag;
    },
    parse_icepwd: function (line) {
        return line.substring(10);
    },
    build_icepwd: function (pwd) {
        return 'a=ice-pwd:' + pwd;
    },
    parse_mid: function (line) {
        return line.substring(6);
    },
    parse_mline: function (line) {
        var parts = line.substring(2).split(' '),
        data = {};
        data.media = parts.shift();
        data.port = parts.shift();
        data.proto = parts.shift();
        if (parts[parts.length - 1] === '') { // trailing whitespace
            parts.pop();
        }
        data.fmt = parts;
        return data;
    },
    build_mline: function (mline) {
        return 'm=' + mline.media + ' ' + mline.port + ' ' + mline.proto + ' ' + mline.fmt.join(' ');
    },
    parse_rtpmap: function (line) {
        var parts = line.substring(9).split(' '),
            data = {};
        data.id = parts.shift();
        parts = parts[0].split('/');
        data.name = parts.shift();
        data.clockrate = parts.shift();
        data.channels = parts.length ? parts.shift() : '1';
        return data;
    },
    build_rtpmap: function (el) {
        var line = 'a=rtpmap:' + el.getAttribute('id') + ' ' + el.getAttribute('name') + '/' + el.getAttribute('clockrate');
        if (el.getAttribute('channels') && el.getAttribute('channels') != '1') {
            line += '/' + el.getAttribute('channels');
        }
        return line;
    },
    parse_crypto: function (line) {
        var parts = line.substring(9).split(' '),
        data = {};
        data.tag = parts.shift();
        data['crypto-suite'] = parts.shift();
        data['key-params'] = parts.shift();
        if (parts.length) {
            data['session-params'] = parts.join(' ');
        }
        return data;
    },
    parse_fingerprint: function (line) { // RFC 4572
        var parts = line.substring(14).split(' '),
        data = {};
        data.hash = parts.shift();
        data.fingerprint = parts.shift();
        // TODO assert that fingerprint satisfies 2UHEX *(":" 2UHEX) ?
        return data;
    },
    parse_fmtp: function (line) {
        var parts = line.split(' '),
            i, key, value,
            data = [];
        parts.shift();
        parts = parts.join(' ').split(';');
        for (i = 0; i < parts.length; i++) {
            key = parts[i].split('=')[0];
            while (key.length && key[0] == ' ') {
                key = key.substring(1);
            }
            value = parts[i].split('=')[1];
            if (key && value) {
                data.push({name: key, value: value});
            } else if (key) {
                // rfc 4733 (DTMF) style stuff
                data.push({name: '', value: key});
            }
        }
        return data;
    },
    parse_icecandidate: function (line) {
        var candidate = {},
            elems = line.split(' ');
        candidate.foundation = elems[0].substring(12);
        candidate.component = elems[1];
        candidate.protocol = elems[2].toLowerCase();
        candidate.priority = elems[3];
        candidate.ip = elems[4];
        candidate.port = elems[5];
        // elems[6] => "typ"
        candidate.type = elems[7];
        candidate.generation = 0; // default value, may be overwritten below
        for (var i = 8; i < elems.length; i += 2) {
            switch (elems[i]) {
            case 'raddr':
                candidate['rel-addr'] = elems[i + 1];
                break;
            case 'rport':
                candidate['rel-port'] = elems[i + 1];
                break;
            case 'generation':
                candidate.generation = elems[i + 1];
                break;
            case 'tcptype':
                candidate.tcptype = elems[i + 1];
                break;
            default: // TODO
                console.log('parse_icecandidate not translating "' + elems[i] + '" = "' + elems[i + 1] + '"');
            }
        }
        candidate.network = '1';
        candidate.id = Math.random().toString(36).substr(2, 10); // not applicable to SDP -- FIXME: should be unique, not just random
        return candidate;
    },
    build_icecandidate: function (cand) {
        var line = ['a=candidate:' + cand.foundation, cand.component, cand.protocol, cand.priority, cand.ip, cand.port, 'typ', cand.type].join(' ');
        line += ' ';
        switch (cand.type) {
        case 'srflx':
        case 'prflx':
        case 'relay':
            if (cand.hasOwnAttribute('rel-addr') && cand.hasOwnAttribute('rel-port')) {
                line += 'raddr';
                line += ' ';
                line += cand['rel-addr'];
                line += ' ';
                line += 'rport';
                line += ' ';
                line += cand['rel-port'];
                line += ' ';
            }
            break;
        }
        if (cand.hasOwnAttribute('tcptype')) {
            line += 'tcptype';
            line += ' ';
            line += cand.tcptype;
            line += ' ';
        }
        line += 'generation';
        line += ' ';
        line += cand.hasOwnAttribute('generation') ? cand.generation : '0';
        return line;
    },
    parse_ssrc: function (desc) {
        // proprietary mapping of a=ssrc lines
        // TODO: see "Jingle RTP Source Description" by Juberti and P. Thatcher on google docs
        // and parse according to that
        var lines = desc.split('\r\n'),
            data = {};
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].substring(0, 7) == 'a=ssrc:') {
                var idx = lines[i].indexOf(' ');
                data[lines[i].substr(idx + 1).split(':', 2)[0]] = lines[i].substr(idx + 1).split(':', 2)[1];
            }
        }
        return data;
    },
    parse_rtcpfb: function (line) {
        var parts = line.substr(10).split(' ');
        var data = {};
        data.pt = parts.shift();
        data.type = parts.shift();
        data.params = parts;
        return data;
    },
    parse_extmap: function (line) {
        var parts = line.substr(9).split(' ');
        var data = {};
        data.value = parts.shift();
        if (data.value.indexOf('/') != -1) {
            data.direction = data.value.substr(data.value.indexOf('/') + 1);
            data.value = data.value.substr(0, data.value.indexOf('/'));
        } else {
            data.direction = 'both';
        }
        data.uri = parts.shift();
        data.params = parts;
        return data;
    },
    find_line: function (haystack, needle, sessionpart) {
        var lines = haystack.split('\r\n');
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].substring(0, needle.length) == needle) {
                return lines[i];
            }
        }
        if (!sessionpart) {
            return false;
        }
        // search session part
        lines = sessionpart.split('\r\n');
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].substring(0, needle.length) == needle) {
                return lines[j];
            }
        }
        return false;
    },
    find_lines: function (haystack, needle, sessionpart) {
        var lines = haystack.split('\r\n'),
            needles = [];
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].substring(0, needle.length) == needle)
                needles.push(lines[i]);
        }
        if (needles.length || !sessionpart) {
            return needles;
        }
        // search session part
        lines = sessionpart.split('\r\n');
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].substring(0, needle.length) == needle) {
                needles.push(lines[j]);
            }
        }
        return needles;
    },
    candidateToJingle: function (line) {
        // a=candidate:2979166662 1 udp 2113937151 192.168.2.100 57698 typ host generation 0
        //      <candidate component=... foundation=... generation=... id=... ip=... network=... port=... priority=... protocol=... type=.../>
        if (line.indexOf('candidate:') === 0) {
            line = 'a=' + line;
        } else if (line.substring(0, 12) != 'a=candidate:') {            
			console.log('parseCandidate called with a line that is not a candidate line');
            console.log(line);
            return null;
        }
        if (line.substring(line.length - 2) == '\r\n') // chomp it
            line = line.substring(0, line.length - 2);
        var candidate = {},
            elems = line.split(' '),
            i;
        if (elems[6] != 'typ') {
            console.log('did not find typ in the right place');
            console.log(line);
            return null;
        }
        candidate.foundation = elems[0].substring(12);
        candidate.component = elems[1];
        candidate.protocol = elems[2].toLowerCase();
        candidate.priority = elems[3];
        candidate.ip = elems[4];
        candidate.port = elems[5];
        // elems[6] => "typ"
        candidate.type = elems[7];

        candidate.generation = '0'; // fippo from jitsi-meet: default, may be overwritten below

        for (i = 8; i < elems.length; i += 2) {
            switch (elems[i]) {
            case 'raddr':
                candidate['rel-addr'] = elems[i + 1];
                break;
            case 'rport':
                candidate['rel-port'] = elems[i + 1];
                break;
            case 'generation':
                candidate.generation = elems[i + 1];
                break;
            case 'tcptype':
                candidate.tcptype = elems[i + 1];
                break;
            default: // TODO
                console.log('not translating "' + elems[i] + '" = "' + elems[i + 1] + '"');
            }
        }
        candidate.network = '1';
        candidate.id = Math.random().toString(36).substr(2, 10); // not applicable to SDP -- FIXME: should be unique, not just random
        return candidate;
    },
    candidateFromJingle: function (cand) {
        var line = 'a=candidate:';
        line += cand.getAttribute('foundation');
        line += ' ';
        line += cand.getAttribute('component');
        line += ' ';
        line += cand.getAttribute('protocol'); //.toUpperCase(); // chrome M23 doesn't like this
        line += ' ';
        line += cand.getAttribute('priority');
        line += ' ';
        line += cand.getAttribute('ip');
        line += ' ';
        line += cand.getAttribute('port');
        line += ' ';
        line += 'typ';
        line += ' ' + cand.getAttribute('type');
        line += ' ';
        switch (cand.getAttribute('type')) {
        case 'srflx':
        case 'prflx':
        case 'relay':
            if (cand.getAttribute('rel-addr') && cand.getAttribute('rel-port')) {
                line += 'raddr';
                line += ' ';
                line += cand.getAttribute('rel-addr');
                line += ' ';
                line += 'rport';
                line += ' ';
                line += cand.getAttribute('rel-port');
                line += ' ';
            }
            break;
        }
        line += 'generation';
        line += ' ';
        line += cand.getAttribute('generation') || '0';
        return line + '\r\n';
    }
};
}(jQuery));

/*!
 * Source: build/lib/strophe.jingle/strophe.jingle.adapter.js, license: MIT, url: https://github.com/ESTOS/strophe.jingle */
/* jshint -W117 */
var setupRTC, getUserMediaWithConstraints, TraceablePeerConnection;

(function($){
TraceablePeerConnection = function(ice_config, constraints) {
    var self = this;
    var RTCPeerconnection = navigator.mozGetUserMedia ? mozRTCPeerConnection : webkitRTCPeerConnection;
    this.peerconnection = new RTCPeerconnection(ice_config, constraints);
    this.updateLog = [];
    this.stats = {};
    this.statsinterval = null;
    this.maxstats = 300; // limit to 300 values, i.e. 5 minutes; set to 0 to disable

    // override as desired
    this.trace = function(what, info) {
        //console.warn('WTRACE', what, info);
        self.updateLog.push({
            time: new Date(),
            type: what,
            value: info || ""
        });
    };
    this.onicecandidate = null;
    this.peerconnection.onicecandidate = function (event) {
        self.trace('onicecandidate', JSON.stringify(event.candidate, null, ' '));
        if (self.onicecandidate !== null) {
            self.onicecandidate(event);
        }
    };
    this.onaddstream = null;
    this.peerconnection.onaddstream = function (event) {
        self.trace('onaddstream', event.stream.id);
        if (self.onaddstream !== null) {
            self.onaddstream(event);
        }
    };
    this.onremovestream = null;
    this.peerconnection.onremovestream = function (event) {
        self.trace('onremovestream', event.stream.id);
        if (self.onremovestream !== null) {
            self.onremovestream(event);
        }
    };
    this.onsignalingstatechange = null;
    this.peerconnection.onsignalingstatechange = function (event) {
        self.trace('onsignalingstatechange', self.signalingState);
        if (self.onsignalingstatechange !== null) {
            self.onsignalingstatechange(event);
        }
    };
    this.oniceconnectionstatechange = null;
    this.peerconnection.oniceconnectionstatechange = function (event) {
        self.trace('oniceconnectionstatechange', self.iceConnectionState);
        if (self.oniceconnectionstatechange !== null) {
            self.oniceconnectionstatechange(event);
        }
    };
    this.onnegotiationneeded = null;
    this.peerconnection.onnegotiationneeded = function (event) {
        self.trace('onnegotiationneeded');
        if (self.onnegotiationneeded !== null) {
            self.onnegotiationneeded(event);
        }
    };
    self.ondatachannel = null;
    this.peerconnection.ondatachannel = function (event) {
        self.trace('ondatachannel', event);
        if (self.ondatachannel !== null) {
            self.ondatachannel(event);
        }
    }
    if (!navigator.mozGetUserMedia) {
        this.statsinterval = window.setInterval(function() {
            self.peerconnection.getStats(function(stats) {
                var results = stats.result();
                for (var i = 0; i < results.length; ++i) {
                    //console.log(results[i].type, results[i].id, results[i].names())
                    var now = new Date();
                    results[i].names().forEach(function (name) {
                        var id = results[i].id + '-' + name;
                        if (!self.stats[id]) {
                            self.stats[id] = {
                                startTime: now,
                                endTime: now,
                                values: [],
                                times: []
                            };
                        }
                        self.stats[id].values.push(results[i].stat(name));
                        self.stats[id].times.push(now.getTime());
                        if (self.stats[id].values.length > self.maxstats) {
                            self.stats[id].values.shift();
                            self.stats[id].times.shift();
                        }
                        self.stats[id].endTime = now;
                    });
                }
            });

        }, 1000);
    }
};

dumpSDP = function(description) {
    return 'type: ' + description.type + '\r\n' + description.sdp;
}

if (TraceablePeerConnection.prototype.__defineGetter__ !== undefined) {
    TraceablePeerConnection.prototype.__defineGetter__('signalingState', function() { return this.peerconnection.signalingState; });
    TraceablePeerConnection.prototype.__defineGetter__('iceConnectionState', function() { return this.peerconnection.iceConnectionState; });
    TraceablePeerConnection.prototype.__defineGetter__('localDescription', function() { return this.peerconnection.localDescription; });
    TraceablePeerConnection.prototype.__defineGetter__('remoteDescription', function() { return this.peerconnection.remoteDescription; });
}

TraceablePeerConnection.prototype.addStream = function (stream) {
    this.trace('addStream', stream.id);
    this.peerconnection.addStream(stream);
};

TraceablePeerConnection.prototype.removeStream = function (stream) {
    this.trace('removeStream', stream.id);
    this.peerconnection.removeStream(stream);
};

TraceablePeerConnection.prototype.createDataChannel = function (label, opts) {
    this.trace('createDataChannel', label, opts);
    this.peerconnection.createDataChannel(label, opts);
}

TraceablePeerConnection.prototype.setLocalDescription = function (description, successCallback, failureCallback) {
    var self = this;
    this.trace('setLocalDescription', dumpSDP(description));
    this.peerconnection.setLocalDescription(description, 
        function () {
            self.trace('setLocalDescriptionOnSuccess');
            successCallback();
        },
        function (err) {
            self.trace('setLocalDescriptionOnFailure', err);
            failureCallback(err);
        }
    );
    /*
    if (this.statsinterval === null && this.maxstats > 0) {
        // start gathering stats
    }
    */
};

TraceablePeerConnection.prototype.setRemoteDescription = function (description, successCallback, failureCallback) {
    var self = this;
    this.trace('setRemoteDescription', dumpSDP(description));
    this.peerconnection.setRemoteDescription(description, 
        function () {
            self.trace('setRemoteDescriptionOnSuccess');
            successCallback();
        },
        function (err) {
            self.trace('setRemoteDescriptionOnFailure', err);
            failureCallback(err);
        }
    );
    /*
    if (this.statsinterval === null && this.maxstats > 0) {
        // start gathering stats
    }
    */
};

TraceablePeerConnection.prototype.close = function () {
    this.trace('stop');
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
    this.peerconnection.close();
};

TraceablePeerConnection.prototype.createOffer = function (successCallback, failureCallback, constraints) {
    var self = this;
    this.trace('createOffer', JSON.stringify(constraints, null, ' '));
    this.peerconnection.createOffer(
        function (offer) {
            self.trace('createOfferOnSuccess', dumpSDP(offer));
            successCallback(offer);
        },
        function(err) {
            self.trace('createOfferOnFailure', err);
            failureCallback(err);
        },
        constraints
    );
};

TraceablePeerConnection.prototype.createAnswer = function (successCallback, failureCallback, constraints) {
    var self = this;
    this.trace('createAnswer', JSON.stringify(constraints, null, ' '));
    this.peerconnection.createAnswer(
        function (answer) {
            self.trace('createAnswerOnSuccess', dumpSDP(answer));
            successCallback(answer);
        },
        function(err) {
            self.trace('createAnswerOnFailure', err);
            failureCallback(err);
        },
        constraints
    );
};

TraceablePeerConnection.prototype.addIceCandidate = function (candidate, successCallback, failureCallback) {
    var self = this;
    this.trace('addIceCandidate', JSON.stringify(candidate, null, ' '));
    this.peerconnection.addIceCandidate(candidate);
    /* maybe later
    this.peerconnection.addIceCandidate(candidate, 
        function () {                                
            self.trace('addIceCandidateOnSuccess');
            successCallback();
        },
        function (err) {
            self.trace('addIceCandidateOnFailure', err);
            failureCallback(err);
        }
    );
    */
};

TraceablePeerConnection.prototype.getStats = function(callback, errback) {
    if (navigator.mozGetUserMedia) {
        // ignore for now...
    } else {
        this.peerconnection.getStats(callback);
    }
};

// mozilla chrome compat layer -- very similar to adapter.js
setupRTC = function (){
    var RTC = null;
    if (navigator.mozGetUserMedia) {
        console.log('This appears to be Firefox');
        var version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
        if (version >= 22) {
            RTC = {
                peerconnection: mozRTCPeerConnection,
                browser: 'firefox',
                getUserMedia: navigator.mozGetUserMedia.bind(navigator),
                attachMediaStream: function (element, stream) {
                    element[0].mozSrcObject = stream;
                    element[0].play();
                },
                pc_constraints: {}
            };
            if (!MediaStream.prototype.getVideoTracks)
                MediaStream.prototype.getVideoTracks = function () { return []; };
            if (!MediaStream.prototype.getAudioTracks)
                MediaStream.prototype.getAudioTracks = function () { return []; };
            RTCSessionDescription = mozRTCSessionDescription;
            RTCIceCandidate = mozRTCIceCandidate;
        }
    } else if (navigator.webkitGetUserMedia) {
        console.log('This appears to be Chrome');
        RTC = {
            peerconnection: webkitRTCPeerConnection,
            browser: 'chrome',
            getUserMedia: navigator.webkitGetUserMedia.bind(navigator),
            attachMediaStream: function (element, stream) {
                element.attr('src', webkitURL.createObjectURL(stream));
            },
            // DTLS should now be enabled by default but..
            pc_constraints: {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]} 
        };
        if (navigator.userAgent.indexOf('Android') != -1) {
            RTC.pc_constraints = {}; // disable DTLS on Android
        }
        if (!webkitMediaStream.prototype.getVideoTracks) {
            webkitMediaStream.prototype.getVideoTracks = function () {
                return this.videoTracks;
            };
        }
        if (!webkitMediaStream.prototype.getAudioTracks) {
            webkitMediaStream.prototype.getAudioTracks = function () {
                return this.audioTracks;
            };
        }
    }
    if (RTC === null) {
        try { console.log('Browser does not appear to be WebRTC-capable'); } catch (e) { }
    }
    return RTC;
};

getUserMediaWithConstraints = function(um, resolution, bandwidth, fps) {
    var constraints = {audio: false, video: false};

    if (um.indexOf('video') >= 0) {
        constraints.video = {mandatory: {}};// same behaviour as true
    }
    if (um.indexOf('audio') >= 0) {
        constraints.audio = {};// same behaviour as true
    }
    if (um.indexOf('screen') >= 0) {
        constraints.video = {
            "mandatory": {
                "chromeMediaSource": "screen"
            }
        };
    }

    if (resolution && !constraints.video) {
        constraints.video = {mandatory: {}};// same behaviour as true
    }
    // see https://code.google.com/p/chromium/issues/detail?id=143631#c9 for list of supported resolutions
    switch (resolution) {
    // 16:9 first
    case '1080':
    case 'fullhd':
        constraints.video.mandatory.minWidth = 1920;
        constraints.video.mandatory.minHeight = 1080;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
    case '720':
    case 'hd':
        constraints.video.mandatory.minWidth = 1280;
        constraints.video.mandatory.minHeight = 720;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
    case '360':
        constraints.video.mandatory.minWidth = 640;
        constraints.video.mandatory.minHeight = 360;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
    case '180':
        constraints.video.mandatory.minWidth = 320;
        constraints.video.mandatory.minHeight = 180;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
        // 4:3
    case '960':
        constraints.video.mandatory.minWidth = 960;
        constraints.video.mandatory.minHeight = 720;
        break;
    case '640':
    case 'vga':
        constraints.video.mandatory.minWidth = 640;
        constraints.video.mandatory.minHeight = 480;
        break;
    case '320':
        constraints.video.mandatory.minWidth = 320;
        constraints.video.mandatory.minHeight = 240;
        break;
    default:
        if (navigator.userAgent.indexOf('Android') != -1) {
            constraints.video.mandatory.minWidth = 320;
            constraints.video.mandatory.minHeight = 240;
            constraints.video.mandatory.maxFrameRate = 15;
        }
        break;
    }

    if (bandwidth) { // doesn't work currently, see webrtc issue 1846
        if (!constraints.video) constraints.video = {mandatory: {}};//same behaviour as true
        constraints.video.optional = [{bandwidth: bandwidth}];
    }
    if (fps) { // for some cameras it might be necessary to request 30fps
        // so they choose 30fps mjpg over 10fps yuy2
        if (!constraints.video) constraints.video = {mandatory: {}};// same behaviour as tru;
        constraints.video.mandatory.minFrameRate = fps;
    }
 
    try {
        RTC.getUserMedia(constraints,
                function (stream) {
                    console.log('onUserMediaSuccess');
                    $(document).trigger('mediaready.jingle', [stream]);
                },
                function (error) {
                    console.warn('Failed to get access to local media. Error ', error);
                    $(document).trigger('mediafailure.jingle', [error]);
                });
    } catch (e) {
        console.error('GUM failed: ', e);
        $(document).trigger('mediafailure.jingle');
    }
}
}(jQuery));

/*!
 * Source: build/lib/i18next/release/i18next-latest.min.js, license: MIT, url: http://i18next.com/ */
// i18next, v1.7.4
// Copyright (c)2014 Jan Mühlemann (jamuhl).
// Distributed under MIT license
// http://i18next.com
!function(){function a(a,b){if(!b||"function"==typeof b)return a;for(var c in b)a[c]=b[c];return a}function b(a,c){for(var d in c)d in a?b(a[d],c[d]):a[d]=c[d];return a}function c(a,b,c){var d,e=0,f=a.length,g=void 0===f||"[object Array]"!==Object.prototype.toString.apply(a)||"function"==typeof a;if(c)if(g){for(d in a)if(b.apply(a[d],c)===!1)break}else for(;f>e&&b.apply(a[e++],c)!==!1;);else if(g){for(d in a)if(b.call(a[d],d,a[d])===!1)break}else for(;f>e&&b.call(a[e],e,a[e++])!==!1;);return a}function d(a){return"string"==typeof a?a.replace(/[&<>"'\/]/g,function(a){return O[a]}):a}function e(a){var b=function(a){if(window.XMLHttpRequest)return a(null,new XMLHttpRequest);if(window.ActiveXObject)try{return a(null,new ActiveXObject("Msxml2.XMLHTTP"))}catch(b){return a(null,new ActiveXObject("Microsoft.XMLHTTP"))}return a(new Error)},c=function(a){if("string"==typeof a)return a;var b=[];for(var c in a)a.hasOwnProperty(c)&&b.push(encodeURIComponent(c)+"="+encodeURIComponent(a[c]));return b.join("&")},d=function(a){a=a.replace(/\r\n/g,"\n");for(var b="",c=0;c<a.length;c++){var d=a.charCodeAt(c);128>d?b+=String.fromCharCode(d):d>127&&2048>d?(b+=String.fromCharCode(192|d>>6),b+=String.fromCharCode(128|63&d)):(b+=String.fromCharCode(224|d>>12),b+=String.fromCharCode(128|63&d>>6),b+=String.fromCharCode(128|63&d))}return b},e=function(a){var b="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";a=d(a);var c,e,f,g,h,i,j,k="",l=0;do c=a.charCodeAt(l++),e=a.charCodeAt(l++),f=a.charCodeAt(l++),g=c>>2,h=(3&c)<<4|e>>4,i=(15&e)<<2|f>>6,j=63&f,isNaN(e)?i=j=64:isNaN(f)&&(j=64),k+=b.charAt(g)+b.charAt(h)+b.charAt(i)+b.charAt(j),c=e=f="",g=h=i=j="";while(l<a.length);return k},f=function(){for(var a=arguments[0],b=1;b<arguments.length;b++){var c=arguments[b];for(var d in c)c.hasOwnProperty(d)&&(a[d]=c[d])}return a},g=function(a,d,e,h){"function"==typeof e&&(h=e,e={}),e.cache=e.cache||!1,e.data=e.data||{},e.headers=e.headers||{},e.jsonp=e.jsonp||!1,e.async=void 0===e.async?!0:e.async;var i,j=f({accept:"*/*","content-type":"application/x-www-form-urlencoded;charset=UTF-8"},g.headers,e.headers);if(i="application/json"===j["content-type"]?JSON.stringify(e.data):c(e.data),"GET"===a){var k=[];if(i&&(k.push(i),i=null),e.cache||k.push("_="+(new Date).getTime()),e.jsonp&&(k.push("callback="+e.jsonp),k.push("jsonp="+e.jsonp)),k=k.join("&"),k.length>1&&(d+=d.indexOf("?")>-1?"&"+k:"?"+k),e.jsonp){var l=document.getElementsByTagName("head")[0],m=document.createElement("script");return m.type="text/javascript",m.src=d,l.appendChild(m),void 0}}b(function(b,c){if(b)return h(b);c.open(a,d,e.async);for(var f in j)j.hasOwnProperty(f)&&c.setRequestHeader(f,j[f]);c.onreadystatechange=function(){if(4===c.readyState){var a=c.responseText||"";if(!h)return;h(c.status,{text:function(){return a},json:function(){return JSON.parse(a)}})}},c.send(i)})},h={authBasic:function(a,b){g.headers.Authorization="Basic "+e(a+":"+b)},connect:function(a,b,c){return g("CONNECT",a,b,c)},del:function(a,b,c){return g("DELETE",a,b,c)},get:function(a,b,c){return g("GET",a,b,c)},head:function(a,b,c){return g("HEAD",a,b,c)},headers:function(a){g.headers=a||{}},isAllowed:function(a,b,c){this.options(a,function(a,d){c(-1!==d.text().indexOf(b))})},options:function(a,b,c){return g("OPTIONS",a,b,c)},patch:function(a,b,c){return g("PATCH",a,b,c)},post:function(a,b,c){return g("POST",a,b,c)},put:function(a,b,c){return g("PUT",a,b,c)},trace:function(a,b,c){return g("TRACE",a,b,c)}},i=a.type?a.type.toLowerCase():"get";h[i](a.url,a,function(b,c){200===b||0===b&&c.text()?a.success(c.json(),b,null):a.error(c.text(),b,null)})}function f(a,b){"function"==typeof a&&(b=a,a={}),a=a||{},R.extend(N,a),delete N.fixLng,"string"==typeof N.ns&&(N.ns={namespaces:[N.ns],defaultNs:N.ns}),"string"==typeof N.fallbackNS&&(N.fallbackNS=[N.fallbackNS]),("string"==typeof N.fallbackLng||"boolean"==typeof N.fallbackLng)&&(N.fallbackLng=[N.fallbackLng]),N.interpolationPrefixEscaped=R.regexEscape(N.interpolationPrefix),N.interpolationSuffixEscaped=R.regexEscape(N.interpolationSuffix),N.lng||(N.lng=R.detectLanguage()),J=R.toLanguages(N.lng),D=J[0],R.log("currentLng set to: "+D),N.useCookie&&R.cookie.read(N.cookieName)!==D&&R.cookie.create(N.cookieName,D,N.cookieExpirationTime,N.cookieDomain),N.detectLngFromLocalStorage&&"undefined"!=typeof document&&window.localstorage&&window.localStorage.setItem("i18next_lng",D);var c=x;a.fixLng&&(c=function(a,b){return b=b||{},b.lng=b.lng||c.lng,x(a,b)},c.lng=D),S.setCurrentLng(D),F&&N.setJqueryExt&&q();var d;if(F&&F.Deferred&&(d=F.Deferred()),!N.resStore){var e=R.toLanguages(N.lng);"string"==typeof N.preload&&(N.preload=[N.preload]);for(var f=0,g=N.preload.length;g>f;f++)for(var h=R.toLanguages(N.preload[f]),i=0,j=h.length;j>i;i++)e.indexOf(h[i])<0&&e.push(h[i]);return G.sync.load(e,N,function(a,e){H=e,K=!0,b&&b(c),d&&d.resolve(c)}),d?d.promise():void 0}return H=N.resStore,K=!0,b&&b(c),d&&d.resolve(c),d?d.promise():void 0}function g(a,b){"string"==typeof a&&(a=[a]);for(var c=0,d=a.length;d>c;c++)N.preload.indexOf(a[c])<0&&N.preload.push(a[c]);return f(b)}function h(a,b,c,d){"string"!=typeof b?(c=b,b=N.ns.defaultNs):N.ns.namespaces.indexOf(b)<0&&N.ns.namespaces.push(b),H[a]=H[a]||{},H[a][b]=H[a][b]||{},d?R.deepExtend(H[a][b],c):R.extend(H[a][b],c)}function i(a,b){"string"!=typeof b&&(b=N.ns.defaultNs),H[a]=H[a]||{},H[a][b]={}}function j(a,b,c,d){"string"!=typeof b?(resource=b,b=N.ns.defaultNs):N.ns.namespaces.indexOf(b)<0&&N.ns.namespaces.push(b),H[a]=H[a]||{},H[a][b]=H[a][b]||{};for(var e=c.split(N.keyseparator),f=0,g=H[N.lng][b];e[f];)f==e.length-1?g[e[f]]=d:(null==g[e[f]]&&(g[e[f]]={}),g=g[e[f]]),f++}function k(a,b,c){"string"!=typeof b?(resource=b,b=N.ns.defaultNs):N.ns.namespaces.indexOf(b)<0&&N.ns.namespaces.push(b);for(var d in c)"string"==typeof c[d]&&j(a,b,d,c[d])}function l(a){N.ns.defaultNs=a}function m(a,b){n([a],b)}function n(a,b){var c={dynamicLoad:N.dynamicLoad,resGetPath:N.resGetPath,getAsync:N.getAsync,customLoad:N.customLoad,ns:{namespaces:a,defaultNs:""}},d=R.toLanguages(N.lng);"string"==typeof N.preload&&(N.preload=[N.preload]);for(var e=0,f=N.preload.length;f>e;e++)for(var g=R.toLanguages(N.preload[e]),h=0,i=g.length;i>h;h++)d.indexOf(g[h])<0&&d.push(g[h]);for(var j=[],k=0,l=d.length;l>k;k++){var m=!1,n=H[d[k]];if(n)for(var o=0,p=a.length;p>o;o++)n[a[o]]||(m=!0);else m=!0;m&&j.push(d[k])}j.length?G.sync._fetch(j,c,function(c,d){var e=a.length*j.length;R.each(a,function(a,c){N.ns.namespaces.indexOf(c)<0&&N.ns.namespaces.push(c),R.each(j,function(a,f){H[f]=H[f]||{},H[f][c]=d[f][c],e--,0===e&&b&&(N.useLocalStorage&&G.sync._storeLocal(H),b())})})}):b&&b()}function o(a,b,c){return"function"==typeof b?(c=b,b={}):b||(b={}),b.lng=a,f(b,c)}function p(){return D}function q(){function a(a,b,c){if(0!==b.length){var d="text";if(0===b.indexOf("[")){var e=b.split("]");b=e[1],d=e[0].substr(1,e[0].length-1)}b.indexOf(";")===b.length-1&&(b=b.substr(0,b.length-2));var f;if("html"===d)f=N.defaultValueFromContent?F.extend({defaultValue:a.html()},c):c,a.html(F.t(b,f));else if("text"===d)f=N.defaultValueFromContent?F.extend({defaultValue:a.text()},c):c,a.text(F.t(b,f));else if("prepend"===d)f=N.defaultValueFromContent?F.extend({defaultValue:a.html()},c):c,a.prepend(F.t(b,f));else if("append"===d)f=N.defaultValueFromContent?F.extend({defaultValue:a.html()},c):c,a.append(F.t(b,f));else if(0===d.indexOf("data-")){var g=d.substr("data-".length);f=N.defaultValueFromContent?F.extend({defaultValue:a.data(g)},c):c;var h=F.t(b,f);a.data(g,h),a.attr(d,h)}else f=N.defaultValueFromContent?F.extend({defaultValue:a.attr(d)},c):c,a.attr(d,F.t(b,f))}}function b(b,c){var d=b.attr(N.selectorAttr);if(d||"undefined"==typeof d||d===!1||(d=b.text()||b.val()),d){var e=b,f=b.data("i18n-target");if(f&&(e=b.find(f)||b),c||N.useDataAttrOptions!==!0||(c=b.data("i18n-options")),c=c||{},d.indexOf(";")>=0){var g=d.split(";");F.each(g,function(b,d){""!==d&&a(e,d,c)})}else a(e,d,c);N.useDataAttrOptions===!0&&b.data("i18n-options",c)}}F.t=F.t||x,F.fn.i18n=function(a){return this.each(function(){b(F(this),a);var c=F(this).find("["+N.selectorAttr+"]");c.each(function(){b(F(this),a)})})}}function r(a,b,c,d){if(!a)return a;if(d=d||b,a.indexOf(d.interpolationPrefix||N.interpolationPrefix)<0)return a;var e=d.interpolationPrefix?R.regexEscape(d.interpolationPrefix):N.interpolationPrefixEscaped,f=d.interpolationSuffix?R.regexEscape(d.interpolationSuffix):N.interpolationSuffixEscaped,g="HTML"+f,h=b.replace&&"object"==typeof b.replace?b.replace:b;return R.each(h,function(b,h){var i=c?c+N.keyseparator+b:b;"object"==typeof h&&null!==h?a=r(a,h,i,d):d.escapeInterpolation||N.escapeInterpolation?(a=a.replace(new RegExp([e,i,g].join(""),"g"),R.regexReplacementEscape(h)),a=a.replace(new RegExp([e,i,f].join(""),"g"),R.regexReplacementEscape(R.escape(h)))):a=a.replace(new RegExp([e,i,f].join(""),"g"),R.regexReplacementEscape(h))}),a}function s(a,b){var c=",",d="{",e="}",f=R.extend({},b);for(delete f.postProcess;-1!=a.indexOf(N.reusePrefix)&&(I++,!(I>N.maxRecursion));){var g=a.lastIndexOf(N.reusePrefix),h=a.indexOf(N.reuseSuffix,g)+N.reuseSuffix.length,i=a.substring(g,h),j=i.replace(N.reusePrefix,"").replace(N.reuseSuffix,"");if(g>=h)return R.error("there is an missing closing in following translation value",a),"";if(-1!=j.indexOf(c)){var k=j.indexOf(c);if(-1!=j.indexOf(d,k)&&-1!=j.indexOf(e,k)){var l=j.indexOf(d,k),m=j.indexOf(e,l)+e.length;try{f=R.extend(f,JSON.parse(j.substring(l,m))),j=j.substring(0,k)}catch(n){}}}var o=A(j,f);a=a.replace(i,R.regexReplacementEscape(o))}return a}function t(a){return a.context&&("string"==typeof a.context||"number"==typeof a.context)}function u(a,b){return void 0!==a.count&&"string"!=typeof a.count&&S.needsPlural(b,a.count)}function v(a){return void 0!==a.indefinite_article&&"string"!=typeof a.indefinite_article&&a.indefinite_article}function w(a,b){b=b||{};var c=y(a,b),d=B(a,b);return void 0!==d||d===c}function x(a,b){return b=b||{},K?(I=0,A.apply(null,arguments)):(R.log("i18next not finished initialization. you might have called t function before loading resources finished."),b.defaultValue||"")}function y(a,b){return void 0!==b.defaultValue?b.defaultValue:a}function z(){for(var a=[],b=1;b<arguments.length;b++)a.push(arguments[b]);return{postProcess:"sprintf",sprintf:a}}function A(a,b){if(b&&"object"!=typeof b?"sprintf"===N.shortcutFunction?b=z.apply(null,arguments):"defaultValue"===N.shortcutFunction&&(b={defaultValue:b}):b=b||{},void 0===a||null===a||""===a)return"";"string"==typeof a&&(a=[a]);var c=a[0];if(a.length>1)for(var d=0;d<a.length&&(c=a[d],!w(c,b));d++);var e,f=y(c,b),g=B(c,b),h=b.lng?R.toLanguages(b.lng,b.fallbackLng):J,i=b.ns||N.ns.defaultNs;c.indexOf(N.nsseparator)>-1&&(e=c.split(N.nsseparator),i=e[0],c=e[1]),void 0===g&&N.sendMissing&&"function"==typeof N.missingKeyHandler&&(b.lng?N.missingKeyHandler(h[0],i,c,f,h):N.missingKeyHandler(N.lng,i,c,f,h));var j=b.postProcess||N.postProcess;void 0!==g&&j&&T[j]&&(g=T[j](g,c,b));var k=f;if(f.indexOf(N.nsseparator)>-1&&(e=f.split(N.nsseparator),k=e[1]),k===c&&N.parseMissingKey&&(f=N.parseMissingKey(f)),void 0===g&&(f=r(f,b),f=s(f,b),j&&T[j])){var l=y(c,b);g=T[j](l,c,b)}return void 0!==g?g:f}function B(a,b){b=b||{};var c,d,e=y(a,b),f=J;if(!H)return e;if("cimode"===f[0].toLowerCase())return e;if(b.lng&&(f=R.toLanguages(b.lng,b.fallbackLng),!H[f[0]])){var g=N.getAsync;N.getAsync=!1,G.sync.load(f,N,function(a,b){R.extend(H,b),N.getAsync=g})}var h=b.ns||N.ns.defaultNs;if(a.indexOf(N.nsseparator)>-1){var i=a.split(N.nsseparator);h=i[0],a=i[1]}if(t(b)){c=R.extend({},b),delete c.context,c.defaultValue=N.contextNotFound;var j=h+N.nsseparator+a+"_"+b.context;if(d=x(j,c),d!=N.contextNotFound)return r(d,{context:b.context})}if(u(b,f[0])){c=R.extend({},b),delete c.count,c.defaultValue=N.pluralNotFound;var k=h+N.nsseparator+a+N.pluralSuffix,l=S.get(f[0],b.count);if(l>=0?k=k+"_"+l:1===l&&(k=h+N.nsseparator+a),d=x(k,c),d!=N.pluralNotFound)return r(d,{count:b.count,interpolationPrefix:b.interpolationPrefix,interpolationSuffix:b.interpolationSuffix})}if(v(b)){var m=R.extend({},b);delete m.indefinite_article,m.defaultValue=N.indefiniteNotFound;var n=h+N.nsseparator+a+(b.count&&!u(b,f[0])||!b.count?N.indefiniteSuffix:"");if(d=x(n,m),d!=N.indefiniteNotFound)return d}for(var o,p=a.split(N.keyseparator),q=0,w=f.length;w>q&&void 0===o;q++){for(var z=f[q],C=0,D=H[z]&&H[z][h];p[C];)D=D&&D[p[C]],C++;if(void 0!==D){var E=Object.prototype.toString.apply(D);if("string"==typeof D)D=r(D,b),D=s(D,b);else if("[object Array]"!==E||N.returnObjectTrees||b.returnObjectTrees){if(null===D&&N.fallbackOnNull===!0)D=void 0;else if(null!==D)if(N.returnObjectTrees||b.returnObjectTrees){if("[object Number]"!==E&&"[object Function]"!==E&&"[object RegExp]"!==E){var F="[object Array]"===E?[]:{};R.each(D,function(c){F[c]=A(h+N.nsseparator+a+N.keyseparator+c,b)}),D=F}}else N.objectTreeKeyHandler&&"function"==typeof N.objectTreeKeyHandler?D=N.objectTreeKeyHandler(a,D,z,h,b):(D="key '"+h+":"+a+" ("+z+")' "+"returned an object instead of string.",R.log(D))}else D=D.join("\n"),D=r(D,b),D=s(D,b);"string"==typeof D&&""===D.trim()&&N.fallbackOnEmpty===!0&&(D=void 0),o=D}}if(void 0===o&&!b.isFallbackLookup&&(N.fallbackToDefaultNS===!0||N.fallbackNS&&N.fallbackNS.length>0)){if(b.isFallbackLookup=!0,N.fallbackNS.length){for(var I=0,K=N.fallbackNS.length;K>I;I++)if(o=B(N.fallbackNS[I]+N.nsseparator+a,b)){var L=o.indexOf(N.nsseparator)>-1?o.split(N.nsseparator)[1]:o,M=e.indexOf(N.nsseparator)>-1?e.split(N.nsseparator)[1]:e;if(L!==M)break}}else o=B(a,b);b.isFallbackLookup=!1}return o}function C(){var a,b=[];if("undefined"!=typeof window&&(!function(){for(var a=window.location.search.substring(1),c=a.split("&"),d=0;d<c.length;d++){var e=c[d].indexOf("=");if(e>0){var f=c[d].substring(0,e),g=c[d].substring(e+1);b[f]=g}}}(),b[N.detectLngQS]&&(a=b[N.detectLngQS])),!a&&"undefined"!=typeof document&&N.useCookie){var c=R.cookie.read(N.cookieName);c&&(a=c)}return!a&&"undefined"!=typeof document&&window.localstorage&&N.detectLngFromLocalStorage&&(a=window.localStorage.getItem("i18next_lng")),a||"undefined"==typeof navigator||(a=navigator.language?navigator.language:navigator.userLanguage),a||(a=N.fallbackLng[0]),a}Array.prototype.indexOf||(Array.prototype.indexOf=function(a){"use strict";if(null==this)throw new TypeError;var b=Object(this),c=b.length>>>0;if(0===c)return-1;var d=0;if(arguments.length>0&&(d=Number(arguments[1]),d!=d?d=0:0!=d&&1/0!=d&&d!=-1/0&&(d=(d>0||-1)*Math.floor(Math.abs(d)))),d>=c)return-1;for(var e=d>=0?d:Math.max(c-Math.abs(d),0);c>e;e++)if(e in b&&b[e]===a)return e;return-1}),Array.prototype.lastIndexOf||(Array.prototype.lastIndexOf=function(a){"use strict";if(null==this)throw new TypeError;var b=Object(this),c=b.length>>>0;if(0===c)return-1;var d=c;arguments.length>1&&(d=Number(arguments[1]),d!=d?d=0:0!=d&&d!=1/0&&d!=-(1/0)&&(d=(d>0||-1)*Math.floor(Math.abs(d))));for(var e=d>=0?Math.min(d,c-1):c-Math.abs(d);e>=0;e--)if(e in b&&b[e]===a)return e;return-1}),"function"!=typeof String.prototype.trim&&(String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g,"")});var D,E=this,F=E.jQuery||E.Zepto,G={},H={},I=0,J=[],K=!1,L={};if("undefined"!=typeof module&&module.exports){if(!F)try{F=require("jquery")}catch(M){}F&&(F.i18n=F.i18n||G),module.exports=G}else F&&(F.i18n=F.i18n||G),E.i18n=E.i18n||G;L={load:function(a,b,c){b.useLocalStorage?L._loadLocal(a,b,function(d,e){for(var f=[],g=0,h=a.length;h>g;g++)e[a[g]]||f.push(a[g]);f.length>0?L._fetch(f,b,function(a,b){R.extend(e,b),L._storeLocal(b),c(null,e)}):c(null,e)}):L._fetch(a,b,function(a,b){c(null,b)})},_loadLocal:function(a,b,c){var d={},e=(new Date).getTime();if(window.localStorage){var f=a.length;R.each(a,function(a,g){var h=window.localStorage.getItem("res_"+g);h&&(h=JSON.parse(h),h.i18nStamp&&h.i18nStamp+b.localStorageExpirationTime>e&&(d[g]=h)),f--,0===f&&c(null,d)})}},_storeLocal:function(a){if(window.localStorage)for(var b in a)a[b].i18nStamp=(new Date).getTime(),window.localStorage.setItem("res_"+b,JSON.stringify(a[b]))},_fetch:function(a,b,c){var d=b.ns,e={};if(b.dynamicLoad){var f=function(a,b){c(null,b)};if("function"==typeof b.customLoad)b.customLoad(a,d.namespaces,b,f);else{var g=r(b.resGetPath,{lng:a.join("+"),ns:d.namespaces.join("+")});R.ajax({url:g,success:function(a){R.log("loaded: "+g),f(null,a)},error:function(a,b,c){R.log("failed loading: "+g),f("failed loading resource.json error: "+c)},dataType:"json",async:b.getAsync})}}else{var h,i=d.namespaces.length*a.length;R.each(d.namespaces,function(d,f){R.each(a,function(a,d){var g=function(a,b){a&&(h=h||[],h.push(a)),e[d]=e[d]||{},e[d][f]=b,i--,0===i&&c(h,e)};"function"==typeof b.customLoad?b.customLoad(d,f,b,g):L._fetchOne(d,f,b,g)})})}},_fetchOne:function(a,b,c,d){var e=r(c.resGetPath,{lng:a,ns:b});R.ajax({url:e,success:function(a){R.log("loaded: "+e),d(null,a)},error:function(a,b,c){if(b&&200==b||a&&a.status&&200==a.status)R.error("There is a typo in: "+e);else if(b&&404==b||a&&a.status&&404==a.status)R.log("Does not exist: "+e);else{var f=b?b:a&&a.status?a.status:null;R.log(f+" when loading "+e)}d(c,{})},dataType:"json",async:c.getAsync})},postMissing:function(a,b,c,d,e){var f={};f[c]=d;var g=[];if("fallback"===N.sendMissingTo&&N.fallbackLng[0]!==!1)for(var h=0;h<N.fallbackLng.length;h++)g.push({lng:N.fallbackLng[h],url:r(N.resPostPath,{lng:N.fallbackLng[h],ns:b})});else if("current"===N.sendMissingTo||"fallback"===N.sendMissingTo&&N.fallbackLng[0]===!1)g.push({lng:a,url:r(N.resPostPath,{lng:a,ns:b})});else if("all"===N.sendMissingTo)for(var h=0,i=e.length;i>h;h++)g.push({lng:e[h],url:r(N.resPostPath,{lng:e[h],ns:b})});for(var j=0,k=g.length;k>j;j++){var l=g[j];R.ajax({url:l.url,type:N.sendType,data:f,success:function(){R.log("posted missing key '"+c+"' to: "+l.url);for(var a=c.split("."),e=0,f=H[l.lng][b];a[e];)f=f[a[e]]=e===a.length-1?d:f[a[e]]||{},e++},error:function(){R.log("failed posting missing key '"+c+"' to: "+l.url)},dataType:"json",async:N.postAsync})}}};var N={lng:void 0,load:"all",preload:[],lowerCaseLng:!1,returnObjectTrees:!1,fallbackLng:["dev"],fallbackNS:[],detectLngQS:"setLng",detectLngFromLocalStorage:!1,ns:"translation",fallbackOnNull:!0,fallbackOnEmpty:!1,fallbackToDefaultNS:!1,nsseparator:":",keyseparator:".",selectorAttr:"data-i18n",debug:!1,resGetPath:"locales/__lng__/__ns__.json",resPostPath:"locales/add/__lng__/__ns__",getAsync:!0,postAsync:!0,resStore:void 0,useLocalStorage:!1,localStorageExpirationTime:6048e5,dynamicLoad:!1,sendMissing:!1,sendMissingTo:"fallback",sendType:"POST",interpolationPrefix:"__",interpolationSuffix:"__",reusePrefix:"$t(",reuseSuffix:")",pluralSuffix:"_plural",pluralNotFound:["plural_not_found",Math.random()].join(""),contextNotFound:["context_not_found",Math.random()].join(""),escapeInterpolation:!1,indefiniteSuffix:"_indefinite",indefiniteNotFound:["indefinite_not_found",Math.random()].join(""),setJqueryExt:!0,defaultValueFromContent:!0,useDataAttrOptions:!1,cookieExpirationTime:void 0,useCookie:!0,cookieName:"i18next",cookieDomain:void 0,objectTreeKeyHandler:void 0,postProcess:void 0,parseMissingKey:void 0,missingKeyHandler:L.postMissing,shortcutFunction:"sprintf"},O={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;"},P={create:function(a,b,c,d){var e;if(c){var f=new Date;f.setTime(f.getTime()+1e3*60*c),e="; expires="+f.toGMTString()}else e="";d=d?"domain="+d+";":"",document.cookie=a+"="+b+e+";"+d+"path=/"},read:function(a){for(var b=a+"=",c=document.cookie.split(";"),d=0;d<c.length;d++){for(var e=c[d];" "==e.charAt(0);)e=e.substring(1,e.length);if(0===e.indexOf(b))return e.substring(b.length,e.length)}return null},remove:function(a){this.create(a,"",-1)}},Q={create:function(){},read:function(){return null},remove:function(){}},R={extend:F?F.extend:a,deepExtend:b,each:F?F.each:c,ajax:F?F.ajax:"undefined"!=typeof document?e:function(){},cookie:"undefined"!=typeof document?P:Q,detectLanguage:C,escape:d,log:function(a){N.debug&&"undefined"!=typeof console&&console.log(a)},error:function(a){"undefined"!=typeof console&&console.error(a)},getCountyIndexOfLng:function(a){var b=0;return("nb-NO"===a||"nn-NO"===a)&&(b=1),b},toLanguages:function(a){var b=this.log,c=[],d=N.lngWhitelist||!1,e=function(a){!d||d.indexOf(a)>-1?c.push(a):b("rejecting non-whitelisted language: "+a)};if("string"==typeof a&&a.indexOf("-")>-1){var f=a.split("-");a=N.lowerCaseLng?f[0].toLowerCase()+"-"+f[1].toLowerCase():f[0].toLowerCase()+"-"+f[1].toUpperCase(),"unspecific"!==N.load&&e(a),"current"!==N.load&&e(f[this.getCountyIndexOfLng(a)])}else e(a);for(var g=0;g<N.fallbackLng.length;g++)-1===c.indexOf(N.fallbackLng[g])&&N.fallbackLng[g]&&c.push(N.fallbackLng[g]);return c},regexEscape:function(a){return a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&")},regexReplacementEscape:function(a){return"string"==typeof a?a.replace(/\$/g,"$$$$"):a}};R.applyReplacement=r;var S={rules:{ach:{name:"Acholi",numbers:[1,2],plurals:function(a){return Number(a>1)}},af:{name:"Afrikaans",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ak:{name:"Akan",numbers:[1,2],plurals:function(a){return Number(a>1)}},am:{name:"Amharic",numbers:[1,2],plurals:function(a){return Number(a>1)}},an:{name:"Aragonese",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ar:{name:"Arabic",numbers:[0,1,2,3,11,100],plurals:function(a){return Number(0===a?0:1==a?1:2==a?2:a%100>=3&&10>=a%100?3:a%100>=11?4:5)}},arn:{name:"Mapudungun",numbers:[1,2],plurals:function(a){return Number(a>1)}},ast:{name:"Asturian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ay:{name:"Aymará",numbers:[1],plurals:function(){return 0}},az:{name:"Azerbaijani",numbers:[1,2],plurals:function(a){return Number(1!=a)}},be:{name:"Belarusian",numbers:[1,2,5],plurals:function(a){return Number(1==a%10&&11!=a%100?0:a%10>=2&&4>=a%10&&(10>a%100||a%100>=20)?1:2)}},bg:{name:"Bulgarian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},bn:{name:"Bengali",numbers:[1,2],plurals:function(a){return Number(1!=a)}},bo:{name:"Tibetan",numbers:[1],plurals:function(){return 0}},br:{name:"Breton",numbers:[1,2],plurals:function(a){return Number(a>1)}},bs:{name:"Bosnian",numbers:[1,2,5],plurals:function(a){return Number(1==a%10&&11!=a%100?0:a%10>=2&&4>=a%10&&(10>a%100||a%100>=20)?1:2)}},ca:{name:"Catalan",numbers:[1,2],plurals:function(a){return Number(1!=a)}},cgg:{name:"Chiga",numbers:[1],plurals:function(){return 0}},cs:{name:"Czech",numbers:[1,2,5],plurals:function(a){return Number(1==a?0:a>=2&&4>=a?1:2)}},csb:{name:"Kashubian",numbers:[1,2,5],plurals:function(a){return Number(1==a?0:a%10>=2&&4>=a%10&&(10>a%100||a%100>=20)?1:2)}},cy:{name:"Welsh",numbers:[1,2,3,8],plurals:function(a){return Number(1==a?0:2==a?1:8!=a&&11!=a?2:3)}},da:{name:"Danish",numbers:[1,2],plurals:function(a){return Number(1!=a)}},de:{name:"German",numbers:[1,2],plurals:function(a){return Number(1!=a)}},dz:{name:"Dzongkha",numbers:[1],plurals:function(){return 0}},el:{name:"Greek",numbers:[1,2],plurals:function(a){return Number(1!=a)}},en:{name:"English",numbers:[1,2],plurals:function(a){return Number(1!=a)}},eo:{name:"Esperanto",numbers:[1,2],plurals:function(a){return Number(1!=a)}},es:{name:"Spanish",numbers:[1,2],plurals:function(a){return Number(1!=a)}},es_ar:{name:"Argentinean Spanish",numbers:[1,2],plurals:function(a){return Number(1!=a)}},et:{name:"Estonian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},eu:{name:"Basque",numbers:[1,2],plurals:function(a){return Number(1!=a)}},fa:{name:"Persian",numbers:[1],plurals:function(){return 0}},fi:{name:"Finnish",numbers:[1,2],plurals:function(a){return Number(1!=a)}},fil:{name:"Filipino",numbers:[1,2],plurals:function(a){return Number(a>1)}},fo:{name:"Faroese",numbers:[1,2],plurals:function(a){return Number(1!=a)}},fr:{name:"French",numbers:[1,2],plurals:function(a){return Number(a>=2)}},fur:{name:"Friulian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},fy:{name:"Frisian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ga:{name:"Irish",numbers:[1,2,3,7,11],plurals:function(a){return Number(1==a?0:2==a?1:7>a?2:11>a?3:4)}},gd:{name:"Scottish Gaelic",numbers:[1,2,3,20],plurals:function(a){return Number(1==a||11==a?0:2==a||12==a?1:a>2&&20>a?2:3)}},gl:{name:"Galician",numbers:[1,2],plurals:function(a){return Number(1!=a)}},gu:{name:"Gujarati",numbers:[1,2],plurals:function(a){return Number(1!=a)}},gun:{name:"Gun",numbers:[1,2],plurals:function(a){return Number(a>1)}},ha:{name:"Hausa",numbers:[1,2],plurals:function(a){return Number(1!=a)}},he:{name:"Hebrew",numbers:[1,2],plurals:function(a){return Number(1!=a)}},hi:{name:"Hindi",numbers:[1,2],plurals:function(a){return Number(1!=a)}},hr:{name:"Croatian",numbers:[1,2,5],plurals:function(a){return Number(1==a%10&&11!=a%100?0:a%10>=2&&4>=a%10&&(10>a%100||a%100>=20)?1:2)}},hu:{name:"Hungarian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},hy:{name:"Armenian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ia:{name:"Interlingua",numbers:[1,2],plurals:function(a){return Number(1!=a)}},id:{name:"Indonesian",numbers:[1],plurals:function(){return 0}},is:{name:"Icelandic",numbers:[1,2],plurals:function(a){return Number(1!=a%10||11==a%100)}},it:{name:"Italian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ja:{name:"Japanese",numbers:[1],plurals:function(){return 0}},jbo:{name:"Lojban",numbers:[1],plurals:function(){return 0}},jv:{name:"Javanese",numbers:[0,1],plurals:function(a){return Number(0!==a)}},ka:{name:"Georgian",numbers:[1],plurals:function(){return 0}},kk:{name:"Kazakh",numbers:[1],plurals:function(){return 0}},km:{name:"Khmer",numbers:[1],plurals:function(){return 0}},kn:{name:"Kannada",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ko:{name:"Korean",numbers:[1],plurals:function(){return 0}},ku:{name:"Kurdish",numbers:[1,2],plurals:function(a){return Number(1!=a)}},kw:{name:"Cornish",numbers:[1,2,3,4],plurals:function(a){return Number(1==a?0:2==a?1:3==a?2:3)}},ky:{name:"Kyrgyz",numbers:[1],plurals:function(){return 0}},lb:{name:"Letzeburgesch",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ln:{name:"Lingala",numbers:[1,2],plurals:function(a){return Number(a>1)}},lo:{name:"Lao",numbers:[1],plurals:function(){return 0}},lt:{name:"Lithuanian",numbers:[1,2,10],plurals:function(a){return Number(1==a%10&&11!=a%100?0:a%10>=2&&(10>a%100||a%100>=20)?1:2)}},lv:{name:"Latvian",numbers:[1,2,0],plurals:function(a){return Number(1==a%10&&11!=a%100?0:0!==a?1:2)}},mai:{name:"Maithili",numbers:[1,2],plurals:function(a){return Number(1!=a)}},mfe:{name:"Mauritian Creole",numbers:[1,2],plurals:function(a){return Number(a>1)}},mg:{name:"Malagasy",numbers:[1,2],plurals:function(a){return Number(a>1)}},mi:{name:"Maori",numbers:[1,2],plurals:function(a){return Number(a>1)}},mk:{name:"Macedonian",numbers:[1,2],plurals:function(a){return Number(1==a||1==a%10?0:1)}},ml:{name:"Malayalam",numbers:[1,2],plurals:function(a){return Number(1!=a)}},mn:{name:"Mongolian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},mnk:{name:"Mandinka",numbers:[0,1,2],plurals:function(a){return Number(1==a?1:2)}},mr:{name:"Marathi",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ms:{name:"Malay",numbers:[1],plurals:function(){return 0}},mt:{name:"Maltese",numbers:[1,2,11,20],plurals:function(a){return Number(1==a?0:0===a||a%100>1&&11>a%100?1:a%100>10&&20>a%100?2:3)}},nah:{name:"Nahuatl",numbers:[1,2],plurals:function(a){return Number(1!=a)}},nap:{name:"Neapolitan",numbers:[1,2],plurals:function(a){return Number(1!=a)}},nb:{name:"Norwegian Bokmal",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ne:{name:"Nepali",numbers:[1,2],plurals:function(a){return Number(1!=a)}},nl:{name:"Dutch",numbers:[1,2],plurals:function(a){return Number(1!=a)}},nn:{name:"Norwegian Nynorsk",numbers:[1,2],plurals:function(a){return Number(1!=a)}},no:{name:"Norwegian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},nso:{name:"Northern Sotho",numbers:[1,2],plurals:function(a){return Number(1!=a)}},oc:{name:"Occitan",numbers:[1,2],plurals:function(a){return Number(a>1)}},or:{name:"Oriya",numbers:[2,1],plurals:function(a){return Number(1!=a)}},pa:{name:"Punjabi",numbers:[1,2],plurals:function(a){return Number(1!=a)}},pap:{name:"Papiamento",numbers:[1,2],plurals:function(a){return Number(1!=a)}},pl:{name:"Polish",numbers:[1,2,5],plurals:function(a){return Number(1==a?0:a%10>=2&&4>=a%10&&(10>a%100||a%100>=20)?1:2)}},pms:{name:"Piemontese",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ps:{name:"Pashto",numbers:[1,2],plurals:function(a){return Number(1!=a)}},pt:{name:"Portuguese",numbers:[1,2],plurals:function(a){return Number(1!=a)}},pt_br:{name:"Brazilian Portuguese",numbers:[1,2],plurals:function(a){return Number(1!=a)}},rm:{name:"Romansh",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ro:{name:"Romanian",numbers:[1,2,20],plurals:function(a){return Number(1==a?0:0===a||a%100>0&&20>a%100?1:2)}},ru:{name:"Russian",numbers:[1,2,5],plurals:function(a){return Number(1==a%10&&11!=a%100?0:a%10>=2&&4>=a%10&&(10>a%100||a%100>=20)?1:2)}},sah:{name:"Yakut",numbers:[1],plurals:function(){return 0}},sco:{name:"Scots",numbers:[1,2],plurals:function(a){return Number(1!=a)}},se:{name:"Northern Sami",numbers:[1,2],plurals:function(a){return Number(1!=a)}},si:{name:"Sinhala",numbers:[1,2],plurals:function(a){return Number(1!=a)}},sk:{name:"Slovak",numbers:[1,2,5],plurals:function(a){return Number(1==a?0:a>=2&&4>=a?1:2)}},sl:{name:"Slovenian",numbers:[5,1,2,3],plurals:function(a){return Number(1==a%100?1:2==a%100?2:3==a%100||4==a%100?3:0)}},so:{name:"Somali",numbers:[1,2],plurals:function(a){return Number(1!=a)}},son:{name:"Songhay",numbers:[1,2],plurals:function(a){return Number(1!=a)}},sq:{name:"Albanian",numbers:[1,2],plurals:function(a){return Number(1!=a)}},sr:{name:"Serbian",numbers:[1,2,5],plurals:function(a){return Number(1==a%10&&11!=a%100?0:a%10>=2&&4>=a%10&&(10>a%100||a%100>=20)?1:2)}},su:{name:"Sundanese",numbers:[1],plurals:function(){return 0}},sv:{name:"Swedish",numbers:[1,2],plurals:function(a){return Number(1!=a)}},sw:{name:"Swahili",numbers:[1,2],plurals:function(a){return Number(1!=a)}},ta:{name:"Tamil",numbers:[1,2],plurals:function(a){return Number(1!=a)}},te:{name:"Telugu",numbers:[1,2],plurals:function(a){return Number(1!=a)}},tg:{name:"Tajik",numbers:[1,2],plurals:function(a){return Number(a>1)}},th:{name:"Thai",numbers:[1],plurals:function(){return 0}},ti:{name:"Tigrinya",numbers:[1,2],plurals:function(a){return Number(a>1)}},tk:{name:"Turkmen",numbers:[1,2],plurals:function(a){return Number(1!=a)}},tr:{name:"Turkish",numbers:[1,2],plurals:function(a){return Number(a>1)}},tt:{name:"Tatar",numbers:[1],plurals:function(){return 0}},ug:{name:"Uyghur",numbers:[1],plurals:function(){return 0}},uk:{name:"Ukrainian",numbers:[1,2,5],plurals:function(a){return Number(1==a%10&&11!=a%100?0:a%10>=2&&4>=a%10&&(10>a%100||a%100>=20)?1:2)}},ur:{name:"Urdu",numbers:[1,2],plurals:function(a){return Number(1!=a)}},uz:{name:"Uzbek",numbers:[1,2],plurals:function(a){return Number(a>1)}},vi:{name:"Vietnamese",numbers:[1],plurals:function(){return 0}},wa:{name:"Walloon",numbers:[1,2],plurals:function(a){return Number(a>1)}},wo:{name:"Wolof",numbers:[1],plurals:function(){return 0}},yo:{name:"Yoruba",numbers:[1,2],plurals:function(a){return Number(1!=a)}},zh:{name:"Chinese",numbers:[1],plurals:function(){return 0}}},addRule:function(a,b){S.rules[a]=b},setCurrentLng:function(a){if(!S.currentRule||S.currentRule.lng!==a){var b=a.split("-");S.currentRule={lng:a,rule:S.rules[b[0]]}}},needsPlural:function(a,b){var c,d=a.split("-");return c=S.currentRule&&S.currentRule.lng===a?S.currentRule.rule:S.rules[d[R.getCountyIndexOfLng(a)]],c&&c.numbers.length<=1?!1:1!==this.get(a,b)},get:function(a,b){function c(b,c){var d;if(d=S.currentRule&&S.currentRule.lng===a?S.currentRule.rule:S.rules[b]){var e;e=d.noAbs?d.plurals(c):d.plurals(Math.abs(c));var f=d.numbers[e];return 2===d.numbers.length&&1===d.numbers[0]&&(2===f?f=-1:1===f&&(f=1)),f}return 1===c?"1":"-1"}var d=a.split("-");
return c(d[R.getCountyIndexOfLng(a)],b)}},T={},U=function(a,b){T[a]=b},V=function(){function a(a){return Object.prototype.toString.call(a).slice(8,-1).toLowerCase()}function b(a,b){for(var c=[];b>0;c[--b]=a);return c.join("")}var c=function(){return c.cache.hasOwnProperty(arguments[0])||(c.cache[arguments[0]]=c.parse(arguments[0])),c.format.call(null,c.cache[arguments[0]],arguments)};return c.format=function(c,d){var e,f,g,h,i,j,k,l=1,m=c.length,n="",o=[];for(f=0;m>f;f++)if(n=a(c[f]),"string"===n)o.push(c[f]);else if("array"===n){if(h=c[f],h[2])for(e=d[l],g=0;g<h[2].length;g++){if(!e.hasOwnProperty(h[2][g]))throw V('[sprintf] property "%s" does not exist',h[2][g]);e=e[h[2][g]]}else e=h[1]?d[h[1]]:d[l++];if(/[^s]/.test(h[8])&&"number"!=a(e))throw V("[sprintf] expecting number but found %s",a(e));switch(h[8]){case"b":e=e.toString(2);break;case"c":e=String.fromCharCode(e);break;case"d":e=parseInt(e,10);break;case"e":e=h[7]?e.toExponential(h[7]):e.toExponential();break;case"f":e=h[7]?parseFloat(e).toFixed(h[7]):parseFloat(e);break;case"o":e=e.toString(8);break;case"s":e=(e=String(e))&&h[7]?e.substring(0,h[7]):e;break;case"u":e=Math.abs(e);break;case"x":e=e.toString(16);break;case"X":e=e.toString(16).toUpperCase()}e=/[def]/.test(h[8])&&h[3]&&e>=0?"+"+e:e,j=h[4]?"0"==h[4]?"0":h[4].charAt(1):" ",k=h[6]-String(e).length,i=h[6]?b(j,k):"",o.push(h[5]?e+i:i+e)}return o.join("")},c.cache={},c.parse=function(a){for(var b=a,c=[],d=[],e=0;b;){if(null!==(c=/^[^\x25]+/.exec(b)))d.push(c[0]);else if(null!==(c=/^\x25{2}/.exec(b)))d.push("%");else{if(null===(c=/^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(b)))throw"[sprintf] huh?";if(c[2]){e|=1;var f=[],g=c[2],h=[];if(null===(h=/^([a-z_][a-z_\d]*)/i.exec(g)))throw"[sprintf] huh?";for(f.push(h[1]);""!==(g=g.substring(h[0].length));)if(null!==(h=/^\.([a-z_][a-z_\d]*)/i.exec(g)))f.push(h[1]);else{if(null===(h=/^\[(\d+)\]/.exec(g)))throw"[sprintf] huh?";f.push(h[1])}c[2]=f}else e|=2;if(3===e)throw"[sprintf] mixing positional and named placeholders is not (yet) supported";d.push(c)}b=b.substring(c[0].length)}return d},c}(),W=function(a,b){return b.unshift(a),V.apply(null,b)};U("sprintf",function(a,b,c){return c.sprintf?"[object Array]"===Object.prototype.toString.apply(c.sprintf)?W(a,c.sprintf):"object"==typeof c.sprintf?V(a,c.sprintf):a:a}),G.init=f,G.setLng=o,G.preload=g,G.addResourceBundle=h,G.addResource=j,G.addResources=k,G.removeResourceBundle=i,G.loadNamespace=m,G.loadNamespaces=n,G.setDefaultNamespace=l,G.t=x,G.translate=x,G.exists=w,G.detectLanguage=R.detectLanguage,G.pluralExtensions=S,G.sync=L,G.functions=R,G.lng=p,G.addPostProcessor=U,G.options=N}();
/*!
 * Source: build/lib/translation.json, license: MIT, url: https://webtranslateit.com/en/projects/10365-JSXC */
var I18next = {"de":{"translation":{"Logging_in":"Login läuft…","your_connection_is_unencrypted":"Deine Verbindung ist Unverschlüsselt.","your_connection_is_encrypted":"Deine Verbindung ist verschlüsselt.","your_buddy_closed_the_private_connection":"Dein Kontakt hat die private Verbindung getrennt.","start_private":"Privat starten","close_private":"Privat abbrechen","your_buddy_is_verificated":"Dein Kontakt ist verifiziert.","you_have_only_a_subscription_in_one_way":"Der Kontaktstatus ist einseitig.","authentication_query_sent":"Authentifizierungsanfrage gesendet.","your_message_wasnt_send_please_end_your_private_conversation":"Deine Nachricht wurde nicht gesendet. Bitte beende die private Konversation.","unencrypted_message_received":"Unverschlüsselte Nachricht erhalten.","your_message_wasnt_send_because_you_have_no_valid_subscription":"Deine Nachricht wurde nicht gesandt, da der Kontaktstatus einseitig ist.","not_available":"Nicht verfügbar.","no_connection":"Keine Verbindung.","relogin":"Neu anmelden.","trying_to_start_private_conversation":"Versuche private Konversation zu starten.","Verified":"Verifiziert","Unverified":"Unverifiziert","private_conversation_started":"Private Konversation gestartet.","private_conversation_aborted":"Private Konversation abgebrochen.","your_buddy_closed_the_private_conversation_you_should_do_the_same":"Dein Kontakt hat die private Konversation beendet. Das solltest du auch tun!","conversation_is_now_verified":"Konversation ist jetzt verifiziert","authentication_failed":"Authentifizierung fehlgeschlagen.","your_buddy_is_attempting_to_determine_":"Dein Kontakt versucht herauszufinden ob er wirklich mit dir redet.","to_authenticate_to_your_buddy":"Um dich gegenüber deinem Kontakt zu verifizieren ","enter_the_answer_and_click_answer":"gib die Antwort ein und klick auf Antworten.","enter_the_secret":"gib das Geheimnis ein.","Creating_your_private_key_":"Wir werden jetzt deinen privaten Schlüssel generieren. Das kann einige Zeit in Anspruch nehmen.","Authenticating_a_buddy_helps_":"Einen Kontakt zu authentifizieren hilft sicher zustellen, dass die Person mit der du sprichst auch die ist die sie sagt.","How_do_you_want_to_authenticate_your_buddy":"Wie willst du {{bid_name}} (<b>{{bid_jid}}</b>) authentifizieren?","Select_method":"Wähle...","Manual":"Manual","Question":"Frage","Secret":"Geheimnis","To_verify_the_fingerprint_":"Um den Fingerprint zu verifizieren kontaktiere dein Kontakt über einen anderen Kommunikationsweg. Zum Beispiel per Telefonanruf.","Your_fingerprint":"Dein Fingerprint","Buddy_fingerprint":"Sein/Ihr Fingerprint","Close":"Schließen","Compared":"Verglichen","To_authenticate_using_a_question_":"Um die Authentifizierung per Frage durchzuführen, wähle eine Frage bei welcher nur dein Kontakt die Antwort weiß.","Ask":"Frage","To_authenticate_pick_a_secret_":"Um deinen Kontakt zu authentifizieren, wähle ein Geheimnis welches nur deinem Kontakt und dir bekannt ist.","Compare":"Vergleiche","Fingerprints":"Fingerprints","Authentication":"Authentifizierung","Message":"Nachricht","Add_buddy":"Kontakt hinzufügen","rename_buddy":"Kontakt umbenennen","delete_buddy":"Kontakt löschen","Login":"Anmeldung","Username":"Benutzername","Password":"Passwort","Cancel":"Abbrechen","Connect":"Verbinden","Type_in_the_full_username_":"Gib bitte den vollen Benutzernamen und optional ein Alias an.","Alias":"Alias","Add":"Hinzufügen","Subscription_request":"Kontaktanfrage","You_have_a_request_from":"Du hast eine Anfrage von","Deny":"Ablehnen","Approve":"Bestätigen","Remove_buddy":"Kontakt entfernen","You_are_about_to_remove_":"Du bist gerade dabei {{bid_name}} (<b>{{bid_jid}}</b>) von deiner Kontaktliste zu entfernen. Alle Chats werden geschlossen.","Continue_without_chat":"Weiter ohne Chat","Please_wait":"Bitte warten","Login_failed":"Chat-Anmeldung fehlgeschlagen","Sorry_we_cant_authentikate_":"Der Chatserver hat die Anmeldung abgelehnt. Falsches Passwort?","Retry":"Zurück","clear_history":"Lösche Verlauf","New_message_from":"Neue Nachricht von","Should_we_notify_you_":"Sollen wir dich in Zukunft über eingehende Nachrichten informieren, auch wenn dieser Tab nicht im Vordergrund ist?","Please_accept_":"Bitte klick auf den \"Zulassen\" Button oben.","Hide_offline":"Offline ausblenden","Show_offline":"Offline einblenden","About":"Über","dnd":"Beschäftigt","Mute":"Ton aus","Unmute":"Ton an","Subscription":"Bezug","both":"beidseitig","Status":"Status","online":"online","chat":"chat","away":"abwesend","xa":"länger abwesend","offline":"offline","none":"keine","Unknown_instance_tag":"Unbekannter instance tag.","Not_one_of_our_latest_keys":"Nicht einer unserer letzten Schlüssel.","Received_an_unreadable_encrypted_message":"Eine unlesbare verschlüsselte Nachricht erhalten.","Online":"Online","Chatty":"Gesprächig","Away":"Abwesend","Extended_away":"Länger abwesend","Offline":"Offline","Friendship_request":"Kontaktanfrage","Confirm":"Bestätigen","Dismiss":"Ablehnen","Remove":"Löschen","Online_help":"Online Hilfe","FN":"Name","N":" ","FAMILY":"Familienname","GIVEN":"Vorname","NICKNAME":"Spitzname","URL":"URL","ADR":"Adresse","STREET":"Straße","EXTADD":"Zusätzliche Adresse","LOCALITY":"Ortschaft","REGION":"Region","PCODE":"Postleitzahl","CTRY":"Land","TEL":"Telefon","NUMBER":"Nummer","EMAIL":"E-Mail","USERID":" ","ORG":"Organisation","ORGNAME":"Name","ORGUNIT":"Abteilung","TITLE":"Titel","ROLE":"Rolle","BDAY":"Geburtstag","DESC":"Beschreibung","PHOTO":" ","send_message":"Sende Nachricht","get_info":"Benutzerinformationen","Settings":"Einstellungen","Priority":"Priorität","Save":"Speichern","User_settings":"Benutzereinstellungen","A_fingerprint_":"Ein Fingerabdruck wird dazu benutzt deinen Gesprächspartner zu identifizieren.","Your_roster_is_empty_add_a":"Deine Kontaktliste ist leer, füge einen neuen Kontakt ","new_buddy":"hinzu","is":"ist","Login_options":"Anmeldeoptionen","BOSH_url":"BOSH url","Domain":"Domain","Resource":"Ressource","On_login":"Beim Anmelden","Received_an_unencrypted_message":"Unverschlüsselte Nachricht empfangen","Sorry_your_buddy_doesnt_provide_any_information":"Dein Kontakt stellt leider keine Informationen bereit.","Info_about":"Info über","Authentication_aborted":"Authentifizierung abgebrochen.","Authentication_request_received":"Authentifizierunganfrage empfangen.","Do_you_want_to_display_them":"Möchtest du sie sehen?","Log_in_without_chat":"Anmelden ohne Chat","has_come_online":"ist online gekommen","Unknown_sender":"Unbekannter Sender","You_received_a_message_from_an_unknown_sender":"Du hast eine Nachricht von einem unbekannten Sender erhalten","Please_allow_access_to_microphone_and_camera":"Bitte klick auf den \"Zulassen\" Button oben, um den Zugriff auf Kamera und Mikrofon zu erlauben.","Incoming_call":"Eingehender Anruf","from":"von","Do_you_want_to_accept_the_call_from":"Möchtest Du den Anruf annehmen von","Reject":"Ablehnen","Accept":"Annehmen","hang_up":"Auflegen","snapshot":"Schnappschuss","mute_my_audio":"Mein Ton aus","pause_my_video":"Mein Video pausieren","fullscreen":"Vollbild","Info":"Info","Local_IP":"Lokale IP","Remote_IP":"Remote IP","Local_Fingerprint":"Lokaler Fingerprint","Remote_Fingerprint":"Remote Fingerprint","Video_call_not_possible":"Videoanruf nicht verfügbar. Dein Gesprächspartner unterstützt keine Videotelefonie.","Start_video_call":"Starte Videoanruf"}},"el":{"translation":{"Logging_in":null,"your_connection_is_unencrypted":null,"your_connection_is_encrypted":null,"your_buddy_closed_the_private_connection":null,"start_private":null,"close_private":null,"your_buddy_is_verificated":null,"you_have_only_a_subscription_in_one_way":null,"authentication_query_sent":null,"your_message_wasnt_send_please_end_your_private_conversation":null,"unencrypted_message_received":null,"your_message_wasnt_send_because_you_have_no_valid_subscription":null,"not_available":null,"no_connection":null,"relogin":null,"trying_to_start_private_conversation":null,"Verified":null,"Unverified":null,"private_conversation_started":null,"private_conversation_aborted":null,"your_buddy_closed_the_private_conversation_you_should_do_the_same":null,"conversation_is_now_verified":null,"authentication_failed":null,"your_buddy_is_attempting_to_determine_":null,"to_authenticate_to_your_buddy":null,"enter_the_answer_and_click_answer":null,"enter_the_secret":null,"Creating_your_private_key_":null,"Authenticating_a_buddy_helps_":null,"How_do_you_want_to_authenticate_your_buddy":null,"Select_method":null,"Manual":null,"Question":null,"Secret":null,"To_verify_the_fingerprint_":null,"Your_fingerprint":null,"Buddy_fingerprint":null,"Close":null,"Compared":null,"To_authenticate_using_a_question_":null,"Ask":null,"To_authenticate_pick_a_secret_":null,"Compare":null,"Fingerprints":null,"Authentication":null,"Message":null,"Add_buddy":null,"rename_buddy":null,"delete_buddy":null,"Login":null,"Username":null,"Password":null,"Cancel":null,"Connect":null,"Type_in_the_full_username_":null,"Alias":null,"Add":null,"Subscription_request":null,"You_have_a_request_from":null,"Deny":null,"Approve":null,"Remove_buddy":null,"You_are_about_to_remove_":null,"Continue_without_chat":null,"Please_wait":null,"Login_failed":null,"Sorry_we_cant_authentikate_":null,"Retry":null,"clear_history":null,"New_message_from":null,"Should_we_notify_you_":null,"Please_accept_":null,"Hide_offline":null,"Show_offline":null,"About":null,"dnd":null,"Mute":null,"Unmute":null,"Subscription":null,"both":null,"Status":null,"online":null,"chat":null,"away":null,"xa":null,"offline":null,"none":null,"Unknown_instance_tag":null,"Not_one_of_our_latest_keys":null,"Received_an_unreadable_encrypted_message":null,"Online":null,"Chatty":null,"Away":null,"Extended_away":null,"Offline":null,"Friendship_request":null,"Confirm":null,"Dismiss":null,"Remove":null,"Online_help":null,"FN":null,"N":null,"FAMILY":null,"GIVEN":null,"NICKNAME":null,"URL":null,"ADR":null,"STREET":null,"EXTADD":null,"LOCALITY":null,"REGION":null,"PCODE":null,"CTRY":null,"TEL":null,"NUMBER":null,"EMAIL":null,"USERID":null,"ORG":null,"ORGNAME":null,"ORGUNIT":null,"TITLE":null,"ROLE":null,"BDAY":null,"DESC":null,"PHOTO":null,"send_message":null,"get_info":null,"Settings":null,"Priority":null,"Save":null,"User_settings":null,"A_fingerprint_":null,"Your_roster_is_empty_add_a":null,"new_buddy":null,"is":null,"Login_options":null,"BOSH_url":null,"Domain":null,"Resource":null,"On_login":null,"Received_an_unencrypted_message":null,"Sorry_your_buddy_doesnt_provide_any_information":null,"Info_about":null,"Authentication_aborted":null,"Authentication_request_received":null,"Do_you_want_to_display_them":null,"Log_in_without_chat":null,"has_come_online":null,"Unknown_sender":null,"You_received_a_message_from_an_unknown_sender":null,"Please_allow_access_to_microphone_and_camera":null,"Incoming_call":null,"from":null,"Do_you_want_to_accept_the_call_from":null,"Reject":null,"Accept":null,"hang_up":null,"snapshot":null,"mute_my_audio":null,"pause_my_video":null,"fullscreen":null,"Info":null,"Local_IP":null,"Remote_IP":null,"Local_Fingerprint":null,"Remote_Fingerprint":null,"Video_call_not_possible":null,"Start_video_call":null}},"en":{"translation":{"Logging_in":"Logging in…","your_connection_is_unencrypted":"Your connection is unencrypted.","your_connection_is_encrypted":"Your connection is encrypted.","your_buddy_closed_the_private_connection":"Your buddy closed the private connection.","start_private":"Start private","close_private":"Close private","your_buddy_is_verificated":"Your buddy is verified.","you_have_only_a_subscription_in_one_way":"You only have a one-way subscription.","authentication_query_sent":"Authentication query sent.","your_message_wasnt_send_please_end_your_private_conversation":"Your message was not sent. Please end your private conversation.","unencrypted_message_received":"Unencrypted message received","your_message_wasnt_send_because_you_have_no_valid_subscription":"Your message was not sent because you have no valid subscription.","not_available":"Not available","no_connection":"No connection!","relogin":"relogin","trying_to_start_private_conversation":"Trying to start private conversation!","Verified":"Verified","Unverified":"Unverified","private_conversation_started":"Private conversation started.","private_conversation_aborted":"Private conversation aborted!","your_buddy_closed_the_private_conversation_you_should_do_the_same":"Your buddy closed the private conversation! You should do the same.","conversation_is_now_verified":"Conversation is now verified.","authentication_failed":"Authentication failed.","your_buddy_is_attempting_to_determine_":"You buddy is attempting to determine if he or she is really talking to you.","to_authenticate_to_your_buddy":"To authenticate to your buddy, ","enter_the_answer_and_click_answer":"enter the answer and click Answer.","enter_the_secret":"enter the secret.","Creating_your_private_key_":"Creating your private key; this may take a while.","Authenticating_a_buddy_helps_":"Authenticating a buddy helps ensure that the person you are talking to is really the one he or she claims to be.","How_do_you_want_to_authenticate_your_buddy":"How do you want to authenticate {{bid_name}} (<b>{{bid_jid}}</b>)?","Select_method":"Select method...","Manual":"Manual","Question":"Question","Secret":"Secret","To_verify_the_fingerprint_":"To verify the fingerprint, contact your buddy via some other trustworthy channel, such as the telephone.","Your_fingerprint":"Your fingerprint","Buddy_fingerprint":"Buddy fingerprint","Close":"Close","Compared":"Compared","To_authenticate_using_a_question_":"To authenticate using a question, pick a question whose answer is known only you and your buddy.","Ask":"Ask","To_authenticate_pick_a_secret_":"To authenticate, pick a secret known only to you and your buddy.","Compare":"Compare","Fingerprints":"Fingerprints","Authentication":"Authentication","Message":"Message","Add_buddy":"Add buddy","rename_buddy":"rename buddy","delete_buddy":"delete buddy","Login":"Login","Username":"Username","Password":"Password","Cancel":"Cancel","Connect":"Connect","Type_in_the_full_username_":"Type in the full username and an optional alias.","Alias":"Alias","Add":"Add","Subscription_request":"Subscription request","You_have_a_request_from":"You have a request from","Deny":"Deny","Approve":"Approve","Remove_buddy":"Remove buddy","You_are_about_to_remove_":"You are about to remove {{bid_name}} (<b>{{bid_jid}}</b>) from your buddy list. All related chats will be closed.","Continue_without_chat":"Continue without chat","Please_wait":"Please wait","Login_failed":"Chat login failed","Sorry_we_cant_authentikate_":"Authentication failed with the chat server. Maybe the password is wrong?","Retry":"Back","clear_history":"Clear history","New_message_from":"New message from","Should_we_notify_you_":"Should we notify you about new messages in the future?","Please_accept_":"Please click the \"Allow\" button at the top.","Hide_offline":"Hide offline contacts","Show_offline":"Show offline contacts","About":"About","dnd":"Do Not Disturb","Mute":"Mute","Unmute":"Unmute","Subscription":"Subscription","both":"both","Status":"Status","online":"online","chat":"chat","away":"away","xa":"extended away","offline":"offline","none":"none","Unknown_instance_tag":"Unknown instance tag.","Not_one_of_our_latest_keys":"Not one of our latest keys.","Received_an_unreadable_encrypted_message":"Received an unreadable encrypted message.","Online":"Online","Chatty":"Chatty","Away":"Away","Extended_away":"Extended away","Offline":"Offline","Friendship_request":"Friendship request","Confirm":"Confirm","Dismiss":"Dismiss","Remove":"Remove","Online_help":"Online help","FN":"Full name","N":" ","FAMILY":"Family name","GIVEN":"Given name","NICKNAME":"Nickname","URL":"URL","ADR":"Address","STREET":"Street Address","EXTADD":"Extended Address","LOCALITY":"Locality","REGION":"Region","PCODE":"Postal Code","CTRY":"Country","TEL":"Telephone","NUMBER":"Number","EMAIL":"Email","USERID":" ","ORG":"Organization","ORGNAME":"Name","ORGUNIT":"Unit","TITLE":"Job title","ROLE":"Role","BDAY":"Birthday","DESC":"Description","PHOTO":" ","send_message":"Send message","get_info":"Show information","Settings":"Settings","Priority":"Priority","Save":"Save","User_settings":"User settings","A_fingerprint_":"A fingerprint is used to make sure that the person you are talking to is who he or she is saying.","Your_roster_is_empty_add_a":"Your roster is empty, add a ","new_buddy":"new buddy","is":"is","Login_options":"Login options","BOSH_url":"BOSH URL","Domain":"Domain","Resource":"Resource","On_login":"On login","Received_an_unencrypted_message":"Received an unencrypted message","Sorry_your_buddy_doesnt_provide_any_information":"Sorry, your buddy does not provide any information.","Info_about":"Info about","Authentication_aborted":"Authentication aborted.","Authentication_request_received":"Authentication request received.","Do_you_want_to_display_them":"Do you want to display them?","Log_in_without_chat":"Log in without chat","has_come_online":"has come online","Unknown_sender":"Unknown sender","You_received_a_message_from_an_unknown_sender":"You received a message from an unknown sender","Please_allow_access_to_microphone_and_camera":"Please click the \"Allow\" button at the top, to allow access to microphone and camera.","Incoming_call":"Incoming call","from":"from","Do_you_want_to_accept_the_call_from":"Do you want to accept the call from","Reject":"Reject","Accept":"Accept","hang_up":"hang up","snapshot":"snapshot","mute_my_audio":"mute my audio","pause_my_video":"pause my video","fullscreen":"fullscreen","Info":"Info","Local_IP":"Local IP","Remote_IP":"Remote IP","Local_Fingerprint":"Local fingerprint","Remote_Fingerprint":"Remote fingerprint","Video_call_not_possible":"Video call not possible. Your buddy does not support video calls.","Start_video_call":"Start video call"}},"es":{"translation":{"Logging_in":"Por favor, espere...","your_connection_is_unencrypted":"Su conexión no está cifrada.","your_connection_is_encrypted":"Su conexión está cifrada.","your_buddy_closed_the_private_connection":"Su amigo ha cerrado la conexión privada.","start_private":"Iniciar privado","close_private":"Cerrar privado","your_buddy_is_verificated":"Tu amigo está verificado.","you_have_only_a_subscription_in_one_way":"Sólo tienes una suscripción de un modo.","authentication_query_sent":"Consulta de verificación enviada.","your_message_wasnt_send_please_end_your_private_conversation":"Su mensaje no fue enviado. Por favor, termine su conversación privada.","unencrypted_message_received":"Mensaje no cifrado recibido:","your_message_wasnt_send_because_you_have_no_valid_subscription":"Su mensaje no se ha enviado, porque usted no tiene suscripción válida.","not_available":"No disponible","no_connection":"Sin conexión!","relogin":"iniciar sesión nuevamente","trying_to_start_private_conversation":"Intentando iniciar una conversación privada!","Verified":"Verificado","Unverified":"No verificado","private_conversation_started":"se inició una conversación privada.","private_conversation_aborted":"Conversación privada abortada!","your_buddy_closed_the_private_conversation_you_should_do_the_same":"Su amigo cerró la conversación privada! Usted debería hacer lo mismo.","conversation_is_now_verified":"La conversación es ahora verificada.","authentication_failed":"Fallo la verificación.","your_buddy_is_attempting_to_determine_":"Tu amigo está tratando de determinar si él o ella está realmente hablando con usted.","to_authenticate_to_your_buddy":"Para autenticar a su amigo, ","enter_the_answer_and_click_answer":"introduce la respuesta y haga clic en Contestar.","enter_the_secret":"especifique el secreto.","Creating_your_private_key_":"Ahora vamos a crear su clave privada. Esto puede tomar algún tiempo.","Authenticating_a_buddy_helps_":"Autenticación de un amigo ayuda a garantizar que la persona que está hablando es quien él o ella está diciendo.","How_do_you_want_to_authenticate_your_buddy":"¿Cómo desea autenticar {{bid_name}} (<b>{{bid_jid}}</b>)?","Select_method":"Escoja un método...","Manual":"Manual","Question":"Pregunta","Secret":"Secreto","To_verify_the_fingerprint_":"Para verificar la firma digital, póngase en contacto con su amigo a través de algún otro canal autenticado, como el teléfono.","Your_fingerprint":"Tu firma digital","Buddy_fingerprint":"firma digital de tu amigo","Close":"Cerrar","Compared":"Comparado","To_authenticate_using_a_question_":"Para autenticar mediante una pregunta, elegir una pregunta cuya respuesta se conoce sólo usted y su amigo.","Ask":"Preguntar","To_authenticate_pick_a_secret_":"Para autenticar, elija un secreto conocido sólo por usted y su amigo.","Compare":"Comparar","Fingerprints":"Firmas digitales","Authentication":"Autenticación","Message":"Mensaje","Add_buddy":"Añadir amigo","rename_buddy":"renombrar amigo","delete_buddy":"eliminar amigo","Login":"Iniciar Sesión","Username":"Usuario","Password":"Contraseña","Cancel":"Cancelar","Connect":"Conectar","Type_in_the_full_username_":"Escriba el usuario completo y un alias opcional.","Alias":"Alias","Add":"Añadir","Subscription_request":"Solicitud de suscripción","You_have_a_request_from":"Tienes una petición de","Deny":"Rechazar","Approve":"Aprobar","Remove_buddy":"Eliminar amigo","You_are_about_to_remove_":"Vas a eliminar a {{bid_name}} (<b>{{bid_jid}}</b>) de tu lista de amigos. Todas las conversaciones relacionadas serán cerradas.","Continue_without_chat":"Continuar","Please_wait":"Espere por favor","Login_failed":"Fallo el inicio de sesión","Sorry_we_cant_authentikate_":"Lo sentimos, no podemos autentificarlo en nuestro servidor de chat. ¿Tal vez la contraseña es incorrecta?","Retry":"Reintentar","clear_history":"Borrar el historial","New_message_from":"Nuevo mensaje de","Should_we_notify_you_":"¿Debemos notificarle sobre nuevos mensajes en el futuro?","Please_accept_":"Por favor, haga clic en el botón \"Permitir\" en la parte superior.","Hide_offline":"Ocultar contactos desconectados","Show_offline":"Mostrar contactos desconectados","About":"Acerca de","dnd":"No Molestar","Mute":"Desactivar sonido","Unmute":"Activar sonido","Subscription":"Suscripción","both":"ambos","Status":"Estado","online":"en línea","chat":"chat","away":"ausente","xa":"mas ausente","offline":"desconectado","none":"nadie","Unknown_instance_tag":"Etiqueta de instancia desconocida.","Not_one_of_our_latest_keys":"No de nuestra ultima tecla.","Received_an_unreadable_encrypted_message":"Se recibió un mensaje cifrado ilegible.","Online":"En linea","Chatty":"Hablador","Away":"Ausente","Extended_away":"Mas ausente","Offline":"Desconectado","Friendship_request":"Solicitud de amistad","Confirm":"Confirmar","Dismiss":"Rechazar","Remove":"Eliminar","Online_help":"Ayuda en línea","FN":"Nombre completo ","N":" ","FAMILY":"Apellido","GIVEN":"Nombre","NICKNAME":"Apodar","URL":"URL","ADR":"Dirección","STREET":"Calle","EXTADD":"Extendido dirección","LOCALITY":"Población","REGION":"Región","PCODE":"Código postal","CTRY":"País","TEL":"Teléfono","NUMBER":"Número","EMAIL":"Emilio","USERID":" ","ORG":"Organización","ORGNAME":"Nombre","ORGUNIT":"Departamento","TITLE":"Título","ROLE":"Rol","BDAY":"Cumpleaños","DESC":"Descripción","PHOTO":" ","send_message":"mandar un texto","get_info":"obtener información","Settings":"Ajustes","Priority":"Prioridad","Save":"Guardar","User_settings":"Configuración de usuario","A_fingerprint_":"La huella digital se utiliza para que puedas estar seguro que la persona con la que estas hablando es quien realmente dice ser","Your_roster_is_empty_add_a":"Tu lista de amigos esta vacia","new_buddy":"Nuevo amigo","is":"es","Login_options":"Opciones de login","BOSH_url":"BOSH url","Domain":"Dominio","Resource":"Recurso","On_login":"Iniciar sesión","Received_an_unencrypted_message":"Recibe un mensaje no cifrado","Sorry_your_buddy_doesnt_provide_any_information":"Lo sentimos, su amigo no provee ninguna información.","Info_about":"Info acerca de","Authentication_aborted":"Autenticación abortada","Authentication_request_received":"Pedido de autenticación recibido.","Do_you_want_to_display_them":"¿Quiere mostrarlos?","Log_in_without_chat":"Ingresar sin chat","has_come_online":"se ha conectado","Unknown_sender":"Remitente desconocido","You_received_a_message_from_an_unknown_sender":"Ha recibido un mensaje de un remitente desconocido","Please_allow_access_to_microphone_and_camera":"Por favor, permitir el acceso al micrófono y la cámara.","Incoming_call":"Llamada entrante","from":"de","Do_you_want_to_accept_the_call_from":"Desea aceptar la llamada de","Reject":"Rechazar","Accept":"Aceptar","hang_up":"colgar","snapshot":"instantánea","mute_my_audio":"silenciar mi audio","pause_my_video":"pausar mi vídeo","fullscreen":"pantalla completa","Info":"Info","Local_IP":"IP local","Remote_IP":"IP remota","Local_Fingerprint":"Firma digital local","Remote_Fingerprint":"Firma digital remota","Video_call_not_possible":"Llamada de vídeo no es posible","Start_video_call":"Iniciar llamada de vídeo"}},"fr":{"translation":{"Logging_in":"Connexion...","your_connection_is_unencrypted":"Connexion non chiffrée.","your_connection_is_encrypted":"Connexion chiffrée.","your_buddy_closed_the_private_connection":"Votre ami a fermé la connexion privée.","start_private":"Démarrer une conversation privé","close_private":"Clôturer une conversation privée","your_buddy_is_verificated":"Votre ami est vérifié.","you_have_only_a_subscription_in_one_way":"Vous ne pouvez souscrire qu'une fois.","authentication_query_sent":"Requête d’authentification envoyée.","your_message_wasnt_send_please_end_your_private_conversation":"Votre message n'a pas été envoyé. Veuillez terminer votre conversation privée.","unencrypted_message_received":"Reçu message non chiffré","your_message_wasnt_send_because_you_have_no_valid_subscription":"Votre message n'a pas été envoyé car votre abonnement n'est pas valide.","not_available":"Pas disponible","no_connection":"Pas de connexion !","relogin":"Re-connexion","trying_to_start_private_conversation":"Essai de démarrage d'une conversation privée !","Verified":"Vérifié","Unverified":"Non vérifié","private_conversation_started":"Conversation privé démarrée.","private_conversation_aborted":"Conversation privée interrompue !","your_buddy_closed_the_private_conversation_you_should_do_the_same":"Votre ami a fermé la conversation privée ! Vous devriez faire de même.","conversation_is_now_verified":"La conversation est maintenant vérifiée.","authentication_failed":"L'authentification a échoué.","your_buddy_is_attempting_to_determine_":"Votre ami tente de déterminer si il ou elle parle vraiment à vous.","to_authenticate_to_your_buddy":"Vous authentifier à votre ami, ","enter_the_answer_and_click_answer":"Saisissez une réponse et cliquer sur Répondre.","enter_the_secret":"Entrez le mot secret","Creating_your_private_key_":"Création de votre clé privée; cela peut prendre un moment.","Authenticating_a_buddy_helps_":"L'authentification d'un ami permet de s'assurer que la personne à qui vous parlez est vraiment celui qu'il ou elle prétend être.","How_do_you_want_to_authenticate_your_buddy":"Comment voulez-vous vous authentifier {{bid_name}} (<b>{{bid_jid}}</b>)?","Select_method":"Sélection de la méthode...","Manual":"Manuel","Question":"Question","Secret":"Sécurité","To_verify_the_fingerprint_":"Pour vérifier l'empreinte, contactez votre ami via un autre canal digne de confiance, tel que le téléphone.","Your_fingerprint":"Votre empreinte","Buddy_fingerprint":"Empreinte de l'ami","Close":"Fermer","Compared":"Comparé","To_authenticate_using_a_question_":"Pour s'authentifier à l'aide d'une question, choisissez une question dont la réponse n'est connue que vous et de votre ami.","Ask":"Demander","To_authenticate_pick_a_secret_":"Pour vous authentifier, choisissez un secret connu seulement de vous et de votre ami.","Compare":"Comparer","Fingerprints":"Empreintes","Authentication":"Authentification","Message":"Message","Add_buddy":"Ajouter comme ami","rename_buddy":"Renommer l'ami","delete_buddy":"Supprimer l'ami","Login":"Connexion","Username":"Nom d'utilisateur","Password":"Mot de passe","Cancel":"Annuler","Connect":"Connecter","Type_in_the_full_username_":"Tapez un nom d'utilisateur complet et un alias(optionnel).","Alias":"Alias","Add":"Ajouter","Subscription_request":"Demande d'abonnement","You_have_a_request_from":"Vous avez une requête de ","Deny":"Refuser","Approve":"Approuver","Remove_buddy":"Supprimer l'ami","You_are_about_to_remove_":"Vous allez retirer {{bid_name}} (<b>{{bid_jid}}</b>) de votre liste d'amis. Toutes les fenêtres de chat en lien avec celui-ci seront fermées.","Continue_without_chat":"Continuer sans tchat","Please_wait":"Merci de patienter","Login_failed":"Authentification échouée","Sorry_we_cant_authentikate_":"La connexion avec le serveur de tchat a échoué. Vérifiez le mot de passe.","Retry":"Retour","clear_history":"Effacer l’historique","New_message_from":"Nouveau message de","Should_we_notify_you_":"Dans le futur, devrons-nous vous notifier les nouveaux messages ?","Please_accept_":"Merci de cliquer sur le bouton \"autoriser\" en haut de page","Hide_offline":"Masquer les contacts non connectés","Show_offline":"Afficher les contacts non connectés","About":"À propos","dnd":"Ne pas déranger","Mute":"Muet","Unmute":"Son actif","Subscription":"Abonnement","both":"Les deux","Status":"Status","online":"En ligne","chat":"tchat","away":"Absent","xa":"Options étendues","offline":"Hors ligne","none":"Aucun","Unknown_instance_tag":"Tag inconnu","Not_one_of_our_latest_keys":"Ce n'est pas l'une des dernières touches","Received_an_unreadable_encrypted_message":"Message chiffré non lisible","Online":"En ligne","Chatty":"tchatty","Away":"Absent","Extended_away":"Options étendues","Offline":"Hors ligne","Friendship_request":"Demande d'amitié","Confirm":"Valider","Dismiss":"Rejeter","Remove":"Supprimer","Online_help":"Aide en ligne","FN":"Nom","N":" N ","FAMILY":"Nom de famille","GIVEN":"prénom","NICKNAME":"Surnom","URL":"URL","ADR":"Adresse","STREET":"Rue","EXTADD":"Adresse (suite)","LOCALITY":"Localité","REGION":"Région","PCODE":"Code Postal","CTRY":"Pays","TEL":"Téléphone","NUMBER":"Numéro","EMAIL":"Courriel","USERID":" USERID ","ORG":"Organisation","ORGNAME":"Nom","ORGUNIT":"Unité","TITLE":"Qualité:","ROLE":"Rôle","BDAY":"Date de naissance","DESC":"Description","PHOTO":"Photo","send_message":"Envoyer le message","get_info":"Montrer les informations","Settings":"Réglages","Priority":"Priorité","Save":"Enregistrer","User_settings":"Paramètres utilisateur","A_fingerprint_":"Une empreinte est utilisée pour s'assurer de l'identité de la personne à qui vous parlez","Your_roster_is_empty_add_a":"Votre liste est vide, ajouter ","new_buddy":"Nouvel ami","is":"est","Login_options":"Options d'identification","BOSH_url":"URL BOSH","Domain":"Domaine","Resource":"Ressource","On_login":"Après authentification","Received_an_unencrypted_message":"Reçu un message non chiffré","Sorry_your_buddy_doesnt_provide_any_information":"Désolé, votre ami n'a pas fourni d'informations","Info_about":"A propos de","Authentication_aborted":"Authentification interrompue.","Authentication_request_received":"Requête d'authentification reçue.","Do_you_want_to_display_them":"Voulez-vous les afficher ?","Log_in_without_chat":"S'identifier sans tchat","has_come_online":"vient d'arriver","Unknown_sender":"Expéditeur inconnu","You_received_a_message_from_an_unknown_sender":"Vous avez reçu un message d'un expéditeur inconnu","Please_allow_access_to_microphone_and_camera":"Veuillez cliquez sur le bouton \"Autoriser\" en haut, pour permettre l'accès au micro et à la caméra.","Incoming_call":"Appel entrant","from":"de","Do_you_want_to_accept_the_call_from":"Voulez-vous accepter l'appel de","Reject":"Rejeté","Accept":"Accepté","hang_up":"Décrochez","snapshot":"Capture d’écran","mute_my_audio":"Couper l'audio","pause_my_video":"Mettre ma vidéo en pause","fullscreen":"Plein écran","Info":"Info","Local_IP":"IP locale","Remote_IP":"IP distante","Local_Fingerprint":"Empreinte locale","Remote_Fingerprint":"Empreinte distante","Video_call_not_possible":"L'appel vidéo n'est possible. Votre ami ne supporte pas les appels vidéo.","Start_video_call":"Démarrer l'appel vidéo"}},"nds":{"translation":{"Logging_in":null,"your_connection_is_unencrypted":null,"your_connection_is_encrypted":null,"your_buddy_closed_the_private_connection":null,"start_private":null,"close_private":null,"your_buddy_is_verificated":null,"you_have_only_a_subscription_in_one_way":null,"authentication_query_sent":null,"your_message_wasnt_send_please_end_your_private_conversation":null,"unencrypted_message_received":null,"your_message_wasnt_send_because_you_have_no_valid_subscription":null,"not_available":null,"no_connection":null,"relogin":null,"trying_to_start_private_conversation":null,"Verified":null,"Unverified":null,"private_conversation_started":null,"private_conversation_aborted":null,"your_buddy_closed_the_private_conversation_you_should_do_the_same":null,"conversation_is_now_verified":null,"authentication_failed":null,"your_buddy_is_attempting_to_determine_":null,"to_authenticate_to_your_buddy":null,"enter_the_answer_and_click_answer":null,"enter_the_secret":null,"Creating_your_private_key_":null,"Authenticating_a_buddy_helps_":null,"How_do_you_want_to_authenticate_your_buddy":null,"Select_method":null,"Manual":null,"Question":null,"Secret":null,"To_verify_the_fingerprint_":null,"Your_fingerprint":null,"Buddy_fingerprint":null,"Close":null,"Compared":null,"To_authenticate_using_a_question_":null,"Ask":null,"To_authenticate_pick_a_secret_":null,"Compare":null,"Fingerprints":null,"Authentication":null,"Message":null,"Add_buddy":null,"rename_buddy":null,"delete_buddy":null,"Login":null,"Username":null,"Password":null,"Cancel":null,"Connect":null,"Type_in_the_full_username_":null,"Alias":null,"Add":null,"Subscription_request":null,"You_have_a_request_from":null,"Deny":null,"Approve":null,"Remove_buddy":null,"You_are_about_to_remove_":null,"Continue_without_chat":null,"Please_wait":null,"Login_failed":null,"Sorry_we_cant_authentikate_":null,"Retry":null,"clear_history":null,"New_message_from":null,"Should_we_notify_you_":null,"Please_accept_":null,"Hide_offline":null,"Show_offline":null,"About":null,"dnd":null,"Mute":null,"Unmute":null,"Subscription":null,"both":null,"Status":null,"online":null,"chat":null,"away":null,"xa":null,"offline":null,"none":null,"Unknown_instance_tag":null,"Not_one_of_our_latest_keys":null,"Received_an_unreadable_encrypted_message":null,"Online":null,"Chatty":null,"Away":null,"Extended_away":null,"Offline":null,"Friendship_request":null,"Confirm":null,"Dismiss":null,"Remove":null,"Online_help":null,"FN":null,"N":null,"FAMILY":null,"GIVEN":null,"NICKNAME":null,"URL":null,"ADR":null,"STREET":null,"EXTADD":null,"LOCALITY":null,"REGION":null,"PCODE":null,"CTRY":null,"TEL":null,"NUMBER":null,"EMAIL":null,"USERID":null,"ORG":null,"ORGNAME":null,"ORGUNIT":null,"TITLE":null,"ROLE":null,"BDAY":null,"DESC":null,"PHOTO":null,"send_message":null,"get_info":null,"Settings":null,"Priority":null,"Save":null,"User_settings":null,"A_fingerprint_":null,"Your_roster_is_empty_add_a":null,"new_buddy":null,"is":null,"Login_options":null,"BOSH_url":null,"Domain":null,"Resource":null,"On_login":null,"Received_an_unencrypted_message":null,"Sorry_your_buddy_doesnt_provide_any_information":null,"Info_about":null,"Authentication_aborted":null,"Authentication_request_received":null,"Do_you_want_to_display_them":null,"Log_in_without_chat":null,"has_come_online":null,"Unknown_sender":null,"You_received_a_message_from_an_unknown_sender":null,"Please_allow_access_to_microphone_and_camera":null,"Incoming_call":null,"from":null,"Do_you_want_to_accept_the_call_from":null,"Reject":null,"Accept":null,"hang_up":null,"snapshot":null,"mute_my_audio":null,"pause_my_video":null,"fullscreen":null,"Info":null,"Local_IP":null,"Remote_IP":null,"Local_Fingerprint":null,"Remote_Fingerprint":null,"Video_call_not_possible":null,"Start_video_call":null}},"pt-BR":{"translation":{"Logging_in":"Entrando...","your_connection_is_unencrypted":"Sua conexão não é encriptada","your_connection_is_encrypted":"Sua conexão é encriptada","your_buddy_closed_the_private_connection":"Seu contato fechou a conexão privada","start_private":"Iniciar conversa privada","close_private":"Fechar conversa privada","your_buddy_is_verificated":"Seu contato está verificado","you_have_only_a_subscription_in_one_way":"Você só tem a inscrição one-way","authentication_query_sent":"Pergunta de autenticação enviada","your_message_wasnt_send_please_end_your_private_conversation":"Sua mensagem não foi enviada. Por favor finalize sua conversa privada","unencrypted_message_received":"Mensagem não encriptada recebida","your_message_wasnt_send_because_you_have_no_valid_subscription":"Sua mensagem não foi enviada porque sua inscrição não é válida","not_available":"Indisponível","no_connection":"Sem conexão!","relogin":"reentrar","trying_to_start_private_conversation":"Tentando iniciar conversa privada","Verified":"Verificado","Unverified":"Não verificado","private_conversation_started":"Conversa privada iniciada.","private_conversation_aborted":"Conversa privada abortada!","your_buddy_closed_the_private_conversation_you_should_do_the_same":"Seu contato encerrou a conversa privada! Você deveria fazer o mesmo.","conversation_is_now_verified":"Conversa verificada.","authentication_failed":"Autenticação falhou.","your_buddy_is_attempting_to_determine_":"Seu contato está tentando determinar se ele realmente está falando contigo.","to_authenticate_to_your_buddy":"Para autenticar seu contato, ","enter_the_answer_and_click_answer":"entre com a resposta e clique em Responder.","enter_the_secret":"escreva a senha.","Creating_your_private_key_":"Criando sua chave privada: isso pode demorar um pouco.","Authenticating_a_buddy_helps_":"Autenticar seu contato ajuda a garantir que a pessoa com a qual você está falando é realmente a pessoa que ela alega ser.","How_do_you_want_to_authenticate_your_buddy":"Como você gostaria de se autenticar {{bid_name}} (<b>{{bid_jid}}</b>)?","Select_method":"Selecione o método...","Manual":"Manual","Question":"Pergunta","Secret":"Senha","To_verify_the_fingerprint_":"Para verificar o fingerprint, entre em contato com seu contato usando outro meio, de preferência seguro, como o telefone.","Your_fingerprint":"Seu fingerprint","Buddy_fingerprint":"Fingerprint do contato","Close":"Fechar","Compared":"Comparado","To_authenticate_using_a_question_":"Para autenticar seu contato faça uma pergunta, mas escolha que só ele saiba a resposta.","Ask":"Pergunta","To_authenticate_pick_a_secret_":"Para autenticar, escolha um segredo que somente você e seu contato saibam.","Compare":"Compare","Fingerprints":"Fingerprints","Authentication":"Autenticação","Message":"Mensagem","Add_buddy":"Adicionar contato","rename_buddy":"renomear contato","delete_buddy":"remover contato","Login":"Entrar","Username":"Usuário","Password":"Senha","Cancel":"Cancelar","Connect":"Conectar","Type_in_the_full_username_":"Digite seu nome completo e um apelido opcional.","Alias":"Apelido","Add":"Adicionar","Subscription_request":"Pedido de inscrição","You_have_a_request_from":"Você tem um pedido de","Deny":"Negar","Approve":"Aprovar","Remove_buddy":"Remover contato","You_are_about_to_remove_":"Você está prestes a remover {{bid_name}} (<b>{{bid_jid}}</b>) de sua lista de contatos. Todas as conversas serão fechadas.","Continue_without_chat":"Continue sem converar","Please_wait":"Por favor aguarde","Login_failed":"Autenticação da conversa falhou","Sorry_we_cant_authentikate_":"A autenticação com o servidor falhou. Talvez seja a senha errada?","Retry":"Voltar","clear_history":"Limpar histórico","New_message_from":"Nova mensagem de","Should_we_notify_you_":"Devemos continuar notificando sobre novas mensagens no futuro?","Please_accept_":"Por favor clique no botão \"Permitir\" na parte superior.","Hide_offline":"Esconder contatos desconectados","Show_offline":"Mostrar contatos desconectados","About":"Sobre","dnd":"Não perturbe","Mute":"Mudo","Unmute":"Ligar","Subscription":"Inscrição","both":"ambos","Status":"Status","online":"online","chat":"conversa","away":"ausente","xa":"ausente por mais tempo","offline":"desativado","none":"nenhum","Unknown_instance_tag":"Marcação desconhecida da instância","Not_one_of_our_latest_keys":"Nenhuma de nossas ultimas chaves.","Received_an_unreadable_encrypted_message":"Mensagem encriptada ilegível foi recebida.","Online":"Online","Chatty":"Tagarela","Away":"Ausente","Extended_away":"Ausente por mais tempo","Offline":"Desativado","Friendship_request":"Pedido de amizade","Confirm":"Confirmar","Dismiss":"Ignorar","Remove":"Remover","Online_help":"Ajuda online","FN":"Nome completo","N":"  ","FAMILY":"Sobrenome","GIVEN":"Nome","NICKNAME":"Apelido","URL":"URL","ADR":"Endereço","STREET":"Rua, Av, etc","EXTADD":"Complemento","LOCALITY":"Localidade","REGION":"Região","PCODE":"CEP","CTRY":"País","TEL":"Telefone","NUMBER":"Número","EMAIL":"Email","USERID":"  ","ORG":"Empresa","ORGNAME":"Nome","ORGUNIT":"Unidade","TITLE":"Cargo","ROLE":"Rol","BDAY":"Data de nascimento","DESC":"Descrição","PHOTO":"  ","send_message":"Enviar mensagem","get_info":"Exibir informações","Settings":"Configurações","Priority":"Prioridade","Save":"Salvar","User_settings":"Configurações do usuário","A_fingerprint_":"O fingerprint é usado para certificar que a pessoa com a qual se está falando é que ela diz ser.","Your_roster_is_empty_add_a":"Sua lista está vazia, adicione um ","new_buddy":"novo contato","is":"é","Login_options":"Opções de login","BOSH_url":"BOSH URL","Domain":"Domínio","Resource":"Recurso","On_login":"Ao autenticar","Received_an_unencrypted_message":"Mensagem não encriptada recebida","Sorry_your_buddy_doesnt_provide_any_information":"Desculpe, seu contato não forneceu nenhuma informação","Info_about":"Informações sobre","Authentication_aborted":"Autenticação encerrada.","Authentication_request_received":"Pedido de autenticação recebido","Do_you_want_to_display_them":"Você quer mostrá-los?","Log_in_without_chat":"Entrar sem conversar","has_come_online":"ficou online","Unknown_sender":"Emissor desconhecido","You_received_a_message_from_an_unknown_sender":"Você recebeu uma mensagem de um emissor desconhecido","Please_allow_access_to_microphone_and_camera":"Por favor clique no botão \"Permitir\" no topo, para conceder acesso ao seu microfone e câmera.","Incoming_call":"Recebendo chamada","from":"de","Do_you_want_to_accept_the_call_from":"Você aceita a chamada de","Reject":"Negar","Accept":"Aceitar","hang_up":"desligar","snapshot":"registrar imagem","mute_my_audio":"mudo","pause_my_video":"pausar vídeo","fullscreen":"tela cheia","Info":"Informações","Local_IP":"IP local","Remote_IP":"IP remoto","Local_Fingerprint":"Fingerprint local","Remote_Fingerprint":"Fingerprint remoto","Video_call_not_possible":"Chamada de vídeo impossível. Seu contato não suporta chamadas desse tipo.","Start_video_call":"Iniciar chamada de vídeo"}}};