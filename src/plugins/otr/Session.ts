import Log from '../../util/Log'
import { IContact } from '@src/Contact.interface';
import Message from '../../Message'
import { DIRECTION } from '../../Message.interface'
import Translation from '../../util/Translation'
import OTR from 'otr/lib/otr'
import DSA from 'otr/lib/dsa'
import { EncryptionState } from '../../plugin/AbstractPlugin'
import Storage from '../../Storage'
import PersistentMap from '../../util/PersistentMap'
import OTRPlugin from './Plugin';
import { IConnection } from '@connection/Connection.interface';
import VerificationDialog from '@ui/dialogs/verification';

//@REVIEW
interface IOTR {
   off: (name: string, func) => void
   on: (name: string, func) => void
   sendQueryMsg: () => void
   receiveMsg: (message: string, meta: any) => void
   sendMsg: (message: string, meta: any) => void
   endOtr: (func) => void
   smpSecret: (secret: string, question?: string) => void
   init
   _smInit
   ake

   their_priv_pk
   msgstate
   SEND_WHITESPACE_TAG
   WHITESPACE_START_AKE
   trust
}

export default class Session {
   private session: IOTR;

   private data: PersistentMap;

   private ourPayloadId: number;

   private verificationDialog: VerificationDialog;

   constructor(private peer: IContact, private key: DSA, private storage: Storage, private connection: IConnection) {

      let options: any = {
         priv: key,
         debug: true,
         //smw: {} //@TODO enable worker for smp
      };

      this.session = new OTR(options);

      if (options.SEND_WHITESPACE_TAG) {
         this.session.SEND_WHITESPACE_TAG = true;
      }

      if (options.WHITESPACE_START_AKE) {
         this.session.WHITESPACE_START_AKE = true;
      }

      this.session.on('status', (status) => {
         this.saveSession();
         // need this to get the right context in status handler
         this.statusHandler(status);
      });
      this.session.on('smp', (type, result) => {
         //@REVIEW do we need to save the session at this point?
         this.smpHandler(type, result);
      });
      this.session.on('error', (err) => {
         this.errorHandler(err);
      });
      this.session.on('io', (msg, meta) => {
         this.saveSession();

         if (typeof msg === 'string' && (typeof meta === 'undefined' || meta === null)) {
            // Only process ake and other system messages. User messages will have a
            // message object as meta data and are processed with a one-time handler.
            this.sendOutgoingMessage(msg);
         }
      });

      this.data = new PersistentMap(this.storage, 'otr', 'session', this.peer.getId());

      this.data.registerHook('payload', (newPayload) => {
         if (this.ourPayloadId !== newPayload.id) {
            this.restoreSession(newPayload)
         }
      });
      this.restoreSession(this.data.get('payload'));
   }

   public goEncrypted(): Promise<void> {
      this.session.sendQueryMsg();

      return Promise.resolve();
   }

   public goPlain(): Promise<void> {
      return this.end();
   }

   public processMessage(message: Message, type: 'decryptMessage' | 'encryptMessage'): Promise<Message> {
      let plaintextBody = message.getPlaintextMessage();

      //@TODO test muc
      //@TODO check for file upload url after decryption

      if (plaintextBody) {
         return this[type](message);
      }

      return Promise.resolve(message);
   }

   private encryptMessage(message: Message): Promise<Message> {
      let self = this;
      let messageId = message.getUid();

      return new Promise((resolve, reject) => {
         // we need this one-time handler for the promise
         //@REVIEW maybe it's easier to add promises to the OTR lib
         this.session.on('io', function handler(msg, message) {
            if (message && message.getUid() === messageId) {
               self.session.off('ui', handler);

               self.afterEncryptMessage(msg, message, resolve);
            }
         });

         this.session.sendMsg(message.getPlaintextMessage(), message);
      });
   }

