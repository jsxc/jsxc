import Dialog from '../Dialog';

export default function(subject:string, message:string, from?:string) {
   let content = Templates.get('loginBox', {
      username: null
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();

   $(document).one('complete.dialog.jsxc', function() {
      setTimeout(setFocus, 50);
   });

   dom.find('form').submit(function(ev) {
      ev.preventDefault();

      submitLoginForm($(this));
   });
}

function setFocus(){
         if ($("#jsxc_username").val().length === 0) {
            $("#jsxc_username").focus();
         } else {
            $('#jsxc_password').focus();
         }
}

function submitLoginForm(form) {
   // @TODO generalize
   form.find('button[data-jsxc-loading-text]').trigger('btnloading.jsxc');

   jsxc.options.loginForm.form = form;
   jsxc.options.loginForm.jid = form.find('#jsxc_username');
   jsxc.options.loginForm.pass = form.find('#jsxc_password');

   jsxc.triggeredFromBox = true;
   jsxc.options.loginForm.triggered = false;

   jsxc.prepareLogin(function(settings) {
      if (settings === false) {
         onAuthFail();
      } else {
         $(document).on('authfail.jsxc', onAuthFail);

         jsxc.xmpp.login();
      }
   });
}

function onAuthFail() {
   alert.show();
   jsxc.gui.dialog.resize();

   $('#jsxc_dialog').find('button').trigger('btnfinished.jsxc');

   $('#jsxc_dialog').find('input').one('keypress', function() {
      alert.hide();
      jsxc.gui.dialog.resize();
   });
}
