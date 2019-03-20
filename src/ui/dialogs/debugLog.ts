import Dialog from '../Dialog'
import Log from '@util/Log';
import Utils from '@util/Utils';

let debugLogTemplate = require('../../../template/debugLog.hbs');

export default function() {
   let content = debugLogTemplate({
      userInfo: getUserInformation()
   });

   let dialog = new Dialog(content);
   dialog.open();

   let logs = Log.getLogs();

   dialog.getDom().find('.jsxc-log').append(`<p>${logs.map(log => Utils.escapeHTML(log)).join('<br>')}</p>`);
}

function getUserInformation() {
   let userInfo = [];

   if (typeof navigator !== 'undefined') {
      for (let key in navigator) {
         if (typeof navigator[key] === 'string' && navigator[key]) {
            userInfo.push({
               key,
               value: navigator[key]
            });
         }
      }
   }

   userInfo.push({
      key: 'jQuery',
      value: ($.fn && $.fn.jquery) ? $.fn.jquery : 'none'
   });

   userInfo.push({
      key: 'jQuery UI',
      value: ((<any> $).ui && (<any> $).ui.version) ? (<any> $).ui.version : 'none'
   });

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
