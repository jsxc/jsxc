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
