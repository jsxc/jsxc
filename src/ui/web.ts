import SM from '../StateMachine'
import ChatWindowList from './ChatWindowList'
import Favicon from './Favicon'
import Roster from './Roster'
import Options from '../Options'
import Notification from '../Notification'

let rosterFormTemplate = require('../../template/roster-form.hbs');

export function init() {
   SM.changeUIState(SM.UISTATE.INITIATING);
console.trace('UI.init')
   //Favicon.init();

   ChatWindowList.init();

   Roster.init();

   //addFormToRoster();

   // if (Options.get('muteNotification')) {
   //    Notification.muteSound();
   // }
}

function addFormToRoster() {
   let roster = Roster.get();
   let rosterFormElement = $(rosterFormTemplate({}));

   roster.setStatus(rosterFormElement);
}

function toggleList(el) {
   var self = el || $(this);

   self.disableSelection();

   self.addClass('jsxc_list');

   var ul = self.find('ul');
   var slideUp = null;

   slideUp = function() {

      self.removeClass('jsxc_opened');

      $('body').off('click', null, slideUp);
   };

   $(this).click(function() {

      if (!self.hasClass('jsxc_opened')) {
         // hide other lists
         $('body').click();
         $('body').one('click', slideUp);
      } else {
         $('body').off('click', null, slideUp);
      }

      window.clearTimeout(ul.data('timer'));

      self.toggleClass('jsxc_opened');

      return false;
   }).mouseleave(function() {
      ul.data('timer', window.setTimeout(slideUp, 2000));
   }).mouseenter(function() {
      window.clearTimeout(ul.data('timer'));
   });
}

// external = true, if from other tab
function changePresence(pres, external) {

   if (external !== true) {
      jsxc.storage.setUserItem('presence', pres);
   }

   if (jsxc.master) {
      jsxc.xmpp.sendPres();
   }

   $('#jsxc_presence > span').text($('#jsxc_presence .jsxc_inner ul .jsxc_' + pres).text());

   jsxc.gui.updatePresence('own', pres);
}

/**
* This function searches for URI scheme according to XEP-0147.
*
* @memberOf jsxc.gui
* @param container In which element should we search?
*/
function detectUriScheme(container) {
   container = (container) ? $(container) : $('body');

   container.find("a[href^='xmpp:']").each(function() {

      var element = $(this);
      var href = element.attr('href').replace(/^xmpp:/, '');
      var jid = href.split('?')[0];
      var action, params = {};

      if (href.indexOf('?') < 0) {
         action = 'message';
      } else {
         var pairs = href.substring(href.indexOf('?') + 1).split(';');
         action = pairs[0];

         var i, key, value;
         for (i = 1; i < pairs.length; i++) {
            key = pairs[i].split('=')[0];
            value = (pairs[i].indexOf('=') > 0) ? pairs[i].substring(pairs[i].indexOf('=') + 1) : null;

            params[decodeURIComponent(key)] = decodeURIComponent(value);
         }
      }

      if (typeof jsxc.gui.queryActions[action] === 'function') {
         element.addClass('jsxc_uriScheme jsxc_uriScheme_' + action);

         element.off('click').click(function(ev) {
            ev.stopPropagation();

            jsxc.gui.queryActions[action].call(jsxc, jid, params);

            return false;
         });
      }
   });
}

function detectEmail(container) {
   container = (container) ? $(container) : $('body');

   container.find('a[href^="mailto:"],a[href^="xmpp:"]').each(function() {
      var spot = $("<span>X</span>").addClass("jsxc_spot");
      var href = $(this).attr("href").replace(/^ *(mailto|xmpp):/, "").trim();

      if (href !== '' && href !== Strophe.getBareJidFromJid(jsxc.storage.getItem("jid"))) {
         var bid = jsxc.jidToBid(href);
         var self = $(this);
         var s = self.prev();

         if (!s.hasClass('jsxc_spot')) {
            s = spot.clone().attr('data-bid', bid);

            self.before(s);
         }

         s.off('click');

         if (jsxc.storage.getUserItem('buddy', bid)) {
            jsxc.gui.update(bid);
            s.click(function() {
               jsxc.gui.window.open(bid);

               return false;
            });
         } else {
            s.click(function() {
               jsxc.gui.showContactDialog(href);

               return false;
            });
         }
      }
   });
}
