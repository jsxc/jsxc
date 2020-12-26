import Dialog from '../Dialog'

const mucHelpDialogTemplate = require('../../../template/mucHelpDialog.hbs');

export default function() {
   let content = mucHelpDialogTemplate({});

   let dialog = new Dialog(content);
   let dom = dialog.open();

   dom.find('#button-close').click(() => {
      dialog.close();
   });
}
