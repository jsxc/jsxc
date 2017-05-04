import Dialog from '../Dialog';
import Contact from '../../Contact'
import StorageSingleton from '../../StorageSingleton'

let debugLogTemplate = require('../../../template/debugLog.hbs');

export default function() {
   let storage = StorageSingleton.getUserStorage();

   let content = debugLogTemplate({
      userInfo: getUserInformation()
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();
}

function getUserInformation() {
   let userInfo = [];

   if (typeof navigator !== 'undefined') {
      var key;
      for (key in navigator) {
         if (typeof navigator[key] === 'string') {
            userInfo.push({
               key: key,
               value: navigator[key]
            });
         }
      }
   }

   if ($.fn && $.fn.jquery) {
      userInfo.push({
         key: 'jQuery',
         value: $.fn.jquery
      });
   }

   if (window.screen) {
      userInfo.push({
         key: 'Height',
         value: window.screen.height
      });
      userInfo.push({
         key: 'Width',
         value: window.screen.width
      });
   }

   userInfo.push({
      key: 'JSXC',
      value: null
   });

   return userInfo;
}
