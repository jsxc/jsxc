import SM from '../StateMachine'
import ChatWindowList from './ChatWindowList'
import Favicon from './Favicon'
import Roster from './Roster'
import Options from '../Options'
import Notification from '../Notification'

let rosterFormTemplate = require('../../template/roster-form.hbs');

export function init() {
   SM.changeUIState(SM.UISTATE.INITIATING);

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
