import i18next from 'i18next'

export default class Translation {
   public static t(text:string, param?):string {

      return i18next.t(text, param);
   }
}
