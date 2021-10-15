import * as moment from 'moment';

export default class DateTime {
   public static stringify(stamp: number, elements?: JQuery) {
      let momentObject = moment(stamp);
      var locale =  window.navigator.language;
      momentObject.locale(locale);
      let fromNow = momentObject.fromNow();

      if (!elements) {
         return fromNow;
      }

      elements.each(function () {
         $(this).text(fromNow);
      });

      setTimeout(function () {
         DateTime.stringify(stamp, elements);
      }, 1000 * 60);
   }

   public static stringifyToString(stamp: number) {
      let momentObject = moment(stamp);
      var locale =  window.navigator.language;
      momentObject.locale(locale);
      let fromNow = momentObject.fromNow();

      return fromNow;
   }
}
