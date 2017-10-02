import Log from '../../util/Log';
import JID from '../../JID';
import Account from '../../Account';
import Contact from '../../Contact';
import PresenceHandler from './handlers/presence';
import MultiUserPresenceHandler from './handlers/multiUser/Presence';
import RosterChangeHandler from './handlers/rosterChange'
import ChatMessageHandler from './handlers/chatMessage'
import MultiUserChatMessageHandler from './handlers/multiUser/groupChatMessage'
import HeadlineMessageHandler from './handlers/headlineMessage'
import JingleHandler from './handlers/jingle'
import {DiscoInfoHandler, DiscoItemsHandler} from './handlers/disco'
import CapsHandler from './handlers/caps'
import * as NS from './namespace'

interface StropheConnection {
  jid:string,
  addHandler(Handler, namespace?:string, tagName?:string, type?:string, id?:string, from?:string)
}

export default class XMPPHandler {
   private connectionJid: JID;

   constructor(private account:Account, private connection: StropheConnection) {
      this.connectionJid = new JID(connection.jid);
   }

   private registerHandler() {
      this.addHandler(RosterChangeHandler, 'jabber:iq:roster', 'iq', 'set');
      this.addHandler(ChatMessageHandler, null, 'message', 'chat');
      this.addHandler(MultiUserChatMessageHandler, null, 'message', 'groupchat');
      this.addHandler(HeadlineMessageHandler, null, 'message', 'headline');
      this.addHandler(PresenceHandler, null, 'presence');
      this.addHandler(MultiUserPresenceHandler, 'http://jabber.org/protocol/muc#user', 'presence');
      this.addHandler(JingleHandler, 'urn:xmpp:jingle:1', 'iq', 'set');

      this.addHandler(DiscoInfoHandler, Strophe.NS.DISCO_INFO, 'iq', 'get');
      this.addHandler(DiscoItemsHandler, Strophe.NS.DISCO_ITEMS, 'iq', 'get');

      this.addHandler(CapsHandler, CapsHandler.NAMESPACE);
      // this.connection.conn.addHandler(this.onReceived, null, 'message');
   }

   private addHandler(Handler, namespace?:string, tagName?:string, type?:string, id?:string, from?:string) {
     let handler = new Handler(this.account);

     this.connection.addHandler(stanza => handler.processStanza(stanza), namespace, tagName, type, id, from);
   }
}
