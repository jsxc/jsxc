import JID from '../../../../JID';
import AbstractHandler from '../../AbstractHandler';
import { TYPE as NOTICETYPE, FUNCTION as NOTICEFUNCTION, Notice } from '../../../../Notice';
import Log from '@util/Log';
import Translation from '@util/Translation';

export default class extends AbstractHandler {
   public processStanza(stanza: Element): boolean {
      let from = new JID($(stanza).attr('from'));
      let contact = this.account.getContact(from);

      if (!contact) {
         Log.warn('Got invitation from stranger. Ignore silently.');
      } else if (contact.getType() === 'groupchat') {
         Log.warn("I don't accept direct invitations from MUC rooms.");
      }

      let xElement = $(stanza).find('x[xmlns="jabber:x:conference"]');
      let roomJid = new JID(xElement.attr('jid'));
      let password = xElement.attr('password');
      let reason = xElement.attr('reason') || xElement.text(); //pidgin workaround

      let lastnoti: Notice = this.account.getNoticeManager().getNotices().getLastItem();
      if (
         lastnoti === null ||
         lastnoti.getTitle() !== Translation.t('muc_invitation') ||
         lastnoti.getDescription() !== `for ${roomJid.bare}` ||
         lastnoti.getType() !== NOTICETYPE.invitation ||
         lastnoti.callFunction() !== NOTICEFUNCTION.multiUserInvitation
      ) {
         this.account.getNoticeManager().addNotice({
            title: Translation.t('muc_invitation'),
            description: `for ${roomJid.bare}`,
            type: NOTICETYPE.invitation,
            fnName: NOTICEFUNCTION.multiUserInvitation,
            fnParams: ['direct', from.bare, roomJid.bare, reason, password, this.account.getUid()],
         });
      }

      return this.PRESERVE_HANDLER;
   }
}
