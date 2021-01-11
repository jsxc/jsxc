import Dialog from '../Dialog'
import Client from '../../Client'
import Account from '../../Account'
import { Presence } from '../../connection/AbstractConnection'

let exstatusTemplate = require('../../../template/exstatus.hbs');

let dialog: Dialog;

export default function() {

   let content = exstatusTemplate();

   dialog = new Dialog(content);
   let dom = dialog.open();

   let accounts = Client.getAccountManager().getAccounts();
   accounts.forEach(account => {
      let accountoption = $('<option>').text(account.getJID().bare).val(account.getUid());
      dom.find('select[name="account"]').append(accountoption);
   })

   getStatus(accounts[0]);

   dom.find('select[name="account"]').on('change', (ev) => {
      let uid = $(ev.target).val().toString();

       getStatus(Client.getAccountManager().getAccount(uid));
   });

   $('.jsxc-js-save').on('click',sendStatus);
   $('.jsxc-js-clear').on('click',removeStatus);
}

function sendStatus()
{
   let account = Client.getAccountManager().getAccount(dialog.getDom().find('select[name="account"]').val().toString());
   let val = dialog.getDom().find('select[name="presence"]').val();
   let presence;
   switch (val)
   {
       case 'away':
          presence = Presence.away;
       break;

       case 'xa':
          presence = Presence.xa;
       break;

       case 'dnd':
          presence = Presence.dnd;
       break;
   }

   let statustext = dialog.getDom().find('textarea[name="extended_status_text"]').val().toString();
   Client.getPresenceController().setTargetPresence(presence);
   account.getContact().setStatus(statustext);
   account.getConnection().sendPresence(presence,statustext);
   dialog.close();
}

function getStatus(account: Account)
{
   let text = account.getContact().getStatus();
   dialog.getDom().find('textarea[name="extended_status_text"]').val(text);
}

function removeStatus(ev) {
   ev.preventDefault();

   let account = Client.getAccountManager().getAccount(dialog.getDom().find('select[name="account"]').val().toString());
   let currentPresence = Client.getPresenceController().getCurrentPresence();
   account.getConnection().sendPresence(currentPresence,'');
   dialog.getDom().find('textarea[name="extended_status_text"]').val('');
}