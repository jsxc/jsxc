import Dialog from '../Dialog'
import Log from '@util/Log';
import Utils from '@util/Utils';
import UserMedia from '@src/UserMedia';
import { VideoDialog } from '@ui/VideoDialog';

let debugLogTemplate = require('../../../template/debugLog.hbs');

export default function() {
   let content = debugLogTemplate({
      userInfo: getUserInformation()
   });

   let dialog = new Dialog(content);
   dialog.open();

   let dom = dialog.getDom();
   let logs = Log.getLogs();

   dom.find('.jsxc-log').append(`<p>${logs.map(log => Utils.escapeHTML(log)).join('<br>')}</p>`);

   dom.find('.jsxc-webcam button').on('click', function() {
      $(this).remove();

      let videoElement = $('<video autoplay></video>');
      videoElement.css('width', '150px');
      videoElement.appendTo(dom.find('.jsxc-webcam'));

      UserMedia.request(['video']).then(stream => {
         VideoDialog.attachMediaStream(videoElement, stream);
      }).catch(err => {
         Log.warn('Video request failed.', err);

         videoElement.remove();

         dom.find('.jsxc-webcam').append(err.toString());
      })
   });

   dialog.registerOnClosedHook(() => {
      let videoElement = dom.find('.jsxc-webcam video');

      if (videoElement.length > 0) {
         VideoDialog.detachMediaStream(videoElement);
      }
   })
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
