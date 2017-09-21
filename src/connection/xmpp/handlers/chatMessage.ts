//import {} from '../handler'
import * as NS from '../namespace'
import Log from '../../../util/Log'
import JID from '../../../JID'
import Message from '../../../Message'
import Utils from '../../../util/Utils'
import Translation from '../../../util/Translation'
import Client from '../../../Client'
import Contact from '../../../Contact'
import Notification from '../../../Notification'
import {SOUNDS} from '../../../CONST'
import Pipe from '../../../util/Pipe'

// body.replace(/^\/me /, '<i title="/me">' + Utils.removeHTML(this.sender.getName()) + '</i> ');
const PRESERVE_HANDLER = true;

export default function onChatMessage(stanza: Element): boolean {
   let messageElement = $(stanza);
   let forwardedStanza = $(stanza).find('forwarded' + NS.getFilter('FORWARD'));

   let from = new JID(messageElement.attr('from'));
   let to = new JID(messageElement.attr('to'));
   let account = Client.getAccout(to); //@TODO test if we got an account

   let isForwarded = false;
   let isCarbonCopy = false;
   let carbonStanza;

   if (forwardedStanza.length > 0) {
      messageElement = forwardedStanza.find('> message');
      isForwarded = true;
      carbonStanza = $(stanza).find('> ' + NS.getFilter('CARBONS'));

      if (carbonStanza.length === 0) {
         isCarbonCopy = false;
      } else if (from.bare !== to.bare) {
         // ignore this carbon copy
         return PRESERVE_HANDLER;
      } else {
         isCarbonCopy = true;
      }

      Log.debug('Incoming forwarded message', messageElement);
   } else {
      Log.debug('Incoming message', messageElement);
   }

   let plaintextBody = Utils.removeHTML(messageElement.find('> body').text());
   let htmlBody = messageElement.find('html body[xmlns="' + Strophe.NS.XHTML + '"]');

   if (!plaintextBody || (plaintextBody.match(/\?OTR/i) && isForwarded)) {
      return PRESERVE_HANDLER;
   }

   let messageType = messageElement.attr('type');
   let messageFrom = messageElement.attr('from');
   let messageTo = messageElement.attr('from');
   let messageId = messageElement.attr('id');

   let receiptsRequestElement = messageElement.find("request[xmlns='urn:xmpp:receipts']");

   let delayElement = messageElement.find('delay[xmlns="urn:xmpp:delay"]');
   let stamp = (delayElement.length > 0) ? new Date(delayElement.attr('stamp')) : new Date();
   let peer:JID = from; //@REVIEW do we need peer?

   if (isCarbonCopy) {
      let direction = (carbonStanza.prop('tagName') === 'sent') ? Message.DIRECTION.OUT : Message.DIRECTION.IN;
      peer = new JID(direction === Message.DIRECTION.OUT ? messageTo : messageFrom);

      let message = new Message({
         peer: peer,
         direction: direction,
         plaintextMessage: plaintextBody,
         htmlMessage: htmlBody.html(),
         forwarded: isForwarded,
         stamp: stamp.getTime()
      });
      message.save();

      //@TODO

      return PRESERVE_HANDLER;

   } else if (isForwarded) {
      // Someone forwarded a message to us
//@REVIEW
      plaintextBody = from + ' ' + Translation.t('to') + ' ' + $(stanza).attr('to') + '"' + plaintextBody + '"';

      messageFrom = $(stanza).attr('from');
   }

   let contact:Contact = account.getContact(from);
   if (typeof contact === 'undefined') {
      Log.debug('Sender is not in our contact list')
      // jid not in roster

      // var chat = jsxc.storage.getUserItem('chat', bid) || [];
      //
      // if (chat.length === 0) {
      //    jsxc.notice.add({
      //       msg: $.t('Unknown_sender'),
      //       description: $.t('You_received_a_message_from_an_unknown_sender') + ' (' + bid + ').'
      //    }, 'gui.showUnknownSender', [bid]);
      // }
      //
      // var msg = jsxc.removeHTML(plaintextBody);
      // msg = jsxc.escapeHTML(msg);
      //
      // jsxc.storage.saveMessage(bid, 'in', msg, false, forwarded, stamp);

      return PRESERVE_HANDLER;
   }

   // If we now the full jid, we use it
   contact.setResource(from.resource);

   $(document).trigger('message.jsxc', [from, plaintextBody]);

   let message = new Message({
      peer: peer,
      direction: Message.DIRECTION.IN,
      plaintextMessage: plaintextBody,
      htmlMessage: htmlBody.html(),
      forwarded: isForwarded,
      stamp: stamp.getTime(),
      // attachment:
   });

   let pipe = Pipe.get('afterReceiveMessage');

   pipe.run(contact, message).then(([contact, message]) => {
      //@REVIEW why is this required at this position
      message.save();

      let chatWindow = account.openChatWindow(contact);
      chatWindow.receiveIncomingMessage(message);
   });

   // if (!forwarded && mid !== null && receiptsRequestElement.length && data !== null && (data.sub === 'both' || data.sub === 'from') && messageType === 'chat') {
   //    // Send received according to XEP-0184
   //    jsxc.xmpp.conn.send($msg({
   //       to: from
   //    }).c('received', {
   //       xmlns: 'urn:xmpp:receipts',
   //       id: mid
   //    }));
   // }

   // var attachment;
   // if (htmlBody.length === 1) {
   //    var httpUploadElement = htmlBody.find('a[data-type][data-name][data-size]');
   //
   //    if (httpUploadElement.length === 1) {
   //       attachment = {
   //          type: httpUploadElement.attr('data-type'),
   //          name: httpUploadElement.attr('data-name'),
   //          size: httpUploadElement.attr('data-size'),
   //       };
   //
   //       if (httpUploadElement.attr('data-thumbnail') && httpUploadElement.attr('data-thumbnail').match(/^\s*data:[a-z]+\/[a-z0-9-+.*]+;base64,[a-z0-9=+/]+$/i)) {
   //          attachment.thumbnail = httpUploadElement.attr('data-thumbnail');
   //       }
   //
   //       if (httpUploadElement.attr('href') && httpUploadElement.attr('href').match(/^https:\/\//)) {
   //          attachment.data = httpUploadElement.attr('href');
   //          plaintextBody = null;
   //       }
   //
   //       if (!attachment.type.match(/^[a-z]+\/[a-z0-9-+.*]+$/i) || !attachment.name.match(/^[\s\w.,-]+$/i) || !attachment.size.match(/^\d+$/i)) {
   //          attachment = undefined;
   //
   //          jsxc.warn('Invalid file type, name or size.');
   //       }
   //    }
   // }

   // if (jsxc.otr.objects.hasOwnProperty(bid) && plaintextBody) {
   //    // @TODO check for file upload url after decryption
   //    jsxc.otr.objects[bid].receiveMsg(plaintextBody, {
   //       stamp: stamp,
   //       forwarded: forwarded,
   //       attachment: attachment
   //    });
   // } else {
   //    jsxc.gui.window.postMessage({
   //       bid: bid,
   //       direction: jsxc.Message.IN,
   //       msg: plaintextBody,
   //       encrypted: false,
   //       forwarded: forwarded,
   //       stamp: stamp,
   //       attachment: attachment
   //    });
   // }

   return PRESERVE_HANDLER;
}
