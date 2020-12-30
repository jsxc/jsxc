import Dialog from '../Dialog'

const commandHelpDialogTemplate = require('../../../template/commandHelpDialog.hbs');

export default function(categories) {
   let content = commandHelpDialogTemplate({categories});

   let dialog = new Dialog(content);
   dialog.open();
}
