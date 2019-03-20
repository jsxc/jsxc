import Dialog from '../Dialog'
import Client from '../../Client'
import { start } from '../../api/v1/index'
import { usernameToJabberId } from '@src/FormWatcher';
let loginTemplate = require('../../../template/loginBox.hbs');

export default function(username?: string) {
   let boshUrl = Client.getOption('xmpp.url');
   let loadConnectionOptions = Client.getOption('loadConnectionOptions');

   let content = loginTemplate({
      showBoshUrlField: (typeof boshUrl !== 'string' || boshUrl.length === 0) && typeof loadConnectionOptions !== 'function',
      username
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   setTimeout(setFocus, 50);

   dom.find('form').submit(function(ev) {
      ev.preventDefault();

      submitLoginForm($(this)).then(() => {
         dialog.close();
      }).catch((err) => {
         onAuthFail(dom);
      });
   });
}

function setFocus() {
   if ($('#jsxc-url').length && !$('#jsxc-url').val()) {
      $('#jsxc-url').focus();
   } else if (!$('#jsxc-username').val()) {
      $('#jsxc-username').focus();
   } else {
      $('#jsxc-password').focus();
   }
}

async function submitLoginForm(form) {
   form.find('button[data-jsxc-loading-text]').trigger('btnloading.jsxc');

   let url = Client.getOption('xmpp.url') || form.find('#jsxc-url').val();
   let username = form.find('#jsxc-username').val();
   let password = form.find('#jsxc-password').val();
   let jid = username;

   let loadConnectionOptions = Client.getOption('loadConnectionOptions');

   if (typeof loadConnectionOptions === 'function') {
      let options = await loadConnectionOptions(username, password);

      if (typeof options !== 'object' || options === null) {
         throw new Error('No connection options provided');
      }

      if ((!options.xmpp || !options.xmpp.url) && !url) {
         throw new Error('I found no connection url');
      }

      url = (options.xmpp && options.xmpp.url) ? options.xmpp.url : url;
      jid = usernameToJabberId(username, options);

      if (options.xmpp && options.xmpp.password) {
         password = options.xmpp.password;
      }
   }

   return await start(url, jid, password);
}

function onAuthFail(dom) {
   let alert = dom.find('.jsxc-alert');
   alert.show();

   dom.find('button').trigger('btnfinished.jsxc');

   dom.find('input').one('keypress', function() {
      alert.hide();
   });
}
