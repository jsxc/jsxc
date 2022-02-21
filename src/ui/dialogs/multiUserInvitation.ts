import Dialog from '../Dialog';
import MultiUserContact from '../../MultiUserContact';
import JID from '../../JID';
import Log from '../../util/Log';
import Client from '../../Client';

let multiUserInvitation = require('../../../template/multiUserInvitation.hbs');

export default function (
   type: 'direct' | 'mediated',
   from: string,
   room: string,
   reason: string,
   password: string,
   accountId: string
) {
   let fromJid = new JID(from);
   let roomJid = new JID(room);
   let content = multiUserInvitation({
      from,
      room,
      reason,
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();
   let account = Client.getAccountManager().getAccount(accountId);

   if (from.toLocaleLowerCase().localeCompare(room.toLocaleLowerCase())===0)   
   {
      $(dom.find('.form-group')[0]).hide();
   }

   if (reason===null||reason===undefined||reason.trim().length===0)
   {
      $(dom.find('.form-group')[2]).hide();
   }

   dom.find('form').on('submit', ev => {
      ev.preventDefault();

      let multiUserContact = <MultiUserContact>account.getContact(roomJid);

      if (!multiUserContact) {
         multiUserContact = new MultiUserContact(account, roomJid);
         multiUserContact.setAutoJoin(true);

         account.getContactManager().add(multiUserContact);
      } else if (multiUserContact.getType() !== MultiUserContact.TYPE) {
         Log.warn('Got normal contact. Abort.');
         return;
      }

      if (!multiUserContact.getNickname()) {
         multiUserContact.setNickname(account.getJID().node);
      }

      multiUserContact.join();

      let chatWindow = multiUserContact.getChatWindowController();
      chatWindow.openProminently();

      dialog.close();
   });

   dom.find('jsxc-js-close').click(() => {
      if (type === 'mediated') {
         account.getConnection().getMUCService().declineMediatedMultiUserInvitation(fromJid, roomJid);
      }
   });
}
