import Dialog from '../Dialog'
import Utils from '@util/Utils';

let confirmTemplate = require('../../../template/confirm.hbs');

export default function(question: string, safeContent: boolean = false) {
   if (safeContent !== true) {
      question = Utils.escapeHTML(question);
   }

   let content = confirmTemplate({
      question
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   let promise = new Promise((resolve, reject) => {
      dom.find('.jsxc-confirm').click(function() {
         resolve(dialog);
      });

      dom.find('.jsxc-dismiss').click(function() {
         reject(dialog);
      });
   });

   dialog.getPromise = () => {
      return promise;
   };

   return dialog;
}
