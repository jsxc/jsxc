import Dialog from '../Dialog'
import Client from '../../Client'
import { start } from '../../index'
let loginTemplate = require('../../../template/loginBox.hbs');

export default function(username?: string) {
   let boshUrl = Client.getOption('xmppBoshUrl');

   let content = loginTemplate({
      showBoshUrlField: typeof boshUrl !== 'string' || boshUrl.length === 0,
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
   if ($("#jsxc-url").length && !$("#jsxc-url").val()) {
      $("#jsxc-url").focus();
   } else if (!$("#jsxc-username").val()) {
      $("#jsxc-username").focus();
   } else {
      $('#jsxc-password').focus();
   }
}

function submitLoginForm(form) {
   form.find('button[data-jsxc-loading-text]').trigger('btnloading.jsxc');

   let boshUrl = Client.getOption('xmppBoshUrl') || form.find('#jsxc-url').val();
   let username = form.find('#jsxc-username').val();
   let password = form.find('#jsxc-password').val();

   return start(boshUrl, username, password);
}

function onAuthFail(dom) {
   let alert = dom.find('.jsxc-alert');
   alert.show();

   dom.find('button').trigger('btnfinished.jsxc');

   dom.find('input').one('keypress', function() {
      alert.hide();
   });
}
