import incomingMessageSoundFile = require('../sound/incomingMessage.mp3');
import incomingCallSoundFile = require('../sound/Rotary-Phone6.mp3');
import noticeSoundFile = require('../sound/Ping1.mp3');

export let NOTIFICATION_DEFAULT = 'default';
export let NOTIFICATION_GRANTED = 'granted';
export let NOTIFICATION_DENIED = 'denied';
export let STATUS = ['offline', 'dnd', 'xa', 'away', 'chat', 'online'];
export let SOUNDS = {
   MSG: <string> (<any> incomingMessageSoundFile),
   CALL: <string> (<any> incomingCallSoundFile),
   NOTICE: <string> (<any> noticeSoundFile)
};
export let REGEX = {
   JID: new RegExp('\\b[^"&\'\\/:<>@\\s]+@[\\w-_.]+\\b', 'ig'),
   URL: new RegExp(/(https?:\/\/|www\.)[^\s<>'"]+/gi)
};
export let NS = {
   CARBONS: 'urn:xmpp:carbons:2',
   FORWARD: 'urn:xmpp:forward:0'
};
export let HIDDEN = 'hidden';
export let SHOWN = 'shown';
