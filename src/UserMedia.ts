import Log from './util/Log'
import Translation from './util/Translation'
import Overlay from './ui/Overlay'
import * as getScreenMedia from 'getscreenmedia'

export default class UserMedia {
   public static async request(um = ['video', 'audio']): Promise<MediaStream> {
      let overlay = new Overlay();
      overlay.open();

      um.forEach(element => {
         if (['video', 'audio', 'screen'].indexOf(element) < 0) {
            Log.warn('Requested invalid user media: ' + element);
         }
      });

      let stream: MediaStream;

      try {
         if (um.indexOf('screen') > -1) {
            stream = await UserMedia.getScreenMedia();
            const userStream = await UserMedia
               .filterUserMedia(um)
               .then(UserMedia.getUserMedia)
               .catch((err) => {
                  Log.info('Could not get other user streams.');
               });

            if (userStream) {
               if (um.includes('audio')) {
                  stream.addTrack(userStream.getAudioTracks()[0]);
               }
               if (um.includes('video')) {
                  stream.addTrack(userStream.getVideoTracks()[0]);
               }
            }
         } else {
            stream = await UserMedia
               .filterUserMedia(um)
               .then(UserMedia.getUserMedia);
         }
      } catch (err) {
         overlay.close();

         throw UserMedia.onMediaFailure(err);
      }

      overlay.close();

      return stream;
   }

   private static async filterUserMedia(userMedia: string[]): Promise<string[]> {
      let devices = await navigator.mediaDevices.enumerateDevices()
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
   }

   private static getScreenMedia(): Promise<MediaStream> {
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

   private static onMediaFailure(err: Error) {
      let msg: string;

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

      return [msg, err];
   }
}
