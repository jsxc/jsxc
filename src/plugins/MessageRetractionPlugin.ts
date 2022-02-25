import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import Translation from '@util/Translation';
import * as Namespace from '@connection/xmpp/namespace';
import { IContact } from '@src/Contact.interface';
import { IMessage } from '@src/Message.interface';
import Message from '@src/Message';

/**
 * XEP-0424: Message Retraction
 *
 * @version: 0.3.0
 * @see: https://xmpp.org/extensions/xep-0424.html
 *
 */

const RETRACT_CMD = '/del';
const MR = 'urn:xmpp:message-retract:0';

const MIN_VERSION = '4.3.0';
const MAX_VERSION = '99.0.0';

Namespace.register('MESSAGE_RETRACTION', MR);

export default class MessageRetractionPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'mr';
   }

   public static getName(): string {
      return 'Message Retraction';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-mr-enable'),
         xeps: [
            {
               id: 'XEP-0424',
               name: 'Message Retraction',
               version: '0.3.0',
            },
         ],
      };
   }

   private retractionRequests: { [contactUid: string]: IMessage } = {};

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.registerCommand(RETRACT_CMD, this.commandHandler, 'cmd_retraction');

      pluginAPI.addPreSendMessageStanzaProcessor(this.addRetractElementToStanza, 89);

      pluginAPI.addAfterReceiveMessageProcessor(this.checkMessageRetraction, 89);

      pluginAPI.registerChatMessageMenuItem({
         generate: this.generateRetractMessageMenuItem,
      });
   }

   private commandHandler = async (args: string[], contact: IContact, messageString: string) => {
      const originalMessage = contact.getTranscript().getFirstOutgoingMessage();

      this.retractionRequests[contact.getUid()] = originalMessage;

      if (!originalMessage || !contact.isChat()) {
         return false;
      }

      const chatWindow = contact.getChatWindow();
      const message = new Message({
         peer: contact.getJid(),
         direction: Message.DIRECTION.OUT,
         type: contact.getType(),
         plaintextMessage: "This person attempted to retract a previous message, but it's unsupported by your client.",
         attachment: chatWindow.getAttachment(),
         unread: false,
         original: originalMessage.getUid(),
      });
      message.setRetractedBy(message); //mark retracted to know when updating rosteritem that this is a retraction
      contact.getTranscript().pushMessage(message);

      chatWindow.clearAttachment();

      let pipe = contact.getAccount().getPipe('preSendMessage');

      return pipe
         .run(contact, message)
         .then(([contact, message]) => {
            originalMessage.getLastVersion().setReplacedBy(message);
            originalMessage.getLastVersion().setRetractedBy(message);

            contact.getAccount().getConnection().sendMessage(message);

            return true;
         })
         .catch(err => {
            this.pluginAPI.Log.warn('Error during preSendMessage pipe', err);

            return false;
         });
   };

   private addRetractElementToStanza = async (
      message: IMessage,
      xmlMsg: Strophe.Builder
   ): Promise<[IMessage, Strophe.Builder]> => {
      const contact = this.pluginAPI.getContact(message.getPeer());
      const originalMessage = this.retractionRequests[contact.getUid()];

      if (!originalMessage) {
         return [message, xmlMsg];
      }

      delete this.retractionRequests[contact.getUid()];

      $(xmlMsg.tree().getElementsByTagName('origin-id')).remove();
      $(xmlMsg.tree().getElementsByTagName('request')).remove();
      $(xmlMsg.tree().getElementsByTagName('active')).remove();
      $(xmlMsg.tree().getElementsByTagName('markable')).remove();

      xmlMsg
         .c('apply-to', {
            xmlns: 'urn:xmpp:fasten:0',
            id: originalMessage.getAttrId(),
         })
         .c('retract', {
            xmlns: MR,
         })
         .up()
         .up()
         .c('fallback', {
            xmlns: 'urn:xmpp:fallback:0',
         })
         .up()
         .c('store', {
            xmlns: 'urn:xmpp:hints',
         })
         .up();

      return [message, xmlMsg];
   };

   private checkMessageRetraction = async (
      contact: IContact,
      message: IMessage,
      stanza: Element
   ): Promise<[IContact, IMessage, Element]> => {
      const retractElement = $(stanza).find(`apply-to > retract[xmlns="${MR}"]`);

      if (retractElement.length === 0) {
         return [contact, message, stanza];
      }

      const attrIdToBeRetracted = retractElement.parent().attr('id');

      if (!attrIdToBeRetracted) {
         return [contact, message, stanza];
      }

      const messageToBeRetracted = contact.getTranscript().findMessageByAttrId(attrIdToBeRetracted);

      if (messageToBeRetracted && messageToBeRetracted.getAttrId() === attrIdToBeRetracted) {
         message.setOriginal(messageToBeRetracted);
         messageToBeRetracted.getLastVersion().setReplacedBy(message);
         messageToBeRetracted.getLastVersion().setRetractedBy(message);
      }

      return [contact, message, stanza];
   };

   private generateRetractMessageMenuItem = (contact: IContact, message: IMessage) => {
      if (message.isOutgoing()) {
         if (!message.getRetractedBy()) {
            {
               return {
                  id: 'mr-edit',
                  label: '',
                  icon: 'delete',
                  handler: () => {
                     const originalMessage = message;

                     this.retractionRequests[contact.getUid()] = originalMessage;

                     if (!originalMessage || !contact.isChat()) {
                        return false;
                     }

                     const chatWindow = contact.getChatWindow();
                     const retractionmessage = new Message({
                        peer: contact.getJid(),
                        direction: Message.DIRECTION.OUT,
                        type: contact.getType(),
                        plaintextMessage:
                           "This person attempted to retract a previous message, but it's unsupported by your client.",
                        attachment: chatWindow.getAttachment(),
                        unread: false,
                        original: originalMessage.getUid(),
                     });
                     retractionmessage.setRetractedBy(retractionmessage); //mark retracted to know when updating rosteritem that this is a retraction
                     contact.getTranscript().pushMessage(retractionmessage);

                     chatWindow.clearAttachment();

                     let pipe = contact.getAccount().getPipe('preSendMessage');

                     return pipe
                        .run(contact, retractionmessage)
                        .then(([contact, retractionmessage]) => {
                           originalMessage.getLastVersion().setReplacedBy(retractionmessage);
                           originalMessage.getLastVersion().setRetractedBy(retractionmessage);

                           contact.getAccount().getConnection().sendMessage(retractionmessage);

                           return true;
                        })
                        .catch(err => {
                           this.pluginAPI.Log.warn('Error during preSendMessage pipe', err);

                           return false;
                        });
                  },
               };
            }
         }

         return false;
      }
   };
}
