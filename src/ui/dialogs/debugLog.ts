import Dialog from '../Dialog'

let debugLogTemplate = require('../../../template/debugLog.hbs');

export default function() {
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
      value: __VERSION__
   });

   return userInfo;
}
