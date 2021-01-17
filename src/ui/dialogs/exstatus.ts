import Dialog from '../Dialog'
import Client from '../../Client'

let exstatusTemplate = require('../../../template/extensiveStatus.hbs');

export default function () {
   let currentStatus = Client.getPresenceController().getStatus();

   let content = exstatusTemplate({
      status: currentStatus,
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   const updateStatus = () => {
      let status = dom.find('textarea[name="extended_status_text"]').val().toString();
      let targetPresence = Client.getPresenceController().getTargetPresence();

      Client.getPresenceController().setTargetPresence(targetPresence, status);

      dialog.close();
   }

   dom.find('.jsxc-js-save').on('click', () => updateStatus());
   dom.find('.jsxc-js-clear').on('click', () => {
      dom.find('textarea[name="extended_status_text"]').val('');

      updateStatus();
   });
}
