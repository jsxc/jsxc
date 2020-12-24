import Dialog from '../Dialog'
import Client from '../../Client'

let exstatusTemplate = require('../../../template/exstatus.hbs');

let dialog: Dialog;

export default function() {

   let content = exstatusTemplate();

   dialog = new Dialog(content);
   let dom = dialog.open();

   $(dom).ready(function(){
      getStatus();
   });

   $('.jsxc-js-save').on('click',sendStatus);
   $('.jsxc-js-clear').on('click',removeStatus);
}

function sendStatus()
{

   let account = Client.getAccountManager().getAccounts()[0];
   let statustext = dialog.getDom().find('textarea[name="extended_status_text"]').val().toString();

   account.getContact().setStatus(statustext);
   let targetPresence = Client.getPresenceController().getTargetPresence();
   let con = account.getConnection();
   con.sendPresence(targetPresence,statustext);

   account.getConnection().getPEPService().publisStatus(statustext).then(function(result) {
         dialog.close();
   }).catch(function (msg){
         dialog.close();
   });
}

function getStatus()
{
     let account = Client.getAccountManager().getAccounts()[0];
     let contact = account.getContact();
     let jid = contact.getJid();
     account.getConnection().getPEPService().retrieveItems('http://jabber.org/protocol/status',jid.bare).then(function(data) {
         dialog.getDom().find('textarea[name="extended_status_text"]').val($(data).text());
     });
}

function removeStatus(ev) {
   ev.preventDefault();

   let account = Client.getAccountManager().getAccounts()[0];

   let targetPresence = Client.getPresenceController().getTargetPresence();
   let con = account.getConnection();
   con.sendPresence(targetPresence,'');

   account.getConnection().getPEPService().publisStatus('').then(function(result) {
         dialog.close();
   }).catch(function (msg){
         dialog.close();
   });

}