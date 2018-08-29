/**
 * Implements XEP-0085: Chat State Notifications.
 *
 * @namespace chatState
 * @see {@link http://xmpp.org/extensions/xep-0085.html}
 */

import JID from '../../JID'
import { AbstractPlugin } from '../../plugin/AbstractPlugin'
import PluginAPI from '../../plugin/PluginAPI'
import Message from '../../Message'
import Contact from '../../Contact'
import Pipe from '../../util/Pipe'
import ChatWindow from '../../ui/ChatWindow'
import Storage from '../../Storage'
import Translation from '../../util/Translation'
import * as Namespace from '../../connection/xmpp/namespace'
import ChatStateConnection from './ChatStateConnection'
import ChatStateMachine from './ChatStateMachine'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class ChatStatePlugin extends AbstractPlugin {
   public static getName(): string {
      return 'Chat State';
   }

   public static getDescription(): string {
      return Translation.t('setting-explanation-chat-state');
   }

   private chatStateConnection: ChatStateConnection;

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      Namespace.register('CHATSTATES', 'http://jabber.org/protocol/chatstates');

      pluginAPI.addPreSendMessageStanzaProcessor(this.preSendMessageStanzaProcessor)

      pluginAPI.registerChatWindowInitializedHook((chatWindow: ChatWindow, contact: Contact) => {
         new ChatStateMachine(this, chatWindow, contact);
      });

      let connection = pluginAPI.getConnection();

      //@TODO groupchat
      connection.registerHandler(this.onChatState, Namespace.get('CHATSTATES'), 'message', 'chat');
   }

   public getStorage(): Storage {
      return this.pluginAPI.getStorage();
   }

   public getChatStateConnection(): ChatStateConnection {
      if (!this.chatStateConnection) {
         this.chatStateConnection = new ChatStateConnection(this.pluginAPI.send, this.pluginAPI.sendIQ);
      }
      return this.chatStateConnection;
   }

   public getDiscoInfoRepository() {
      return this.pluginAPI.getDiscoInfoRepository();
   }

   private preSendMessageStanzaProcessor = (message: Message, xmlStanza: Strophe.Builder): Promise<any> => {
      //@TODO groupchat
      //@TODO is not disabled for jid
      if (message.getType() === Message.MSGTYPE.CHAT && true) {
         xmlStanza.c('active', {
            xmlns: Namespace.get('CHATSTATES')
         });
      }

      return Promise.resolve([message, xmlStanza]);
   }

   private onChatState = (stanza): boolean => {
      stanza = $(stanza);
      let from = new JID(stanza.attr('from'));
      let composingElement = stanza.find('composing' + Namespace.getFilter('CHATSTATES'));
      let pausedElement = stanza.find('paused' + Namespace.getFilter('CHATSTATES'));
      let activeElement = stanza.find('active' + Namespace.getFilter('CHATSTATES'));

      if (composingElement.length > 0) {
         this.onComposing(from);
      }

      if (pausedElement.length > 0) {
         this.onPaused(from);
      }

      if (activeElement.length > 0) {
         this.onActive(from);
      }

      return true;
   }

   private onComposing(from: JID) {
      let contact = this.pluginAPI.getContact(from);
      let chatWindow = contact.getChatWindowController();

      //@TODO this doesn't work in all tabs
      chatWindow.setBarText(Translation.t('_is_composing'));
   }

   private onPaused(from: JID) {
      let contact = this.pluginAPI.getContact(from);
      let chatWindow = contact.getChatWindowController();

      chatWindow.setBarText('');
   }

   private onActive(from: JID) {
      this.onPaused(from);
   }
}
