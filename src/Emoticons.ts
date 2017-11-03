import Options from './Options'

const EMOTICONS: any[] = [
   ['O:-) O:)', 'innocent'],
   ['>:-( >:( &gt;:-( &gt;:(', 'angry'],
   [':-) :)', 'slight_smile'],
   [':-D :D', 'grin'],
   [':-( :(', 'disappointed'],
   [';-) ;)', 'wink'],
   [':-P :P', 'stuck_out_tongue'],
   ['=-O', 'astonished'],
   [':kiss: :-*', 'kissing_heart'],
   ['8-) :cool:', 'sunglasses'],
   [':-X :X', 'zipper_mouth'],
   [':yes:', 'thumbsup'],
   [':no:', 'thumbsdown'],
   [':beer:', 'beer'],
   [':coffee:', 'coffee'],
   [':devil:', 'smiling_imp'],
   [':kiss: :kissing:', 'kissing'],
   ['@->-- @-&gt;--', 'rose'],
   [':music:', 'musical_note'],
   [':love:', 'heart_eyes'],
   [':heart:', 'heart'],
   [':brokenheart:', 'broken_heart'],
   [':zzz:', 'zzz'],
   [':wait:', 'hand_splayed']
]
import * as emojione from '../lib/emojione/lib/js/emojione.js';

const EMOTICON_LIST = {
   'core': {
      ':klaus:': ['klaus'],
      ':jabber:': ['jabber'],
      ':xmpp:': ['xmpp'],
      ':jsxc:': ['jsxc'],
      ':owncloud:': ['owncloud'],
      ':nextcloud:': ['nextcloud']
   },
   'emojione': emojione.emojioneList
}

export default class Emoticons {

   private static initialised = false;

   private static shortRegex = new RegExp(emojione.regShortNames.source + '|(' + Object.keys(EMOTICON_LIST.core).join('|') + ')', 'gi');

   public static getDefaultEmoticonList() {
      let list = [];

      EMOTICONS.forEach(emoticon => {
         list.push(emoticon[0].split(' ')[0]);
      });

      return list;
   }

   public static toImage(text: string): string {
      Emoticons.init();

      text = Emoticons.standardToImage(text);
      text = Emoticons.shortnameToImage(text);

      return text;
   }

   private static init() {
      if (Emoticons.initialised) {
         return;
      }

      $.each(EMOTICONS, function(i, val) {
         // escape characters
         var reg = val[0].replace(/(\/|\||\*|\.|\+|\?|\^|\$|\(|\)|\[|\]|\{|\})/g, '\\$1');
         reg = '(' + reg.split(' ').join('|') + ')';
         EMOTICONS[i][2] = new RegExp(reg, 'g');
      });

      Emoticons.initialised = true;
   }

   private static standardToImage(text: string): string {
      // replace emoticons from XEP-0038 and pidgin with shortnames
      $.each(EMOTICONS, function(i, val) {
         text = text.replace(val[2], ':' + val[1] + ':');
      });

      return text;
   }

   private static shortnameToImage(text: string): string {
      text = text.replace(this.shortRegex, Emoticons.replaceShortnameWithImage);

      var wrapper = $('<div>' + text + '</div>');
      if (wrapper.find('.jsxc_emoticon').length === 1 && wrapper.text().replace(/ /, '').length === 0 && wrapper.find('*').length === 1) {
         wrapper.find('.jsxc_emoticon').addClass('jsxc_large');
         text = wrapper.html();
      }

      return text;
   }

   private static replaceShortnameWithImage = (shortname) => {
      if (typeof shortname === 'undefined' || shortname === '' || (!(shortname in EMOTICON_LIST.emojione) && !(shortname in EMOTICON_LIST.core))) {
         return shortname;
      }

      var src, filename;

      if (EMOTICON_LIST.core[shortname]) {
         filename = EMOTICON_LIST.core[shortname][EMOTICON_LIST.core[shortname].length - 1].replace(/^:([^:]+):$/, '$1');
         src = Options.get('root') + '/img/emotions/' + filename + '.svg';
      } else if (EMOTICON_LIST.emojione[shortname]) {
         filename = EMOTICON_LIST.emojione[shortname].fname;
         src = Options.get('root') + '/lib/emojione/assets/svg/' + filename + '.svg';
      }

      var div = $('<div>');

      div.addClass('jsxc-emoticon');
      div.css('background-image', 'url(' + src + ')');
      div.attr('title', shortname);

      return div.prop('outerHTML');
   }
}
