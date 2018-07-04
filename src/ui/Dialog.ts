import Log from '../util/Log'

let dialogTemplate = require('../../template/dialog.hbs');

export default class Dialog {

   private readonly id: string;

   private src;

   private magnificPopupOptions = {
      items: null,
      modal: null,
      type: 'inline',
      callbacks: {
         beforeClose: this.onBeforeClose,
         afterClose: this.onAfterClose,
         open: () => {
            this.onOpened();
         }
      }
   };

   // @REVIEW name is maybe unnecessary
   public constructor(content: string, private unclosable: boolean = false, readonly name: string = '') {
      this.id = Dialog.generateId();

      this.src = dialogTemplate({
         id: this.id,
         name: name,
         content: content
      });
   }

   public open() {
      if (this.getDom().length === 0) {
         $('body').append(this.src);

         this.onOpened();
      }

      return this.getDom();
   }

   public close() {
      if ($('#' + this.id).length > 0) {
         Log.debug('close dialog');

         $('#' + this.id).remove();
      }
   }

   public resize() {

   }

   public getDom() {
      return $('.jsxc-dialog[data-name="' + this.name + '"]');
   }

   public append(content: string) {
      var dom = this.getDom();

      dom.append(content);
   }

   public getPromise(): Promise<{}> {
      return new Promise(() => { });
   }

   private onOpened() {
      let self = this;
      let dom = this.getDom();

      if (this.unclosable) {
         dom.find('.jsxc-dialog-close').hide();
      }

      dom.find('.jsxc-close').click(function(ev) {
         ev.preventDefault();

         self.close();
      });

      dom.find('form').each(function() {
         var form = $(this);

         form.find('button[data-jsxc-loading-text]').each(function() {
            var btn = $(this);

            btn.on('btnloading.jsxc', function() {
               if (!btn.prop('disabled')) {
                  btn.prop('disabled', true);

                  btn.data('jsxc_value', btn.text());

                  btn.text(btn.attr('data-jsxc-loading-text'));
               }
            });

            btn.on('btnfinished.jsxc', function() {
               if (btn.prop('disabled')) {
                  btn.prop('disabled', false);

                  btn.text(btn.data('jsxc_value'));
               }
            });
         });
      });

      self.resize();

      $(document).trigger('complete.dialog.jsxc');
   }

   private onAfterClose() {
      $(document).trigger('close.dialog.jsxc');
   }

   private onBeforeClose() {
      $(document).trigger('cleanup.dialog.jsxc');
   }

   private static generateId(): string {
      let random = Math.round(Math.random() * Math.pow(10, 20)).toString();

      return 'dialog-' + random;
   }
}
