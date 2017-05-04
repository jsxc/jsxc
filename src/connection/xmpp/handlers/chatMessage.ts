//import {} from '../handler'
import * as NS from '../namespace'
import Log from '../../../util/Log'
import JID from '../../../JID'

export default function onChatMessage(stanza: Element): boolean {
   let forwardedStanza = $(stanza).find('forwarded' + NS.getFilter('FORWARD'));
   let carbonStanza;
   let message = $(stanza);
   let originalSender = message.attr('from');
   let forwarded = false;
   let carbon = false;

   if (forwardedStanza.length > 0) {
      message = forwardedStanza.find('> message');
      forwarded = true;
      carbonStanza = $(stanza).find('> ' + NS.getFilter('CARBONS'));

      if (carbonStanza.length === 0) {
         carbon = false;
      } else if (originalSender !== Strophe.getBareJidFromJid(jsxc.xmpp.conn.jid)) {
         // ignore this carbon copy
         return true;
      } else {
         carbon = true;
      }

      Log.debug('Incoming forwarded message', message);
   } else {
      Log.debug('Incoming message', message);
   }

   let body = message.find('body:first').text();
   let htmlBody = message.find('body[xmlns="' + Strophe.NS.XHTML + '"]');

   if (!body || (body.match(/\?OTR/i) && forwarded)) {
      return true;
   }

   let type = message.attr('type');
   let from = message.attr('from');
   let messageId = message.attr('id');
   let bid;

   let delay = message.find('delay[xmlns="urn:xmpp:delay"]');
   let stamp = (delay.length > 0) ? new Date(delay.attr('stamp')) : new Date();

   if (carbon) {
      var direction = (carbonStanza.prop("tagName") === 'sent') ? jsxc.Message.OUT : jsxc.Message.IN;
      bid = jsxc.jidToBid((direction === 'out') ? $(message).attr('to') : from);

      jsxc.gui.window.postMessage({
         bid: bid,
         direction: direction,
         msg: body,
         encrypted: false,
         forwarded: forwarded,
         stamp: stamp.getTime()
      });

      return true;

   } else if (forwarded) {
      // Someone forwarded a message to us

      body = from + ' ' + $.t('to') + ' ' + $(stanza).attr('to') + '"' + body + '"';

      from = $(stanza).attr('from');
   }

   var jid = new JID(from);
   var data = jsxc.storage.getUserItem('buddy', bid);
   var request = $(message).find("request[xmlns='urn:xmpp:receipts']");

   if (data === null) {
      // jid not in roster

      var chat = jsxc.storage.getUserItem('chat', bid) || [];

      if (chat.length === 0) {
         jsxc.notice.add({
            msg: $.t('Unknown_sender'),
            description: $.t('You_received_a_message_from_an_unknown_sender') + ' (' + bid + ').'
         }, 'gui.showUnknownSender', [bid]);
      }

      var msg = jsxc.removeHTML(body);
      msg = jsxc.escapeHTML(msg);

      jsxc.storage.saveMessage(bid, 'in', msg, false, forwarded, stamp);

      return true;
   }

   var win = jsxc.gui.window.init(bid);

   // If we now the full jid, we use it
   if (type === 'chat') {
      win.data('jid', from);
      jsxc.storage.updateUserItem('buddy', bid, {
         jid: from
      });
   }

   $(document).trigger('message.jsxc', [from, body]);

   // create related otr object
   if (jsxc.master && !jsxc.otr.objects[bid]) {
      jsxc.otr.create(bid);
   }

   if (!forwarded && mid !== null && request.length && data !== null && (data.sub === 'both' || data.sub === 'from') && type === 'chat') {
      // Send received according to XEP-0184
      jsxc.xmpp.conn.send($msg({
         to: from
      }).c('received', {
         xmlns: 'urn:xmpp:receipts',
         id: mid
      }));
   }

   var attachment;
   if (htmlBody.length === 1) {
      var httpUploadElement = htmlBody.find('a[data-type][data-name][data-size]');

      if (httpUploadElement.length === 1) {
         attachment = {
            type: httpUploadElement.attr('data-type'),
            name: httpUploadElement.attr('data-name'),
            size: httpUploadElement.attr('data-size'),
         };

         if (httpUploadElement.attr('data-thumbnail') && httpUploadElement.attr('data-thumbnail').match(/^\s*data:[a-z]+\/[a-z0-9-+.*]+;base64,[a-z0-9=+/]+$/i)) {
            attachment.thumbnail = httpUploadElement.attr('data-thumbnail');
         }

         if (httpUploadElement.attr('href') && httpUploadElement.attr('href').match(/^https:\/\//)) {
            attachment.data = httpUploadElement.attr('href');
            body = null;
         }

         if (!attachment.type.match(/^[a-z]+\/[a-z0-9-+.*]+$/i) || !attachment.name.match(/^[\s\w.,-]+$/i) || !attachment.size.match(/^\d+$/i)) {
            attachment = undefined;

            jsxc.warn('Invalid file type, name or size.');
         }
      }
   }

   if (jsxc.otr.objects.hasOwnProperty(bid) && body) {
      // @TODO check for file upload url after decryption
      jsxc.otr.objects[bid].receiveMsg(body, {
         stamp: stamp,
         forwarded: forwarded,
         attachment: attachment
      });
   } else {
      jsxc.gui.window.postMessage({
         bid: bid,
         direction: jsxc.Message.IN,
         msg: body,
         encrypted: false,
         forwarded: forwarded,
         stamp: stamp,
         attachment: attachment
      });
   }

   // preserve handler
   return PRESERVE_HANDLER;
}
