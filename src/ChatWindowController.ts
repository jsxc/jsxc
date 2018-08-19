import ChatWindow, { State } from './ui/ChatWindow'
import Client from './Client'
import Contact from './Contact'
import PersistentMap from './util/PersistentMap'

const KEY = 'chatWindowState'

export default class ChatWindowController {
   private chatWindow: ChatWindow;

   constructor(private contact: Contact, private properties: PersistentMap) {
      this.properties.registerHook(KEY, this.stateHandler);

      this.stateHandler(this.properties.get(KEY), State.Closed);
   }

   public close() {
      this.setState(State.Closed);
   }

   public minimize() {
      this.setState(State.Minimized);
   }

   public open() {
      this.setState(State.Open);
   }

   public openProminently() {
      this.open();

      //@TODO will not work in all tabs
      this.contact.getChatWindow().highlight();
      this.contact.getChatWindow().focus();
   }

   public setBarText(text: string) {
      this.contact.getChatWindow().setBarText(text);
   }

   private setState(state: State) {
      this.properties.set(KEY, state);
   }

   private stateHandler = (state: State, oldState: State) => {
      oldState = typeof state !== 'undefined' ? oldState : State.Closed;
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
   }
}
