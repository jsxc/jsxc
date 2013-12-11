/**
 * Copyright (c) 2013 Klaus Herberth <klaus@jsxc.org> <br>
 * Released under the MIT license
 * 
 * @author Klaus Herberth
 * @version 0.4.2
 */

/* global jsxc, oc_appswebroots, OC, $ */

/**
 * Make room for the roster inside the owncloud template.
 * 
 * @param {type} event
 * @param {type} state State in which the roster is
 * @param {type} duration Time the roster needs to move
 * @returns {undefined}
 */
function onRosterToggle(event, state, duration) {
   "use strict";
   var wrapper = $('#content-wrapper');
   var control = $('#controls');

   var roster_width = (state === 'shown') ? $('#jsxc_roster').outerWidth() : 0;
   var navigation_width = $('#navigation').width();

   wrapper.animate({
      paddingRight: (roster_width) + 'px'
   }, duration);
   control.animate({
      paddingRight: (roster_width + navigation_width) + 'px'
   }, duration);
}

/**
 * Init owncloud template for roster.
 * 
 * @returns {undefined}
 */
function onRosterReady() {
   "use strict";
   var roster_width = $('#jsxc_roster').outerWidth();
   var navigation_width = $('#navigation').width();
   var roster_right = parseFloat($('#jsxc_roster').css('right'));

   $('#content-wrapper').css('paddingRight', roster_width + roster_right);
   $('#controls').css('paddingRight', roster_width + navigation_width + roster_right);
}

// initialization
$(function() {
   "use strict";

   $(document).on('ready.roster.jsxc', onRosterReady);
   $(document).on('toggle.roster.jsxc', onRosterToggle);

   jsxc.init({
      loginForm: {
         form: '#body-login form',
         jid: '#user',
         pass: '#password',
         preJid: function(jid) {
            var data = null;

            $.ajax(OC.filePath('ojsxc', 'ajax', 'getsettings.php'), {
               async: false,
               success: function(d) {
                  data = d;
               }
            });

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
      debug: function(msg, data) {
         if (data) {
            console.log(msg, data);
         } else {
            console.log(msg);
         }
      },
      rosterAppend: 'body',
      root: oc_appswebroots.ojsxc,
      // @TODO: don't include get turn credentials routine into jsxc
      turnCredentialsPath: OC.filePath('ojsxc', 'ajax', 'getturncredentials.php'),
      displayRosterMinimized: function() {
         return OC.currentUser != null;
      },
      otr: {
         SEND_WHITESPACE_TAG: true,
         WHITESPACE_START_AKE: true
      }
   });

   // Add submit link without chat functionality
   if (jsxc.el_exists($('#body-login form'))) {

      var link = $('<a/>').text('Log in without chat').attr('href', '#').click(function() {
         jsxc.submitLoginForm();
      });

      var alt = $('<p id="jsxc_alt"/>').append(link);
      $('#body-login form fieldset').append(alt);
   }
});