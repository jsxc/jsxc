import Log from '../../util/Log'
import Contact from '../../Contact'
import Message from '../../Message'
import {DIRECTION} from '../../MessageInterface'
import Translation from '../../util/Translation'
import OTR = require('otr/lib/otr')
import DSA = require('otr/lib/dsa')
import {EncryptionState} from '../../plugin/AbstractPlugin'
import Storage from '../../Storage'
import {IConnection} from '../../connection/ConnectionInterface'

//@REVIEW
interface OTR {
   off:(string, func)=>void
   on:(string, func)=>void
   sendQueryMsg:() => void
   receiveMsg:(string, any)=>void
   sendMsg:(string, any)=>void
   endOtr:(func)=>void
   init
   _smInit
   ake

   their_priv_pk
   msgstate
   SEND_WHITESPACE_TAG
   WHITESPACE_START_AKE
   trust
}

interface DSA {

}

//te

export default class Session {
   private session:OTR;

   constructor(private peer:Contact, key:DSA, private storage:Storage, private connection:IConnection) {

      let options:any = {
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

      //@TODO add hook to update session

      this.restoreSession();
   }

   public goEncrypted() {
      this.session.sendQueryMsg();

      return Promise.resolve();
   }

   public goPlain() {
      return this.end();
   }

   public processMessage(message:Message, type:'decryptMessage'|'encryptMessage') {
      let bareJid = message.getPeer().bare;
      let plaintextBody = message.getPlaintextMessage();

      //@TODO test muc
      //@TODO check for file upload url after decryption

      if (plaintextBody) {
         return this[type](message);
      }

      return Promise.resolve(message);
   }

   private encryptMessage(message:Message) { console.log('encrypt message')
      let self = this;
      let messageId = message.getId();

      return new Promise((resolve, reject) => {
         // we need this one-time handler for the promise
         //@REVIEW maybe it's easier to add promises to the OTR lib
         this.session.on('io', function handler(msg, message) {
            if (message && message.getId() === messageId) { console.log('mid', messageId, msg)
               self.session.off('ui', handler);

               self.afterEncryptMessage(msg, message, resolve);
            }
         });

         this.session.sendMsg(message.getPlaintextMessage(), message);
      });
   }

   private decryptMessage(message:Message) {
      let self = this;
      let messageId = message.getId();

      return new Promise((resolve, reject) => {
         this.session.on('ui', function handler(msg, encrypted, message) {
            if (message && message.getId() === messageId) {
               self.session.off('ui', handler);

               self.afterDecryptMessage(msg, encrypted, message, resolve);
            }
         });

         this.session.receiveMsg(message.getPlaintextMessage(), message);
      });
   }

   public end() {
      return new Promise((resolve, reject) => {
         this.session.endOtr(() => {
            this.session.init.call(this.session);

            this.saveSession();

            resolve();
         });
      });
   }

   public isEncrypted():boolean {
      return this.session.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED;
   }

   public isEnded():boolean {
      return this.session.msgstate === OTR.CONST.MSGSTATE_FINISHED;
   }

   private inform(messageString:string) {
      console.log('OTR Session: ' + messageString)

      let message = new Message({
         peer: this.peer.getJid(),
         direction: Message.DIRECTION.SYS,
         plaintextMessage: messageString
      });
      message.save();
      this.peer.openWindow().receiveIncomingMessage(message);

      //@REVIEW this is maybe more generic and most of the messages are the same for other encryption plugins
   }

   private statusHandler = function(status) {
      console.log('context', this);
      switch (status) {
         case OTR.CONST.STATUS_SEND_QUERY:
            this.inform('trying_to_start_private_conversation');
            break;
         case OTR.CONST.STATUS_AKE_SUCCESS:
            var msg_state = this.session.trust ? 'Verified' : 'Unverified';

            this.inform(msg_state + '_private_conversation_started');

            this.peer.setEncryptionState(this.session.trust ? EncryptionState.VerifiedEncrypted : EncryptionState.UnverifiedEncrypted);
            break;
         case OTR.CONST.STATUS_END_OTR:
            if (this.session.msgstate === OTR.CONST.MSGSTATE_PLAINTEXT) {
               // we aborted the private conversation

               this.inform('private_conversation_aborted');

               this.peer.setEncryptionState(EncryptionState.Plaintext);
            } else {
               // the buddy abort the private conversation

               this.inform('your_buddy_closed_the_private_conversation_you_should_do_the_same');

               this.peer.setEncryptionState(EncryptionState.Ended);
            }
            break;
         case OTR.CONST.STATUS_SMP_HANDLE:
            // jsxc.keepBusyAlive();
            break;
      }
   }

   private smpHandler = function(type, result) {
      switch (type) {
         case 'question': // verification request received
            this.inform('Authentication_request_received');

            //@TODO add link to above message which opens the verification dialog

            break;
         case 'trust': // verification completed
            this.session.trust = result;

            //@TODO mark as verified
            this.saveSession();

            if (result) {
               this.inform('conversation_is_now_verified');
            } else {
               this.inform('authentication_failed');
            }

            //@TODO close dialog

            break;
         case 'abort':
            //@TODO close dialog
            this.inform('Authentication_aborted');
            break;
         default:
            Log.debug('[OTR] sm callback: Unknown type: ' + type);
      }
   }

   private afterEncryptMessage = function(encryptedMessage:string, message:Message, resolve) {
      if (this.session.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED) {
         message.setEncryptedPlaintextMessage(encryptedMessage);

         message.setEncrypted(true);
      } else if (this.peer.isEncrypted()) {
         Log.warn('This message had to be encrypted.');
         //@TODO make this warning more visible
      }

      resolve(message);
   }

   private afterDecryptMessage = function(plaintextMessage:string, encrypted:boolean, message:Message, resolve) {
      if (this.session.msgstate !== OTR.CONST.MSGSTATE_PLAINTEXT && !encrypted) {
         message.setPlaintextMessage(Translation.t('Received_an_unencrypted_message') + '. ['+plaintextMessage+']');
         message.setDirection(DIRECTION.SYS);
      } else {
         message.setPlaintextMessage(plaintextMessage);
      }

      message.setEncrypted(encrypted);

      resolve(message);
   }

   private sendOutgoingMessage = function(messageString:string) {
      let message = new Message({
         peer: this.peer.getJid(),
         direction: Message.DIRECTION.OUT,
         plaintextMessage: messageString
      });

      //@REVIEW do we have to save this message, because it's never displaied?
      message.save();

      this.connection.sendMessage(message);
   }

   private errorHandler = function(err) {
      // Handle this case in jsxc.otr.receiveMessage
      if (err !== 'Received an unencrypted message.') {
         this.inform(err);
      }

      Log.error('[OTR] ' + err);
   }

   private restoreSession() {
      var payload = this.storage.getItem('session', this.peer.getId());

      if (this.session !== null || payload !== null) {
         var key;
         for (key in payload) {
            if (payload.hasOwnProperty(key)) {
               var val = JSON.parse(payload[key]);
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
      let payload:any = {}; // return value

      if (this.session === null) {
         return;
      }

      // all variables which should be saved
      let savekey = ['jid', 'our_instance_tag', 'msgstate', 'authstate', 'fragment', 'their_y', 'their_old_y', 'their_keyid', 'their_instance_tag', 'our_dh', 'our_old_dh', 'our_keyid', 'sessKeys', 'storedMgs', 'oldMacKeys', 'trust', 'transmittedRS', 'ssid', 'receivedPlaintext', 'authstate', 'send_interval'];

      for (let i = 0; i < savekey.length; i++) {
         payload[savekey[i]] = JSON.stringify(this.session[savekey[i]]);
      }

      if (this.session.their_priv_pk !== null) {
         payload.their_priv_pk = JSON.stringify(this.session.their_priv_pk.packPublic());
      }

      if (this.session.ake.otr_version && this.session.ake.otr_version !== '') {
         payload.otr_version = JSON.stringify(this.session.ake.otr_version);
      }

      this.storage.setItem('session', this.peer.getId(), payload);
   }
}
