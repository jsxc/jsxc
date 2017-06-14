/**
 * @namespace jsxc.fileTransfer
 * @type {Object}
 */
jsxc.fileTransfer = {};

/**
 * Make bytes more human readable.
 *
 * @memberOf jsxc.fileTransfer
 * @param  {Integer} byte
 * @return {String}
 */
jsxc.fileTransfer.formatByte = function(byte) {
   var s = ['', 'KB', 'MB', 'GB', 'TB'];
   var i;

   for (i = 1; i < s.length; i++) {
      if (byte < 1024) {
         break;
      }
      byte /= 1024;
   }

   return (Math.round(byte * 10) / 10) + s[i - 1];
};

/**
 * Start file transfer dialog.
 *
 * @memberOf jsxc.fileTransfer
 * @param  {String} jid
 */
jsxc.fileTransfer.startGuiAction = function(jid) {
   var bid = jsxc.jidToBid(jid);
   var res = Strophe.getResourceFromJid(jid);

   if (!res && !jsxc.xmpp.httpUpload.ready) {
      if (jsxc.fileTransfer.isWebrtcCapable(bid)) {
         jsxc.fileTransfer.selectResource(bid, jsxc.fileTransfer.startGuiAction);
      } else {
         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.SYS,
            msg: $.t('No_proper_file_transfer_method_available')
         });
      }

      return;
   }

   jsxc.fileTransfer.showFileSelection(jid);
};

/**
 * Show select dialog for file transfer capable resources.
 *
 * @memberOf jsxc.fileTransfer
 * @param  {String} bid
 * @param  {Function} success_cb Called if user selects resource
 * @param  {Function} error_cb Called if no resource was found or selected
 */
jsxc.fileTransfer.selectResource = function(bid, success_cb, error_cb) {
   var win = jsxc.gui.window.get(bid);
   var jid = win.data('jid');
   var res = Strophe.getResourceFromJid(jid);

   var fileCapableRes = jsxc.webrtc.getCapableRes(jid, jsxc.webrtc.reqFileFeatures);
   var resources = Object.keys(jsxc.storage.getUserItem('res', bid)) || [];

   if (res === null && resources.length === 1 && fileCapableRes.length === 1) {
      // only one resource is available and this resource is also capable to receive files
      res = fileCapableRes[0];
      jid = bid + '/' + res;

      success_cb(jid);
   } else if (fileCapableRes.indexOf(res) >= 0) {
      // currently used resource is capable to receive files
      success_cb(bid + '/' + res);
   } else if (fileCapableRes.indexOf(res) < 0) {
      // show selection dialog
      jsxc.gui.window.selectResource(bid, $.t('Your_contact_uses_multiple_clients_'), function(data) {
         if (data.status === 'unavailable') {
            jsxc.gui.window.hideOverlay(bid);

            if (typeof error_cb === 'function') {
               error_cb();
            }
         } else if (data.status === 'selected') {
            success_cb(bid + '/' + data.result);
         }
      }, fileCapableRes);
   }
};

/**
 * Show file selector.
 *
 * @memberOf jsxc.fileTransfer
 * @param  {String} jid
 */
jsxc.fileTransfer.showFileSelection = function(jid) {
   var bid = jsxc.jidToBid(jid);
   var msg = $('<div><div><label><input type="file" name="files" /><label></div></div>');
   msg.addClass('jsxc_chatmessage');

   jsxc.gui.window.showOverlay(bid, msg, true);

   // open file selection for user
   msg.find('label').click();

   msg.find('[type="file"]').change(function(ev) {
      var file = ev.target.files[0]; // FileList object

      if (!file) {
         return;
      }

      jsxc.fileTransfer.fileSelected(jid, msg, file);
   });
};

jsxc.fileTransfer.showFileTooLarge = function(bid, file) {
   var maxSize = jsxc.fileTransfer.formatByte(jsxc.options.get('httpUpload').maxSize);
   var fileSize = jsxc.fileTransfer.formatByte(file.size);

   jsxc.gui.window.postMessage({
      bid: bid,
      direction: jsxc.Message.SYS,
      msg: $.t('File_too_large') + ' (' + fileSize + ' > ' + maxSize + ')'
   });

   jsxc.gui.window.hideOverlay(bid);
};

/**
 * Callback for file selector.
 *
 * @memberOf jsxc.fileTransfer
 * @param  {String} jid
 * @param  {jQuery} msg jQuery object of temporary file message
 * @param  {File} file selected file
 */
