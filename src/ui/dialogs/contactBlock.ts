import Dialog from '../Dialog'
import Translation from '../../util/Translation'
import Client from '../../Client'
import BlockingCommandPlugin from '../../plugins/BlockingCommandPlugin'
import Log from '@util/Log';

let contactBlockList = require('../../../template/contactBlock.hbs');
let dialog: Dialog;

export default function () {
   let content = contactBlockList({});

   dialog = new Dialog(content);
   dialog.open();
   let accounts = Client.getAccountManager().getAccounts();
   accounts.forEach(account => {
      let accountoption = $('<option>').text(account.getJID().bare).val(account.getUid());
      dialog.getDom().find('select[name="account"]').append(accountoption);
   });

   dialog.getDom().find('select[name="account"]').on('change', (ev) => {

      let uid = $(ev.target).val().toString();
      let account = Client.getAccountManager().getAccount(uid);

      //Check Support
      account.getDiscoInfoRepository().hasFeature(undefined, BlockingCommandPlugin.getNS()).then((result)=>{
          if (result)
          {
              $('.jsxc-block-error').empty();
              let blockPlugin = account.getPluginRepository().getPlugin(BlockingCommandPlugin.getId()) as BlockingCommandPlugin;
              getBlockList(blockPlugin);
          }
          else
          {
              dialog.getDom().find('textarea[name="jsxc-blocklist-textarea"]').val('');
              $('.jsxc-block-error').text(Translation.t('blocking_cmd_not_supported'));
          }
      }).catch((err)=>{
          dialog.getDom().find('textarea[name="jsxc-blocklist-textarea"]').val('');
          Log.warn(Translation.t('blocking_cmd_not_supported'), err)
          $('.jsxc-block-error').text(Translation.t('blocking_cmd_not_supported'));
      });
   });

   dialog.getDom().find('select[name="account"]').trigger('change');
}

function getBlockList(blockPlugin: BlockingCommandPlugin) {
   let dom = dialog.getDom();
   dom.find('.jsxc-warning').remove();

   blockPlugin.getBlocklist()
      .then(function (blocklist) {
         let textfield = dialog.getDom().find('textarea[name="jsxc-blocklist-textarea"]');
         textfield.val(blocklist.join('\n'));

         initSubmit(dialog, blockPlugin, blocklist);
      }).catch((err) => {
         Log.warn(Translation.t('error_receiving_blocklist'), err)

         $('<div>').addClass('jsxc-warning').text(Translation.t('error_receiving_blocklist')).appendTo(dom);
      });
}

function initSubmit(dialog: Dialog, blockPlugin: BlockingCommandPlugin, oldBlocklist: string[]) {
   dialog.getDom().find('form').off('submit').on('submit', (ev) => {
      ev.preventDefault();

      dialog.getDom().find('input, button').prop('disabled', true);

      let textarea = dialog.getDom().find('textarea[name="jsxc-blocklist-textarea"]');
      let lines = textarea.val().toString().split('\n').map(item => item.trim())

      lines = lines.filter(item => item.length > 0 && /^(\w+([-+.']\w+)*@)?\w+([-.]\w+)*(\/[-.\w])?$/.test(item));

      textarea.val(lines.join('\n'));

      let unblockedJids: string[] = <any>$(oldBlocklist).not(lines as any).get();
      let blockedJids: string[] = <any>$(lines).not(oldBlocklist as any).get();

      let promises = [];

      if (unblockedJids.length > 0 || lines.length === 0) {
         promises.push(blockPlugin.unblock(unblockedJids));
      }

      if (blockedJids.length > 0) {
         promises.push(blockPlugin.block(blockedJids));
      }

      Promise.all(promises).then(() => {
         dialog.close();
      });
   });
}
