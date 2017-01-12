/**
 * @namespace jsxc.otr
 */
jsxc.otr = {
   /** list of otr objects */
   objects: {},

   dsaFallback: null,
   /**
    * Handler for otr receive event
    *
    * @memberOf jsxc.otr
    * @param {Object} d
    * @param {string} d.bid
    * @param {string} d.msg received message
    * @param {boolean} d.encrypted True, if msg was encrypted.
    * @param {boolean} d.forwarded
    * @param {string} d.stamp timestamp
    */
   receiveMessage: function(d) {
      var bid = d.bid;

      if (jsxc.otr.objects[bid].msgstate !== OTR.CONST.MSGSTATE_PLAINTEXT) {
         jsxc.otr.backup(bid);
      }

      if (jsxc.otr.objects[bid].msgstate !== OTR.CONST.MSGSTATE_PLAINTEXT && !d.encrypted) {
         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.SYS,
            msg: $.t('Received_an_unencrypted_message') + '. [' + d.msg + ']',
            encrypted: d.encrypted,
            forwarded: d.forwarded,
            stamp: d.stamp
         });
      } else {
         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.IN,
            msg: d.msg,
            encrypted: d.encrypted,
            forwarded: d.forwarded,
            stamp: d.stamp,
            attachment: d.attachment
         });
      }
   },

   /**
    * Handler for otr send event
    *
    * @param {string} jid
    * @param {string} msg message to be send
    */
   sendMessage: function(jid, msg, message) {
      if (jsxc.otr.objects[jsxc.jidToBid(jid)].msgstate !== 0) {
         jsxc.otr.backup(jsxc.jidToBid(jid));
      }

      jsxc.xmpp._sendMessage(jid, msg, message);
   },

   /**
    * Create new otr instance
    *
    * @param {type} bid
    * @returns {undefined}
    */
   create: function(bid) {

      if (jsxc.otr.objects.hasOwnProperty(bid)) {
         return;
      }

      if (!jsxc.options.otr.priv) {
         return;
      }

      // save list of otr objects
      var ol = jsxc.storage.getUserItem('otrlist') || [];
      if (ol.indexOf(bid) < 0) {
         ol.push(bid);
         jsxc.storage.setUserItem('otrlist', ol);
      }

      jsxc.otr.objects[bid] = new OTR(jsxc.options.otr);

      if (jsxc.options.otr.SEND_WHITESPACE_TAG) {
         jsxc.otr.objects[bid].SEND_WHITESPACE_TAG = true;
      }

      if (jsxc.options.otr.WHITESPACE_START_AKE) {
         jsxc.otr.objects[bid].WHITESPACE_START_AKE = true;
      }

      jsxc.otr.objects[bid].on('status', function(status) {
         var data = jsxc.storage.getUserItem('buddy', bid);

         if (data === null) {
            return;
         }

         switch (status) {
            case OTR.CONST.STATUS_SEND_QUERY:
               jsxc.gui.window.postMessage({
                  bid: bid,
                  direction: jsxc.Message.SYS,
                  msg: $.t('trying_to_start_private_conversation')
               });
               break;
            case OTR.CONST.STATUS_AKE_SUCCESS:
               data.fingerprint = jsxc.otr.objects[bid].their_priv_pk.fingerprint();
               data.msgstate = OTR.CONST.MSGSTATE_ENCRYPTED;

               var msg_state = jsxc.otr.objects[bid].trust ? 'Verified' : 'Unverified';
               var msg = $.t(msg_state + '_private_conversation_started');

               jsxc.gui.window.postMessage({
                  bid: bid,
                  direction: 'sys',
                  msg: msg
               });
               break;
            case OTR.CONST.STATUS_END_OTR:
               data.fingerprint = null;

               if (jsxc.otr.objects[bid].msgstate === OTR.CONST.MSGSTATE_PLAINTEXT) {
                  // we abort the private conversation

                  data.msgstate = OTR.CONST.MSGSTATE_PLAINTEXT;
                  jsxc.gui.window.postMessage({
                     bid: bid,
                     direction: jsxc.Message.SYS,
                     msg: $.t('private_conversation_aborted')
                  });

               } else {
                  // the buddy abort the private conversation

                  data.msgstate = OTR.CONST.MSGSTATE_FINISHED;
                  jsxc.gui.window.postMessage({
                     bid: bid,
                     direction: jsxc.Message.SYS,
                     msg: $.t('your_buddy_closed_the_private_conversation_you_should_do_the_same')
                  });
               }
               break;
            case OTR.CONST.STATUS_SMP_HANDLE:
               jsxc.keepBusyAlive();
               break;
         }

         jsxc.storage.setUserItem('buddy', bid, data);

         // for encryption and verification state
         jsxc.gui.update(bid);
      });

      jsxc.otr.objects[bid].on('smp', function(type, data) {
         switch (type) {
            case 'question': // verification request received
               jsxc.gui.window.postMessage({
                  bid: bid,
                  direction: jsxc.Message.SYS,
                  msg: $.t('Authentication_request_received')
               });

               jsxc.gui.window.smpRequest(bid, data);
               jsxc.storage.setUserItem('smp', bid, {
                  data: data || null
               });

               break;
            case 'trust': // verification completed
               jsxc.otr.objects[bid].trust = data;
               jsxc.storage.updateUserItem('buddy', bid, 'trust', data);
               jsxc.otr.backup(bid);
               jsxc.gui.update(bid);

               if (data) {
                  jsxc.gui.window.postMessage({
                     bid: bid,
                     direction: jsxc.Message.SYS,
                     msg: $.t('conversation_is_now_verified')
                  });
               } else {
                  jsxc.gui.window.postMessage({
                     bid: bid,
                     direction: jsxc.Message.SYS,
                     msg: $.t('authentication_failed')
                  });
               }
               jsxc.storage.removeUserItem('smp', bid);
               jsxc.gui.dialog.close('smp');
               break;
            case 'abort':
               jsxc.gui.window.hideOverlay(bid);
               jsxc.gui.window.postMessage({
                  bid: bid,
                  direction: jsxc.Message.SYS,
                  msg: $.t('Authentication_aborted')
               });
               break;
            default:
               jsxc.debug('[OTR] sm callback: Unknown type: ' + type);
         }
      });

      // Receive message
      jsxc.otr.objects[bid].on('ui', function(msg, encrypted, meta) {
         jsxc.otr.receiveMessage({
            bid: bid,
            msg: msg,
            encrypted: encrypted === true,
            stamp: meta.stamp,
            forwarded: meta.forwarded,
            attachment: meta.attachment
         });
      });

      // Send message
      jsxc.otr.objects[bid].on('io', function(msg, message) {
         var jid = jsxc.gui.window.get(bid).data('jid') || jsxc.otr.objects[bid].jid;

         jsxc.otr.objects[bid].jid = jid;

         jsxc.otr.sendMessage(jid, msg, message);
      });

      jsxc.otr.objects[bid].on('error', function(err) {
         // Handle this case in jsxc.otr.receiveMessage
         if (err !== 'Received an unencrypted message.') {
            jsxc.gui.window.postMessage({
               bid: bid,
               direction: jsxc.Message.SYS,
               msg: '[OTR] ' + $.t(err)
            });
         }

         jsxc.error('[OTR] ' + err);
      });

      jsxc.otr.restore(bid);
   },

   /**
    * show verification dialog with related part (secret or question)
    *
    * @param {type} bid
    * @param {string} [data]
    * @returns {undefined}
    */
   onSmpQuestion: function(bid, data) {
      jsxc.gui.showVerification(bid);

      $('#jsxc_dialog select').prop('selectedIndex', (data ? 2 : 3)).change();
      $('#jsxc_dialog > div:eq(0)').hide();

      if (data) {
         $('#jsxc_dialog > div:eq(2)').find('#jsxc_quest').val(data).prop('disabled', true);
         $('#jsxc_dialog > div:eq(2)').find('.jsxc_submit').text($.t('Answer'));
         $('#jsxc_dialog > div:eq(2)').find('.jsxc_explanation').text($.t('onsmp_explanation_question'));
         $('#jsxc_dialog > div:eq(2)').show();
      } else {
         $('#jsxc_dialog > div:eq(3)').find('.jsxc_explanation').text($.t('onsmp_explanation_secret'));
         $('#jsxc_dialog > div:eq(3)').show();
      }

      $('#jsxc_dialog .jsxc_close').click(function() {
         jsxc.storage.removeUserItem('smp', bid);

         if (jsxc.master) {
            jsxc.otr.objects[bid].sm.abort();
         }
      });
   },

   /**
    * Send verification request to buddy
    *
    * @param {string} bid
    * @param {string} sec secret
    * @param {string} [quest] question
    * @returns {undefined}
    */
   sendSmpReq: function(bid, sec, quest) {
      jsxc.keepBusyAlive();

      jsxc.otr.objects[bid].smpSecret(sec, quest || '');
   },

   /**
    * Toggle encryption state
    *
    * @param {type} bid
    * @returns {undefined}
    */
   toggleTransfer: function(bid) {
      if (typeof OTR !== 'function') {
         return;
      }

      if (jsxc.storage.getUserItem('buddy', bid).msgstate === 0) {
         jsxc.otr.goEncrypt(bid);
      } else {
         jsxc.otr.goPlain(bid);
      }
   },

   /**
    * Send request to encrypt the session
    *
    * @param {type} bid
    * @returns {undefined}
    */
   goEncrypt: function(bid) {
      if (jsxc.master) {
         if (jsxc.otr.objects.hasOwnProperty(bid)) {
            jsxc.otr.objects[bid].sendQueryMsg();
         }
      } else {
         jsxc.storage.updateUserItem('buddy', bid, 'transferReq', 1);
      }
   },

   /**
    * Abort encryptet session
    *
    * @param {type} bid
    * @param cb callback
    * @returns {undefined}
    */
   goPlain: function(bid, cb) {
      if (jsxc.master) {
         if (jsxc.otr.objects.hasOwnProperty(bid)) {
            jsxc.otr.objects[bid].endOtr.call(jsxc.otr.objects[bid], cb);
            jsxc.otr.objects[bid].init.call(jsxc.otr.objects[bid]);

            jsxc.otr.backup(bid);
         }
      } else {
         jsxc.storage.updateUserItem('buddy', bid, 'transferReq', 0);
      }
   },

   /**
    * Backups otr session
    *
    * @param {string} bid
    */
   backup: function(bid) {
      var o = jsxc.otr.objects[bid]; // otr object
      var r = {}; // return value

      if (o === null) {
         return;
      }

      // all variables which should be saved
      var savekey = ['jid', 'our_instance_tag', 'msgstate', 'authstate', 'fragment', 'their_y', 'their_old_y', 'their_keyid', 'their_instance_tag', 'our_dh', 'our_old_dh', 'our_keyid', 'sessKeys', 'storedMgs', 'oldMacKeys', 'trust', 'transmittedRS', 'ssid', 'receivedPlaintext', 'authstate', 'send_interval'];

      var i;
      for (i = 0; i < savekey.length; i++) {
         r[savekey[i]] = JSON.stringify(o[savekey[i]]);
      }

      if (o.their_priv_pk !== null) {
         r.their_priv_pk = JSON.stringify(o.their_priv_pk.packPublic());
      }

      if (o.ake.otr_version && o.ake.otr_version !== '') {
         r.otr_version = JSON.stringify(o.ake.otr_version);
      }

      jsxc.storage.setUserItem('otr', bid, r);
   },

   /**
    * Restore old otr session
    *
    * @param {string} bid
    */
   restore: function(bid) {
      var o = jsxc.otr.objects[bid];
      var d = jsxc.storage.getUserItem('otr', bid);

      if (o !== null || d !== null) {
         var key;
         for (key in d) {
            if (d.hasOwnProperty(key)) {
               var val = JSON.parse(d[key]);
               if (key === 'their_priv_pk' && val !== null) {
                  val = DSA.parsePublic(val);
               }
               if (key === 'otr_version' && val !== null) {
                  o.ake.otr_version = val;
               } else {
                  o[key] = val;
               }
            }
         }

         jsxc.otr.objects[bid] = o;

         if (o.msgstate === 1 && o.their_priv_pk !== null) {
            o._smInit.call(jsxc.otr.objects[bid]);
         }
      }

      jsxc.otr.enable(bid);
   },

   /**
    * Create or load DSA key
    *
    * @returns {unresolved}
    */
   createDSA: function() {
      if (jsxc.options.otr.priv) {
         return;
      }

      if (typeof OTR !== 'function') {
         jsxc.warn('OTR support disabled');

         OTR = {};
         OTR.CONST = {
            MSGSTATE_PLAINTEXT: 0,
            MSGSTATE_ENCRYPTED: 1,
            MSGSTATE_FINISHED: 2
         };

         return;
      }

      if (jsxc.storage.getUserItem('key') === null) {
         var msg = $.t('Creating_your_private_key_');
         var worker = null;

         if (Worker) {
            // try to create web-worker

            try {
               worker = new Worker(jsxc.options.root + '/lib/otr/lib/dsa-webworker.js');
            } catch (err) {
               jsxc.warn('Couldn\'t create web-worker.', err);
            }
         }

         jsxc.otr.dsaFallback = (worker === null);

         if (!jsxc.otr.dsaFallback) {
            // create DSA key in background

            worker.onmessage = function(e) {
               var type = e.data.type;
               var val = e.data.val;

               if (type === 'debug') {
                  jsxc.debug(val);
               } else if (type === 'data') {
                  jsxc.otr.DSAready(DSA.parsePrivate(val));
               }
            };

            jsxc.debug('DSA key creation started.');

            // start worker
            worker.postMessage({
               imports: [jsxc.options.root + '/lib/otr/vendor/salsa20.js', jsxc.options.root + '/lib/otr/vendor/bigint.js', jsxc.options.root + '/lib/otr/vendor/crypto.js', jsxc.options.root + '/lib/otr/vendor/eventemitter.js', jsxc.options.root + '/lib/otr/lib/const.js', jsxc.options.root + '/lib/otr/lib/helpers.js', jsxc.options.root + '/lib/otr/lib/dsa.js'],
               seed: BigInt.getSeed(),
               debug: true
            });

         } else {
            // fallback
            jsxc.xmpp.conn.pause();

            jsxc.gui.dialog.open(jsxc.gui.template.get('waitAlert', null, msg), {
               noClose: true
            });

            jsxc.debug('DSA key creation started in fallback mode.');

            // wait until the wait alert is opened
            setTimeout(function() {
               var dsa = new DSA();
               jsxc.otr.DSAready(dsa);
            }, 500);
         }
      } else {
         jsxc.debug('DSA key loaded');
         jsxc.options.otr.priv = DSA.parsePrivate(jsxc.storage.getUserItem('key'));

         jsxc.otr._createDSA();
      }
   },

   /**
    * Ending of createDSA().
    */
   _createDSA: function() {

      jsxc.storage.setUserItem('priv_fingerprint', jsxc.options.otr.priv.fingerprint());

      $.each(jsxc.storage.getUserItem('windowlist') || [], function(index, val) {
         jsxc.otr.create(val);
      });
   },

   /**
    * Ending of DSA key generation.
    *
    * @param {DSA} dsa DSA object
    */
   DSAready: function(dsa) {
      jsxc.storage.setUserItem('key', dsa.packPrivate());
      jsxc.options.otr.priv = dsa;

      // close wait alert
      if (jsxc.otr.dsaFallback) {
         jsxc.xmpp.conn.resume();
         jsxc.gui.dialog.close();
      }

      jsxc.otr._createDSA();
   },

   enable: function(bid) {
      jsxc.gui.window.get(bid).find('.jsxc_otr').removeClass('jsxc_disabled');
   }
};
