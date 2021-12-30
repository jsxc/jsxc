import Dialog from '../Dialog';

let alertdialogcontent = require('../../../template/alertdialog.hbs');

export default function (title: string, message: string, closebtn: string, callback?: () => any): void {
   let content = alertdialogcontent({
      Title: title,
      Close: closebtn,
      content: message,
   });

   let dialog = new Dialog(content);

   let dom = dialog.open();

   dom.find('.app-js-close').remove();

   dom.find('.app-button-close').on('click', ev => {
      if (callback !== undefined) {
         callback();
      }
      ev.preventDefault();
      dialog.close();
   });
}
