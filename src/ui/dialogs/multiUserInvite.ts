import Dialog from '../Dialog'
import MultiUserContact from '../../MultiUserContact'
import JID from '../../JID'

let multiUserInvite = require('../../../template/multiUserInvite.hbs');

export default function(multiUserContact: MultiUserContact) {
   let content = multiUserInvite({});

   let dialog = new Dialog(content);
   let dom = dialog.open();

   //@TODO add datalist of all jids in roster

   dom.find('form').on('submit', (ev) => {
      ev.preventDefault();

      let reason = <string> dom.find('input[name="reason"]').val();
      let jidString = <string> dom.find('input[name="jid"]').val();
      let jid = new JID(jidString);

      multiUserContact.invite(jid, reason);

      dialog.close();
   })
}
