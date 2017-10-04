//import {} from '../handler'
import * as NS from '../../namespace'
import Log from '../../../../util/Log'
import JID from '../../../../JID'
import Message from '../../../../Message'
import Utils from '../../../../util/Utils'
import Translation from '../../../../util/Translation'
import Client from '../../../../Client'
import Contact from '../../../../Contact'
import Notification from '../../../../Notification'
import {SOUNDS} from '../../../../CONST'
import Pipe from '../../../../util/Pipe'
import AbstractHandler from '../../AbstractHandler'
import {Notice, TYPE as NOTICETYPE, FUNCTION as NOTICEFUNCTION} from '../../../../Notice';

export default class extends AbstractHandler {
   public processStanza(stanza:Element) {
      let from = new JID($(stanza).attr('from'));
      let xElement = $(stanza).find('x[xmlns="http://jabber.org/protocol/muc#user"]');

      let inviteElement = xElement.find('invite');

      if(inviteElement.length === 1) {
         let host = new JID(inviteElement.attr('from'));
         let reason = inviteElement.find('reason').text();
         let password = inviteElement.find('password').text();

         this.account.getNoticeManager().addNotice({
            title: 'Invitation',
            description: `for ${from.bare}`,
            type: NOTICETYPE.invitation,
            fnName: NOTICEFUNCTION.multiUserInvitation,
            fnParams: ['direct', host.bare, from.bare, reason, password]
         });
      }

      return this.PRESERVE_HANDLER;
   }
}
