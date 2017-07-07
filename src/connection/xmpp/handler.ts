import Log from '../../util/Log';
import JID from '../../JID';
import Contact from '../../Contact';
import onPresence from './handlers/presence';
import onRoster from './handlers/roster'
import onRosterChange from './handlers/rosterChange'
import onChatMessage from './handlers/chatMessage'
import onHeadlineMessage from './handlers/headlineMessage'
import onJingle from './handlers/jingle'

let PRESERVE_HANDLER = true;
let REMOVE_HANDLER = false;
let SUBSCRIPTION = {
   REMOVE: 'remove',
   FROM: 'from',
   BOTH: 'both'
};

export default class XMPPHandler {
   private connectionJid: JID;

   constructor(private connection: Strophe.Connection) {
      this.connectionJid = new JID(connection.jid);
   }

   private registerHandler() {
      this.connection.addHandler(onRosterChange, 'jabber:iq:roster', 'iq', 'set');
      this.connection.addHandler(onChatMessage, null, 'message', 'chat');
      this.connection.addHandler(onHeadlineMessage, null, 'message', 'headline');
      this.connection.addHandler(onPresence, null, 'presence');
      this.connection.addHandler(onJingle, 'urn:xmpp:jingle:1', 'iq', 'set', null, null);

      // this.connection.conn.addHandler(this.onReceived, null, 'message');
   }
}
