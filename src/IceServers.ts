import Client from './Client'
import Options from './Options'
import Log from './util/Log'

export default class IceServers {
   public static get() {
      let rtcPeerConfig = Client.getOption('RTCPeerConfig') || {};
      let storage = Client.getStorage();
      let url = rtcPeerConfig.url;

      let ttl = (storage.getItem('iceValidity') || 0) - (new Date()).getTime();

      //@REVIEW ttl and ice servers from config object

      if (ttl > 0 && rtcPeerConfig.iceServers) {
         // credentials valid

         return Promise.resolve(rtcPeerConfig.iceServers);
      } else if (url) {
         return IceServers.getFromUrl(url);
      } else {
         Promise.reject(null);
      }
   }

   private static getFromUrl(url) {
      return new Promise((resolve, reject) => {
         $.ajax(url, {
            async: true,
            dataType: 'json',
            xhrFields: {
               withCredentials: Client.getOption('RTCPeerConfig').withCredentials
            }
         }).done((data) => {
            var ttl = data.ttl || 3600;
            var iceServers = data.iceServers;

            if (iceServers && iceServers.length > 0) {
               var urls = iceServers[0].urls && iceServers[0].urls.length > 0;

               if (urls) {
                  Log.debug('ice servers received');

                  var peerConfig = Client.getOption('RTCPeerConfig');
                  peerConfig.iceServers = iceServers;
                  Client.setOption('RTCPeerConfig', peerConfig);

                  Client.getStorage().setItem('iceValidity', (new Date()).getTime() + 1000 * ttl);

                  resolve(iceServers);
               } else {
                  Log.warn('No valid url found in first ice object.');

                  reject();
               }
            }
         });
      });
   }
}
