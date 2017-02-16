;(function () {
  "use strict";

  var root = this

  var CryptoJS, BigInt, CONST, HLP, DSA
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AKE
    CryptoJS = require('../vendor/crypto.js')
    BigInt = require('../vendor/bigint.js')
    CONST = require('./const.js')
    HLP = require('./helpers.js')
    DSA = require('./dsa.js')
  } else {
    root.OTR.AKE = AKE
    CryptoJS = root.CryptoJS
    BigInt = root.BigInt
    CONST = root.OTR.CONST
    HLP = root.OTR.HLP
    DSA = root.DSA
  }

  // diffie-hellman modulus
  // see group 5, RFC 3526
  var N = BigInt.str2bigInt(CONST.N, 16)
  var N_MINUS_2 = BigInt.sub(N, BigInt.str2bigInt('2', 10))

  function hMac(gx, gy, pk, kid, m) {
    var pass = CryptoJS.enc.Latin1.parse(m)
    var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, pass)
    hmac.update(CryptoJS.enc.Latin1.parse(HLP.packMPI(gx)))
    hmac.update(CryptoJS.enc.Latin1.parse(HLP.packMPI(gy)))
    hmac.update(CryptoJS.enc.Latin1.parse(pk))
    hmac.update(CryptoJS.enc.Latin1.parse(kid))
    return (hmac.finalize()).toString(CryptoJS.enc.Latin1)
  }

  // AKE constructor
  function AKE(otr) {
    if (!(this instanceof AKE)) return new AKE(otr)

    // otr instance
    this.otr = otr

    // our keys
    this.our_dh = otr.our_old_dh
    this.our_keyid = otr.our_keyid - 1

    // their keys
    this.their_y = null
    this.their_keyid = null
    this.their_priv_pk = null

    // state
    this.ssid = null
    this.transmittedRS = false
    this.r = null

    // bind methods
    var self = this
    ;['sendMsg'].forEach(function (meth) {
      self[meth] = self[meth].bind(self)
    })
  }

  AKE.prototype = {

    constructor: AKE,

    createKeys: function(g) {
      var s = BigInt.powMod(g, this.our_dh.privateKey, N)
      var secbytes = HLP.packMPI(s)
      this.ssid = HLP.mask(HLP.h2('\x00', secbytes), 0, 64)  // first 64-bits
      var tmp = HLP.h2('\x01', secbytes)
      this.c = HLP.mask(tmp, 0, 128)  // first 128-bits
      this.c_prime = HLP.mask(tmp, 128, 128)  // second 128-bits
      this.m1 = HLP.h2('\x02', secbytes)
      this.m2 = HLP.h2('\x03', secbytes)
      this.m1_prime = HLP.h2('\x04', secbytes)
      this.m2_prime = HLP.h2('\x05', secbytes)
    },

    verifySignMac: function (mac, aesctr, m2, c, their_y, our_dh_pk, m1, ctr) {
      // verify mac
      var vmac = HLP.makeMac(aesctr, m2)
      if (!HLP.compare(mac, vmac))
        return ['MACs do not match.']

      // decrypt x
      var x = HLP.decryptAes(aesctr.substring(4), c, ctr)
      x = HLP.splitype(['PUBKEY', 'INT', 'SIG'], x.toString(CryptoJS.enc.Latin1))

      var m = hMac(their_y, our_dh_pk, x[0], x[1], m1)
      var pub = DSA.parsePublic(x[0])

      var r = HLP.bits2bigInt(x[2].substring(0, 20))
      var s = HLP.bits2bigInt(x[2].substring(20))

      // verify sign m
      if (!DSA.verify(pub, m, r, s)) return ['Cannot verify signature of m.']

      return [null, HLP.readLen(x[1]), pub]
    },

    makeM: function (their_y, m1, c, m2) {
      var pk = this.otr.priv.packPublic()
      var kid = HLP.packINT(this.our_keyid)
      var m = hMac(this.our_dh.publicKey, their_y, pk, kid, m1)
      m = this.otr.priv.sign(m)
      var msg = pk + kid
      msg += BigInt.bigInt2bits(m[0], 20)  // pad to 20 bytes
      msg += BigInt.bigInt2bits(m[1], 20)
      msg = CryptoJS.enc.Latin1.parse(msg)
      var aesctr = HLP.packData(HLP.encryptAes(msg, c, HLP.packCtr(0)))
      var mac = HLP.makeMac(aesctr, m2)
      return aesctr + mac
    },

    akeSuccess: function (version) {
      HLP.debug.call(this.otr, 'success')

      if (BigInt.equals(this.their_y, this.our_dh.publicKey))
        return this.otr.error('equal keys - we have a problem.')

      this.otr.our_old_dh = this.our_dh
      this.otr.their_priv_pk = this.their_priv_pk

      if (!(
        (this.their_keyid === this.otr.their_keyid &&
         BigInt.equals(this.their_y, this.otr.their_y)) ||
        (this.their_keyid === (this.otr.their_keyid - 1) &&
         BigInt.equals(this.their_y, this.otr.their_old_y))
      )) {

        this.otr.their_y = this.their_y
        this.otr.their_old_y = null
        this.otr.their_keyid = this.their_keyid

        // rotate keys
        this.otr.sessKeys[0] = [ new this.otr.DHSession(
            this.otr.our_dh
          , this.otr.their_y
        ), null ]
        this.otr.sessKeys[1] = [ new this.otr.DHSession(
            this.otr.our_old_dh
          , this.otr.their_y
        ), null ]

      }

      // ake info
      this.otr.ssid = this.ssid
      this.otr.transmittedRS = this.transmittedRS
      this.otr_version = version

      // go encrypted
      this.otr.authstate = CONST.AUTHSTATE_NONE
      this.otr.msgstate = CONST.MSGSTATE_ENCRYPTED

      // null out values
      this.r = null
      this.myhashed = null
      this.dhcommit = null
      this.encrypted = null
      this.hashed = null

      this.otr.trigger('status', [CONST.STATUS_AKE_SUCCESS])

      // send stored msgs
      this.otr.sendStored()
    },

    handleAKE: function (msg) {
      var send, vsm, type
      var version = msg.version

      switch (msg.type) {

        case '\x02':
          HLP.debug.call(this.otr, 'd-h key message')

          msg = HLP.splitype(['DATA', 'DATA'], msg.msg)

          if (this.otr.authstate === CONST.AUTHSTATE_AWAITING_DHKEY) {
            var ourHash = HLP.readMPI(this.myhashed)
            var theirHash = HLP.readMPI(msg[1])
            if (BigInt.greater(ourHash, theirHash)) {
              type = '\x02'
              send = this.dhcommit
              break  // ignore
            } else {
              // forget
              this.our_dh = this.otr.dh()
              this.otr.authstate = CONST.AUTHSTATE_NONE
              this.r = null
              this.myhashed = null
            }
          } else if (
            this.otr.authstate === CONST.AUTHSTATE_AWAITING_SIG
          ) this.our_dh = this.otr.dh()

          this.otr.authstate = CONST.AUTHSTATE_AWAITING_REVEALSIG

          this.encrypted = msg[0].substring(4)
          this.hashed = msg[1].substring(4)

          type = '\x0a'
          send = HLP.packMPI(this.our_dh.publicKey)
          break

        case '\x0a':
          HLP.debug.call(this.otr, 'reveal signature message')

          msg = HLP.splitype(['MPI'], msg.msg)

          if (this.otr.authstate !== CONST.AUTHSTATE_AWAITING_DHKEY) {
            if (this.otr.authstate === CONST.AUTHSTATE_AWAITING_SIG) {
              if (!BigInt.equals(this.their_y, HLP.readMPI(msg[0]))) return
            } else {
              return  // ignore
            }
          }

          this.otr.authstate = CONST.AUTHSTATE_AWAITING_SIG

          this.their_y = HLP.readMPI(msg[0])

          // verify gy is legal 2 <= gy <= N-2
          if (!HLP.checkGroup(this.their_y, N_MINUS_2))
            return this.otr.error('Illegal g^y.')

          this.createKeys(this.their_y)

          type = '\x11'
          send = HLP.packMPI(this.r)
          send += this.makeM(this.their_y, this.m1, this.c, this.m2)

          this.m1 = null
          this.m2 = null
          this.c = null
          break

        case '\x11':
          HLP.debug.call(this.otr, 'signature message')

          if (this.otr.authstate !== CONST.AUTHSTATE_AWAITING_REVEALSIG)
            return  // ignore

          msg = HLP.splitype(['DATA', 'DATA', 'MAC'], msg.msg)

          this.r = HLP.readMPI(msg[0])

          // decrypt their_y
          var key = CryptoJS.enc.Hex.parse(BigInt.bigInt2str(this.r, 16))
          key = CryptoJS.enc.Latin1.stringify(key)

          var gxmpi = HLP.decryptAes(this.encrypted, key, HLP.packCtr(0))
          gxmpi = gxmpi.toString(CryptoJS.enc.Latin1)

          this.their_y = HLP.readMPI(gxmpi)

          // verify hash
          var hash = CryptoJS.SHA256(CryptoJS.enc.Latin1.parse(gxmpi))

          if (!HLP.compare(this.hashed, hash.toString(CryptoJS.enc.Latin1)))
            return this.otr.error('Hashed g^x does not match.')

          // verify gx is legal 2 <= g^x <= N-2
          if (!HLP.checkGroup(this.their_y, N_MINUS_2))
            return this.otr.error('Illegal g^x.')

          this.createKeys(this.their_y)

          vsm = this.verifySignMac(
              msg[2]
            , msg[1]
            , this.m2
            , this.c
            , this.their_y
            , this.our_dh.publicKey
            , this.m1
            , HLP.packCtr(0)
          )
          if (vsm[0]) return this.otr.error(vsm[0])

          // store their key
          this.their_keyid = vsm[1]
          this.their_priv_pk = vsm[2]

          send = this.makeM(
              this.their_y
            , this.m1_prime
            , this.c_prime
            , this.m2_prime
          )

          this.m1 = null
          this.m2 = null
          this.m1_prime = null
          this.m2_prime = null
          this.c = null
          this.c_prime = null

          this.sendMsg(version, '\x12', send)
          this.akeSuccess(version)
          return

        case '\x12':
          HLP.debug.call(this.otr, 'data message')

          if (this.otr.authstate !== CONST.AUTHSTATE_AWAITING_SIG)
            return  // ignore

          msg = HLP.splitype(['DATA', 'MAC'], msg.msg)

          vsm = this.verifySignMac(
              msg[1]
            , msg[0]
            , this.m2_prime
            , this.c_prime
            , this.their_y
            , this.our_dh.publicKey
            , this.m1_prime
            , HLP.packCtr(0)
          )
          if (vsm[0]) return this.otr.error(vsm[0])

          // store their key
          this.their_keyid = vsm[1]
          this.their_priv_pk = vsm[2]

          this.m1_prime = null
          this.m2_prime = null
          this.c_prime = null

          this.transmittedRS = true
          this.akeSuccess(version)
          return

        default:
          return  // ignore

      }

      this.sendMsg(version, type, send)
    },

    sendMsg: function (version, type, msg) {
      var send = version + type
      var v3 = (version === CONST.OTR_VERSION_3)

      // instance tags for v3
      if (v3) {
        HLP.debug.call(this.otr, 'instance tags')
        send += this.otr.our_instance_tag
        send += this.otr.their_instance_tag
      }

      send += msg

      // fragment message if necessary
      send = HLP.wrapMsg(
          send
        , this.otr.fragment_size
        , v3
        , this.otr.our_instance_tag
        , this.otr.their_instance_tag
      )
      if (send[0]) return this.otr.error(send[0])

      this.otr.io(send[1])
    },

    initiateAKE: function (version) {
      HLP.debug.call(this.otr, 'd-h commit message')

      this.otr.trigger('status', [CONST.STATUS_AKE_INIT])

      this.otr.authstate = CONST.AUTHSTATE_AWAITING_DHKEY

      var gxmpi = HLP.packMPI(this.our_dh.publicKey)
      gxmpi = CryptoJS.enc.Latin1.parse(gxmpi)

      this.r = BigInt.randBigInt(128)
      var key = CryptoJS.enc.Hex.parse(BigInt.bigInt2str(this.r, 16))
      key = CryptoJS.enc.Latin1.stringify(key)

      this.myhashed = CryptoJS.SHA256(gxmpi)
      this.myhashed = HLP.packData(this.myhashed.toString(CryptoJS.enc.Latin1))

      this.dhcommit = HLP.packData(HLP.encryptAes(gxmpi, key, HLP.packCtr(0)))
      this.dhcommit += this.myhashed

      this.sendMsg(version, '\x02', this.dhcommit)
    }

  }

}).call(this)