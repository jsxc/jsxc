import { PluginState, EncryptionState } from '../../plugin/AbstractPlugin'
import PluginAPI from '../../plugin/PluginAPI'
import { EncryptionPlugin } from '../../plugin/EncryptionPlugin'
import Client from '../../Client'
import Account from '../../Account'
import Log from '../../util/Log'
import Contact from '../../Contact'
import Message from '../../Message'
import { DIRECTION } from '../../Message.interface'
import Translation from '../../util/Translation'
import Session from './Session'
import DSA from 'otr/lib/dsa'
import Options from '../../Options'

interface DSA {
   parsePrivate
   createInWebWorker
   packPrivate
}

Options.get().addDefaults({
   otr: {
      ERROR_START_AKE: false,
      debug: false,
      SEND_WHITESPACE_TAG: false,
      WHITESPACE_START_AKE: true
   }
});

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class OTRPlugin extends EncryptionPlugin {
   private sessions = {};
   private key: DSA;

   public static getName(): string {
      return 'otr';
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.getStorage().registerHook('key', (key) => {
         if (this.key && this.key !== key) {
            Log.warn('Something went wrong. We have two different DSA keys.');
         }

         this.key = key;
      });

      //@TODO on first message received or send a DSA key is generated, this should be avoided
      pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor);
      pluginAPI.addPreSendMessageProcessor(this.preSendMessageProcessor);
   }

   //@TODO create contactPluginApi
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

   private afterReceiveMessageProcessor = (contact: Contact, message: Message) => {
      let plaintextMessage = message.getPlaintextMessage();
      if (!plaintextMessage || !/^\?OTR/.test(plaintextMessage)) { //@TODO search for whitespace
         return Promise.resolve([contact, message]);
      }

      return this.getSession(contact).then((session: Session) => {
         return session.processMessage(message, 'decryptMessage');
      }).then((message) => {
         return [contact, message];
      });
   }

   private preSendMessageProcessor = (contact: Contact, message: Message) => {
      if (contact.getEncryptionState() === EncryptionState.Plaintext) {
         return Promise.resolve([contact, message]);
      }

      return this.getSession(contact).then((session: Session) => {
         if (session.isEnded()) {
            //@TODO block this message
            message.setDirection(DIRECTION.SYS);
            message.setPlaintextMessage('This message was not send');

            return message;
         } else if (session.isEncrypted()) {
            return session.processMessage(message, 'encryptMessage');
         } else {
            return message;
         }
      }).then((message) => {
         return [contact, message];
      });
   }

   private getSession(contact: Contact): Promise<Session> {
      //@TODO only master (sure?)
      let bareJid = contact.getJid().bare;

      if (this.sessions.hasOwnProperty(bareJid)) {
         return Promise.resolve(this.sessions[bareJid]);
      }

      return this.getDSAKey().then((key) => {
         this.sessions[bareJid] = new Session(contact, key, this.pluginAPI.getStorage(), this.pluginAPI.getConnection());

         //@TODO save session?

         return this.sessions[bareJid];
      });
   }

   //@TODO call this before logout
   private endAllSessions() {
      //@TODO restore all otr objects (?)

      let promiseMap = $.map(this.sessions, (session, bareJid) => {
         if (session.isEncrypted()) {
            return session.end();
         }
      });

      return Promise.all(promiseMap);
   }

   private getDSAKey() {
      if (this.key) {
         return Promise.resolve(this.key);
      }

      let storage = this.pluginAPI.getStorage();
      let storedKey = storage.getItem('key');

      if (storedKey === null) {
         //@TODO we should generate only one key even if there are multiple calls during generation
         return this.generateDSAKey().then((key: DSA) => {
            storage.setItem('key', key.packPrivate());

            this.key = key;

            return key;
         });
      } else {
         Log.debug('DSA key loaded');
         this.key = DSA.parsePrivate(storedKey);

         return Promise.resolve(this.key);
      }
   }

   private generateDSAKey(): Promise<{}> {
      let msg = Translation.t('Creating_your_private_key_');
      let worker = null;

      if (typeof Worker === 'undefined') {
         //@TODO disable OTR
      }

      let root = Client.getOption('root');

      return new Promise((resolve, reject) => {
         Log.debug('Start DSA key generation');

         DSA.createInWebWorker({
            imports: [root + '/lib/otr/vendor/salsa20.js', root + '/lib/otr/vendor/bigint.js', root + '/lib/otr/vendor/crypto.js', root + '/lib/otr/vendor/eventemitter.js', root + '/lib/otr/lib/const.js', root + '/lib/otr/lib/helpers.js', root + '/lib/otr/lib/dsa.js'],
            path: root + '/lib/otr/lib/dsa-webworker.js'
         }, (key) => {
            Log.debug('DSA key generated');

            resolve(key);
         });
      });
   }
}
