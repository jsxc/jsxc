import Dialog from '../Dialog'
import Contact from '../../Contact'
import * as CONST from '../../CONST'
import Client from '../../Client'
import JID from '../../JID'

let contactTemplate = require('../../../template/contact.hbs');
let nick: string;
let dialog: Dialog;

export default function(username?: string, nickname?: string) {
   username = (typeof username === 'string') ? username : undefined;
   nickname = (typeof nickname === 'string') ? nickname : undefined;
   nick = nickname;
   let content = contactTemplate({
      username,
   });

   dialog = new Dialog(content);
   let dom = dialog.open();

   dom.find('[name="username"]').on('keyup', onUsernameKeyUp);
   dom.find('[name="username"]').on('input', onUsernameInput);
   dom.find('form').submit(onSubmit);
}

async function onUsernameKeyUp() {
   let getUsers = Client.getOption('getUsers');

   if (typeof getUsers !== 'function') {
      return;
   }

   let val = $(this).val();
   $('#jsxc-userlist').empty();

   if (val === '') {
      return;
   }

   //@TODO delay execution
   let list = await getUsers(val);

   $('#jsxc-userlist').empty();

   for (let uid in list) {
      let displayName = list[uid];

      let option = $('<option>');
      option.attr('data-username', uid.toString());
      option.attr('data-alias', displayName);

      option.attr('value', uid.toString()).appendTo('#jsxc-userlist');

      if (uid !== displayName) {
         option.clone().attr('value', displayName).appendTo('#jsxc-userlist');
      }
   }
}

function onUsernameInput() {
   let val = $(this).val();
   let option = $('#jsxc-userlist').find('option[data-username="' + val + '"], option[data-alias="' + val + '"]');

   if (option.length > 0) {
      $('#jsxc-username').val(option.attr('data-username'));
      $('#jsxc-alias').val(option.attr('data-alias'));
   }
}

function onSubmit(ev) {
   ev.preventDefault();

   let username = <string> $('#jsxc-username').val();
   let alias = <string> $('#jsxc-alias').val();
   //@TODO [MA] if we support multi account, we need an account selection dialog
   let account = Client.getAccountManager().getAccount();

   if (!username.match(/@(.*)$/)) {
      username += '@' + account.getJID().domain;
   }

   // Check if the username is valid
   if (!username || !username.match(CONST.REGEX.JID)) {
      // Add notification
      $('#jsxc-username').addClass('jsxc-invalid').keyup(function() {
         if ((<string> $(this).val()).match(CONST.REGEX.JID)) {
            $(this).removeClass('jsxc-invalid');
         }
      });

      return false;
   }

   let jid = new JID(username);
   let contact = new Contact(account, jid, alias);
   contact.getNicknameObject().setContactNickname(nick);
   account.getContactManager().add(contact);

   //@TODO show spinner

   dialog.close();
}
