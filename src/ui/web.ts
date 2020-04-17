import SM from '../StateMachine'
import ChatWindowList from './ChatWindowList'
import Roster from './Roster'

export function init() {
   SM.changeUIState(SM.UISTATE.INITIATING);

   ChatWindowList.init();

   Roster.init();

   // if (Options.get('muteNotification')) {
   //    Notification.muteSound();
   // }
}
