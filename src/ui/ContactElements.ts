import Storage from '../Storage';
import Log from '../util/Log';
import StorageSingleton from '../StorageSingleton';
import Templates from '../util/Templates';
import Contact from '../Contact'
import * as CONST from '../CONST'
import Options from '../Options'
import Hash from '../util/Hash'

export default class ContactElements {
   constructor(private contact:Contact) {

   }

   public update() {
      var data = jsxc.storage.getUserItem('buddy', bid);

      if (!data) {
         jsxc.debug('No data for ' + bid);
         return;
      }

      var ri = jsxc.gui.roster.getItem(bid); // roster item from user
      var we = jsxc.gui.window.get(bid); // window element from user
      var ue = ri.add(we); // both
      var spot = $('.jsxc_spot[data-bid="' + bid + '"]');

      // Attach data to corresponding roster item
      ri.data(data);

      // Add online status
      jsxc.gui.updatePresence(bid, jsxc.CONST.STATUS[data.status]);

      // Change name and add title
      ue.find('.jsxc_name:first').add(spot).text(data.name).attr('title', $.t('is_', {
         status: $.t(jsxc.CONST.STATUS[data.status])
      }));

      // Update gui according to encryption state
      switch (data.msgstate) {
         case 0:
            we.find('.jsxc_transfer').removeClass('jsxc_enc jsxc_fin').attr('title', $.t('your_connection_is_unencrypted'));
            we.find('.jsxc_settings .jsxc_verification').addClass('jsxc_disabled');
            we.find('.jsxc_settings .jsxc_transfer').text($.t('start_private'));
            break;
         case 1:
            we.find('.jsxc_transfer').addClass('jsxc_enc').attr('title', $.t('your_connection_is_encrypted'));
            we.find('.jsxc_settings .jsxc_verification').removeClass('jsxc_disabled');
            we.find('.jsxc_settings .jsxc_transfer').text($.t('close_private'));
            break;
         case 2:
            we.find('.jsxc_settings .jsxc_verification').addClass('jsxc_disabled');
            we.find('.jsxc_transfer').removeClass('jsxc_enc').addClass('jsxc_fin').attr('title', $.t('your_buddy_closed_the_private_connection'));
            we.find('.jsxc_settings .jsxc_transfer').text($.t('close_private'));
            break;
      }

      // update gui according to verification state
      if (data.trust) {
         we.find('.jsxc_transfer').addClass('jsxc_trust').attr('title', $.t('your_buddy_is_verificated'));
      } else {
         we.find('.jsxc_transfer').removeClass('jsxc_trust');
      }

      // update gui according to subscription state
      if (data.sub && data.sub !== 'both') {
         ue.addClass('jsxc_oneway');
      } else {
         ue.removeClass('jsxc_oneway');
      }

      var info = Strophe.getBareJidFromJid(data.jid) + '\n';
      info += $.t('Subscription') + ': ' + $.t(data.sub) + '\n';
      info += $.t('Status') + ': ' + $.t(jsxc.CONST.STATUS[data.status]);

      ri.find('.jsxc_name').attr('title', info);

      jsxc.gui.updateAvatar(ri.add(we.find('.jsxc_bar')), data.jid, data.avatar);

      $(document).trigger('update.gui.jsxc', [bid]);
   }

   public updateAvatar() {
      let avatar = this.contact.getAvatar();

      avatar.then(this.setImageAsAvatar);
      avatar.catch(this.setPlaceholderAsAvatar);
   }

   public updatePresence(pres) {

      // if (bid === 'own') {
      //    if (pres === 'dnd') {
      //       $('#jsxc_menu .jsxc_muteNotification').addClass('jsxc_disabled');
      //       jsxc.notification.muteSound(true);
      //    } else {
      //       $('#jsxc_menu .jsxc_muteNotification').removeClass('jsxc_disabled');
      //
      //       if (!jsxc.options.get('muteNotification')) {
      //          jsxc.notification.unmuteSound(true);
      //       }
      //    }
      // }

      this.getElements().each(function() {
         var presence = this.contact.getPresence();
         var element = $(this);

         element.attr('data-presence', presence);

         if (element.find('.jsxc_avatar').length > 0) {
            element = element.find('.jsxc_avatar');
         }

         element.removeClass('jsxc-' + CONST.STATUS.join(' jsxc-'));
         element.addClass('jsxc-' + presence);
      });
   }

   public unreadMsg() {
      let count = this.contact.getNumberOfUnreadMessages();
      let elements = this.getElements();
      let badgeElement = elements.find('.jsxc-unread-badge');

      elements.addClass('jsxc-unread-messages');
      badgeElement.text(count);
   }

   public readMsg(bid) {
      let elements = this.getElements();
      let badgeElement = elements.find('.jsxc-unread-badge');

      elements.removeClass('jsxc-unread-messages');
      badgeElement.text('');
   }

   private getElements():JQuery {
      return $('[data-contact-id="' + this.contact.id + '"]');
   }

   private setImageAsAvatar(src, type?){
      let avatars = this.getElements().find('.jsxc-avatar');

      avatars.removeAttr('style');

      avatars.css({
         'background-image': 'url(' + src + ')',
         'text-indent': '999px'
      });
   }

   private setPlaceholderAsAvatar() {
      let avatars = this.getElements().find('.jsxc-avatar');
      let label = this.contact.getName();

      var options = Options.get('avatarplaceholder') || {};
      var hash = Hash.String(label);

      var hue = Math.abs(hash) % 360;
      var saturation = options.saturation || 90;
      var lightness = options.lightness || 65;

      avatars.each(function(){
         $(this).css({
            'background-color': 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)',
            'color': '#fff',
            'font-weight': 'bold',
            'text-align': 'center',
            'line-height': $(this).height() + 'px',
            'font-size': $(this).height() * 0.6 + 'px'
         });
      });

      avatars.text(label[0].toUpperCase());
   }
}
