import Dialog from '../Dialog'

let selectionTemplate = require('../../../template/selection.hbs');

interface ISelectionDialogOptions {
   header?: string,
   message?: string,
   primary?: {
      label?: string,
      cb: () => any
   },
   option?: {
      label?: string,
      cb: () => any
   },
   id?: string
}

export default function(options: ISelectionDialogOptions) {

   let content = selectionTemplate(options);

   let dialog = new Dialog(content, true);
   let dom = dialog.open();

   if (options.id) {
      dom.attr('data-selection-id', options.id);
   }

   dom.find('.btn-primary').click(options.primary.cb);
   dom.find('.btn-default').click(options.option.cb);
}
