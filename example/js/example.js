$(function() {
   var settings = {
      xmpp: {
         url: '/http-bind/',
         domain: 'localhost',
         resource: 'example',
         overwrite: true,
         onlogin: true
      }
   };

   jsxc.init({
      loginForm: {
         form: '#form',
         jid: '#username',
         pass: '#password'
      },
      logoutElement: $('#logout'),
      checkFlash: false,
      rosterAppend: 'body',
      root: window.location.pathname.replace(/\/[^/]+$/, '/') + '../build',
      turnCredentialsPath: 'ajax/getturncredentials.json',
      displayRosterMinimized: function() {
         return true;
      },
      otr: {
         debug: true,
         SEND_WHITESPACE_TAG: true,
         WHITESPACE_START_AKE: true
      },
      loadSettings: function(username, password) {
         return settings;
      },
      xmpp: {
         url: settings.xmpp.url
      }
   });

   $('#form2').submit(function(ev) {
      ev.preventDefault();

      $(document).on('connectionReady.jsxc', function() {
         $('#form2 input').prop('disabled', true);
         
         $('#logout2').show().click(jsxc.xmpp.logout);
      });

      jsxc.xmpp.login($('#username2').val() + '@' + settings.xmpp.domain, $('#password2').val());
   });
});
