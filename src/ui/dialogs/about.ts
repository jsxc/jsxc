import Dialog from '../Dialog'
import showDebugLog from './debugLog'
import Client from '../../Client'

var aboutTemplate = require('../../../template/about.hbs');

export default function() {
   let content = aboutTemplate({
      version: __VERSION__,
      date: __BUILD_DATE__,
      appName: Client.getOption('app_name'),
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   dom.find('.jsxc-debug-log').click(() => {
      dialog.close();

      showDebugLog();
   });
}
