/**
 * Implements HTTP UPLOAD (XEP-0363).
 *
 * @namespace jsxc.httpupload
 */
jsxc.httpupload = {
   /** strophe connection */
   conn: null,
   CONST: {
      HTTPUPLOAD: 'urn:xmpp:http:upload'
   },

   /**
    * Initialize httpupload plugin.
    *
    * @private
    * @memberof jsxc.httpupload
    * @param {object} o Options
    */
   init: function(o) {
      var self = jsxc.httpupload;
      self.conn = jsxc.xmpp.conn;

      var options = o || jsxc.options.get('httpupload');

      if (!options || typeof options.server !== 'string') {
         setTimeout(function() {
            self.conn.disco.items(Strophe.getDomainFromJid(self.conn.jid), null, function(items) {
               $(items).find('item').each(function() {
                  var jid = $(this).attr('jid');
                  var discovered = false;

                  self.conn.disco.info(jid, null, function(info) {
                     var uploadFeature = $(info).find('feature[var="' + jsxc.httpupload.CONST.HTTPUPLOAD + '"]');
                     var uploadIdentity = $(info).find('identity[category="store"][type="file"]');

                     if (uploadFeature.length > 0 && uploadIdentity.length > 0) {
                        jsxc.options.set('httpupload', {
                           server: jid,
                           name: $(info).find('identity').attr('name')
                        });

                        discovered = true;

                        self.init();
                     }
                  });

                  return !discovered;
               });
            });
         }, 1000);
         return;
      }
   },

   sendFile: function(jid) {
      var bid = jsxc.jidToBid(jid);

      var msg = $('<div><div><label><input type="file" name="files" /><label></div></div>');
      msg.addClass('jsxc_chatmessage');

      jsxc.gui.window.showOverlay(bid, msg, true);

      msg.find('label').click();

      msg.find('[type="file"]').change(function(ev) {
         var file = ev.target.files[0]; // FileList object

         if (!file) {
            return;
         }

         var attachment = $('<div>');
         attachment.addClass('jsxc_attachment');
         attachment.addClass('jsxc_' + file.type.replace(/\//, '-'));
         attachment.addClass('jsxc_' + file.type.replace(/^([^/]+)\/.*/, '$1'));

         msg.empty().append(attachment);

         if (FileReader && file.type.match(/^image\//)) {
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
            jsxc.httpupload._sendFile(jid, bid, img, file);

            jsxc.gui.window.hideOverlay(bid);

            msg.remove();

         }).appendTo(msg);

         $('<button>').addClass('jsxc_btn jsxc_btn-default').text($.t('Abort')).click(function() {
            jsxc.gui.window.hideOverlay(bid);
         }).appendTo(msg);
      });
   },

   _sendFile: function(jid, bid, img, file){
      var uploadUrl = jsxc.options.get('httpupload').server;
      var iq = $iq({
         to: uploadUrl,
         type: 'get'
      }).c('request', {
         xmlns: jsxc.httpupload.CONST.HTTPUPLOAD
      }).c('filename').t(file.name).up().c('size').t(file.size);

      jsxc.xmpp.conn.sendIQ(iq, function(resIq) {
         var slot = resIq.getElementsByTagName("slot");
         if(slot.length > 0)
         {
            var putUrl = slot[0].getElementsByTagName("put")[0].firstChild.nodeValue;
            $.ajax({
               url:putUrl,
               type:'PUT',
               contentType: 'application/octet-stream',
               data:file,
               crossDomain: true,
               processData:false,
               complete: function(xhr) {
                  if (xhr.readyState === 4) {
                     if (xhr.status === 201) {
                        var uid = Date.parse(new Date()) + ':msg';
                        var message = jsxc.gui.window.postMessage({
                           _uid: uid,
                           bid: bid,
                           direction: 'out',
                           dataType: 'text',
                           attachment: {
                              name: file.name,
                              size: file.size,
                              type: file.type,
                              data: (file.type.match(/^image\//)) ? img.attr('src') : null
                           }
                        });
                        jsxc.gui.window.updateProgress(message, file.size, file.size);
                        jsxc.xmpp.sendMessage(bid, putUrl, uid);
                     }
                  } else {
                     jsxc.warn('ajax put failed');
                  }
               }
            });
         }

      }, function(stanza) {
         jsxc.warn('send iq failed', stanza);
      });
   }
};

$(document).one('attached.jsxc', function() {
   jsxc.httpupload.init();
});
