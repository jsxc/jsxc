import Log from './util/Log'

export default class UserMedia {
   public static request(um = ['video', 'audio']) {
      let self = this;

      //@TODO show allow media access, maybe it's enough to show a black overlay

      return UserMedia
         .filterUserMedia(um)
         .then(UserMedia.getUserMedia)
         .catch(UserMedia.onMediaFailure);
   }

   private static filterUserMedia(userMedia: Array<string>) {
      return navigator.mediaDevices.enumerateDevices()
         .then((devices) => {
            var availableDevices = devices.map(function(device) {
               return device.kind;
            });

            userMedia = userMedia.filter(function(el) {
               return availableDevices.indexOf(el) !== -1 || availableDevices.indexOf(el + 'input') !== -1;
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
            //@TODO translate
            msg = ('PermissionDeniedError');
            break;
         case 'HTTPS_REQUIRED':
         case 'EXTENSION_UNAVAILABLE':
            msg = (err.name);
            break;
         default:
            msg = (err.name) !== err.name ? (err.name) : ('UNKNOWN_ERROR');
      }

      //@TODO post media failure message
      // jsxc.gui.window.postMessage({
      //    bid: jsxc.jidToBid(jsxc.webrtc.last_caller),
      //    direction: jsxc.Message.SYS,
      //    msg: $.t('Media_failure') + ': ' + msg + ' (' + err.name + ').'
      // });

      Log.debug('media failure: ' + err.name);

      return Promise.reject([msg, err]);
   }
}
