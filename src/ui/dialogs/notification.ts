import Dialog from '../Dialog'

let notificationTemplate = require('../../../template/notification.hbs');

export default function(subject: string, message: string, from?: string) {
   let content = notificationTemplate({
      subject,
      message,
      from
   });

   let dialog = new Dialog(content);
   dialog.open();
}
