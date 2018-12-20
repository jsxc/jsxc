import Log from './util/Log'
import Translation from './util/Translation'
import Overlay from './ui/Overlay'
import * as getScreenMedia from 'getscreenmedia'

export default class UserMedia {
   public static request(um = ['video', 'audio']) {
      let overlay = new Overlay();
      overlay.open();

      let mediaPromise;

      if (um.indexOf('screen') > -1) {
         mediaPromise = UserMedia.getScreenMedia();
      } else {
         mediaPromise = UserMedia
            .filterUserMedia(um)
            .then(UserMedia.getUserMedia);
      }

      return mediaPromise
         .then(stream => {
            overlay.close();

            return stream;
         })
         .catch(err => {
            overlay.close();

            return UserMedia.onMediaFailure(err);
         });
   }

   private static filterUserMedia(userMedia: string[]) {
      return navigator.mediaDevices.enumerateDevices()
         .then((devices) => {
            let availableDevices = devices.map(function(device) {
               //@REVIEW MediaDeviceKind === string?
               return <string> device.kind;
            });

            userMedia = userMedia.filter(function(el) {
               return availableDevices.indexOf(el) !== -1 || availableDevices.indexOf(el + 'input') !== -1;
            });

            if (userMedia.length === 0) {
               throw new Error('No audio/video device available.');
            }

            return userMedia;
         });
   }

   private static getScreenMedia() {
      return new Promise((resolve, reject) => {
         getScreenMedia((error, stream) => {
            if (!error && stream) {
               resolve(stream);
            }

            reject(error);
         });
      })
   }

   private static getUserMedia(um) {
      let constraints: any = {};

      if (um.indexOf('video') > -1) {
         constraints.video = true;
      }

      if (um.indexOf('audio') > -1) {
         constraints.audio = true;
      }

      try {
         return navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
         Log.error('GUM failed: ', e);

         return Promise.reject('GUM failed');
      }
   }

   private static onMediaFailure(err: any = {}) {
      let msg;

      switch (err.name) {
         case 'NotAllowedError':
         case 'PERMISSION_DENIED':
            msg = Translation.t('PermissionDeniedError');
            break;
         case 'HTTPS_REQUIRED':
         case 'EXTENSION_UNAVAILABLE':
            msg = Translation.t(err.name);
            break;
         case 'NotSupportedError':
            msg = Translation.t('NotSupportedError');
            break;
         default:
            msg = Translation.t(err.name) !== err.name ? Translation.t(err.name) : Translation.t('UNKNOWN_ERROR');
      }

      Log.debug('media failure: ' + err.name);

      return Promise.reject([msg, err]);
   }
}
