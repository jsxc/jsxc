;(function () {
  "use strict";

  var root = this

  var CryptoJS, BigInt, Worker, WWPath, HLP
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSA
    CryptoJS = require('../vendor/crypto.js')
    BigInt = require('../vendor/bigint.js')
    WWPath = require('path').join(__dirname, '/dsa-webworker.js')
    HLP = require('./helpers.js')
  } else {
    // copy over and expose internals
    Object.keys(root.DSA).forEach(function (k) {
      DSA[k] = root.DSA[k]
    })
    root.DSA = DSA
    CryptoJS = root.CryptoJS
    BigInt = root.BigInt
    Worker = root.Worker
    WWPath = 'dsa-webworker.js'
    HLP = DSA.HLP
  }

  var ZERO = BigInt.str2bigInt('0', 10)
    , ONE = BigInt.str2bigInt('1', 10)
    , TWO = BigInt.str2bigInt('2', 10)
    , KEY_TYPE = '\x00\x00'

  var DEBUG = false
  function timer() {
    var start = (new Date()).getTime()
    return function (s) {
      if (!DEBUG || typeof console === 'undefined') return
      var t = (new Date()).getTime()
      console.log(s + ': ' + (t - start))
      start = t
    }
  }

  function makeRandom(min, max) {
    var c = BigInt.randBigInt(BigInt.bitSize(max))
    if (!HLP.between(c, min, max)) return makeRandom(min, max)
    return c
  }

  // altered BigInt.randProbPrime()
  // n rounds of Miller Rabin (after trial division with small primes)
  var rpprb = []
  function isProbPrime(k, n) {
    var i, B = 30000, l = BigInt.bitSize(k)
    var primes = BigInt.primes

    if (primes.length === 0)
      primes = BigInt.findPrimes(B)

    if (rpprb.length != k.length)
      rpprb = BigInt.dup(k)

    // check ans for divisibility by small primes up to B
    for (i = 0; (i < primes.length) && (primes[i] <= B); i++)
      if (BigInt.modInt(k, primes[i]) === 0 && !BigInt.equalsInt(k, primes[i]))
        return 0

    // do n rounds of Miller Rabin, with random bases less than k
    for (i = 0; i < n; i++) {
      BigInt.randBigInt_(rpprb, l, 0)
      while(!BigInt.greater(k, rpprb))  // pick a random rpprb that's < k
        BigInt.randBigInt_(rpprb, l, 0)
      if (!BigInt.millerRabin(k, rpprb))
        return 0
    }

    return 1
  }

  var bit_lengths = {
      '1024': { N: 160, repeat: 40 }  // 40x should give 2^-80 confidence
    , '2048': { N: 224, repeat: 56 }
  }

  var primes = {}

  // follows go lang http://golang.org/src/pkg/crypto/dsa/dsa.go
  // fips version was removed in 0c99af0df3e7
  function generatePrimes(bit_length) {

    var t = timer()  // for debugging

    // number of MR tests to perform
    var repeat = bit_lengths[bit_length].repeat

    var N = bit_lengths[bit_length].N

    var LM1 = BigInt.twoToThe(bit_length - 1)
    var bl4 = 4 * bit_length
    var brk = false

    var q, p, rem, counter
    for (;;) {

      q = BigInt.randBigInt(N, 1)
      q[0] |= 1

      if (!isProbPrime(q, repeat)) continue
      t('q')

      for (counter = 0; counter < bl4; counter++) {
        p = BigInt.randBigInt(bit_length, 1)
        p[0] |= 1

        rem = BigInt.mod(p, q)
        rem = BigInt.sub(rem, ONE)
        p = BigInt.sub(p, rem)

        if (BigInt.greater(LM1, p)) continue
        if (!isProbPrime(p, repeat)) continue

        t('p')
        primes[bit_length] = { p: p, q: q }
        brk = true
        break
      }

      if (brk) break
    }

    var h = BigInt.dup(TWO)
    var pm1 = BigInt.sub(p, ONE)
    var e = BigInt.multMod(pm1, BigInt.inverseMod(q, p), p)

    var g
    for (;;) {
      g = BigInt.powMod(h, e, p)
      if (BigInt.equals(g, ONE)) {
        h = BigInt.add(h, ONE)
        continue
      }
      primes[bit_length].g = g
      t('g')
      return
    }

    throw new Error('Unreachable!')
  }

  function DSA(obj, opts) {
    if (!(this instanceof DSA)) return new DSA(obj, opts)

    // options
    opts = opts || {}

    // inherit
    if (obj) {
      var self = this
      ;['p', 'q', 'g', 'y', 'x'].forEach(function (prop) {
        self[prop] = obj[prop]
      })
      this.type = obj.type || KEY_TYPE
      return
    }

    // default to 1024
    var bit_length = parseInt(opts.bit_length ? opts.bit_length : 1024, 10)

    if (!bit_lengths[bit_length])
      throw new Error('Unsupported bit length.')

    // set primes
    if (!primes[bit_length])
      generatePrimes(bit_length)

    this.p = primes[bit_length].p
    this.q = primes[bit_length].q
    this.g = primes[bit_length].g

    // key type
    this.type = KEY_TYPE

    // private key
    this.x = makeRandom(ZERO, this.q)

    // public keys (p, q, g, y)
    this.y = BigInt.powMod(this.g, this.x, this.p)

    // nocache?
    if (opts.nocache) primes[bit_length] = null
  }

  DSA.prototype = {

    constructor: DSA,

    packPublic: function () {
      var str = this.type
      str += HLP.packMPI(this.p)
      str += HLP.packMPI(this.q)
      str += HLP.packMPI(this.g)
      str += HLP.packMPI(this.y)
      return str
    },

    packPrivate: function () {
      var str = this.packPublic() + HLP.packMPI(this.x)
      str = CryptoJS.enc.Latin1.parse(str)
      return str.toString(CryptoJS.enc.Base64)
    },

    // http://www.imperialviolet.org/2013/06/15/suddendeathentropy.html
    generateNonce: function (m) {
      var priv = BigInt.bigInt2bits(BigInt.trim(this.x, 0))
      var rand = BigInt.bigInt2bits(BigInt.randBigInt(256))

      var sha256 = CryptoJS.algo.SHA256.create()
      sha256.update(CryptoJS.enc.Latin1.parse(priv))
      sha256.update(m)
      sha256.update(CryptoJS.enc.Latin1.parse(rand))

      var hash = sha256.finalize()
      hash = HLP.bits2bigInt(hash.toString(CryptoJS.enc.Latin1))
      BigInt.rightShift_(hash, 256 - BigInt.bitSize(this.q))

      return HLP.between(hash, ZERO, this.q) ? hash : this.generateNonce(m)
    },

    sign: function (m) {
      m = CryptoJS.enc.Latin1.parse(m)
      var b = BigInt.str2bigInt(m.toString(CryptoJS.enc.Hex), 16)
      var k, r = ZERO, s = ZERO
      while (BigInt.isZero(s) || BigInt.isZero(r)) {
        k = this.generateNonce(m)
        r = BigInt.mod(BigInt.powMod(this.g, k, this.p), this.q)
        if (BigInt.isZero(r)) continue
        s = BigInt.inverseMod(k, this.q)
        s = BigInt.mult(s, BigInt.add(b, BigInt.mult(this.x, r)))
        s = BigInt.mod(s, this.q)
      }
      return [r, s]
    },

    fingerprint: function () {
      var pk = this.packPublic()
      if (this.type === KEY_TYPE) pk = pk.substring(2)
      pk = CryptoJS.enc.Latin1.parse(pk)
      return CryptoJS.SHA1(pk).toString(CryptoJS.enc.Hex)
    }

  }

  DSA.parsePublic = function (str, priv) {
    var fields = ['SHORT', 'MPI', 'MPI', 'MPI', 'MPI']
    if (priv) fields.push('MPI')
    str = HLP.splitype(fields, str)
    var obj = {
        type: str[0]
      , p: HLP.readMPI(str[1])
      , q: HLP.readMPI(str[2])
      , g: HLP.readMPI(str[3])
      , y: HLP.readMPI(str[4])
    }
    if (priv) obj.x = HLP.readMPI(str[5])
    return new DSA(obj)
  }

  function tokenizeStr(str) {
    var start, end

    start = str.indexOf("(")
    end = str.lastIndexOf(")")

    if (start < 0 || end < 0)
      throw new Error("Malformed S-Expression")

    str = str.substring(start + 1, end)

    var splt = str.search(/\s/)
    var obj = {
        type: str.substring(0, splt)
      , val: []
    }

    str = str.substring(splt + 1, end)
    start = str.indexOf("(")

    if (start < 0) obj.val.push(str)
    else {

      var i, len, ss, es
      while (start > -1) {
        i = start + 1
        len = str.length
        for (ss = 1, es = 0; i < len && es < ss; i++) {
          if (str[i] === "(") ss++
          if (str[i] === ")") es++
        }
        obj.val.push(tokenizeStr(str.substring(start, ++i)))
        str = str.substring(++i)
        start = str.indexOf("(")
      }

    }
    return obj
  }

  function parseLibotr(obj) {
    if (!obj.type) throw new Error("Parse error.")

    var o, val
    if (obj.type === "privkeys") {
      o = []
      obj.val.forEach(function (i) {
        o.push(parseLibotr(i))
      })
      return o
    }

    o = {}
    obj.val.forEach(function (i) {

      val = i.val[0]
      if (typeof val === "string") {

        if (val.indexOf("#") === 0) {
          val = val.substring(1, val.lastIndexOf("#"))
          val = BigInt.str2bigInt(val, 16)
        }

      } else {
        val = parseLibotr(i)
      }

      o[i.type] = val
    })

    return o
  }

  DSA.parsePrivate = function (str, libotr) {
    if (!libotr) {
      str = CryptoJS.enc.Base64.parse(str)
      str = str.toString(CryptoJS.enc.Latin1)
      return DSA.parsePublic(str, true)
    }
    // only returning the first key found
    return parseLibotr(tokenizeStr(str))[0]["private-key"].dsa
  }

  DSA.verify = function (key, m, r, s) {
    if (!HLP.between(r, ZERO, key.q) || !HLP.between(s, ZERO, key.q))
      return false

    var hm = CryptoJS.enc.Latin1.parse(m)  // CryptoJS.SHA1(m)
    hm = BigInt.str2bigInt(hm.toString(CryptoJS.enc.Hex), 16)

    var w = BigInt.inverseMod(s, key.q)
    var u1 = BigInt.multMod(hm, w, key.q)
    var u2 = BigInt.multMod(r, w, key.q)

    u1 = BigInt.powMod(key.g, u1, key.p)
    u2 = BigInt.powMod(key.y, u2, key.p)

    var v = BigInt.mod(BigInt.multMod(u1, u2, key.p), key.q)

    return BigInt.equals(v, r)
  }

  DSA.createInWebWorker = function (options, cb) {
    var opts = {
        path: WWPath
      , seed: BigInt.getSeed
    }
    if (options && typeof options === 'object')
      Object.keys(options).forEach(function (k) {
        opts[k] = options[k]
      })

    // load optional dep. in node
    if (typeof module !== 'undefined' && module.exports)
      Worker = require('webworker-threads').Worker

    var worker = new Worker(opts.path)
    worker.onmessage = function (e) {
      var data = e.data
      switch (data.type) {
        case "debug":
          if (!DEBUG || typeof console === 'undefined') return
          console.log(data.val)
          break;
        case "data":
          worker.terminate()
          cb(DSA.parsePrivate(data.val))
          break;
        default:
          throw new Error("Unrecognized type.")
      }
    }
    worker.postMessage({
        seed: opts.seed()
      , imports: opts.imports
      , debug: DEBUG
    })
  }

}).call(this)