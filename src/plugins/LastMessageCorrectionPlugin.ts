import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import Translation from '@util/Translation';
import * as Namespace from '@connection/xmpp/namespace';
import { IContact } from '@src/Contact.interface';
import { IMessage } from '@src/Message.interface';
import Message from '@src/Message';

/**
 * XEP-0308: Last Message Correction
 *
 * @version: 1.2.0
 * @see: https://xmpp.org/extensions/xep-0308.html
 *
 */

const CORRECTION_CMD = '/fix';
const LMC = 'urn:xmpp:message-correct:0';

const MIN_VERSION = '4.3.0';
const MAX_VERSION = '99.0.0';

Namespace.register('LAST_MSG_CORRECTION', LMC);

export default class LastMessageCorrectionPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'lmc';
   }

   public static getName(): string {
      return 'Last Message Correction';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-lmc-enable'),
         xeps: [
            {
               id: 'XEP-0308',
               name: 'Last Message Correction',
               version: '1.2.0',
            },
         ],
      };
   }

   private correctionRequests: { [contactUid: string]: IMessage } = {};

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.addAfterReceiveMessageProcessor(this.checkMessageCorrection, 90);

      pluginAPI.registerCommand(
         CORRECTION_CMD,
         async (args, contact, messageString) => {
            const originalMessage = contact.getTranscript().getFirstOutgoingMessage();

            this.correctionRequests[contact.getUid()] = originalMessage;

            if (!originalMessage) {
               return false;
            }

            const chatWindow = contact.getChatWindow();
            const message = new Message({
               peer: contact.getJid(),
               direction: Message.DIRECTION.OUT,
               type: contact.getType(),
               plaintextMessage: messageString.replace(/^\/fix /, ''),
               attachment: chatWindow.getAttachment(),
               unread: false,
               original: originalMessage.getUid(),
            });

            contact.getTranscript().pushMessage(message);

            chatWindow.clearAttachment();

            let pipe = contact.getAccount().getPipe('preSendMessage');

            return pipe
               .run(contact, message)
               .then(([contact, message]) => {
                  originalMessage.getLastVersion().setReplacedBy(message);

                  contact.getAccount().getConnection().sendMessage(message);

                  return true;
               })
               .catch(err => {
                  this.pluginAPI.Log.warn('Error during preSendMessage pipe', err);

                  return false;
               });
         },
         'cmd_correction'
      );

      pluginAPI.addPreSendMessageStanzaProcessor(async (message, xmlMsg) => {
         const contact = this.pluginAPI.getContact(message.getPeer());
         const originalMessage = this.correctionRequests[contact.getUid()];

         if (!originalMessage || originalMessage.getLastVersion().getUid() !== message.getUid()) {
            return [message, xmlMsg];
         }

         xmlMsg
            .c('replace', {
               xmlns: LMC,
               id: originalMessage.getAttrId(),
            })
            .up();

         return [message, xmlMsg];
      }, 90);
   }

   // review carbon copy
   private checkMessageCorrection = async (
      contact: IContact,
      message: IMessage,
      stanza: Element
   ): Promise<[IContact, IMessage, Element]> => {
      const replaceElement = $(stanza).find(`>replace[xmlns="${LMC}"]`);

      if (replaceElement.length === 0) {
         return [contact, message, stanza];
      }

      const attrIdToBeReplaced = replaceElement.attr('id');

      if (!attrIdToBeReplaced) {
         return [contact, message, stanza];
      }

      const firstIncomingMessage = contact.getTranscript().getFirstIncomingMessage();

      if (firstIncomingMessage && firstIncomingMessage.getAttrId() === attrIdToBeReplaced) {
         message.setOriginal(firstIncomingMessage);

         contact.getTranscript().pushMessage(message);

         firstIncomingMessage.getLastVersion().setReplacedBy(message);

         return [contact, undefined, stanza];
      }

      return [contact, message, stanza];
   };
}
