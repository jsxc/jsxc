import Log from './util/Log';
import Translation from './util/Translation';
import Overlay from './ui/Overlay';
import * as getScreenMedia from 'getscreenmedia';
import Client from './Client';

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
            const userStream = await UserMedia.filterUserMedia(um)
               .then(UserMedia.getUserMedia)
               .catch(err => {
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
            stream = await UserMedia.filterUserMedia(um).then(UserMedia.getUserMedia);
         }
      } catch (err) {
         overlay.close();

         throw UserMedia.onMediaFailure(err);
      }

      overlay.close();

      return stream;
   }

   private static async filterUserMedia(userMedia: string[]): Promise<string[]> {
      let devices = await UserMedia.getMediaDevices();

      userMedia = userMedia.filter(function (el) {
         return devices[el + 'input']?.length > 0;
      });

      if (userMedia.length === 0) {
         throw new Error('No audio/video device available.');
      }

      return userMedia;
   }

   private static async getMediaDevices(): Promise<{ audioinput: string[]; videoinput: string[] }> {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let mediaDevices = devices.reduce(
         (mediaDevices, device) => {
            mediaDevices[device.kind]?.push(device.deviceId);

            return mediaDevices;
         },
         {
            audioinput: [] as string[],
            videoinput: [] as string[],
         }
      );

      return mediaDevices;
   }

   private static getScreenMedia(): Promise<MediaStream> {
      return new Promise((resolve, reject) => {
         getScreenMedia((error, stream) => {
            if (!error && stream) {
               resolve(stream);
            }

            reject(error);
         });
      });
   }

   private static async getUserMedia(um) {
      let devices = await UserMedia.getMediaDevices();

      let videoIndex = 0;
      let audioIndex = 0;

      let lastError: any;

      while (
         (videoIndex < devices.videoinput.length || !um.includes('video')) &&
         (audioIndex < devices.audioinput.length || !um.includes('audio'))
      ) {
         const constraints: MediaStreamConstraints = {};

         if (um.includes('video')) {
            constraints.video = devices.videoinput[videoIndex]
               ? {
                    deviceId: {
                       exact: devices.videoinput[videoIndex],
                    },
                 }
               : true;

            if (Client.isDebugMode()) {
               constraints.video = {
                  ...(typeof constraints.video === 'object' ? constraints.video : {}),
                  width: { ideal: 320 },
                  height: { ideal: 180 },
                  frameRate: { ideal: 2 },
               };
            }
         }

         if (um.includes('audio')) {
            constraints.audio = devices.audioinput[audioIndex]
               ? {
                    deviceId: {
                       exact: devices.audioinput[audioIndex],
                    },
                 }
               : true;
         }

         try {
            const userMedia = await navigator.mediaDevices.getUserMedia(constraints);

            um.includes('video') && Log.debug(`Using ${devices.videoinput[videoIndex]} as video device`);
            um.includes('audio') && Log.debug(`Using ${devices.audioinput[audioIndex]} as audio device`);

            return userMedia;
         } catch (err) {
            Log.error('GUM failed: ', { err });

            if (
               err.name !== 'NotAllowedError' &&
               err.name !== 'PERMISSION_DENIED' &&
               !lastError &&
               ((um.includes('video') && !devices.videoinput[videoIndex]) ||
                  (um.includes('audio') && !devices.audioinput[audioIndex]))
            ) {
               devices = await UserMedia.getMediaDevices();
            } else if (err.toString().includes('video')) {
               videoIndex++;
            } else if (err.toString().includes('audio')) {
               audioIndex++;
            } else {
               videoIndex++;
               audioIndex++;
            }

            lastError = err;
         }
      }

      return Promise.reject(lastError || 'GUM failed');
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
         case 'NotSupportedError':
            msg = Translation.t(err.name);
            break;
         case 'NotReadableError':
            msg = Translation.t('User_media_not_readable');
         default:
            msg = Translation.t(err.name) !== err.name ? Translation.t(err.name) : Translation.t('UNKNOWN_ERROR');
      }

      Log.debug('media failure: ' + err.name);

      return [msg, err];
   }
}
