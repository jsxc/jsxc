import Dialog from '../Dialog';

import { IMessage } from '@src/Message.interface';
import DateTime from '@ui/util/DateTime';
import { IContact } from '@src/Contact.interface';

let template = require('../../../template/xep308log.hbs');

let dialog: Dialog;


export default  function (from: IContact, to :IContact, messages: IMessage[]) {
   let arr = [];
   messages.forEach((item:IMessage)=>{
      arr.push({text:item.getPlaintextMessage(),time:DateTime.stringifyToString(item.getStamp().getTime())});
   });
 
   let content = template({
      from: from.getJid().bare,
      to: to.getJid().bare,
      message: arr
   });

   dialog = new Dialog(content);
   dialog.open();
}

