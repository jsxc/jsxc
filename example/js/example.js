$(function() {
   jsxc.init({
      loginForm: {
         form: '#form',
         jid: '#username',
         pass: '#password',
         preJid: function(jid) {
            var data = {
               xmppResource: 'example',
               xmppDomain: 'localhost',
               boshUrl: '/http-bind/'
            };

            var resource = (data.xmppResource) ? '/' + data.xmppResource : '';
            var domain = data.xmppDomain;

            jsxc.storage.setItem('boshUrl', data.boshUrl);

            if (jid.match(/@(.*)$/)) {
               return (jid.match(/\/(.*)$/)) ? jid : jid + resource;
            }

            return jid + '@' + domain + resource;
         }
      },
      logoutElement: $('#logout'),
      checkFlash: false,
      rosterAppend: 'body',
      root: '../',
      turnCredentialsPath: 'ajax/getturncredentials.json',
      displayRosterMinimized: function() {
         return true;
      },
      otr: {
         debug: true,
         SEND_WHITESPACE_TAG: true,
         WHITESPACE_START_AKE: true
      },

   });
});