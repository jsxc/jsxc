import * as moment from 'moment';

export default class DateTime {
   public static stringify(stamp: number, elements?: JQuery) {
      let momentObject = moment(stamp);
      let locale = window.navigator.language;
      momentObject.locale(locale);
      let fromNow = momentObject.fromNow();

      if (!elements) {
         return fromNow;
      }

      elements.each(function () {
         $(this).text(fromNow);
         $(this).attr('title', new Date(stamp).toISOString() + ' (UTC)');
      });

      setTimeout(function () {
         DateTime.stringify(stamp, elements);
      }, 1000 * 60);
   }

   public static stringifyToString(stamp: number) {
      let momentObject = moment(stamp);
      let locale = window.navigator.language;
      momentObject.locale(locale);
      return momentObject.fromNow();
   }
}
