import Dialog from '../Dialog';
import Contact from '../../Contact'
import StorageSingleton from '../../StorageSingleton'
import showDebugLog from './debugLog'

var aboutTemplate = require('../../../template/about.hbs');

export default function() {
   let content = aboutTemplate({
      version: null,
      appName: null
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   dom.find('.show-debug-log').click(() => {
      dialog.close();

      showDebugLog();
   });
}
