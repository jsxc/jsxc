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
   let content = selectionTemplate({
      ...options,
      hasPrimary: options.primary && typeof options.primary.cb === 'function',
      hasOption: options.option && typeof options.option.cb === 'function',
   });

   let dialog = new Dialog(content, true);
   let dom = dialog.open();

   if (options.id) {
      dom.attr('data-selection-id', options.id);
   }

   dom.find('.jsxc-button--primary').click(function() {
      options.primary.cb.call(this, arguments);

      dialog.close();
   });
   dom.find('.jsxc-button--default').click(function() {
      options.option.cb.call(this, arguments);

      dialog.close();
   });
}
