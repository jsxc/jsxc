import Account from '../../../Account'
import AbstractHandler from '../AbstractHandler'
import { STANZA_JINGLE_KEY } from '../../AbstractConnection'

const FEATURES = [
   'urn:xmpp:jingle:1',
   'urn:xmpp:jingle:apps:rtp:1',
   'urn:xmpp:jingle:apps:rtp:audio',
   'urn:xmpp:jingle:apps:rtp:video',
   'urn:xmpp:jingle:apps:rtp:rtcb-fb:0',
   'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0',
   'urn:xmpp:jingle:apps:rtp:ssma:0',
   'urn:xmpp:jingle:apps:dtls:0',
   'urn:xmpp:jingle:apps:grouping:0',
   'urn:xmpp:jingle:apps:file-transfer:3',
   'urn:xmpp:jingle:transports:ice-udp:1',
   'urn:xmpp:jingle:transports.dtls-sctp:1',
   'urn:ietf:rfc:3264',
   'urn:ietf:rfc:5576',
   'urn:ietf:rfc:5888'
];

export default class extends AbstractHandler {
   constructor(account: Account) {
      super(account);

      for (let feature of FEATURES) {
         account.getDiscoInfo().addFeature(feature);
      }
   }

   public processStanza(stanza: Element) {
      let connection = this.account.getConnection();
      let storage = this.account.getSessionStorage();

      storage.setItem(STANZA_JINGLE_KEY, stanza.outerHTML);
      storage.removeItem(STANZA_JINGLE_KEY);

      connection.getJingleHandler().onJingle(stanza);

      return this.PRESERVE_HANDLER;
   }
}
