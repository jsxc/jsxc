import { EncryptionState, IMetaData } from '../../plugin/AbstractPlugin'
import PluginAPI from '../../plugin/PluginAPI'
import { EncryptionPlugin } from '../../plugin/EncryptionPlugin'
import Contact from '../../Contact'
import Message from '../../Message'
import Session from './Session'
import DSA from 'otr/lib/dsa'
import Options from '../../Options'

import dsaWebworkerFile = require('otr/build/dsa-webworker.js?path')
import ChatWindow from '@ui/ChatWindow';
import { ContactType, IContact } from '@src/Contact.interface';
import Translation from '@util/Translation';
import VerificationDialog from '@ui/dialogs/verification';
import { DIRECTION } from '@src/Message.interface';

const WHITESPACE_TAG = '\x20\x09\x20\x20\x09\x09\x09\x09\x20\x09\x20\x09\x20\x09\x20\x20';

interface IDSA {
   parsePrivate
   createInWebWorker
   packPrivate
}

Options.addDefaults({
   otr: {
      ERROR_START_AKE: false,
      debug: false,
      SEND_WHITESPACE_TAG: false,
      WHITESPACE_START_AKE: true
   }
});

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

export default class OTRPlugin extends EncryptionPlugin {
   private sessions = {};
   private key: IDSA;

   public static getId(): string {
      return 'otr';
   }

   public static getName(): string {
      return 'OTR';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-otr-enable'),
      }
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.getStorage().registerHook('key', (key) => {
         if (this.key && this.key !== key) {
            this.pluginAPI.Log.warn('Something went wrong. We have two different DSA keys.');
         }

         this.key = key;
      });

      pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor);
      pluginAPI.addPreSendMessageProcessor(this.preSendMessageProcessor);

      pluginAPI.registerChatWindowInitializedHook((chatWindow: ChatWindow) => {
         let contact = chatWindow.getContact();

         if (contact.getType() !== ContactType.CHAT) {
            return;
         }

         let menuEntry = chatWindow.addMenuEntry('otr-verification', 'OTR ' + Translation.t('Verification'), () => this.openVerificationDialog(contact));
         this.updateMenuEntry(contact, menuEntry);

         contact.registerHook('encryptionState', () => {
            this.updateMenuEntry(contact, menuEntry);
         })
      });

      pluginAPI.registerTextFormatter(this.textFormatter);
   }

   public toggleTransfer(contact: Contact): Promise<void> {
      return this.getSession(contact).then((session: Session) => {
         if (session.isEnded()) {
            return session.end();
         } else if (session.isEncrypted()) {
            return session.goPlain();
         } else {
            return session.goEncrypted();
         }
      });
   }

   private textFormatter = (plaintext: string, direction: DIRECTION, contact: Contact) => {
      // hide unprocessed otr messages
      if (plaintext.match(/^\?OTR([:,|?]|[?v0-9x]+)/)) {
         plaintext = '<i title="' + plaintext + '">' + Translation.t('Unreadable_OTR_message') + '</i>';
      }

      return plaintext;
   }

   private updateMenuEntry(contact: IContact, menuEntry: JQuery) {
      if (contact.isEncrypted() && contact.getEncryptionPluginId() === OTRPlugin.getId()) {
         menuEntry.removeClass('jsxc-disabled');
      } else {
         menuEntry.addClass('jsxc-disabled');
      }
   }

   private afterReceiveMessageProcessor = (contact: Contact, message: Message, stanza: Element): Promise<[Contact, Message, Element]> => {
      let plaintextMessage = message.getPlaintextMessage();
      if (!plaintextMessage || (!/^\?OTR/.test(plaintextMessage) && plaintextMessage.indexOf(WHITESPACE_TAG) < 0)) {
         return Promise.resolve([contact, message, stanza]);
      }

      return this.getSession(contact).then((session: Session) => {
         return session.processMessage(message, 'decryptMessage');
      }).then((message) => {
         return [contact, message, stanza];
      });
   }

   private preSendMessageProcessor = (contact: Contact, message: Message): Promise<[Contact, Message]> => {
      if (contact.getEncryptionState() === EncryptionState.Plaintext || contact.getEncryptionPluginId() !== OTRPlugin.getId()) {
         return Promise.resolve([contact, message]);
      }

      return this.getSession(contact).then((session: Session) => {
         if (session.isEnded()) {
            contact.addSystemMessage(Translation.t('your_message_wasnt_send_please_end_your_private_conversation'));

            throw new Error('OTR session is ended');
         } else if (session.isEncrypted()) {
            return session.processMessage(message, 'encryptMessage');
         } else {
            return message;
         }
      }).then((message) => {
         return [contact, message];
      });
   }

   public async openVerificationDialog(contact: IContact) {
      let session = await this.getSession(contact);

      new VerificationDialog(contact, session);
   }

   private getSession(contact: IContact): Promise<Session> {
      let bareJid = contact.getJid().bare;

      if (this.sessions.hasOwnProperty(bareJid)) {
         return Promise.resolve(this.sessions[bareJid]);
      }

      return this.getDSAKey().then((key) => {
         this.sessions[bareJid] = new Session(contact, key, this.pluginAPI.getStorage(), this.pluginAPI.getConnection());

         return this.sessions[bareJid];
      });
   }

   //@TODO call this before logout
   // private endAllSessions() {
   //    //@TODO restore all otr objects (?)

   //    let promiseMap = Object.keys(this.sessions).map((bareJid) => {
   //       let session = this.sessions[bareJid];

   //       if (session.isEncrypted()) {
   //          return session.end();
   //       }
   //    });

   //    return Promise.all(promiseMap);
   // }

   private getDSAKey() {
      if (this.key) {
         return Promise.resolve(this.key);
      }

      let storage = this.pluginAPI.getStorage();
      let storedKey = storage.getItem('key');

      if (!storedKey) {
         //@TODO we should generate only one key even if there are multiple calls during generation
         return this.generateDSAKey().then((key: IDSA) => {
            storage.setItem('key', key.packPrivate());

            this.key = key;

            return key;
         });
      } else {
         this.pluginAPI.Log.debug('DSA key loaded');
         this.key = (<IDSA> DSA).parsePrivate(storedKey);

         return Promise.resolve(this.key);
      }
   }

   private generateDSAKey(): Promise<{}> {
      if (typeof Worker === 'undefined') {
         throw new Error('No worker available');
      }

      return new Promise((resolve, reject) => {
         this.pluginAPI.Log.debug('Start DSA key generation');

         (<IDSA> DSA).createInWebWorker({
            path: typeof dsaWebworkerFile === 'string' ? dsaWebworkerFile : (dsaWebworkerFile && (<any> dsaWebworkerFile).default)
         }, (key) => {
            this.pluginAPI.Log.debug('DSA key generated');

            resolve(key);
         });
      });
   }
}
