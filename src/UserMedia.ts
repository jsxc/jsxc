import Log from './util/Log'
import Translation from './util/Translation'
import Overlay from './ui/Overlay'

export default class UserMedia {
   public static request(um = ['video', 'audio']) {
      let self = this;
      let overlay = new Overlay();
      overlay.open();

      return UserMedia
         .filterUserMedia(um)
         .then(UserMedia.getUserMedia)
         .then(um => {
            overlay.close();

            return um;
         })
         .catch(err => {
            overlay.close();

            return UserMedia.onMediaFailure(err);
         });
   }

   private static filterUserMedia(userMedia: Array<string>) {
      return navigator.mediaDevices.enumerateDevices()
         .then((devices) => {
            var availableDevices = devices.map(function(device) {
               return device.kind;
            });

            userMedia = userMedia.filter(function(el) {
               //@REVIEW ts type
               return availableDevices.indexOf(<any>el) !== -1 || availableDevices.indexOf(<any>(el + 'input')) !== -1;
            });

            if (userMedia.length) {
               return Promise.resolve(userMedia);
            } else {
               return Promise.reject('No audio/video device available.');
            }
         });
   }

   private static getUserMedia(um) {
      var constraints: any = {};

      if (um.indexOf('video') > -1) {
         constraints.video = true;
      }

      if (um.indexOf('audio') > -1) {
         constraints.audio = true;
      }

      //@TODO screen media

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
         default:
            msg = Translation.t(err.name) !== err.name ? Translation.t(err.name) : Translation.t('UNKNOWN_ERROR');
      }

      Log.debug('media failure: ' + err.name);

      return Promise.reject([msg, err]);
   }
}
