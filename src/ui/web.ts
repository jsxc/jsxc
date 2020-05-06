import SM from '../StateMachine'
import ChatWindowList from './ChatWindowList'
import Roster from './Roster'

export function init() {
   if (SM.getUIState() === SM.UISTATE.STANDBY) {
      SM.changeUIState(SM.UISTATE.INITIATING);

      ChatWindowList.init();

      Roster.init();
   }

   // if (Options.get('muteNotification')) {
   //    Notification.muteSound();
   // }
}
