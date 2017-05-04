
emotions: [
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
],


regShortNames: null,

emoticonList: {
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

jsxc.gui.regShortNames = new RegExp(emojione.regShortNames.source + '|(' + Object.keys(jsxc.gui.emoticonList.core).join('|') + ')', 'gi');

// prepare regexp for emotions
$.each(jsxc.gui.emotions, function(i, val) {
   // escape characters
   var reg = val[0].replace(/(\/|\||\*|\.|\+|\?|\^|\$|\(|\)|\[|\]|\{|\})/g, '\\$1');
   reg = '(' + reg.split(' ').join('|') + ')';
   jsxc.gui.emotions[i][2] = new RegExp(reg, 'g');
});
