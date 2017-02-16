;(function () {
  "use strict";

  var root = this

  var CryptoJS, BigInt, EventEmitter, Worker, SMWPath
    , CONST, HLP, Parse, AKE, SM, DSA
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OTR
    CryptoJS = require('../vendor/crypto.js')
    BigInt = require('../vendor/bigint.js')
    EventEmitter = require('../vendor/eventemitter.js')
    SMWPath = require('path').join(__dirname, '/sm-webworker.js')
    CONST = require('./const.js')
    HLP = require('./helpers.js')
    Parse = require('./parse.js')
    AKE = require('./ake.js')
    SM = require('./sm.js')
    DSA = require('./dsa.js')
    // expose CONST for consistency with docs
    OTR.CONST = CONST
  } else {
    // copy over and expose internals
    Object.keys(root.OTR).forEach(function (k) {
      OTR[k] = root.OTR[k]
    })
    root.OTR = OTR
    CryptoJS = root.CryptoJS
    BigInt = root.BigInt
    EventEmitter = root.EventEmitter
    Worker = root.Worker
    SMWPath = 'sm-webworker.js'
    CONST = OTR.CONST
    HLP = OTR.HLP
    Parse = OTR.Parse
    AKE = OTR.AKE
    SM = OTR.SM
    DSA = root.DSA
  }

  // diffie-hellman modulus and generator
  // see group 5, RFC 3526
  var G = BigInt.str2bigInt(CONST.G, 10)
  var N = BigInt.str2bigInt(CONST.N, 16)

  // JavaScript integers
  var MAX_INT = Math.pow(2, 53) - 1  // doubles
  var MAX_UINT = Math.pow(2, 31) - 1  // bitwise operators

  // an internal callback
  function OTRCB(cb) {
    this.cb = cb
  }

  // OTR contructor
  function OTR(options) {
    if (!(this instanceof OTR)) return new OTR(options)

    // options
    options = options || {}

    // private keys
    if (options.priv && !(options.priv instanceof DSA))
      throw new Error('Requires long-lived DSA key.')

    this.priv = options.priv ? options.priv : new DSA()

    this.fragment_size = options.fragment_size || 0
    if (this.fragment_size < 0)
      throw new Error('Fragment size must be a positive integer.')

    this.send_interval = options.send_interval || 0
    if (this.send_interval < 0)
      throw new Error('Send interval must be a positive integer.')

    this.outgoing = []

    // instance tag
    this.our_instance_tag = options.instance_tag || OTR.makeInstanceTag()

    // debug
    this.debug = !!options.debug

    // smp in webworker options
    // this is still experimental and undocumented
    this.smw = options.smw

    // init vals
    this.init()

    // bind methods
    var self = this
    ;['sendMsg', 'receiveMsg'].forEach(function (meth) {
      self[meth] = self[meth].bind(self)
    })

    EventEmitter.call(this)
  }

  // inherit from EE
  HLP.extend(OTR, EventEmitter)

  // add to prototype
  OTR.prototype.init = function () {

    this.msgstate = CONST.MSGSTATE_PLAINTEXT
    this.authstate = CONST.AUTHSTATE_NONE

    this.ALLOW_V2 = true
    this.ALLOW_V3 = true

    this.REQUIRE_ENCRYPTION = false
    this.SEND_WHITESPACE_TAG = false
    this.WHITESPACE_START_AKE = false
    this.ERROR_START_AKE = false

    Parse.initFragment(this)

    // their keys
    this.their_y = null
    this.their_old_y = null
    this.their_keyid = 0
    this.their_priv_pk = null
    this.their_instance_tag = '\x00\x00\x00\x00'

    // our keys
    this.our_dh = this.dh()
    this.our_old_dh = this.dh()
    this.our_keyid = 2

    // session keys
    this.sessKeys = [ new Array(2), new Array(2) ]

    // saved
    this.storedMgs = []
    this.oldMacKeys = []

    // smp
    this.sm = null  // initialized after AKE

    // when ake is complete
    // save their keys and the session
    this._akeInit()

    // receive plaintext message since switching to plaintext
    // used to decide when to stop sending pt tags when SEND_WHITESPACE_TAG
    this.receivedPlaintext = false

  }

  OTR.prototype._akeInit = function () {
    this.ake = new AKE(this)
    this.transmittedRS = false
    this.ssid = null
  }

  // smp over webworker
  OTR.prototype._SMW = function (otr, reqs) {
    this.otr = otr
    var opts = {
        path: SMWPath
      , seed: BigInt.getSeed
    }
    if (typeof otr.smw === 'object')
      Object.keys(otr.smw).forEach(function (k) {
        opts[k] = otr.smw[k]
      })

    // load optional dep. in node
    if (typeof module !== 'undefined' && module.exports)
      Worker = require('webworker-threads').Worker

    this.worker = new Worker(opts.path)
    var self = this
    this.worker.onmessage = function (e) {
      var d = e.data
      if (!d) return
      self.trigger(d.method, d.args)
    }
    this.worker.postMessage({
        type: 'seed'
      , seed: opts.seed()
      , imports: opts.imports
    })
    this.worker.postMessage({
        type: 'init'
      , reqs: reqs
    })
  }

  // inherit from EE
  HLP.extend(OTR.prototype._SMW, EventEmitter)

  // shim sm methods
  ;['handleSM', 'rcvSecret', 'abort'].forEach(function (m) {
    OTR.prototype._SMW.prototype[m] = function () {
      this.worker.postMessage({
          type: 'method'
        , method: m
        , args: Array.prototype.slice.call(arguments, 0)
      })
    }
  })

  OTR.prototype._smInit = function () {
    var reqs = {
        ssid: this.ssid
      , our_fp: this.priv.fingerprint()
      , their_fp: this.their_priv_pk.fingerprint()
      , debug: this.debug
    }
    if (this.smw) {
      if (this.sm) this.sm.worker.terminate()  // destroy prev webworker
      this.sm = new this._SMW(this, reqs)
    } else {
      this.sm = new SM(reqs)
    }
    var self = this
    ;['trust', 'abort', 'question'].forEach(function (e) {
      self.sm.on(e, function () {
        self.trigger('smp', [e].concat(Array.prototype.slice.call(arguments)))
      })
    })
    this.sm.on('send', function (ssid, send) {
      if (self.ssid === ssid) {
        send = self.prepareMsg(send)
        self.io(send)
      }
    })
  }

  OTR.prototype.io = function (msg, meta) {

    // buffer
    msg = ([].concat(msg)).map(function(m, i, arr) {
       var obj = { msg: m }
       if (!(meta instanceof OTRCB) ||
         i === (arr.length - 1)  // only cb after last fragment is sent
       ) obj.meta = meta
       return obj
    })
    this.outgoing = this.outgoing.concat(msg)

    var self = this
    ;(function send(first) {
      if (!first) {
        if (!self.outgoing.length) return
        var elem = self.outgoing.shift(), cb = null
        if (elem.meta instanceof OTRCB) {
          cb = elem.meta.cb
          elem.meta = null
        }
        self.trigger('io', [elem.msg, elem.meta])
        if (cb) cb()
      }
      setTimeout(send, first ? 0 : self.send_interval)
    }(true))

  }

  OTR.prototype.dh = function dh() {
    var keys = { privateKey: BigInt.randBigInt(320) }
    keys.publicKey = BigInt.powMod(G, keys.privateKey, N)
    return keys
  }

  // session constructor
  OTR.prototype.DHSession = function DHSession(our_dh, their_y) {
    if (!(this instanceof DHSession)) return new DHSession(our_dh, their_y)

    // shared secret
    var s = BigInt.powMod(their_y, our_dh.privateKey, N)
    var secbytes = HLP.packMPI(s)

    // session id
    this.id = HLP.mask(HLP.h2('\x00', secbytes), 0, 64)  // first 64-bits

    // are we the high or low end of the connection?
    var sq = BigInt.greater(our_dh.publicKey, their_y)
    var sendbyte = sq ? '\x01' : '\x02'
    var rcvbyte  = sq ? '\x02' : '\x01'

    // sending and receiving keys
    this.sendenc = HLP.mask(HLP.h1(sendbyte, secbytes), 0, 128)  // f16 bytes
    this.sendmac = CryptoJS.SHA1(CryptoJS.enc.Latin1.parse(this.sendenc))
    this.sendmac = this.sendmac.toString(CryptoJS.enc.Latin1)

    this.rcvenc = HLP.mask(HLP.h1(rcvbyte, secbytes), 0, 128)
    this.rcvmac = CryptoJS.SHA1(CryptoJS.enc.Latin1.parse(this.rcvenc))
    this.rcvmac = this.rcvmac.toString(CryptoJS.enc.Latin1)
    this.rcvmacused = false

    // extra symmetric key
    this.extra_symkey = HLP.h2('\xff', secbytes)

    // counters
    this.send_counter = 0
    this.rcv_counter = 0
  }

  OTR.prototype.rotateOurKeys = function () {

    // reveal old mac keys
    var self = this
    this.sessKeys[1].forEach(function (sk) {
      if (sk && sk.rcvmacused) self.oldMacKeys.push(sk.rcvmac)
    })

    // rotate our keys
    this.our_old_dh = this.our_dh
    this.our_dh = this.dh()
    this.our_keyid += 1

    this.sessKeys[1][0] = this.sessKeys[0][0]
    this.sessKeys[1][1] = this.sessKeys[0][1]
    this.sessKeys[0] = [
        this.their_y ?
            new this.DHSession(this.our_dh, this.their_y) : null
      , this.their_old_y ?
            new this.DHSession(this.our_dh, this.their_old_y) : null
    ]

  }

  OTR.prototype.rotateTheirKeys = function (their_y) {

    // increment their keyid
    this.their_keyid += 1

    // reveal old mac keys
    var self = this
    this.sessKeys.forEach(function (sk) {
      if (sk[1] && sk[1].rcvmacused) self.oldMacKeys.push(sk[1].rcvmac)
    })

    // rotate their keys / session
    this.their_old_y = this.their_y
    this.sessKeys[0][1] = this.sessKeys[0][0]
    this.sessKeys[1][1] = this.sessKeys[1][0]

    // new keys / sessions
    this.their_y = their_y
    this.sessKeys[0][0] = new this.DHSession(this.our_dh, this.their_y)
    this.sessKeys[1][0] = new this.DHSession(this.our_old_dh, this.their_y)

  }

  OTR.prototype.prepareMsg = function (msg, esk) {
    if (this.msgstate !== CONST.MSGSTATE_ENCRYPTED || this.their_keyid === 0)
      return this.notify('Not ready to encrypt.')

    var sessKeys = this.sessKeys[1][0]

    if (sessKeys.send_counter >= MAX_INT)
      return this.notify('Should have rekeyed by now.')

    sessKeys.send_counter += 1

    var ctr = HLP.packCtr(sessKeys.send_counter)

    var send = this.ake.otr_version + '\x03'  // version and type
    var v3 = (this.ake.otr_version === CONST.OTR_VERSION_3)

    if (v3) {
      send += this.our_instance_tag
      send += this.their_instance_tag
    }

    send += '\x00'  // flag
    send += HLP.packINT(this.our_keyid - 1)
    send += HLP.packINT(this.their_keyid)
    send += HLP.packMPI(this.our_dh.publicKey)
    send += ctr.substring(0, 8)

    if (Math.ceil(msg.length / 8) >= MAX_UINT)  // * 16 / 128
      return this.notify('Message is too long.')

    var aes = HLP.encryptAes(
        CryptoJS.enc.Latin1.parse(msg)
      , sessKeys.sendenc
      , ctr
    )

    send += HLP.packData(aes)
    send += HLP.make1Mac(send, sessKeys.sendmac)
    send += HLP.packData(this.oldMacKeys.splice(0).join(''))

    send = HLP.wrapMsg(
        send
      , this.fragment_size
      , v3
      , this.our_instance_tag
      , this.their_instance_tag
    )
    if (send[0]) return this.notify(send[0])

    // emit extra symmetric key
    if (esk) this.trigger('file', ['send', sessKeys.extra_symkey, esk])

    return send[1]
  }

  OTR.prototype.handleDataMsg = function (msg) {
    var vt = msg.version + msg.type

    if (this.ake.otr_version === CONST.OTR_VERSION_3)
      vt += msg.instance_tags

    var types = ['BYTE', 'INT', 'INT', 'MPI', 'CTR', 'DATA', 'MAC', 'DATA']
    msg = HLP.splitype(types, msg.msg)

    // ignore flag
    var ign = (msg[0] === '\x01')

    if (this.msgstate !== CONST.MSGSTATE_ENCRYPTED || msg.length !== 8) {
      if (!ign) this.error('Received an unreadable encrypted message.')
      return
    }

    var our_keyid = this.our_keyid - HLP.readLen(msg[2])
    var their_keyid = this.their_keyid - HLP.readLen(msg[1])

    if (our_keyid < 0 || our_keyid > 1) {
      if (!ign) this.error('Not of our latest keys.')
      return
    }

    if (their_keyid < 0 || their_keyid > 1) {
      if (!ign) this.error('Not of your latest keys.')
      return
    }

    var their_y = their_keyid ? this.their_old_y : this.their_y

    if (their_keyid === 1 && !their_y) {
      if (!ign) this.error('Do not have that key.')
      return
    }

    var sessKeys = this.sessKeys[our_keyid][their_keyid]

    var ctr = HLP.unpackCtr(msg[4])
    if (ctr <= sessKeys.rcv_counter) {
      if (!ign) this.error('Counter in message is not larger.')
      return
    }
    sessKeys.rcv_counter = ctr

    // verify mac
    vt += msg.slice(0, 6).join('')
    var vmac = HLP.make1Mac(vt, sessKeys.rcvmac)

    if (!HLP.compare(msg[6], vmac)) {
      if (!ign) this.error('MACs do not match.')
      return
    }
    sessKeys.rcvmacused = true

    var out = HLP.decryptAes(
        msg[5].substring(4)
      , sessKeys.rcvenc
      , HLP.padCtr(msg[4])
    )
    out = out.toString(CryptoJS.enc.Latin1)

    if (!our_keyid) this.rotateOurKeys()
    if (!their_keyid) this.rotateTheirKeys(HLP.readMPI(msg[3]))

    // parse TLVs
    var ind = out.indexOf('\x00')
    if (~ind) {
      this.handleTLVs(out.substring(ind + 1), sessKeys)
      out = out.substring(0, ind)
    }

    out = CryptoJS.enc.Latin1.parse(out)
    return out.toString(CryptoJS.enc.Utf8)
  }

  OTR.prototype.handleTLVs = function (tlvs, sessKeys) {
    var type, len, msg
    for (; tlvs.length; ) {
      type = HLP.unpackSHORT(tlvs.substr(0, 2))
      len = HLP.unpackSHORT(tlvs.substr(2, 2))

      msg = tlvs.substr(4, len)

      // TODO: handle pathological cases better
      if (msg.length < len) break

      switch (type) {
        case 1:
          // Disconnected
          this.msgstate = CONST.MSGSTATE_FINISHED
          this.trigger('status', [CONST.STATUS_END_OTR])
          break
        case 2: case 3: case 4:
        case 5: case 6: case 7:
          // SMP
          if (this.msgstate !== CONST.MSGSTATE_ENCRYPTED) {
            if (this.sm) this.sm.abort()
            return
          }
          if (!this.sm) this._smInit()
          this.sm.handleSM({ msg: msg, type: type })
          break
        case 8:
          // utf8 filenames
          msg = msg.substring(4) // remove 4-byte indication
          msg = CryptoJS.enc.Latin1.parse(msg)
          msg = msg.toString(CryptoJS.enc.Utf8)

          // Extra Symkey
          this.trigger('file', ['receive', sessKeys.extra_symkey, msg])
          break
      }

      tlvs = tlvs.substring(4 + len)
    }
  }

  OTR.prototype.smpSecret = function (secret, question) {
    if (this.msgstate !== CONST.MSGSTATE_ENCRYPTED)
      return this.notify('Must be encrypted for SMP.')

    if (typeof secret !== 'string' || secret.length < 1)
      return this.notify('Secret is required.')

    if (!this.sm) this._smInit()

    // utf8 inputs
    secret = CryptoJS.enc.Utf8.parse(secret).toString(CryptoJS.enc.Latin1)
    if (question)
      question = CryptoJS.enc.Utf8.parse(question).toString(CryptoJS.enc.Latin1)

    this.sm.rcvSecret(secret, question)
  }

  OTR.prototype.sendQueryMsg = function () {
    var versions = {}
      , msg = CONST.OTR_TAG

    if (this.ALLOW_V2) versions['2'] = true
    if (this.ALLOW_V3) versions['3'] = true

    // but we don't allow v1
    // if (versions['1']) msg += '?'

    var vs = Object.keys(versions)
    if (vs.length) {
      msg += 'v'
      vs.forEach(function (v) {
        if (v !== '1') msg += v
      })
      msg += '?'
    }

    this.io(msg)
    this.trigger('status', [CONST.STATUS_SEND_QUERY])
  }

  OTR.prototype.sendMsg = function (msg, meta) {
    if ( this.REQUIRE_ENCRYPTION ||
         this.msgstate !== CONST.MSGSTATE_PLAINTEXT
    ) {
      msg = CryptoJS.enc.Utf8.parse(msg)
      msg = msg.toString(CryptoJS.enc.Latin1)
    }

    switch (this.msgstate) {
      case CONST.MSGSTATE_PLAINTEXT:
        if (this.REQUIRE_ENCRYPTION) {
          this.storedMgs.push({msg: msg, meta: meta})
          this.sendQueryMsg()
          return
        }
        if (this.SEND_WHITESPACE_TAG && !this.receivedPlaintext) {
          msg += CONST.WHITESPACE_TAG  // 16 byte tag
          if (this.ALLOW_V3) msg += CONST.WHITESPACE_TAG_V3
          if (this.ALLOW_V2) msg += CONST.WHITESPACE_TAG_V2
        }
        break
      case CONST.MSGSTATE_FINISHED:
        this.storedMgs.push({msg: msg, meta: meta})
        this.notify('Message cannot be sent at this time.', 'warn')
        return
      case CONST.MSGSTATE_ENCRYPTED:
        msg = this.prepareMsg(msg)
        break
      default:
        throw new Error('Unknown message state.')
    }

    if (msg) this.io(msg, meta)
  }

  OTR.prototype.receiveMsg = function (msg, meta) {

    // parse type
    msg = Parse.parseMsg(this, msg)

    if (!msg) return

    switch (msg.cls) {
      case 'error':
        this.notify(msg.msg)
        return
      case 'ake':
        if ( msg.version === CONST.OTR_VERSION_3 &&
          this.checkInstanceTags(msg.instance_tags)
        ) {
          this.notify(
            'Received a message intended for a different session.', 'warn')
          return  // ignore
        }
        this.ake.handleAKE(msg)
        return
      case 'data':
        if ( msg.version === CONST.OTR_VERSION_3 &&
          this.checkInstanceTags(msg.instance_tags)
        ) {
          this.notify(
            'Received a message intended for a different session.', 'warn')
          return  // ignore
        }
        msg.msg = this.handleDataMsg(msg)
        msg.encrypted = true
        break
      case 'query':
        if (this.msgstate === CONST.MSGSTATE_ENCRYPTED) this._akeInit()
        this.doAKE(msg)
        break
      default:
        // check for encrypted
        if ( this.REQUIRE_ENCRYPTION ||
             this.msgstate !== CONST.MSGSTATE_PLAINTEXT
        ) this.notify('Received an unencrypted message.', 'warn')

        // received a plaintext message
        // stop sending the whitespace tag
        this.receivedPlaintext = true

        // received a whitespace tag
        if (this.WHITESPACE_START_AKE && msg.ver.length > 0)
          this.doAKE(msg)
    }

    if (msg.msg) this.trigger('ui', [msg.msg, !!msg.encrypted, meta])
  }

  OTR.prototype.checkInstanceTags = function (it) {
    var their_it = HLP.readLen(it.substr(0, 4))
    var our_it = HLP.readLen(it.substr(4, 4))

    if (our_it && our_it !== HLP.readLen(this.our_instance_tag))
      return true

    if (HLP.readLen(this.their_instance_tag)) {
      if (HLP.readLen(this.their_instance_tag) !== their_it) return true
    } else {
      if (their_it < 100) return true
      this.their_instance_tag = HLP.packINT(their_it)
    }
  }

  OTR.prototype.doAKE = function (msg) {
    if (this.ALLOW_V3 && ~msg.ver.indexOf(CONST.OTR_VERSION_3)) {
      this.ake.initiateAKE(CONST.OTR_VERSION_3)
    } else if (this.ALLOW_V2 && ~msg.ver.indexOf(CONST.OTR_VERSION_2)) {
      this.ake.initiateAKE(CONST.OTR_VERSION_2)
    } else {
      this.notify('OTR conversation requested, ' +
        'but no compatible protocol version found.', 'warn')
    }
  }

  OTR.prototype.error = function (err) {
    if (!this.debug) err = 'An OTR error has occurred.'
    this.io('?OTR Error:' + err)
    this.notify(err)
  }

  OTR.prototype.notify = function (err, severity) {
    this.trigger('error', [err, severity || 'error'])
  }

  OTR.prototype.sendStored = function () {
    var self = this
    ;(this.storedMgs.splice(0)).forEach(function (elem) {
      var msg = self.prepareMsg(elem.msg)
      self.io(msg, elem.meta)
    })
  }

  OTR.prototype.sendFile = function (filename) {
    if (this.msgstate !== CONST.MSGSTATE_ENCRYPTED)
      return this.notify('Not ready to encrypt.')

    if (this.ake.otr_version !== CONST.OTR_VERSION_3)
      return this.notify('Protocol v3 required.')

    if (!filename) return this.notify('Please specify a filename.')

    // utf8 filenames
    var l1name = CryptoJS.enc.Utf8.parse(filename)
    l1name = l1name.toString(CryptoJS.enc.Latin1)

    if (l1name.length >= 65532) return this.notify('Filename is too long.')

    var msg = '\x00'  // null byte
    msg += '\x00\x08'  // type 8 tlv
    msg += HLP.packSHORT(4 + l1name.length)  // length of value
    msg += '\x00\x00\x00\x01'  // four bytes indicating file
    msg += l1name

    msg = this.prepareMsg(msg, filename)
    this.io(msg)
  }

  OTR.prototype.endOtr = function (cb) {
    if (this.msgstate === CONST.MSGSTATE_ENCRYPTED) {
      if (typeof cb === 'function')
        cb = new OTRCB(cb)
      this.sendMsg('\x00\x00\x01\x00\x00', cb)
      if (this.sm) {
        if (this.smw) this.sm.worker.terminate()  // destroy webworker
        this.sm = null
      }
    } else if (typeof cb === 'function')
      setTimeout(cb, 0)

    this.msgstate = CONST.MSGSTATE_PLAINTEXT
    this.receivedPlaintext = false
    this.trigger('status', [CONST.STATUS_END_OTR])
  }

  // attach methods

  OTR.makeInstanceTag = function () {
    var num = BigInt.randBigInt(32)
    if (BigInt.greater(BigInt.str2bigInt('100', 16), num))
      return OTR.makeInstanceTag()
    return HLP.packINT(parseInt(BigInt.bigInt2str(num, 10), 10))
  }

}).call(this)
