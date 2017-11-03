import Log from './util/Log'

export default class StateMachine {
   public static STATE = {
      INITIATING: 0,
      PREVCONFOUND: 1,
      SUSPEND: 2,
      TRYTOINTERCEPT: 3,
      INTERCEPTED: 4,
      ESTABLISHING: 5,
      READY: 6
   };

   public static UISTATE = {
      INITIATING: 0,
      READY: 1
   }

   private static currentState;
   private static currentUIState;

   public static changeState(state: number) {
      StateMachine.currentState = state;

      Log.debug('State changed to ' + Object.keys(StateMachine.STATE)[state]);

      $(document).trigger('stateChange.jsxc', state);
   }

   public static changeUIState(state: number) {
      StateMachine.currentUIState = state;

      Log.debug('UI State changed to ' + Object.keys(StateMachine.UISTATE)[state]);

      $(document).trigger('stateUIChange.jsxc', state);
   }
}
