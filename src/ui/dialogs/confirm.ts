import Dialog from '../Dialog'

let confirmTemplate = require('../../../template/confirm.hbs');

export default function(question: string, id?: string) {
   let content = confirmTemplate({
      question: question
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   if (id) {
      dom.attr('data-selection-id', id);
   }

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
