import SM from '../StateMachine'
import ChatWindowList from './ChatWindowList'
import Favicon from './Favicon'
import Roster from './Roster'

export function init() {
   SM.changeUIState(SM.UISTATE.INITIATING);

   Favicon.init();

   ChatWindowList.init();

   Roster.init();

   // if (Options.get('muteNotification')) {
   //    Notification.muteSound();
   // }
}
