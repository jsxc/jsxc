import Dialog from '../Dialog';

let notificationTemplate = require('../../../template/notification.hbs');

export default function(subject:string, message:string, from?:string) {
   let content = notificationTemplate({
      subject: subject,
      message: message,
      from: from
   });

   var dialog = new Dialog(content);
   dialog.open();
}
