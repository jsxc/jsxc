import Dialog from '../Dialog';

var selectionTemplate = require('../../../template/selection.hbs');

interface selectionDialogOptions {
   header?:string,
   message?: string,
   primary?: {
      label?: string,
      cb: ()=>any
   },
   option?: {
      label?: string,
      cb: ()=>any
   }
}

export default function(options:selectionDialogOptions) {

   let content = selectionTemplate(options);

   let dialog = new Dialog(content, true);
   let dom = dialog.open();

   dom.find('.btn-primary').click(options.primary.cb);
   dom.find('.btn-primary').click(options.option.cb);
}
