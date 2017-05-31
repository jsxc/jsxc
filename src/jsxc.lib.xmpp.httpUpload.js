/**
 * Implements Http File Upload (XEP-0363)
 *
 * @namespace jsxc.xmpp.httpUpload
 * @see {@link http://xmpp.org/extensions/xep-0363.html}
 */
jsxc.xmpp.httpUpload = {
   conn: null,

   ready: false,

   CONST: {
      NS: {
         HTTPUPLOAD: 'urn:xmpp:http:upload'
      }
   }
};

/**
 * Set up http file upload.
 *
 * @memberOf jsxc.xmpp.httpUpload
 * @param  {Object} o options
 */
jsxc.xmpp.httpUpload.init = function(o) {
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
      self.ready = true;

      return;
   }

   var caps = jsxc.xmpp.conn.caps;
   var domain = jsxc.xmpp.conn.domain;

   if (!caps || !domain || typeof caps._knownCapabilities[caps._jidVerIndex[domain]] === 'undefined') {
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

   self.discoverUploadService();
};

/**
 * Discover upload service for http upload.
 *
 * @memberOf jsxc.xmpp.httpUpload
 */
jsxc.xmpp.httpUpload.discoverUploadService = function() {
   var self = jsxc.xmpp.httpUpload;
   var domain = self.conn.domain;

   jsxc.debug('discover http upload service');

   if (jsxc.xmpp.conn.caps.hasFeatureByJid(domain, self.CONST.NS.HTTPUPLOAD)) {
      self.queryItemForUploadService(domain);
   }

   self.conn.disco.items(domain, null, function(items) {
      $(items).find('item').each(function() {
         var jid = $(this).attr('jid');

         if (self.ready) {
            // abort, because we already found a service
            return false;
         }

         self.queryItemForUploadService(jid);
      });
   });
};

/**
 * Query item for upload service.
 *
 * @param {String} jid
 * @param {Function} cb Callback on success
 * @memberOf jsxc.xmpp.httpUpload
 */
jsxc.xmpp.httpUpload.queryItemForUploadService = function(jid, cb) {
   var self = jsxc.xmpp.httpUpload;

   jsxc.debug('query ' + jid + ' for upload service');

   self.conn.disco.info(jid, null, function(info) {
      var httpUploadFeature = $(info).find('feature[var="' + self.CONST.NS.HTTPUPLOAD + '"]');
      var httpUploadMaxSize = $(info).find('field[var="max-file-size"]');

      if (httpUploadFeature.length > 0) {
         jsxc.debug('http upload service found on ' + jid);

         jsxc.options.set('httpUpload', {
            server: jid,
            name: $(info).find('identity').attr('name'),
            maxSize: parseInt(httpUploadMaxSize.text()) || -1
         });

         self.ready = true;

         if (typeof cb === 'function') {
            cb.call(info);
         }
      }
   });
};

/**
 * Upload file and send link to peer.
 *
 * @memberOf jsxc.xmpp.httpUpload
 * @param  {File} file
 * @param  {Message} message Preview message
 */
jsxc.xmpp.httpUpload.sendFile = function(file, message) {
   jsxc.debug('Send file via http upload');

   var self = jsxc.xmpp.httpUpload;

   // even if the link is encrypted the file isn't
   message.encrypted = false;

   self.requestSlot(file, function(data) {
      if (!data) {
         // general error
         jsxc.warn('Unknown error occured. Please check the debug log.');
      } else if (data.error) {
         // specific error
         jsxc.warn('The xmpp server responded with an error of the type "' + data.error.type + '"');

         message.getDOM().remove();

         jsxc.gui.window.postMessage({
            bid: message.bid,
            direction: jsxc.Message.SYS,
            msg: data.error.text
         });

         message.delete();
      } else if (data.get && data.put) {
         jsxc.debug('slot received, start upload to ' + data.put);

         self.uploadFile(data.put, file, message, function() {
            var attachment = message.attachment;
            var metaString = attachment.type + '|' + attachment.size + '|' + attachment.name;
            var a = $('<a>');
            a.attr('href', data.get);

            attachment.data = data.get;

            if (attachment.thumbnail) {
               var img = $('<img>');
               img.attr('alt', 'Preview:' + metaString);
               img.attr('src', attachment.thumbnail);
               a.prepend(img);
            } else {
               a.text(metaString);
            }

            message.msg = data.get;
            message.htmlMsg = $('<span>').append(a).html();
            message.type = jsxc.Message.HTML;
            jsxc.gui.window.postMessage(message);
         });
      }
   });
};

/**
 * Upload the given file to the given url.
 *
 * @memberOf jsxc.xmpp.httpUpload
 * @param  {String} url upload url
 * @param  {File} file
 * @param  {Message} message preview message
 * @param  {Function} success_cb callback on successful transition
 */
jsxc.xmpp.httpUpload.uploadFile = function(url, file, message, success_cb) {
   $.ajax({
      url: url,
      type: 'PUT',
      contentType: 'application/octet-stream',
      data: file,
      processData: false,
      xhr: function() {
         var xhr = $.ajaxSettings.xhr();

         // track upload progress
         xhr.upload.onprogress = function(ev) {
            if (ev.lengthComputable) {
               jsxc.gui.window.updateProgress(message, ev.loaded, ev.total);
            }
         };
         return xhr;
      },
      success: function() {
         jsxc.debug('file successful uploaded');

         // In case that upload progress is not available, inform user
         jsxc.gui.window.updateProgress(message, 1, 1);

         if (success_cb) {
            success_cb();
         }
      },
      error: function() {
         jsxc.warn('error while uploading file to ' + url);

         message.error = 'Could not upload file';
         jsxc.gui.window.postMessage(message);
      }
   });
};

/**
 * Request upload slot.
 *
 * @memberOf jsxc.xmpp.httpUpload
 * @param  {File} file
 * @param  {Function} cb Callback after finished request
 */
jsxc.xmpp.httpUpload.requestSlot = function(file, cb) {
   var self = jsxc.xmpp.httpUpload;
   var options = jsxc.options.get('httpUpload');

   if (!options || !options.server) {
      jsxc.warn('could not request upload slot, because I am not aware of a server or http upload is disabled');

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
   }, function(stanza) {
      self.failedRequestSlotCB(stanza, cb);
   });
};

/**
 * Process successful response to slot request.
 *
 * @memberOf jsxc.xmpp.httpUpload
 * @param {String} stanza
 * @param {Function} cb
 */
jsxc.xmpp.httpUpload.successfulRequestSlotCB = function(stanza, cb) {
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
      self.failedRequestSlotCB(stanza, cb);
   }
};

/**
 * Process failed response to slot request.
 *
 * @memberOf jsxc.xmpp.httpUpload
 * @param  {String} stanza
 * @param  {Function} cb
 */
jsxc.xmpp.httpUpload.failedRequestSlotCB = function(stanza, cb) {
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

   cb({
      error: error
   });
};

$(document).on('stateUIChange.jsxc', function(ev, state) {
   if (state === jsxc.CONST.UISTATE.INITIATING) {
      jsxc.xmpp.httpUpload.init();
   }
});
