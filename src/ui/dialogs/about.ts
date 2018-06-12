import Dialog from '../Dialog'
import showDebugLog from './debugLog'

var aboutTemplate = require('../../../template/about.hbs');

export default function() {
   let content = aboutTemplate({
      version: __VERSION__,
      date: __BUILD_DATE__,
      appName: null //@TODO get app name
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   dom.find('.show-debug-log').click(() => {
      dialog.close();

      showDebugLog();
   });
}
