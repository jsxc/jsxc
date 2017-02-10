;(function () {
  "use strict";

  var root = this

  var Parse = {}, CryptoJS, CONST, HLP
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Parse
    CryptoJS = require('../vendor/crypto.js')
    CONST = require('./const.js')
    HLP = require('./helpers.js')
  } else {
    root.OTR.Parse = Parse
    CryptoJS = root.CryptoJS
    CONST = root.OTR.CONST
    HLP = root.OTR.HLP
  }

  // whitespace tags
  var tags = {}
  tags[CONST.WHITESPACE_TAG_V2] = CONST.OTR_VERSION_2
  tags[CONST.WHITESPACE_TAG_V3] = CONST.OTR_VERSION_3

  Parse.parseMsg = function (otr, msg) {

    var ver = []

    // is this otr?
    var start = msg.indexOf(CONST.OTR_TAG)
    if (!~start) {

      // restart fragments
      this.initFragment(otr)

      // whitespace tags
      ind = msg.indexOf(CONST.WHITESPACE_TAG)

      if (~ind) {

        msg = msg.split('')
        msg.splice(ind, 16)

        var tag, len = msg.length
        for (; ind < len;) {
          tag = msg.slice(ind, ind + 8).join('')
          if (Object.hasOwnProperty.call(tags, tag)) {
            msg.splice(ind, 8)
            ver.push(tags[tag])
            continue
          }
          ind += 8
        }

        msg = msg.join('')

      }

      return { msg: msg, ver: ver }
    }

    var ind = start + CONST.OTR_TAG.length
    var com = msg[ind]

    // message fragment
    if (com === ',' || com === '|') {
      return this.msgFragment(otr, msg.substring(ind + 1), (com === '|'))
    }

    this.initFragment(otr)

    // query message
    if (~['?', 'v'].indexOf(com)) {

      // version 1
      if (msg[ind] === '?') {
        ver.push(CONST.OTR_VERSION_1)
        ind += 1
      }

      // other versions
      var vers = {
          '2': CONST.OTR_VERSION_2
        , '3': CONST.OTR_VERSION_3
      }
      var qs = msg.substring(ind + 1)
      var qi = qs.indexOf('?')

      if (qi >= 1) {
        qs = qs.substring(0, qi).split('')
        if (msg[ind] === 'v') {
          qs.forEach(function (q) {
            if (Object.hasOwnProperty.call(vers, q)) ver.push(vers[q])
          })
        }
      }

      return { cls: 'query', ver: ver }
    }

    // otr message
    if (com === ':') {

      ind += 1

      var info = msg.substring(ind, ind + 4)
      if (info.length < 4) return { msg: msg }
      info = CryptoJS.enc.Base64.parse(info).toString(CryptoJS.enc.Latin1)

      var version = info.substring(0, 2)
      var type = info.substring(2)

      // supporting otr versions 2 and 3
      if (!otr['ALLOW_V' + HLP.unpackSHORT(version)]) return { msg: msg }

      ind += 4

      var end = msg.substring(ind).indexOf('.')
      if (!~end) return { msg: msg }

      msg = CryptoJS.enc.Base64.parse(msg.substring(ind, ind + end))
      msg = CryptoJS.enc.Latin1.stringify(msg)

      // instance tags
      var instance_tags
      if (version === CONST.OTR_VERSION_3) {
        instance_tags = msg.substring(0, 8)
        msg = msg.substring(8)
      }

      var cls
      if (~['\x02', '\x0a', '\x11', '\x12'].indexOf(type)) {
        cls = 'ake'
      } else if (type === '\x03') {
        cls = 'data'
      }

      return {
          version: version
        , type: type
        , msg: msg
        , cls: cls
        , instance_tags: instance_tags
      }
    }

    // error message
    if (msg.substring(ind, ind + 7) === ' Error:') {
      if (otr.ERROR_START_AKE) {
        otr.sendQueryMsg()
      }
      return { msg: msg.substring(ind + 7), cls: 'error' }
    }

    return { msg: msg }
  }

  Parse.initFragment = function (otr) {
    otr.fragment = { s: '', j: 0, k: 0 }
  }

  Parse.msgFragment = function (otr, msg, v3) {

    msg = msg.split(',')

    // instance tags
    if (v3) {
      var its = msg.shift().split('|')
      var their_it = HLP.packINT(parseInt(its[0], 16))
      var our_it = HLP.packINT(parseInt(its[1], 16))
      if (otr.checkInstanceTags(their_it + our_it)) return  // ignore
    }

    if (msg.length < 4 ||
      isNaN(parseInt(msg[0], 10)) ||
      isNaN(parseInt(msg[1], 10))
    ) return

    var k = parseInt(msg[0], 10)
    var n = parseInt(msg[1], 10)
    msg = msg[2]

    if (n < k || n === 0 || k === 0) {
      this.initFragment(otr)
      return
    }

    if (k === 1) {
      this.initFragment(otr)
      otr.fragment = { k: 1, n: n, s: msg }
    } else if (n === otr.fragment.n && k === (otr.fragment.k + 1)) {
      otr.fragment.s += msg
      otr.fragment.k += 1
    } else {
      this.initFragment(otr)
    }

    if (n === k) {
      msg = otr.fragment.s
      this.initFragment(otr)
      return this.parseMsg(otr, msg)
    }

    return
  }

}).call(this)