jsxc.fileTransfer.fileSelected = function(jid, msg, file) {
   var bid = jsxc.jidToBid(jid);
   var httpUploadOptions = jsxc.options.get('httpUpload') || {};
   var maxSize = httpUploadOptions.maxSize || -1;

   if (file.transportMethod !== 'webrtc' && jsxc.xmpp.httpUpload.ready && maxSize >= 0 && file.size > maxSize) {
      jsxc.debug('File too large for http upload.');

      if (jsxc.fileTransfer.isWebrtcCapable(bid)) {
         // try data channels
         file.transportMethod = 'webrtc';

         jsxc.fileTransfer.selectResource(bid, function(jid) {
            jsxc.fileTransfer.fileSelected(jid, msg, file);
         }, function() {
            jsxc.fileTransfer.showFileTooLarge(bid, file);
         });
      } else {
         jsxc.fileTransfer.showFileTooLarge(bid, file);
      }

      return;
   } else if (!jsxc.xmpp.httpUpload.ready && Strophe.getResourceFromJid(jid)) {
      // http upload not available
      file.transportMethod = 'webrtc';
   }

   var attachment = $('<div>');
   attachment.addClass('jsxc_attachment');
   attachment.addClass('jsxc_' + file.type.replace(/\//, '-'));
   attachment.addClass('jsxc_' + file.type.replace(/^([^/]+)\/.*/, '$1'));

   msg.empty().append(attachment);

   if (FileReader && file.type.match(/^image\//)) {
      // show image preview
      var img = $('<img alt="preview">').attr('title', file.name);
      img.attr('src', jsxc.options.get('root') + '/img/loading.gif');
      img.appendTo(attachment);

      var reader = new FileReader();

      reader.onload = function() {
         img.attr('src', reader.result);
      };

      reader.readAsDataURL(file);
   } else {
      attachment.text(file.name + ' (' + file.size + ' byte)');
   }

   $('<button>').addClass('jsxc_btn jsxc_btn-primary').text($.t('Send')).click(function() {
      // user confirmed file transfer
      jsxc.gui.window.hideOverlay(bid);
      msg.remove();

      var message = jsxc.gui.window.postMessage({
         bid: bid,
         direction: 'out',
         attachment: {
            name: file.name,
            size: file.size,
            type: file.type,
            data: (file.type.match(/^image\//)) ? img.attr('src') : null
         }
      });

      if (file.transportMethod === 'webrtc') {
         var sess = jsxc.webrtc.sendFile(jid, file);

         sess.sender.on('progress', function(sent, size) {
            jsxc.gui.window.updateProgress(message, sent, size);

            if (sent === size) {
               message.received();
            }
         });
      } else {
         // progress is updated in xmpp.httpUpload.uploadFile
         jsxc.xmpp.httpUpload.sendFile(file, message);
      }
   }).appendTo(msg);

   $('<button>').addClass('jsxc_btn jsxc_btn-default').text($.t('Abort')).click(function() {
      // user aborted file transfer
      jsxc.gui.window.hideOverlay(bid);
   }).appendTo(msg);
};

/**
 * Enable/disable icons for file transfer.
 *
 * @memberOf jsxc.fileTransfer
 * @param  {String} bid
 */
jsxc.fileTransfer.updateIcons = function(bid) {
   var win = jsxc.gui.window.get(bid);

   if (!win || win.length === 0 || !jsxc.xmpp.conn) {
      return;
   }

   jsxc.debug('Update file transfer icons for ' + bid);

   if (jsxc.xmpp.httpUpload.ready) {
      win.find('.jsxc_sendFile').removeClass('jsxc_disabled');

      return;
   } else if (!jsxc.fileTransfer.isWebrtcCapable(bid)) {
      win.find('.jsxc_sendFile').addClass('jsxc_disabled');

      return;
   }

   var jid = win.data('jid');
   var res = Strophe.getResourceFromJid(jid);
   var fileCapableRes = jsxc.webrtc.getCapableRes(bid, jsxc.webrtc.reqFileFeatures);
   var resources = Object.keys(jsxc.storage.getUserItem('res', bid) || {}) || [];

   if (fileCapableRes.indexOf(res) > -1 || (res === null && fileCapableRes.length === 1 && resources.length === 1)) {
      win.find('.jsxc_sendFile').removeClass('jsxc_disabled');
   } else {
      win.find('.jsxc_sendFile').addClass('jsxc_disabled');
   }
};

jsxc.fileTransfer.isWebrtcCapable = function(bid) {
   return !jsxc.muc.isGroupchat(bid);
};

$(document).on('update.gui.jsxc', function(ev, bid) {
   jsxc.fileTransfer.updateIcons(bid);
});
