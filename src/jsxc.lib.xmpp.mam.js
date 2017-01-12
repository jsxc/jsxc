/**
 * Implements XEP-0085: Chat State Notifications.
 *
 * @namespace jsxc.xmpp.mam
 * @see {@link http://xmpp.org/extensions/xep-0313.html}
*/
jsxc.xmpp.mam = {
  conn: null,

  /** Total number of messages to be retrived in one time */
  messageRetreivedInOneGO: 100,
};

jsxc.xmpp.mam.init = function(){
  var self = jsxc.xmpp.mam;

}

jsxc.xmpp.mam.getHistory = function(jid, count, before){
  var self = jsxc.xmpp.mam;
  var bid = jsxc.jidToBid(jid);

  jsxc.xmpp.mam.onMessage = function() {
    
  }

}
