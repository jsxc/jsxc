import Dialog from '../Dialog';
import Contact from '../../Contact'
import Log from '../../util/Log'
import StorageSingleton from '../../StorageSingleton'
import Message from '../../Message'
import Translation from '../../util/Translation'

var verificationTemplate = require('../../../template/verification.hbs');

let dialog:Dialog;
let contact:Contact;

export default function(c:Contact) {
   contact = c;
   let storage = StorageSingleton.getUserStorage();

   // @TODO generalize (fingerprint.ts)
   let ownFingerprint = storage.getItem('ownOtrFingerprint').replace(/(.{8})/g, '$1 ');
   let theirFingerprint = contact.getFingerprint().replace(/(.{8})/g, '$1 ');

   if (contact.getMsgState() !== OTR.CONST.MSGSTATE_ENCRYPTED) {
      Log.warn('Connection not encrypted');
      return;
   }

   let content = verificationTemplate({
   });

   dialog = new Dialog(content);
   let dom = dialog.open();

   dom.find('.jsxc-selection button').click(function() {
      clickVerificationMethod(dom, $(this));
   });

   dom.find('.jsxc-submit-manual .jsxc-submit').click(submitManualVerification);

   dom.find('.jsxc-submit-question .jsxc-submit').click(submitQuestionVerification);

   dom.find('.jsxc-submit-secret .jsxc-submit').click(submitSecretVerification);
}

function clickVerificationMethod(dom, button) {
   $(this).siblings().removeClass('active');
   $(this).addClass('active');
   $(this).get(0).blur();

   dom.find('> div:gt(0)').hide();
   dom.find('> div:eq(' + ($(this).index() + 1) + ')').show().find('input:first').focus();
}

function submitManualVerification(contact:Contact) {
   if (jsxc.master) {
      jsxc.otr.objects[bid].trust = true;
   }

   contact.setTrust(true);

   dialog.close();

   let message = new Message({
      direction: Message.OUT,
      msg: Translation.t('conversation_is_now_verified')
   });

   contact.sendMessage(message);
};

function submitQuestionVerification() {
   var sec = $('#jsxc_secret2').val();
   var quest = $('#jsxc_quest').val();

   // @TODO client side validation (HTML5 form required)

   if (jsxc.master) {
      jsxc.otr.sendSmpReq(bid, sec, quest);
   } else {
      jsxc.storage.setUserItem('smp', bid, {
         sec: sec,
         quest: quest
      });
   }

   dialog.close();

   let message = new Message({
      direction: Message.SYS,
      msg: Translation.t('authentication_query_sent')
   });

   contact.sendMessage(message);
}

function submitSecretVerification() {
   var sec = $('#jsxc_secret').val();

   // @TODO client side validation (HTML5 form required)

   if (jsxc.master) {
      jsxc.otr.sendSmpReq(bid, sec);
   } else {
      jsxc.storage.setUserItem('smp', bid, {
         sec: sec,
         quest: null
      });
   }

   dialog.close();

   let message = new Message({
      direction: Message.SYS,
      msg: Translation.t('authentication_query_sent')
   });

   contact.sendMessage(message);
}
