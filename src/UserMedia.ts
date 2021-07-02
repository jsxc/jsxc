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
      const devices = await UserMedia.getMediaDevices();

      let videoIndex = 0;
      let audioIndex = 0;

      while (
         (videoIndex < devices.videoinput.length || !um.includes('video')) &&
         (audioIndex < devices.audioinput.length || !um.includes('audio'))
      ) {
         const constraints: MediaStreamConstraints = {};

         if (um.includes('video')) {
            constraints.video = {
               deviceId: {
                  exact: devices.videoinput[videoIndex],
               },
            };

            if (Client.isDebugMode()) {
               constraints.video = {
                  ...constraints.video,
                  width: { ideal: 320 },
                  height: { ideal: 180 },
                  frameRate: { ideal: 2 },
               };
            }
         }

         if (um.includes('audio')) {
            constraints.audio = {
               deviceId: {
                  exact: devices.audioinput[audioIndex],
               },
            };
         }

         try {
            const userMedia = await navigator.mediaDevices.getUserMedia(constraints);

            return userMedia;
         } catch (err) {
            Log.error('GUM failed: ', err);

            if (err.toString().includes('video')) {
               videoIndex++;
            } else if (err.toString().includes('audio')) {
               audioIndex++;
            } else {
               videoIndex++;
               audioIndex++;
            }
         }
      }

      return Promise.reject('GUM failed');
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
