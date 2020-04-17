import JID from '../JID'
import Message from '../Message'
import { AbstractPlugin } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import * as Namespace from '../connection/xmpp/namespace'
import { $msg } from '../vendor/Strophe'
import { IContact } from '@src/Contact.interface';
import Translation from '@util/Translation';

/**
 * XEP-0184: Message Delivery Receipts
 *
 * @version 1.2
 * @see https://xmpp.org/extensions/xep-0184.html
 */

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

let PRESERVE_HANDLER = true;

export default class ReceiptPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'receipts';
   }

   public static getName(): string {
      return 'Message Delivery Receipts';
   }

   public static getDescription(): string {
      return Translation.t('setting-receipts-enable');
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      Namespace.register('RECEIPTS', 'urn:xmpp:receipts');
      pluginAPI.addFeature(Namespace.get('RECEIPTS'));

      pluginAPI.addPreSendMessageStanzaProcessor(this.preSendMessageStanzaProcessor);

      let connection = pluginAPI.getConnection();

      connection.registerHandler(this.onMessage, null, 'message');
      connection.registerHandler(this.onReceiptRequest, null, 'message', 'chat');
   }

   private preSendMessageStanzaProcessor = (message: Message, xmlStanza: Strophe.Builder): Promise<any> => {
      if (message.getType() !== Message.MSGTYPE.CHAT) {
         return Promise.resolve([message, xmlStanza]);
      }

      if (message.getPeer().isBare) {
         addRequest();

         return Promise.resolve([message, xmlStanza]);
      }

      let discoRepository = this.pluginAPI.getDiscoInfoRepository();

      return discoRepository.hasFeature(message.getPeer(), [Namespace.get('RECEIPTS')]).then(hasFeature => {
         if (hasFeature) {
            addRequest();
         }

         return [message, xmlStanza];
      });

      function addRequest() {
         // Add request according to XEP-0184
         xmlStanza.c('request', {
            xmlns: Namespace.get('RECEIPTS')
         }).up();
      }
   }

   private onMessage = (stanza) => {
      let stanzaElement = $(stanza);
      let from = stanzaElement.attr('from');
      let contact = from ? this.pluginAPI.getContact(new JID(from)) : undefined;
      let receivedElement = stanzaElement.find('received[xmlns="urn:xmpp:receipts"]');

      if (contact && receivedElement.length === 1) {
         this.onReceipt(contact, receivedElement);
      }

      return PRESERVE_HANDLER;
   }

   private onReceipt = (contact: IContact, receivedElement: JQuery<Element>, tries = 0) => {
      let receivedAttrId = receivedElement.attr('id');

      if (!receivedAttrId) {
         return;
      }

      let message = contact.getTranscript().findMessageByAttrId(receivedAttrId);

      if (message) {
         message.received();
      } else if (tries < 5) {
         setTimeout(() => {
            this.onReceipt(contact, receivedElement, ++tries);
         }, tries * 200);
      }
   }

   private onReceiptRequest = (stanza: string) => {
      let messageElement = $(stanza);
      let isReceiptRequest = messageElement.find('request[xmlns=\'urn:xmpp:receipts\']').length > 0;

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
