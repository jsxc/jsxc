import { State } from './ui/ChatWindow';
import Client from './Client';
import Contact from './Contact';
import PersistentMap from './util/PersistentMap';
import JID from './JID';

const KEY = 'chatWindowState';

export default class ChatWindowController {
   constructor(private contact: Contact, private properties: PersistentMap) {
      this.properties.registerHook(KEY, this.stateHandler);

      this.stateHandler(this.properties.get(KEY), State.Closed);
   }

   public close() {
      this.setState(State.Closed);
      let select = $(document.body).find('.jsxc-fullscreen-active-conversations-select');
      let option = select.find(`option[value="${this.contact.getUid()}"]`);
      if (option.length>0)
      {
         option.remove();
      }
      option=select.find('option');
      if (option.length>0)
      {
         select.val($(select.find(`:first-child`)).val());
         let c = Client.getAccountManager().getAccount().getContact(new JID($(select.find(`:first-child`)).attr("data-jid")));

         let tchatWindow = c.getChatWindowController();

         if ($('body').hasClass('jsxc-fullscreen') || Client.isExtraSmallDevice()) {
            Client.getChatWindowList().minimizeAll();
         }

         tchatWindow.openProminently();
      }
   }

   public minimize() {
      this.setState(State.Minimized);
   }

   public open() {
      this.setState(State.Open);

      let chatWindow = this.contact.getChatWindow();
      let select = $(document.body).find('.jsxc-fullscreen-active-conversations-select');
      if (select.find('option[value="'+this.contact.getUid()+'"]').length===0)
      {
         let uid = chatWindow.getContact().getUid();
         let option = $(`<option data-jid="${this.contact.getJid().bare}" value="${uid}">${this.contact.getName()}</option>`);
         select.append(option);
         select.val(uid);
      }
      else {
         select.val(this.contact.getUid());
      }
      Client.getChatWindowList().moveIntoViewport(chatWindow);
   }

   public openProminently() {
      this.open();

      let chatWindow = this.contact.getChatWindow();

      //@TODO will not work in all tabs
      chatWindow.highlight();
      chatWindow.focus();
   }

   public setBarText(text: string) {
      this.contact.getChatWindow().setBarText(text);
   }

   private setState(state: State) {
      this.properties.set(KEY, state);
   }

   private stateHandler = (state: State, oldState: State) => {
      oldState = typeof oldState !== 'undefined' ? oldState : State.Closed;
      state = typeof state !== 'undefined' ? state : State.Closed;

      if (oldState === state) {
         return;
      }

      let chatWindow = this.contact.getChatWindow();

      if (oldState === State.Closed && state !== State.Closed) {
         Client.getChatWindowList().add(chatWindow);
      }

      switch (state) {
         case State.Closed:
            Client.getChatWindowList().remove(chatWindow);
            chatWindow.close();
            break;
         case State.Minimized:
            chatWindow.minimize();
            break;
         case State.Open:
            chatWindow.open();
            break;
      }
   };
}
