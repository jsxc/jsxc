/*jshint latedef: nofunc */

$(function() {
   var settings = {
      xmpp: {
         url: '/http-bind/',
         domain: 'localhost',
         resource: 'example',
         overwrite: true
      }
   };

   // Initialize core functions, intercept login form 
   // and attach connection if possible.
   jsxc.init({
      loginForm: {
         form: '#form',
         jid: '#username',
         pass: '#password'
      },
      logoutElement: $('#logout'),
      rosterAppend: 'body',
      root: window.location.pathname.replace(/\/[^/]+$/, "/") + (window.location.pathname.match(/dev\.html/) ? '../dev' : '../build'),
      displayRosterMinimized: function() {
         return true;
      },
      loadSettings: function(username, password, cb) {
         cb(settings);
      },
      xmpp: {
         url: settings.xmpp.url
      }
   });

   // helper variable
   var source = '#form';

   // AJAX login
   $('#form2').submit(function(ev) {
      ev.preventDefault();

      source = $(this);
      $('#submit2').button('loading');

      jsxc.start($('#username2').val() + '@' + settings.xmpp.domain, $('#password2').val());
   });

   // Box Login
   $('#form3 .submit').click(jsxc.gui.showLoginBox);

   // ============================================
   // Below you find only some helper to show/hide 
   // logout buttons and similiar stuff.
   // ============================================

   // form elements which needs to be enabled/disabled
   var formElements = $('#form2, #form').find('input');

   $(document).on('connecting.jsxc', function() {
      formElements.prop('disabled', true);
   });

   $(document).on('authfail.jsxc', function() {
      formElements.prop('disabled', false);
      $(source).find('.alert').show();
      $(source).find('.submit').button('reset');
   });

   $(document).on('attached.jsxc', function() {
      formElements.prop('disabled', true);
      $('.submit').hide();
      $('form .alert').hide();

      $('.logout').show().click(jsxc.xmpp.logout);
   });

   $(document).on('disconnected.jsxc', function() {
      $(source).find('button').button('reset');
      formElements.prop('disabled', false);
      $('.submit').show();
      $('.logout').hide().off('click');
   });

   // load bosh url from storage
   if (typeof localStorage.getItem('bosh-url') === 'string') {
      $('#bosh-url').val(localStorage.getItem('bosh-url'));
   }

   // load xmpp domain from storage
   if (typeof localStorage.getItem('xmpp-domain') === 'string') {
      $('#xmpp-domain').val(localStorage.getItem('xmpp-domain'));
   }

   // Check bosh url, if input changed
   $('#bosh-url, #xmpp-domain').on('input', function(){
      var self = $(this);
      var timeout = self.data('timeout');

      if (timeout) {
         clearTimeout(timeout);
      }

      var url = $('#bosh-url').val();
      var domain = $('#xmpp-domain').val();

      if (!url || !domain) {
         // we need url and domain to test BOSH server
         return;
      }

      localStorage.setItem('bosh-url', url);
      localStorage.setItem('xmpp-domain', domain);

      settings.xmpp.url = url;
      settings.xmpp.domain = domain;

      $('#server-flash').removeClass('success fail').text('Testing...');

      // test only every 2 seconds
      timeout = setTimeout(function() {
         testBoshServer($('#bosh-url').val(), $('#xmpp-domain').val(), function(result) {
            $('#server-flash').removeClass('success fail').addClass(result.status).html(result.msg);
         });
      }, 2000);

      self.data('timeout', timeout);
   });

   // check initial bosh url
   $('#bosh-url').trigger('input');
});

/**
* Test if bosh server is up and running.
* 
* @param  {string}   url    BOSH url
* @param  {string}   domain host domain for BOSH server
* @param  {Function} cb     called if test is done
*/
function testBoshServer(url, domain, cb) {
   var rid = jsxc.storage.getItem('rid') || '123456';

   function fail(m) {
      var msg = 'BOSH server NOT reachable or misconfigured.';

      if (typeof m === 'string') {
         msg += '<br /><br />' + m;
      }

      cb({
         status: 'fail',
         msg: msg
      });
   }

   $.ajax({
      type: 'POST',
      url: url,
      data: "<body rid='" + rid + "' xmlns='http://jabber.org/protocol/httpbind' to='" + domain + "' xml:lang='en' wait='60' hold='1' content='text/xml; charset=utf-8' ver='1.6' xmpp:version='1.0' xmlns:xmpp='urn:xmpp:xbosh'/>",
      global: false,
      dataType: 'xml'
   }).done(function(stanza) {
      if (typeof stanza === 'string') {
         // shouldn't be needed anymore, because of dataType
         stanza = $.parseXML(stanza);
      }

      var body = $(stanza).find('body[xmlns="http://jabber.org/protocol/httpbind"]');
      var condition = (body) ? body.attr('condition') : null;
      var type = (body) ? body.attr('type') : null;

      // we got a valid xml response, but we have test for errors

      if (body.length > 0 && type !== 'terminate') {
         cb({
            status: 'success',
            msg: 'BOSH Server reachable.'
         });
      } else {
         if (condition === 'internal-server-error') {
            fail('Internal server error: ' + body.text());
         } else if (condition === 'host-unknown') {
            if (url) {
               fail('Host unknown: ' + domain + ' is unknown to your XMPP server.');
            } else {
               fail('Host unknown: Please provide a XMPP domain.');
            }
         } else {
            fail(condition);
         }
      }
   }).fail(function(xhr, textStatus) {
      // no valid xml, not found or csp issue

      var fullurl;
      if (url.match(/^https?:\/\//)) {
         fullurl = url;
      } else {
         fullurl = window.location.protocol + '//' + window.location.host;
         if (url.match(/^\//)) {
            fullurl += url;
         } else {
            fullurl += window.location.pathname.replace(/[^/]+$/, "") + url;
         }
      }

      if(xhr.status === 0) {
         // cross-side
         fail('Cross domain request was not possible. Either your BOSH server does not send any ' +
            'Access-Control-Allow-Origin header or the content-security-policy (CSP) blocks your request. ' +
            'Starting from Owncloud 9.0 your CSP will be updated in any app which uses the appframework (e.g. files) ' +
            'after you save these settings and reload.' +
            'The savest way is still to use Apache ProxyRequest or Nginx proxy_pass.');
      } else if (xhr.status === 404) {
         // not found
         fail('Your server responded with "404 Not Found". Please check if your BOSH server is running and reachable via ' + fullurl + '.');
      } else if (textStatus === 'parsererror') {
         fail('Invalid XML received. Maybe ' + fullurl + ' was redirected. You should use an absolute url.');
      } else {
         fail(xhr.status + ' ' + xhr.statusText);
      }
   });
}
