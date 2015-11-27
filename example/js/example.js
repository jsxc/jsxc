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
      displayRosterMinimized: function() {
         return true;
      },
      otr: {
         debug: true,
         SEND_WHITESPACE_TAG: true,
         WHITESPACE_START_AKE: true
      },
      loadSettings: function(username, password, cb) {
         cb(settings);
      },
      xmpp: {
         url: settings.xmpp.url
      }
   });

   var source = '#form';

   $('#form2').submit(function(ev) {
      ev.preventDefault();

      source = $(this);
      $('#submit2').button('loading');

      jsxc.xmpp.login($('#username2').val() + '@' + settings.xmpp.domain, $('#password2').val());
   });

   $('#form3 .submit').click(jsxc.gui.showLoginBox);

   $(document).on('connecting.jsxc', function() {
      $('#form2 input, #form input').prop('disabled', true);
   });

   $(document).on('authfail.jsxc', function() {
      $('#form2 input, #form input').prop('disabled', false);
      $(source).find('.alert').show();
      $(source).find('.submit').button('reset');
   });

   $(document).on('connectionReady.jsxc', function() {
      $('#form2 input, #form input').prop('disabled', true);
      $('.submit').hide();
      $('form .alert').hide();

      $('.logout').show().click(jsxc.xmpp.logout);
   });

   $(document).on('disconnected.jsxc', function() {
      $(source).find('button').button('reset');
      $('#form2 input, #form input').prop('disabled', false);
      $('.submit').show();
      $('.logout').hide().off('click');
   });
});
