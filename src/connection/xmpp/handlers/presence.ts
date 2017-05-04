import Log from '../../../util/Log';
import JID from '../../../JID';
import Contact from '../../../Contact';

let PRESERVE_HANDLER = true;
let REMOVE_HANDLER = false;
let SUBSCRIPTION = {
   REMOVE: 'remove',
   FROM: 'from',
   BOTH: 'both'
};
let PRESENCE = {
   SUBSCRIBE: 'subscribe',
   UNAVAILABLE: 'unavailable',
   UNSUBSCRIBED: 'unsubscribed'
};

export default function(stanza: Element): boolean {
   Log.debug('onPresence', stanza);

   let presence = {
      type: $(stanza).attr('type'),
      from: new JID($(stanza).attr('from')),
      show: $(stanza).find('show').text()
   }

   let contact = Contact.get(presence.from);
   let status = null;
   let xVCard = $(presence).find('x[xmlns="vcard-temp:x:update"]');

   if (presence.from.bare === this.connectionJid.bare) {
      return PRESERVE_HANDLER;
   }

   if (presence.type === 'error') {
      // $(document).trigger('error.presence.jsxc', [from, presence]);

      var error = $(presence).find('error');

      //@TODO display error message
      Log.error('[XMPP] ' + error.attr('code') + ' ' + error.find(">:first-child").prop('tagName'));
      return PRESERVE_HANDLER;
   }

   // incoming friendship request
   if (presence.type === PRESENCE.SUBSCRIBE) {
      processSubscribtionRequest(contact);

      return PRESERVE_HANDLER;
   }

   status = determinePresenceStatus(presence);

   contact.setStatus(presence.from.resource, status);

   if (data.type === 'groupchat') {
      data.status = status;
   } else {
      data.status = max;
   }

   data.res = maxVal;
   data.jid = jid;

   // Looking for avatar
   if (xVCard.length > 0 && data.type !== 'groupchat') {
      var photo = xVCard.find('photo');

      if (photo.length > 0 && photo.text() !== data.avatar) {
         jsxc.storage.removeUserItem('avatar', data.avatar);
         data.avatar = photo.text();
      }
   }

   // Reset jid
   if (jsxc.gui.window.get(bid).length > 0) {
      jsxc.gui.window.get(bid).data('jid', jid);
   }

   jsxc.storage.setUserItem('buddy', bid, data);
   jsxc.storage.setUserItem('res', bid, res);

   jsxc.debug('Presence (' + from + '): ' + jsxc.CONST.STATUS[status]);

   jsxc.gui.update(bid);
   jsxc.gui.roster.reorder(bid);

   $(document).trigger('presence.jsxc', [from, status, presence]);

   // preserve handler
   return true;
};

function processSubscribtionRequest(contact:Contact) {
   var bl = jsxc.storage.getUserItem('buddylist');

   if (bl.indexOf(bid) > -1) {
      Log.debug('Auto approve contact request, because he is already in our contact list.');

      jsxc.xmpp.resFriendReq(jid, true);
      if (data.sub !== 'to') {
         jsxc.xmpp.addBuddy(jid, data.name);
      }

      return true;
   }

   jsxc.storage.setUserItem('friendReq', {
      jid: jid,
      approve: -1
   });
   jsxc.notice.add({
      msg: $.t('Friendship_request'),
      description: $.t('from') + ' ' + jid,
      type: 'contact'
   }, 'gui.showApproveDialog', [jid]);
}

function determinePresenceStatus(presence) {
   if (presence.type === PRESENCE.UNAVAILABLE || presence.type === PRESENCE.UNSUBSCRIBED) {
      status = jsxc.CONST.STATUS.indexOf('offline');
   } else {
      var show = presence.show;
      if (show === '') {
         status = jsxc.CONST.STATUS.indexOf('online');
      } else {
         status = jsxc.CONST.STATUS.indexOf(show);
      }
   }

   return status;
}
