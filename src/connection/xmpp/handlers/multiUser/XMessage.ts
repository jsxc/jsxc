import JID from '../../../../JID';
import AbstractHandler from '../../AbstractHandler';
import { TYPE as NOTICETYPE, FUNCTION as NOTICEFUNCTION, Notice } from '../../../../Notice';
import Translation from '@util/Translation';

export default class extends AbstractHandler {
   public processStanza(stanza: Element) {
      let from = new JID($(stanza).attr('from'));
      let xElement = $(stanza).find('x[xmlns="http://jabber.org/protocol/muc#user"]');

      let inviteElement = xElement.find('invite');

      if (inviteElement.length === 1) {
         let host = new JID(inviteElement.attr('from'));
         let reason = inviteElement.find('reason').text();
         let password = inviteElement.find('password').text();
         let lastnoti: Notice = this.account.getNoticeManager().getNotices().getLastItem();
         if (
            lastnoti === null ||
            lastnoti.getTitle() !== Translation.t('muc_invitation') ||
            lastnoti.getDescription() !== `for ${from.bare}` ||
            lastnoti.getType() !== NOTICETYPE.invitation ||
            lastnoti.callFunction() !== NOTICEFUNCTION.multiUserInvitation
         ) {
            this.account.getNoticeManager().addNotice({
               title: Translation.t('muc_invitation'),
               description: `for ${from.bare}`,
               type: NOTICETYPE.invitation,
               fnName: NOTICEFUNCTION.multiUserInvitation,
               fnParams: ['direct', host.bare, from.bare, reason, password, this.account.getUid()],
            });
         }
      }

      return this.PRESERVE_HANDLER;
   }
}
