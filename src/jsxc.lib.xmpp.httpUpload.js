/**
 * Implements Http File Upload (XEP-0363)
 *
 * @namespace jsxc.xmpp.httpUpload
 * @see {@link http://xmpp.org/extensions/xep-0363.html}
 */
jsxc.xmpp.httpUpload = {
   conn: null,

   CONST: {
      NS: {
         HTTPUPLOAD: 'urn:xmpp:http:upload'
      }
   },

   init: function(o) {
      var self = jsxc.xmpp.httpUpload;
      self.conn = jsxc.xmpp.conn;

      var fileTransferOptions = jsxc.options.get('fileTransfer') || {};
      var options = o || jsxc.options.get('httpUpload');

      if (!fileTransferOptions.httpUpload.enable) {
         jsxc.debug('http upload disabled');

         jsxc.options.set('httpUpload', false);

         return;
      }

      if (options && options.server) {
         return;
      }

      var caps = jsxc.xmpp.conn.caps;
      var domain = jsxc.xmpp.conn.domain;

      if (typeof caps._knownCapabilities[caps._jidVerIndex[domain]] === 'undefined') {
         jsxc.debug('Waiting for server capabilities');

         $(document).on('caps.strophe', function onCaps(ev, from) {

            if (from !== domain) {
               return;
            }

            self.init();

            $(document).off('caps.strophe', onCaps);
         });

         return;
      }

      if (caps.hasFeatureByJid(domain, self.CONST.NS.HTTPUPLOAD)) {
         self.discoverUploadService();
      } else {
         jsxc.debug(domain + ' does not support http upload');
      }
   },

   discoverUploadService: function() {
      var self = jsxc.xmpp.httpUpload;

      jsxc.debug('discover http upload service');

      self.conn.disco.items(self.conn.domain, null, function(items) {
         $(items).find('item').each(function() {
            var jid = $(this).attr('jid');
            var discovered = false;

            self.conn.disco.info(jid, null, function(info) {
               var httpUploadFeature = $(info).find('feature[var="' + self.CONST.NS.HTTPUPLOAD + '"]');
               var httpUploadMaxSize = $(info).find('field[var="max-file-size"]');

               if (httpUploadFeature.length > 0) {
                  jsxc.debug('http upload service found', jid);

                  jsxc.options.set('httpUpload', {
                     server: jid,
                     name: $(info).find('identity').attr('name'),
                     maxSize: httpUploadMaxSize.text()
                  });

                  discovered = true;
               }
            });

            return !discovered;
         });
      });
   },

   sendFile: function(file, message) {
      var self = jsxc.xmpp.httpUpload;

      self.requestSlot(file, function(data) {
         if (!data) {
            jsxc.warn('Unknown error occured. Please check the debug log.');
         } else if (data.error) {
            jsxc.warn('The xmpp server responded with an error of the type "' + data.error.type + '"');

            //@TODO display error message
         } else if (data.get && data.put) {
            self.uploadFile(data.put, file, message);
         }
      });
   },

   /**
    * Upload the given file to the given url.
    */
   uploadFile: function(url, file, message) {
      $.ajax({
         url: url,
         type: 'POST',
         contentType: 'application/octet-stream',
         data: file,
         processData: false,
         xhr: function() {
            var xhr = $.ajaxSettings.xhr();

            xhr.upload.onprogress = function(ev) {
               if (ev.lengthComputable) {
                  jsxc.gui.window.updateProgress(message, ev.loaded, ev.total);
               }
            };
            return xhr;
         },
         success: function() {

            // In case that upload progress is not available, inform user
            // @TODO modify updateProgress to not mark this message as received
            jsxc.gui.window.updateProgress(message, 1, 1);

            message.msg = url;
            jsxc.gui.window.postMessage(message);

            jsxc.debug('file successful uploaded');
         },
         error: function() {
            // @TODO display error message
            jsxc.debug('error while uploading file');
         }
      });
   },

   /**
    * Request upload slot
    */
   requestSlot: function(file, cb) {
      var self = jsxc.xmpp.httpUpload;
      var options = jsxc.options.get('httpUpload');

      if (!options || !options.server) {
         jsxc.warn('could not request upload slot, because I am not aware of a server');

         return;
      }

      var iq = $iq({
            to: options.server,
            type: 'get'
         }).c('request', {
            xmlns: self.CONST.NS.HTTPUPLOAD
         }).c('filename').t(file.name)
         .up()
         .c('size').t(file.size);

      self.conn.sendIQ(iq, function(stanza) {
         self.successfulRequestSlotCB(stanza, cb);
      }, function() {
         jsxc.warn('error while sending iq');

         cb();
      });
   },

   /**
    * Process successful response to slot request.
    */
   successfulRequestSlotCB: function(stanza, cb) {
      var self = jsxc.xmpp.httpUpload;
      var slot = $(stanza).find('slot[xmlns="' + self.CONST.NS.HTTPUPLOAD + '"]');

      if (slot.length > 0) {
         var put = slot.find('put').text();
         var get = slot.find('get').text();

         cb({
            put: put,
            get: get
         });
      } else {
         if ($(stanza).find('error').length <= 0) {
            jsxc.warn('response does not contain a slot element');

            cb();

            return;
         }

         var error = {
            type: $(stanza).find('error').attr('type') || 'unknown',
            text: $(stanza).find('error text').text()
         };

         if ($(stanza).find('error not-acceptable')) {
            error.reason = 'not-acceptable';
         } else if ($(stanza).find('error resource-constraint')) {
            error.reason = 'resource-constraint';
         } else if ($(stanza).find('error not-allowed')) {
            error.reason = 'not-allowed';
         }

         cb(error);
      }
   }
};
