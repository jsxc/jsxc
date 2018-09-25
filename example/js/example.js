jsxc.init();

subscribeToInstantLogin();
watchForm();

function watchForm() {
   let formElement = $('#watch-form');
   let usernameElement = $('#watch-username');
   let passwordElement = $('#watch-password');

   jsxc.watchForm(formElement, usernameElement, passwordElement, getSettings);

   function getSettings(username, password) {
      return Promise.resolve({
         xmpp: {
            url: $('#bosh-url').val(),
            domain: $('#xmpp-domain').val(),
         }
      });
   }
}

function subscribeToInstantLogin() {
   $('#instant-login-form').submit(function(ev) {
      var url = $('#bosh-url').val();
      var domain = $('#xmpp-domain').val();

      var username = $(this).find('[name="username"]').val();
      var password = $(this).find('[name="password"]').val();

      var jid = username + '@' + domain;

      jsxc.start(url, jid, password)
         .then(function() {
            console.log('>>> CONNECTION READY')
         }).catch(function(err) {
            console.log('>>> catch', err)
         })

      return false;
   });
}
