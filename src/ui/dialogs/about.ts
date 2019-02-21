import Dialog from '../Dialog'
import showDebugLog from './debugLog'
import Client from '../../Client'

const aboutTemplate = require('../../../template/about.hbs');

export default function() {
   let content = aboutTemplate({
      version: __VERSION__,
      date: __BUILD_DATE__,
      appName: Client.getOption('appName'),
      dependencies: __DEPENDENCIES__,
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   dom.find('.jsxc-debug-log').click(() => {
      dialog.close();

      showDebugLog();
   });
}
