import Dialog from '../Dialog'

const muchelpTemplate = require('../../../template/muchelp.hbs');

export default function() {
   let content = muchelpTemplate({});

   let dialog = new Dialog(content);
   let dom = dialog.open();

   dom.find('#button-close').click(() => {
      dialog.close();
   });
}
