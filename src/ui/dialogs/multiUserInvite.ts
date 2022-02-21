import Dialog from '../Dialog';
import MultiUserContact from '../../MultiUserContact';
import JID from '../../JID';
import Contact from '@src/Contact';
import Translation from '@util/Translation';
import { IContact } from '@src/Contact.interface';

let multiUserInvite = require('../../../template/multiUserInvite.hbs');

export default function (contact: MultiUserContact | IContact) {
   let content = multiUserInvite({});

   let dialog = new Dialog(content);
   let dom = dialog.open();

   //@TODO add datalist of all jids in roster
   if (!contact.isGroupChat()) {
      let contacts = contact.getAccount().getContactManager().getContacts();
      let select = dom.find('#jsxc-groups');
      for (let key in contacts) {
         let c = contacts[key];
         if (c.isGroupChat()) {
            let option = $(`<option value=${c.getJid().bare}>${c.getName()}</option>`);
            select.append(option);
         }
      }

      dom.find('.jsxc-mucs-choice').removeClass('jsxc-hidden');
      dom.find('#jsxc-jid').val(contact.getJid().bare);
      dom.find('#jsxc-jid').prop('disabled', true);
      dom.find('.jsxc-explanation').text(Translation.t('muc_invite_explanation_rooms'));
   }

   dom.find('form').on('submit', ev => {
      ev.preventDefault();

      let reason = <string>dom.find('input[name="reason"]').val();
      let jidString = <string>dom.find('input[name="jid"]').val();
      if (jidString.indexOf('@')===-1)
      {
         jidString+='@'+contact.getAccount().getContact().getJid().domain; // we assume that the user is from same server, so get the domain from account
      }
      let jid = new JID(jidString);

      if (contact instanceof MultiUserContact) {
         contact.invite(jid, reason);
      } else if (contact instanceof Contact) {
         let contacts = contact.getAccount().getContactManager().getContacts();
         let selection = dom.find('#jsxc-groups').val().toString();
         let c = <MultiUserContact>contacts[selection];
         c.invite(jid, reason);
      }

      dialog.close();
   });
}
