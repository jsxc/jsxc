import JID from '../JID'
import Message from '../Message'
import { AbstractPlugin } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Pipe from '../util/Pipe'
import * as Namespace from '../connection/xmpp/namespace'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

let PRESERVE_HANDLER = true;
let REMOVE_HANDLER = false;

export default class ReceiptPlugin extends AbstractPlugin {

   public static getName(): string {
      return 'receipt';
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      Namespace.register('RECEIPTS', 'urn:xmpp:receipts');
      pluginAPI.addFeature(Namespace.get('RECEIPTS'));

      let preSendMessageStanzaPipe = Pipe.get('preSendMessageStanza');
      preSendMessageStanzaPipe.addProcessor(this.preSendMessageStanzaProcessor);

      let connection = pluginAPI.getConnection();

      connection.registerHandler(this.onReceiptRequest, null, 'message', 'chat');
      connection.registerHandler(this.onReceipt, null, 'message');
   }

   private preSendMessageStanzaProcessor = (message: Message, xmlStanza: Strophe.Builder) => {
      if (message.getType() === Message.MSGTYPE.CHAT &&
         (!message.getPeer().resource || true)) { //@TODO this.hasFeatureByJid(message.receiver, Strophe.NS.RECEIPTS)
         // Add request according to XEP-0184
         xmlStanza.c('request', {
            xmlns: Namespace.get('RECEIPTS')
         }).up();
      }

      return [message, xmlStanza];
   }

   private onReceipt = (stanza) => {
      //@REVIEW why are we not able to register a handler with those params?
      let receivedElement = $(stanza).find('received[xmlns="urn:xmpp:receipts"]');

      if (receivedElement.length !== 1) {
         return PRESERVE_HANDLER;
      }

      let receivedId = receivedElement.attr('id');

      if (receivedId) {
         let message = new Message(receivedId);

         message.received();
      }

      return PRESERVE_HANDLER;
   }

   private onReceiptRequest = (stanza: string) => {
      console.log('onReceiptRequest')
      let messageElement = $(stanza);
      let isReceiptRequest = messageElement.find("request[xmlns='urn:xmpp:receipts']").length > 0;

      if (!isReceiptRequest) {
         return PRESERVE_HANDLER;
      }

      //@REVIEW is ^=urn:xmpp:forward: not enough?
      let isForwarded = messageElement.find('forwarded[xmlns="urn:xmpp:forward:0"]').length > 0;

      if (isForwarded) {
         return PRESERVE_HANDLER;
      }

      let messageId = messageElement.attr('id');

      if (!messageId) {
         return PRESERVE_HANDLER;
      }

      let from = messageElement.attr('from');

      if (!from) {
         return PRESERVE_HANDLER;
      }

      let contact = this.pluginAPI.getContact(new JID(from));

      if (!contact) {
         return PRESERVE_HANDLER;
      }

      let subscription = contact.getSubscription();

      if (subscription === 'both' || subscription === 'from') {
         // Send received according to XEP-0184
         this.pluginAPI.send($msg({
            to: from
         }).c('received', {
            xmlns: 'urn:xmpp:receipts',
            id: messageId
         }));
      }

      return PRESERVE_HANDLER;
   }
}
