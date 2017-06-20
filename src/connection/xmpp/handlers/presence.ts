import Log from '../../../util/Log';
import JID from '../../../JID';
import {ContactInterface} from '../../../ContactInterface';
import Client from '../../../Client';
import {Notice, TYPE as NOTICETYPE, FUNCTION as NOTICEFUNCTION} from '../../../Notice';
import Roster from '../../../ui/Roster';
import {Presence} from '../../AbstractConnection'
import 'jquery'

let PRESERVE_HANDLER = true;
let REMOVE_HANDLER = false;
let ERROR_RETURN = 1;
let SUBSCRIPTION = {
   REMOVE: 'remove',
   FROM: 'from',
   BOTH: 'both',
   TO: 'to'
};
let PRESENCE = {
   ERROR: 'error',
   SUBSCRIBE: 'subscribe',
   UNAVAILABLE: 'unavailable',
   UNSUBSCRIBED: 'unsubscribed'
};

let account;

export default function(stanza: Element): boolean {
   Log.debug('onPresence', stanza);

   //@TODO use sid to retrieve the correct account
   account = Client.getAccout();

   let presence = {
      type: $(stanza).attr('type'),
      from: new JID($(stanza).attr('from')),
      show: $(stanza).find('show').text(),
      status: $(stanza).find('status').text()
   }

   let status:Presence = determinePresenceStatus(presence);

   if (presence.from.bare === account.getJID().bare) {
      Log.debug('Ignore own presence notification');

      return 1;
   }

   if (presence.type === PRESENCE.ERROR) {
      var error = $(stanza).find('error');
      var errorCode = error.attr('code') || '';
      var errorType = error.attr('type') || '';
      var errorReason = error.find(">:first-child").prop('tagName');
      var errorText = error.find('text').text();

      //@TODO display error message
      Log.error('[XMPP] ' + errorType + ', ' + errorCode + ', ' + errorReason + ', ' + errorText);

      return 2;
   }

   let xVCard = $(stanza).find('x[xmlns="vcard-temp:x:update"]');
   let contact = account.getContact(presence.from);

   if (typeof contact === 'undefined') {
      Log.warn('Could not find contact object for ' + presence.from.full);

      return PRESERVE_HANDLER;
   }
//@REVIEW we can't process a contact request from an unknown contact, because getContact would return undefined
   // incoming friendship request
   if (presence.type === PRESENCE.SUBSCRIBE) {
      Log.debug('received subscription request');

      processSubscribtionRequest(presence.from, contact);

      return PRESERVE_HANDLER;
   }

   contact.setStatus(presence.status);
   contact.setPresence(presence.from.resource, status);
   contact.setResource(''); // reset jid, so new messages go to the bare jid

   // if (data.type === 'groupchat') {
   //    data.status = status;
   // } else {
   //    data.status = max;
   // }
   //
   // data.res = maxVal;
   // data.jid = jid;
   //
   // // Looking for avatar
   // if (xVCard.length > 0 && data.type !== 'groupchat') {
   //    var photo = xVCard.find('photo');
   //
   //    if (photo.length > 0 && photo.text() !== data.avatar) {
   //       jsxc.storage.removeUserItem('avatar', data.avatar);
   //       data.avatar = photo.text();
   //    }
   // }

   Log.debug('Presence (' + presence.from.full + '): ' + Presence[status]);

   // preserve handler
   return PRESERVE_HANDLER;
};

function processSubscribtionRequest(jid:JID, contact:ContactInterface) {
   if (contact) {
      Log.debug('Auto approve contact request, because he is already in our contact list.');

      account.getConnection().sendSubscriptionAnswer(contact.getJid(), true);

      if (contact.getSubscription() !== SUBSCRIPTION.TO) {
         Roster.get().add(contact);
      }

      return PRESERVE_HANDLER;
   }

   account.addNotice({
      title: 'Friendship_request',
      description: 'from ' + jid.bare,
      type: NOTICETYPE.contact,
      fnName: NOTICEFUNCTION.contactRequest,
      fnParams: [jid.bare]
   });
}

function determinePresenceStatus(presence):Presence {
   let status;

   if (presence.type === PRESENCE.UNAVAILABLE || presence.type === PRESENCE.UNSUBSCRIBED) {
      status = Presence['offline'];
   } else {
      let show = presence.show;

      if (show === '') {
         status = Presence['online'];
      } else {
         status = Presence[show];
      }
   }

   return status;
}
