import Log from '../../../util/Log'
import JID from '../../../JID'
import Utils from '../../../util/Utils'
import Translation from '../../../util/Translation'
import AbstractHandler from '../AbstractHandler'
import MessageElement from './messageElement'
import { FUNCTION } from '../../../Notice'

export default class extends AbstractHandler {

   public processStanza(stanza: Element) {
      let messageElement: MessageElement;

      try {
         messageElement = new MessageElement(stanza);
      } catch (err) {
         return this.PRESERVE_HANDLER;
      }

      if (!messageElement.getPeer()) {
         return this.PRESERVE_HANDLER;
      }

      let peerJid = new JID(messageElement.getPeer());

      if (peerJid.bare!==peerJid.domain)
      {
         return this.PRESERVE_HANDLER; 
      }

      // is broadcast from Server
      this.handleBroadcastMessage(messageElement);

      return this.PRESERVE_HANDLER;
   }

   private handleBroadcastMessage(messageElement: MessageElement) {
      Log.debug('Sender is the server, broadcast?');

      let fromJid = new JID(messageElement.getFrom());

      let title = Translation.t('broadcast')+': '+fromJid;
      let description = `${Utils.escapeHTML(messageElement.getPlaintextBody())}`;

      //@REVIEW maybe improve the dialog
      this.account.getNoticeManager().addNotice({
         title: messageElement.getFrom(),
         description,
         fnName: FUNCTION.broadcast,
         fnParams: [this.account.getUid(), title, description, fromJid.full],
      });
   }
}
