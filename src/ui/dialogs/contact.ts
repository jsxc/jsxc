import Dialog from '../Dialog';
import Contact from '../../Contact'
import Log from '../../util/Log'
import StorageSingleton from '../../StorageSingleton'
import Options from '../../Options'
import * as CONST from '../../CONST'

let contactTemplate = require('../../../template/contact.hbs');

let dialog: Dialog;
let contact: Contact;

export default function(username?: string) {
   let storage = StorageSingleton.getUserStorage();

   let content = contactTemplate({
      username: username
   });

   dialog = new Dialog(content);
   let dom = dialog.open();

   dom.find('[name="username"]').on('keyup', onUsernameKeyUp);
   dom.find('[name="username"]').on('input', onUsernameInput);
   dom.find('form').submit(onSubmit);
}

function onUsernameKeyUp() {
   let getUsers = Options.get('getUsers');

   if (typeof getUsers !== 'function') {
      return;
   }

   var val = $(this).val();
   $('#jsxc-userlist').empty();

   if (val !== '') {
      getUsers.call(this, val, function(list) {
         $('#jsxc-userlist').empty();

         $.each(list || {}, function(uid, displayname) {
            var option = $('<option>');
            option.attr('data-username', uid);
            option.attr('data-alias', displayname);

            option.attr('value', uid).appendTo('#jsxc-userlist');

            if (uid !== displayname) {
               option.clone().attr('value', displayname).appendTo('#jsxc-userlist');
            }
         });
      });
   }
}

function onUsernameInput() {
   var val = $(this).val();
   var option = $('#jsxc-userlist').find('option[data-username="' + val + '"], option[data-alias="' + val + '"]');

   if (option.length > 0) {
      $('#jsxc-username').val(option.attr('data-username'));
      $('#jsxc-alias').val(option.attr('data-alias'));
   }
}

function onSubmit(ev) {
   ev.preventDefault();

   var username = $('#jsxc-username').val();
   var alias = $('#jsxc-alias').val();

   if (!username.match(/@(.*)$/)) {
      username += '@' + Strophe.getDomainFromJid(jsxc.storage.getItem('jid'));
   }

   // Check if the username is valid
   if (!username || !username.match(CONST.REGEX.JID)) {
      // Add notification
      $('#jsxc-username').addClass('jsxc-invalid').keyup(function() {
         if ($(this).val().match(CONST.REGEX.JID)) {
            $(this).removeClass('jsxc-invalid');
         }
      });

      return false;
   }

   jsxc.xmpp.addBuddy(username, alias);

   dialog.close();
}
