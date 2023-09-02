import ChatWindow from '../ui/ChatWindow';
import Attachment from '../Attachment';

export default class FileTransferHandler {
   private handlerElement;
   private inputElement: JQuery<HTMLElement>;

   constructor(private chatWindow: ChatWindow) {
      this.handlerElement = this.chatWindow.getDom().find('.jsxc-file-transfer');
      this.inputElement = this.chatWindow.getDom().find('.jsxc-message-input');

      this.handlerElement.on('click', this.showFileSelection);

      this.inputElement.on('paste', this.pasteImageAsFile);

      this.chatWindow
         .getDom()
         .find('.jsxc-window')
         .on('drop', ev => {
            ev.preventDefault();

            let files = (<any>ev.originalEvent).dataTransfer.files;

            if (files && files.length) {
               this.fileSelected(files[0]);
            }
         });
   }

   private showFileSelection = ev => {
      if (ev.target !== this.handlerElement.find('i').get(0)) {
         // prevent bubbled event
         return;
      }

      this.showFileSelectionDialog();
   };

   private showFileSelectionDialog() {
      let labelElement = this.handlerElement.find('label');
      let fileElement = this.handlerElement.find('input');

      // open file selection for user
      labelElement.click();

      fileElement.off('change').change(ev => {
         let file: File = ev.target.files[0]; // FileList object

         if (!file) {
            return;
         }
         /*Fixed an issue where on chrome based browsers the file select dialog did not fired the event that a file was selected,
           if it was the same file than before. */
         fileElement.off('change');
         fileElement.val('');
         /****/
         this.fileSelected(file);
      });
   }

   private fileSelected(file: File) {
      let attachment = new Attachment(file);
      this.chatWindow.setAttachment(attachment);
   }

   private pasteImageAsFile = (ev: any) => {
      // this handles older browsers
      let items = (ev.clipboardData || ev.originalEvent.clipboardData).items;
      for (let i in items) {
         // poormans check if opbject is an image
         if (items[i].type !== undefined && items[i].type.indexOf('image') === 0) {
            const blob = items[i].getAsFile();
            // load pasted blob as file if present
            this.fileSelected(blob);
            break;
         }
      }
   };
}
