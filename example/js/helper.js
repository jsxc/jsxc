$('.version').text(jsxc.version);

// special setup on localhost
if (window.location.hostname === 'localhost') {
   watchLoginCredentials();
   restoreInstantLoginCredentials();

   $('.localhost').show();
}

// special setup for jsxc.org/example
if (window.location.hostname === 'www.jsxc.org') {
    if (!localStorage.getItem('bosh-url') && !localStorage.getItem('xmpp-domain')) {
       $('#bosh-url').val('/http-bind/');
       $('#xmpp-domain').val('demo.jsxc.ch');
    }

    $('.jsxc-org').show();
 }

armConnectionParameterForm();

function watchLoginCredentials() {
   $('#instant-login-form').submit(function(ev) {
      var username = $(this).find('[name="username"]').val();
      var password = $(this).find('[name="password"]').val();

      storeInstantLoginCredentials(username, password)
   });
}

// store instant login credentials just for convenience
function storeInstantLoginCredentials(username, password) {
   localStorage.setItem('jsxc:example:dev', JSON.stringify({
      username: username,
      password: password
   }));
}

// restore instant login credentials
function restoreInstantLoginCredentials() {
   let formData = localStorage.getItem('jsxc:example:dev');

   try {
      formData = JSON.parse(formData);

      if (formData !== null) {
         $('#instant-login-form').find('[name="username"]').val(formData.username);
         $('#instant-login-form').find('[name="password"]').val(formData.password);
      }
   } catch (err) {}
}

function armConnectionParameterForm() {
   // load bosh url from storage
   if (typeof localStorage.getItem('bosh-url') === 'string') {
      $('#bosh-url').val(localStorage.getItem('bosh-url'));
   }

   // load xmpp domain from storage
   if (typeof localStorage.getItem('xmpp-domain') === 'string') {
      $('#xmpp-domain').val(localStorage.getItem('xmpp-domain'));
   }

   // Check bosh url, if input changed
   $('#bosh-url, #xmpp-domain').on('input', inputHandler);

   // check initial bosh url
   $('#bosh-url').trigger('input');
}

function inputHandler() {
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

   $('#server-flash').removeClass('success fail').text('Testing...');

   // test only every 2 seconds
   timeout = setTimeout(function() {
      let url = $('#bosh-url').val();
      let domain = $('#xmpp-domain').val();

      $('#server-flash').removeClass('success fail');

      jsxc.testBOSHServer(url, domain).then(function(message) {
         $('#server-flash').addClass('success').html(message);
      }).catch(function(error) {
         $('#server-flash').addClass('fail').html(error.message);
      });
   }, 2000);

   self.data('timeout', timeout);
}
