import Log from '../../../../util/Log';
import JID from '../../../../JID';
import MultiUserContact from '../../../../MultiUserContact';
import AbstractHandler from '../../AbstractHandler'
import * as Namespace from '../../namespace'
import MultiUserPresenceProcessor from './PresenceProcessor'
import { Notice, TYPE as NOTICETYPE, FUNCTION as NOTICEFUNCTION } from '../../../../Notice';

export default class extends AbstractHandler {
   public processStanza(stanza: Element): boolean {
      let from = new JID($(stanza).attr('from'));
      let contact = this.account.getContact(from);

      if (!contact) {
         console.warn('Got invitation from stranger. Ignore silently.');
      } else if (contact.getType() === 'groupchat') {
         console.warn('I don\'t accept direct invitations from MUC rooms.');
      }

      let xElement = $(stanza).find('x[xmlns="jabber:x:conference"]');
      let roomJid = new JID(xElement.attr('jid'));
      let password = xElement.attr('password');
      let reason = xElement.attr('reason') || xElement.text(); //pidgin workaround

      this.account.getNoticeManager().addNotice({
         title: 'Invitation',
         description: `for ${roomJid.bare}`,
         type: NOTICETYPE.invitation,
         fnName: NOTICEFUNCTION.multiUserInvitation,
         fnParams: ['direct', from.bare, roomJid.bare, reason, password]
      });

      return this.PRESERVE_HANDLER;
   }
}
