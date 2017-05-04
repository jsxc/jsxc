import Options from './Options'
import Contact from './Contact'
import Translation from './util/Translation'
import Client from './Client'
import * as CONST from './CONST'

interface NotificationSettings {
   title:string,
   message:string,
   duration?:number,
   force?:boolean,
   soundFile?:string,
   loop?:boolean,
   source?:string,
   icon?:string
};

export default class Notification {
   private static inited = false;

   private static popupTimeout;

   private static popupDelay = 1000;

   private static audioObject;

   public static init() {
      if(Notification.inited) {
         return;
      }

      $(document).on('postmessagein.jsxc', function(event, bid, msg) {
         msg = (msg && msg.match(/^\?OTR/)) ? $.t('Encrypted_message') : msg;
         var data = jsxc.storage.getUserItem('buddy', bid);

         Notification.notify({
            title: Translation.t('New_message_from'),
            message: msg,
            soundFile: CONST.SOUNDS.MSG,
            source: bid
         });
      });

      $(document).on('callincoming.jingle', function() {
         Notification.playSound(CONST.SOUNDS.CALL, true, true);
      });

      $(document).on('accept.call.jsxc reject.call.jsxc', function() {
         Notification.stopSound();
      });

      if (!Notice.has('gui.showRequestNotification')) {
         Notice.add({
            msg: Translation.t('Notifications') + '?',
            description: Translation.t('Should_we_notify_you_')
         }, 'gui.showRequestNotification');
      }
   }

   public static muteSound(external?) {
      $('#jsxc-menu .jsxc-muteNotification').text(Translation.t('Unmute'));

      if (external !== true) {
         Options.set('muteNotification', true);
      }
   }

   public static unmuteSound(external?) {
      $('#jsxc-menu .jsxc-muteNotification').text(Translation.t('Mute'));

      if (external !== true) {
         Options.set('muteNotification', false);
      }
   }

   public static notify(settings:NotificationSettings) {
      if (!Options.get('notification') || !Notification.hasPermission()) {
         return; // notifications disabled
      }

      if (Client.hasFocus() && !settings.force) {
         return; // Tab is visible
      }

      settings.icon = settings.icon || Options.get('root') + '/img/XMPP_logo.png';

      if (typeof settings.source === 'string') {
         let contact = new Contact(settings.source);
         let avatar = contact.getAvatar();

         if (typeof avatar === 'string' && avatar !== '0') {
            settings.icon = avatar;
         }
      }

      settings.duration = settings.duration || Options.get('notification').duration;
      settings.title = Translation.t(settings.title);
      settings.message = Translation.t(settings.message);

      Notification.popupTimeout = setTimeout(function() {
         Notification.showPopup(settings);
      }, Notification.popupDelay);
   }

   private static showPopup(settings:NotificationSettings) {
      if (typeof settings.soundFile === 'string') {
         Notification.playSound(settings.soundFile, settings.loop, settings.force);
      }

      var popup = new window.Notification(settings.title, {
         body: settings.message,
         icon: settings.icon
      });

      if (settings.duration > 0) {
         setTimeout(function() {
            popup.close();
         }, settings.duration);
      }
   }

   private static hasSupport() {
      return !!window.Notification;
   }

   private static requestPermission() {
      window.Notification.requestPermission(function(status) {
         if (window.Notification.permission !== status) {
            window.Notification.permission = status;
         }

         if (Notification.hasPermission()) {
            $(document).trigger('notificationready.jsxc');
         } else {
            $(document).trigger('notificationfailure.jsxc');
         }
      });
   }

   private static hasPermission() {
      return window.Notification.permission === CONST.NOTIFICATION_GRANTED;
   }

   private static playSound(soundFile:string, loop?:boolean, force?:boolean) {
      if (!jsxc.master) {
         // only master plays sound
         return;
      }

      if (Options.get('muteNotification') || jsxc.storage.getUserItem('presence') === 'dnd') {
         // sound mute or own presence is dnd
         return;
      }

      if (Client.hasFocus() && !force) {
         // tab is visible
         return;
      }

      // stop current audio file
      Notification.stopSound();

      var audio = new Audio(Options.get('root') + '/sound/' + soundFile);
      audio.loop = loop || false;
      audio.play();

      Notification.audioObject = audio;
   }

   private static stopSound() {
      var audio = Notification.audioObject;

      if (typeof audio !== 'undefined' && audio !== null) {
         audio.pause();
         Notification.audioObject = null;
      }
   }
}
