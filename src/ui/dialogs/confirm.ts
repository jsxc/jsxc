import Dialog from '../Dialog';
import Contact from '../../Contact'
import Log from '../../util/Log'
import StorageSingleton from '../../StorageSingleton'
import Options from '../../Options'
import * as CONST from '../../CONST'
import Client from '../../Client'
import JID from '../../JID'

let confirmTemplate = require('../../../template/confirm.hbs');

export default function(question:string, id?:string) {
   let content = confirmTemplate({
      question: question
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   if (id) {
      dom.attr('data-selection-id', id);
   }

   let promise = new Promise((resolve, reject) => {
      dom.find('.jsxc-confirm').click(function(){
         resolve(dialog);
      });

      dom.find('.jsxc-dismiss').click(function(){
         reject(dialog);
      });
   });

   dialog.getPromise = () => {
      return promise;
   };

   return dialog;
}
