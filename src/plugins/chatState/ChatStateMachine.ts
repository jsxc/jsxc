import ChatStatePlugin from './ChatStatePlugin'
import ChatStateConnection from './ChatStateConnection'
import { STATE } from './State'
import Storage from '../../Storage'
import ChatWindow from '../../ui/ChatWindow'
import Contact from '../../Contact'
import * as Namespace from '../../connection/xmpp/namespace'

const ENTER_KEY = 13;

export default class ChatStateMachine {
   private storage: Storage;
   private connection: ChatStateConnection;

   private key;
   private composingTimeout;
   private id;

   constructor(private plugin: ChatStatePlugin, private chatWindow: ChatWindow, private contact: Contact) {
      this.storage = plugin.getStorage();
      this.connection = plugin.getChatStateConnection();
      this.key = 'state:' + this.contact.getId();

      this.addInputHandler();
      this.registerHook(this.stateChange);

      //@REVIEW is this also supported by MUC?
   }

   private addInputHandler() {
      let element = this.chatWindow.getDom();

      element.find('.jsxc-message-input').on('keydown', (ev) => {
         if (ev.which !== ENTER_KEY) {
            this.composing();
         }

         if (ev.which === ENTER_KEY && !ev.shiftKey) {
            this.paused();
         }
      })
   }

   private composing() {
      this.setState(STATE.COMPOSING);
   }

   private paused = () => {
      this.setState(STATE.PAUSED);
   }

   private registerHook(func: (newState: STATE, oldState: STATE) => void) {
      this.storage.registerHook(this.key, (newValue, oldValue) => {
         let id = newValue.id;
         let newState = newValue.state;
         let oldState = (oldValue || {}).state;

         if (this.composingTimeout) {
            clearTimeout(this.composingTimeout);
         }

         if (id === this.id) {
            if (newState === STATE.COMPOSING) {
               this.composingTimeout = setTimeout(this.paused, 900);
            }

            func(newState, oldState);
         }
      });
   }

   private setState(state: STATE) {
      this.id = Math.random();

      this.storage.setItem(this.key, {
         state,
         id: this.id
      });
   }

   private stateChange = (newState: STATE, oldState: STATE) => {
      let jid = this.contact.getJid();

      new Promise((resolve, reject) => {
         if (jid.isBare()) {
            resolve(true);
            return;
         }
         let hasSupport = this.plugin.getDiscoInfoRepository().hasFeature(jid, Namespace.get('CHATSTATES'));

         resolve(hasSupport);
      }).then((hasSupport) => {
         if (hasSupport) {
            if (oldState === STATE.COMPOSING && newState === STATE.PAUSED) {
               this.connection.sendPaused(jid, this.contact.getType());
            } else if (oldState !== STATE.COMPOSING && newState === STATE.COMPOSING) {
               this.connection.sendComposing(jid, this.contact.getType());
            }
         }
      });
   }
}
