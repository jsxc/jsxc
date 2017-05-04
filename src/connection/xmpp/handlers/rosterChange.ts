
export default function onRosterChange(stanza: Element): boolean {
   let senderJid = $(stanza).attr('from');

   if (senderJid && senderJid !== this.connectionJid.bare) {
      Log.info('Ignore roster change with wrong sender jid.');

      return PRESERVE_HANDLER;
   }

   Log.debug('Process roster change.');

   let item = $(stanza).find('item');

   if (item.length !== 1) {
      Log.info('Ignore roster change with more than one item element.');

      return PRESERVE_HANDLER;
   }

   let jid = new JID($(item).attr('jid'));
   let name = $(item).attr('name') || jid.bare;
   let subscription = $(item).attr('subscription');

   if (subscription === SUBSCRIPTION.REMOVE) {
      jsxc.gui.roster.purge(bid);
   } else {
      var bl = jsxc.storage.getUserItem('buddylist');

      if (bl.indexOf(bid) < 0) {
         bl.push(bid); // (INFO) push returns the new length
         jsxc.storage.setUserItem('buddylist', bl);
      }

      var temp = jsxc.storage.saveBuddy(bid, {
         jid: jid,
         name: name,
         sub: sub
      });

      if (temp === 'updated') {

         jsxc.gui.update(bid);
         jsxc.gui.roster.reorder(bid);
      } else {
         jsxc.gui.roster.add(bid);
      }
   }

   // Remove pending friendship request from notice list
   if (subscription === SUBSCRIPTION.FROM || subscription === SUBSCRIPTION.BOTH) {
      var notices = jsxc.storage.getUserItem('notices');
      var noticeKey = null,
         notice;

      for (noticeKey in notices) {
         notice = notices[noticeKey];

         if (notice.fnName === 'gui.showApproveDialog' && notice.fnParams[0] === jid) {
            jsxc.debug('Remove notice with key ' + noticeKey);

            jsxc.notice.remove(noticeKey);
         }
      }
   }

   if (!jsxc.storage.getUserItem('buddylist') || jsxc.storage.getUserItem('buddylist').length === 0) {
      jsxc.gui.roster.empty();
   } else {
      $('#jsxc_roster > p:first').remove();
   }

   // preserve handler
   return true;
}
