import Options from './Options'
import Contact from './Contact'
import Translation from './util/Translation'
import Client from './Client'
import * as CONST from './CONST'
import { FUNCTION as NOTICEFUNCTION } from './Notice'
import openConfirmDialog from './ui/dialogs/confirm'
import Hash from './util/Hash'
import defaultIconFile = require('../images/XMPP_logo.png')

interface NotificationSettings {
   title: string,
   message: string,
   duration?: number,
   force?: boolean,
   soundFile?: string,
   loop?: boolean,
   source?: Contact,
   icon?: string
};

const enum NotificationState {
   DISABLED,
   ENABLED,
   ASK
};

let NotificationAPI = (<any>window).Notification;

export default class Notification {
   private static inited = false;

   private static popupTimeout;

   private static popupDelay = 1000;

   private static audioObject;

   public static askForPermission() {
      openConfirmDialog(Translation.t('Should_we_notify_you_')).getPromise().then(() => {
         // @TODO open dialog to block further actions

         return this.requestPermission();
      }).then(() => {
         Client.getStorage().setItem('notificationState', NotificationState.ENABLED);
      }).catch(() => {
         Client.getStorage().setItem('notificationState', NotificationState.DISABLED);
      })
   }

   public static muteSound(external?) {
      $('#jsxc-menu .jsxc-muteNotification').text(Translation.t('Unmute'));

      if (external !== true) {
         Client.setOption('muteNotification', true);
      }
   }

   public static unmuteSound(external?) {
      $('#jsxc-menu .jsxc-muteNotification').text(Translation.t('Mute'));

      if (external !== true) {
         Client.setOption('muteNotification', false); // notifications disabled
      }
   }

   public static async notify(settings: NotificationSettings) {
      console.log('notify')
      if (!Client.getOption('notification')) {
         console.log('disabled')
         return; // notifications disabled
      }

      let state = Client.getStorage().getItem('notificationState');
      state = (typeof state === 'number') ? state : NotificationState.ASK;

      if (state === NotificationState.ASK && !Notification.hasPermission()) {
         Client.getNoticeManager().addNotice({
            title: Translation.t('Notifications') + '?',
            description: Translation.t('Should_we_notify_you_'),
            fnName: NOTICEFUNCTION.notificationRequest
         });
      }

      if (!Notification.hasPermission()) {
         console.log('No permission')
         return;
      }

      if (Client.hasFocus() && !settings.force) {
         console.log('hasFocus')
         return; // Tab is visible
      }

      settings.icon = settings.icon || <string><any>defaultIconFile;

      if (settings.source) {
         let avatar;

         try {
            avatar = await settings.source.getAvatar();
         } catch (err) { }


         if (avatar && avatar.src) {
            settings.icon = avatar.src;
         } else {
            var hash = Hash.String(settings.source.getName());

            var hue = Math.abs(hash) % 360;
            var saturation = 90;
            var lightness = 65;

            let canvas = <HTMLCanvasElement>$('<canvas>').get(0);
            canvas.height = 100;
            canvas.width = 100;

            let ctx = canvas.getContext('2d');

            ctx.fillStyle = 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)';
            ctx.fillRect(0, 0, 100, 100);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.font = 'bold 50px sans-serif';
            ctx.fillText(settings.source.getName()[0].toUpperCase(), 50, 50);

            settings.icon = canvas.toDataURL('image/jpeg');
         }
      }

      settings.duration = settings.duration || Client.getOption('notification').duration;
      settings.title = settings.title;
      settings.message = settings.message;
      console.log('settings', settings)
      Notification.popupTimeout = setTimeout(function() {
         Notification.showPopup(settings);
      }, Notification.popupDelay);
   }

   private static showPopup(settings: NotificationSettings) {
      if (typeof settings.soundFile === 'string') {
         Notification.playSound(settings.soundFile, settings.loop, settings.force);
      }

      var popup = new NotificationAPI(settings.title, {
         body: settings.message,
         icon: settings.icon
      });

      if (settings.duration > 0) {
         setTimeout(function() {
            console.log('close popup')
            popup.close();
         }, settings.duration);
      }
   }

   private static hasSupport() {
      console.log('Notification: hasSupport', !!NotificationAPI)
      return !!NotificationAPI;
   }

   private static requestPermission() {
      return new Promise((resolve, reject) => {
         NotificationAPI.requestPermission(function(status) {
            if (NotificationAPI.permission !== status) {
               NotificationAPI.permission = status;
            }

            if (Notification.hasPermission()) {
               resolve();
            } else {
               reject();
            }
         });
      });
   }

   private static hasPermission() {
      return NotificationAPI.permission === CONST.NOTIFICATION_GRANTED;
   }

   private static playSound(soundFile: string, loop?: boolean, force?: boolean) {
      if (Client.getOption('muteNotification')) {
         // @TODO check presence of source account
         // sound mute or own presence is dnd
         return;
      }

      if (Client.hasFocus() && !force) {
         // tab is visible
         return;
      }

      // stop current audio file
      Notification.stopSound();

      var audio = new Audio(soundFile);
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
