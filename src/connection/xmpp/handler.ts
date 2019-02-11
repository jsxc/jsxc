import Log from '../../util/Log'
import Account from '../../Account'
import PresenceHandler from './handlers/presence'
import MultiUserPresenceHandler from './handlers/multiUser/Presence'
import ChatMessageHandler from './handlers/chatMessage'
import MultiUserChatMessageHandler from './handlers/multiUser/groupChatMessage'
import HeadlineMessageHandler from './handlers/headlineMessage'
import JingleHandler from './handlers/jingle'
import { DiscoInfoHandler, DiscoItemsHandler } from './handlers/disco'
import CapsHandler from './handlers/caps'
import MultiUserDirectInvitationHandler from './handlers/multiUser/DirectInvitation'
import MultiUserXMessageHandler from './handlers/multiUser/XMessage'
import AbstractHandler from './AbstractHandler'
import * as NS from './namespace'

interface IStropheConnection {
   jid: string,
   addHandler(Handler, namespace?: string, tagName?: string, type?: string, id?: string, from?: string)
}

export default class XMPPHandler {
   constructor(private account: Account, private connection: IStropheConnection) {

   }

   public registerHandler() {
      this.addHandler(ChatMessageHandler, null, 'message', 'chat');
      this.addHandler(MultiUserChatMessageHandler, null, 'message', 'groupchat');
      this.addHandler(HeadlineMessageHandler, null, 'message', 'headline');
      this.addHandler(MultiUserXMessageHandler, 'http://jabber.org/protocol/muc#user', 'message');
      this.addHandler(PresenceHandler, null, 'presence');
      this.addHandler(MultiUserPresenceHandler, 'http://jabber.org/protocol/muc#user', 'presence');
      this.addHandler(JingleHandler, 'urn:xmpp:jingle:1', 'iq', 'set');

      this.addHandler(DiscoInfoHandler, NS.get('DISCO_INFO'), 'iq', 'get');
      this.addHandler(DiscoItemsHandler, NS.get('DISCO_ITEMS'), 'iq', 'get');

      this.addHandler(MultiUserDirectInvitationHandler, 'jabber:x:conference', 'message');

      this.addHandler(CapsHandler, CapsHandler.NAMESPACE);
      // this.connection.conn.addHandler(this.onReceived, null, 'message');
   }

   public addHandler(Handler, namespace?: string, tagName?: string, type?: string, id?: string, from?: string) {
      let handler = new Handler(this.account);

      if (!(handler instanceof AbstractHandler)) {
         Log.warn('Invalid handler');
         return;
      }

      this.connection.addHandler(stanza => handler.processStanza(stanza), namespace, tagName, type, id, from);
   }
}
