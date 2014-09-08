;(function () {
  "use strict";

  var root = this

  var HLP = {}, CryptoJS, BigInt
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HLP = {}
    CryptoJS = require('../vendor/crypto.js')
    BigInt = require('../vendor/bigint.js')
  } else {
    if (root.OTR) root.OTR.HLP = HLP
    if (root.DSA) root.DSA.HLP = HLP
    CryptoJS = root.CryptoJS
    BigInt = root.BigInt
  }

  // data types (byte lengths)
  var DTS = {
      BYTE  : 1
    , SHORT : 2
    , INT   : 4
    , CTR   : 8
    , MAC   : 20
    , SIG   : 40
  }

  // otr message wrapper begin and end
  var WRAPPER_BEGIN = "?OTR"
    , WRAPPER_END   = "."

  var TWO = BigInt.str2bigInt('2', 10)

  HLP.debug = function (msg) {
    // used as HLP.debug.call(ctx, msg)
    if ( this.debug &&
         typeof this.debug !== 'function' &&
         typeof console !== 'undefined'
    ) console.log(msg)
  }

  HLP.extend = function (child, parent) {
    for (var key in parent) {
      if (Object.hasOwnProperty.call(parent, key))
        child[key] = parent[key]
    }
    function Ctor() { this.constructor = child }
    Ctor.prototype = parent.prototype
    child.prototype = new Ctor()
    child.__super__ = parent.prototype
  }

  // assumes 32-bit
  function intCompare(x, y) {
    var z = ~(x ^ y)
    z &= z >> 16
    z &= z >> 8
    z &= z >> 4
    z &= z >> 2
    z &= z >> 1
    return z & 1
  }

  // constant-time string comparison
  HLP.compare = function (str1, str2) {
    if (str1.length !== str2.length)
      return false
    var i = 0, result = 0
    for (; i < str1.length; i++)
      result |= str1[i].charCodeAt(0) ^ str2[i].charCodeAt(0)
    return intCompare(result, 0)
  }

  HLP.randomExponent = function () {
    return BigInt.randBigInt(1536)
  }

  HLP.smpHash = function (version, fmpi, smpi) {
    var sha256 = CryptoJS.algo.SHA256.create()
    sha256.update(CryptoJS.enc.Latin1.parse(HLP.packBytes(version, DTS.BYTE)))
    sha256.update(CryptoJS.enc.Latin1.parse(HLP.packMPI(fmpi)))
    if (smpi) sha256.update(CryptoJS.enc.Latin1.parse(HLP.packMPI(smpi)))
    var hash = sha256.finalize()
    return HLP.bits2bigInt(hash.toString(CryptoJS.enc.Latin1))
  }

  HLP.makeMac = function (aesctr, m) {
    var pass = CryptoJS.enc.Latin1.parse(m)
    var mac = CryptoJS.HmacSHA256(CryptoJS.enc.Latin1.parse(aesctr), pass)
    return HLP.mask(mac.toString(CryptoJS.enc.Latin1), 0, 160)
  }

  HLP.make1Mac = function (aesctr, m) {
    var pass = CryptoJS.enc.Latin1.parse(m)
    var mac = CryptoJS.HmacSHA1(CryptoJS.enc.Latin1.parse(aesctr), pass)
    return mac.toString(CryptoJS.enc.Latin1)
  }

  HLP.encryptAes = function (msg, c, iv) {
    var opts = {
        mode: CryptoJS.mode.CTR
      , iv: CryptoJS.enc.Latin1.parse(iv)
      , padding: CryptoJS.pad.NoPadding
    }
    var aesctr = CryptoJS.AES.encrypt(
        msg
      , CryptoJS.enc.Latin1.parse(c)
      , opts
    )
    var aesctr_decoded = CryptoJS.enc.Base64.parse(aesctr.toString())
    return CryptoJS.enc.Latin1.stringify(aesctr_decoded)
  }

  HLP.decryptAes = function (msg, c, iv) {
    msg = CryptoJS.enc.Latin1.parse(msg)
    var opts = {
        mode: CryptoJS.mode.CTR
      , iv: CryptoJS.enc.Latin1.parse(iv)
      , padding: CryptoJS.pad.NoPadding
    }
    return CryptoJS.AES.decrypt(
        CryptoJS.enc.Base64.stringify(msg)
      , CryptoJS.enc.Latin1.parse(c)
      , opts
    )
  }

  HLP.multPowMod = function (a, b, c, d, e) {
    return BigInt.multMod(BigInt.powMod(a, b, e), BigInt.powMod(c, d, e), e)
  }

  HLP.ZKP = function (v, c, d, e) {
    return BigInt.equals(c, HLP.smpHash(v, d, e))
  }

  // greater than, or equal
  HLP.GTOE = function (a, b) {
    return (BigInt.equals(a, b) || BigInt.greater(a, b))
  }

  HLP.between = function (x, a, b) {
    return (BigInt.greater(x, a) && BigInt.greater(b, x))
  }

  HLP.checkGroup = function (g, N_MINUS_2) {
    return HLP.GTOE(g, TWO) && HLP.GTOE(N_MINUS_2, g)
  }

  HLP.h1 = function (b, secbytes) {
    var sha1 = CryptoJS.algo.SHA1.create()
    sha1.update(CryptoJS.enc.Latin1.parse(b))
    sha1.update(CryptoJS.enc.Latin1.parse(secbytes))
    return (sha1.finalize()).toString(CryptoJS.enc.Latin1)
  }

  HLP.h2 = function (b, secbytes) {
    var sha256 = CryptoJS.algo.SHA256.create()
    sha256.update(CryptoJS.enc.Latin1.parse(b))
    sha256.update(CryptoJS.enc.Latin1.parse(secbytes))
    return (sha256.finalize()).toString(CryptoJS.enc.Latin1)
  }

  HLP.mask = function (bytes, start, n) {
    return bytes.substr(start / 8, n / 8)
  }

  var _toString = String.fromCharCode;
  HLP.packBytes = function (val, bytes) {
    val = val.toString(16)
    var nex, res = ''  // big-endian, unsigned long
    for (; bytes > 0; bytes--) {
      nex = val.length ? val.substr(-2, 2) : '0'
      val = val.substr(0, val.length - 2)
      res = _toString(parseInt(nex, 16)) + res
    }
    return res
  }

  HLP.packINT = function (d) {
    return HLP.packBytes(d, DTS.INT)
  }

  HLP.packCtr = function (d) {
    return HLP.padCtr(HLP.packBytes(d, DTS.CTR))
  }

  HLP.padCtr = function (ctr) {
    return ctr + '\x00\x00\x00\x00\x00\x00\x00\x00'
  }

  HLP.unpackCtr = function (d) {
    d = HLP.toByteArray(d.substring(0, 8))
    return HLP.unpack(d)
  }

  HLP.unpack = function (arr) {
    var val = 0, i = 0, len = arr.length
    for (; i < len; i++) {
      val = (val * 256) + arr[i]
    }
    return val
  }

  HLP.packData = function (d) {
    return HLP.packINT(d.length) + d
  }

  HLP.bits2bigInt = function (bits) {
    bits = HLP.toByteArray(bits)
    return BigInt.ba2bigInt(bits)
  }

  HLP.packMPI = function (mpi) {
    return HLP.packData(BigInt.bigInt2bits(BigInt.trim(mpi, 0)))
  }

  HLP.packSHORT = function (short) {
    return HLP.packBytes(short, DTS.SHORT)
  }

  HLP.unpackSHORT = function (short) {
    short = HLP.toByteArray(short)
    return HLP.unpack(short)
  }

  HLP.packTLV = function (type, value) {
    return HLP.packSHORT(type) + HLP.packSHORT(value.length) + value
  }

  HLP.readLen = function (msg) {
    msg = HLP.toByteArray(msg.substring(0, 4))
    return HLP.unpack(msg)
  }

  HLP.readData = function (data) {
    var n = HLP.unpack(data.splice(0, 4))
    return [n, data]
  }

  HLP.readMPI = function (data) {
    data = HLP.toByteArray(data)
    data = HLP.readData(data)
    return BigInt.ba2bigInt(data[1])
  }

  HLP.packMPIs = function (arr) {
    return arr.reduce(function (prv, cur) {
      return prv + HLP.packMPI(cur)
    }, '')
  }

  HLP.unpackMPIs = function (num, mpis) {
    var i = 0, arr = []
    for (; i < num; i++) arr.push('MPI')
    return (HLP.splitype(arr, mpis)).map(function (m) {
      return HLP.readMPI(m)
    })
  }

  HLP.wrapMsg = function (msg, fs, v3, our_it, their_it) {
    msg = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Latin1.parse(msg))
    msg = WRAPPER_BEGIN + ":" + msg + WRAPPER_END

    var its
    if (v3) {
      its = '|'
      its += (HLP.readLen(our_it)).toString(16)
      its += '|'
      its += (HLP.readLen(their_it)).toString(16)
    }

    if (!fs) return [null, msg]

    var n = Math.ceil(msg.length / fs)
    if (n > 65535) return ['Too many fragments']
    if (n == 1) return [null, msg]

    var k, bi, ei, frag, mf, mfs = []
    for (k = 1; k <= n; k++) {
      bi = (k - 1) * fs
      ei = k * fs
      frag = msg.slice(bi, ei)
      mf = WRAPPER_BEGIN
      if (v3) mf += its
      mf += ',' + k + ','
      mf += n + ','
      mf += frag + ','
      mfs.push(mf)
    }

    return [null, mfs]
  }

  HLP.splitype = function splitype(arr, msg) {
    var data = []
    arr.forEach(function (a) {
      var str
      switch (a) {
        case 'PUBKEY':
          str = splitype(['SHORT', 'MPI', 'MPI', 'MPI', 'MPI'], msg).join('')
          break
        case 'DATA':  // falls through
        case 'MPI':
          str = msg.substring(0, HLP.readLen(msg) + 4)
          break
        default:
          str = msg.substring(0, DTS[a])
      }
      data.push(str)
      msg = msg.substring(str.length)
    })
    return data
  }

  // https://github.com/msgpack/msgpack-javascript/blob/master/msgpack.js

  var _bin2num = (function () {
    var i = 0, _bin2num = {}
    for (; i < 0x100; ++i) {
      _bin2num[String.fromCharCode(i)] = i  // "\00" -> 0x00
    }
    for (i = 0x80; i < 0x100; ++i) {  // [Webkit][Gecko]
      _bin2num[String.fromCharCode(0xf700 + i)] = i  // "\f780" -> 0x80
    }
    return _bin2num
  }())

  HLP.toByteArray = function (data) {
    var rv = []
      , ary = data.split("")
      , i = -1
      , iz = ary.length
      , remain = iz % 8

    while (remain--) {
      ++i
      rv[i] = _bin2num[ary[i]]
    }
    remain = iz >> 3
    while (remain--) {
      rv.push(_bin2num[ary[++i]], _bin2num[ary[++i]],
              _bin2num[ary[++i]], _bin2num[ary[++i]],
              _bin2num[ary[++i]], _bin2num[ary[++i]],
              _bin2num[ary[++i]], _bin2num[ary[++i]])
    }
    return rv
  }

}).call(this)