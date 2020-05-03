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
      STANDBY: 0,
      INITIATING: 1,
      READY: 2,
   }

   private static currentState;
   private static currentUIState = StateMachine.UISTATE.STANDBY;

   public static changeState(state: number) {
      StateMachine.currentState = state;

      Log.debug('State changed to ' + Object.keys(StateMachine.STATE)[state]);

      $(document).trigger('stateChange.jsxc', state);
   }

   public static getState(): number {
      return StateMachine.currentState;
   }

   public static changeUIState(state: number) {
      StateMachine.currentUIState = state;

      Log.debug('UI State changed to ' + Object.keys(StateMachine.UISTATE)[state]);

      $(document).trigger('stateUIChange.jsxc', state);
   }

   public static getUIState(): number {
      return StateMachine.currentUIState;
   }
}
