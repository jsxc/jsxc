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
      root: '/owncloud/apps/ojsxc/js/jsxc/',
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
      }
   });

   $('#form2').submit(function(ev) {
      ev.preventDefault();

      jsxc.options.xmpp.url = settings.xmpp.url;
      
      $(document).on('connectionReady.jsxc', function() {
         $('#form2 input').prop('disabled', true);
         
         $('#logout2').show().click(jsxc.xmpp.logout);
      });

      jsxc.xmpp.login($('#username2').val() + '@' + settings.xmpp.domain, $('#password2').val());
   });
});