   private decryptMessage(message: Message): Promise<Message> {
      let self = this;
      let messageId = message.getUid();

      return new Promise((resolve, reject) => {
         this.session.on('ui', function handler(msg, encrypted, message) {
            if (message && message.getUid() === messageId) {
               self.session.off('ui', handler);

               self.afterDecryptMessage(msg, encrypted, message, resolve);
            }
         });

         this.session.receiveMsg(message.getPlaintextMessage(), message);
      });
   }

   public end(): Promise<void> {
      return new Promise((resolve, reject) => {
         this.session.endOtr(() => {
            this.session.init.call(this.session);

            this.saveSession();

            resolve();
         });
      });
   }

   public isEncrypted(): boolean {
      return this.session.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED;
   }

   public isEnded(): boolean {
      return this.session.msgstate === OTR.CONST.MSGSTATE_FINISHED;
   }

   public getOwnFingerprint(): string {
      return this.key.fingerprint();
   }

   public getTheirFingerprint(): string {
      return this.session.their_priv_pk && this.session.their_priv_pk.fingerprint();
   }

   public isVerified(): boolean {
      return !!this.session.trust;
   }

   public setVerified(verified: boolean) {
      this.session.trust = verified;

      this.saveSession();

      if (verified) {
         this.peer.setEncryptionState(EncryptionState.VerifiedEncrypted, OTRPlugin.getId());
      } else {
         this.peer.setEncryptionState(EncryptionState.UnverifiedEncrypted, OTRPlugin.getId());
      }
   }

   public sendSMPRequest(secret: string, question?: string) {
      this.session.smpSecret(secret, question);
   }

   private inform(messageString: string) {
      this.peer.addSystemMessage(Translation.t(messageString));
   }

   private statusHandler = (status) => {
      switch (status) {
         case OTR.CONST.STATUS_SEND_QUERY:
            this.inform('trying_to_start_private_conversation');
            break;
         case OTR.CONST.STATUS_AKE_SUCCESS:
            let msgState = this.session.trust ? 'Verified' : 'Unverified';

            this.inform(msgState + '_private_conversation_started');

            this.peer.setEncryptionState(this.session.trust ? EncryptionState.VerifiedEncrypted : EncryptionState.UnverifiedEncrypted, OTRPlugin.getId());
            break;
         case OTR.CONST.STATUS_END_OTR:
            if (this.session.msgstate === OTR.CONST.MSGSTATE_PLAINTEXT) {
               // we aborted the private conversation

               this.inform('private_conversation_aborted');

               this.peer.setEncryptionState(EncryptionState.Plaintext, OTRPlugin.getId());
            } else {
               // the buddy abort the private conversation

               this.inform('your_buddy_closed_the_private_conversation_you_should_do_the_same');

               this.peer.setEncryptionState(EncryptionState.Ended, OTRPlugin.getId());
            }
            break;
         case OTR.CONST.STATUS_SMP_HANDLE:
            // jsxc.keepBusyAlive();
            break;
      }
   }

   private smpHandler = (type: string, data: boolean | string) => {
      switch (type) {
         case 'question': // verification request received
            this.inform('Authentication_request_received');

            //@TODO add link to above message which opens the verification dialog
            let dialog = this.openVerificationDialog();
            dialog.preFill(typeof data === 'string' ? data : undefined);

            break;
         case 'trust': // verification completed
            this.setVerified(!!data);

            if (data) {
               this.inform('conversation_is_now_verified');
            } else {
               this.inform('authentication_failed');
            }

            break;
         case 'abort':
            this.closeVerificationDialog();

            this.inform('Authentication_aborted');
            break;
         default:
            Log.debug('[OTR] sm callback: Unknown type: ' + type);
      }
   }

   private afterEncryptMessage = function(encryptedMessage: string, message: Message, resolve) {
      if (this.session.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED) {
         message.setEncryptedPlaintextMessage(encryptedMessage);

         message.setEncrypted(true);
      } else if (this.peer.isEncrypted()) {
         message.setErrorMessage(Translation.t('Message_was_not_encrypted'));

         Log.warn('This message had to be encrypted.');
      }

      resolve(message);
   }

