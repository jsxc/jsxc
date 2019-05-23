import Dialog from '@ui/Dialog';
import Session from '@src/plugins/otr/Session';
import Log from '@util/Log';
import Utils from '@util/Utils';
import { IContact } from '@src/Contact.interface';
import Translation from '@util/Translation';

let verificationTemplate = require('../../../template/verification.hbs');

export default class VerificationDialog {
   private dialog: Dialog;

   constructor(private contact: IContact, private session: Session) {
      let ownFingerprint = session.getOwnFingerprint();
      let theirFingerprint = session.getTheirFingerprint();

      if (!session.isEncrypted()) {
         Log.warn('Connection not encrypted');

         return;
      }

      let content = verificationTemplate({
         ownFingerprint: Utils.prettifyHex(ownFingerprint),
         theirFingerprint: Utils.prettifyHex(theirFingerprint),
      });

      this.dialog = new Dialog(content);
      let dom = this.dialog.open();

      dom.find('.jsxc-selection button').click((ev) => {
         this.clickVerificationMethod($(ev.target));
      });

      dom.find('.jsxc-verification-manual .jsxc-submit').click(this.submitManualVerification);

      dom.find('.jsxc-verification-question .jsxc-submit').click(this.submitQuestionVerification);

      dom.find('.jsxc-verification-secret .jsxc-submit').click(this.submitSecretVerification);
   }

   public preFill(question?: string) {
      let dom = this.dialog.getDom();

      if (question) {
         dom.find('button[data-type="question"]').click();

         $('#jsxc-quest').val(question);
      } else {
         dom.find('button[data-type="secret"]').click();
      }
   }

   public close() {
      this.dialog.close();
   }

   private clickVerificationMethod = (button) => {
      let type = button.data('type');

      button.siblings().removeClass('jsxc-button--primary');
      button.addClass('jsxc-button--primary');

      let dom = this.dialog.getDom();

      dom.find(`div[data-type]`).hide();
      dom.find(`div[data-type="${type}"]`).show().find('input:first').focus();
   }

   private submitManualVerification = () => {
      this.session.setVerified(true);

      this.dialog.close();

      this.contact.addSystemMessage(Translation.t('conversation_is_now_verified'));
   }

   private submitQuestionVerification = () => {
      let secret = <string> $('#jsxc-secret2').val();
      let question = <string> $('#jsxc-quest').val();

      if (!secret || !question) {
         return;
      }

      this.session.sendSMPRequest(secret, question);

      this.dialog.close();

      this.contact.addSystemMessage(Translation.t('authentication_query_sent'));
   }

   private submitSecretVerification = () => {
      let secret = <string> $('#jsxc-secret').val();

      if (!secret) {
         return;
      }

      this.session.sendSMPRequest(secret);

      this.dialog.close();

      this.contact.addSystemMessage(Translation.t('authentication_query_sent'));
   }
}
