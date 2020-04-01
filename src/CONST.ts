// TODO: find a better sound for incoming messages and calls.
import incomingMessageSoundFile = require('../sound/Ping1.mp3');
import incomingCallSoundFile = require('../sound/Ping1.mp3');
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
   URL: new RegExp(/(https?:\/\/|www\.)[^\s<>'"]+/gi),
   GEOURI: new RegExp(/geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,-?\d+(?:\.\d+)?)?(?:;crs=[\w-]+)?(?:;u=(\d+(?:\.\d+)?))?(?:;[\w-]+=(?:[\w-_.!~*'()]|%[\da-f][\da-f])+)*/, 'g'),
};
export let NS = {
   CARBONS: 'urn:xmpp:carbons:2',
   FORWARD: 'urn:xmpp:forward:0'
};
export let HIDDEN = 'hidden';
export let SHOWN = 'shown';