   private afterDecryptMessage = function(plaintextMessage: string, encrypted: boolean, message: Message, resolve) {
      if (this.session.msgstate !== OTR.CONST.MSGSTATE_PLAINTEXT && !encrypted) {
         message.setPlaintextMessage(Translation.t('Received_an_unencrypted_message') + '. [' + plaintextMessage + ']');
         message.setDirection(DIRECTION.SYS);
      } else {
         message.setPlaintextMessage(plaintextMessage);
      }

      message.setEncrypted(encrypted);

      resolve(message);
   }

   private sendOutgoingMessage(messageString: string) {
      let message = new Message({
         peer: this.peer.getJid(),
         direction: Message.DIRECTION.OUT,
         plaintextMessage: messageString
      });

      this.connection.sendMessage(message);
   }

   private errorHandler = function(err) {
      // Handle this case in jsxc.otr.receiveMessage
      if (err !== 'Received an unencrypted message.') {
         this.inform(err);
      }

      Log.error('[OTR] ' + err);
   }

   //@REVIEW optimization possible? Update only altered values. Maybe split this in two payloads (permanent/ephemeral)
   private restoreSession = (payload) => {
      if (this.session !== null || payload !== null) {
         let key;
         for (key in payload) {
            if (payload.hasOwnProperty(key)) {
               let val = JSON.parse(payload[key]);
               if (key === 'their_priv_pk' && val !== null) {
                  val = DSA.parsePublic(val);
               }
               if (key === 'otr_version' && val !== null) {
                  this.session.ake.otr_version = val;
               } else {
                  this.session[key] = val;
               }
            }
         }

         if (this.session.msgstate === 1 && this.session.their_priv_pk !== null) {
            this.session._smInit.call(this.session);
         }
      }

      let encryptionState = this.peer.getEncryptionState();

      //@REVIEW can this be simplified?
      if ((encryptionState === EncryptionState.Plaintext && this.session.msgstate !== OTR.CONST.MSGSTATE_PLAINTEXT) ||
         (encryptionState === EncryptionState.UnverifiedEncrypted && (this.session.msgstate !== OTR.CONST.MSGSTATE_ENCRYPTED || this.session.trust)) ||
         (encryptionState === EncryptionState.VerifiedEncrypted && (this.session.msgstate !== OTR.CONST.MSGSTATE_ENCRYPTED || !this.session.trust)) ||
         (encryptionState === EncryptionState.Ended && this.session.msgstate !== OTR.CONST.MSGSTATE_FINISHED)) {

         Log.warn('Expected encryption state does not match real message state');
      }
   }

   private saveSession() {
      let payload: any = {}; // return value

      if (this.session === null) {
         return;
      }

      // all variables which should be saved
      let exportableKeys = ['jid', 'our_instance_tag', 'msgstate', 'authstate', 'fragment', 'their_y', 'their_old_y', 'their_keyid', 'their_instance_tag', 'our_dh', 'our_old_dh', 'our_keyid', 'sessKeys', 'storedMgs', 'oldMacKeys', 'trust', 'transmittedRS', 'ssid', 'receivedPlaintext', 'authstate', 'send_interval'];

      for (let key of exportableKeys) {
         payload[key] = JSON.stringify(this.session[key]);
      }

      if (this.session.their_priv_pk !== null) {
         payload.their_priv_pk = JSON.stringify(this.session.their_priv_pk.packPublic());
      }

      if (this.session.ake.otr_version && this.session.ake.otr_version !== '') {
         payload.otr_version = JSON.stringify(this.session.ake.otr_version);
      }

      this.ourPayloadId = payload.id = Math.random();

      this.data.set('payload', payload);
   }

   private openVerificationDialog() {
      this.closeVerificationDialog();

      this.verificationDialog = new VerificationDialog(this.peer, this);

      return this.verificationDialog;
   }

   private closeVerificationDialog() {
      if (this.verificationDialog) {
         this.verificationDialog.close();
         this.verificationDialog = undefined;
      }
   }
}
