import Client from './Client'
import Log from './util/Log'
import { IRTCPeerConfig } from './OptionsDefault';

export interface ICEServer {
   urls: string|string[]
   username?: string
   password?: string
}

export default class IceServers {
   public static isExpiring(): boolean {
      let rtcPeerConfig = Client.getOption<IRTCPeerConfig>('RTCPeerConfig') || <IRTCPeerConfig> {};

      return !!rtcPeerConfig.url;
   }

   public static registerUpdateHook(hook: (iceServers: ICEServer[]) => void) {
      Client.getOptions().registerHook('RTCPeerConfig', (rtcPeerConfig: IRTCPeerConfig) => {
         hook(rtcPeerConfig.iceServers);
      });
   }

   public static get(): Promise<ICEServer[]> {
      let rtcPeerConfig = Client.getOption<IRTCPeerConfig>('RTCPeerConfig') || <IRTCPeerConfig> {};
      let storage = Client.getStorage();
      let url = rtcPeerConfig.url;

      let ttl = (storage.getItem('iceValidity') || 0) - (new Date()).getTime();

      if ((ttl > 0 || !rtcPeerConfig.url) && rtcPeerConfig.iceServers) {
         // credentials valid

         IceServers.startRenewalTimeout();

         return Promise.resolve(rtcPeerConfig.iceServers);
      } else if (url) {
         return IceServers.getFromUrl(url);
      } else {
         Promise.reject(null);
      }
   }

   private static getFromUrl(url: string): Promise<ICEServer[]> {
      return new Promise((resolve, reject) => {
         $.ajax(url, {
            async: true,
            dataType: 'json',
            xhrFields: {
               withCredentials: Client.getOption('RTCPeerConfig').withCredentials
            }
         }).done((data: IRTCPeerConfig) => {
            let peerConfig: IRTCPeerConfig = Client.getOption('RTCPeerConfig');
            let ttl = data.ttl || peerConfig.ttl || 3600;
            let iceServers = data.iceServers;

            if (iceServers && iceServers.length > 0) {
               let urls = iceServers[0].urls && iceServers[0].urls.length > 0;

               if (urls) {
                  Log.debug('ice servers received');

                  peerConfig.iceServers = iceServers;
                  Client.setOption('RTCPeerConfig', peerConfig);

                  Client.getStorage().setItem('iceValidity', (new Date()).getTime() + 1000 * ttl);

                  IceServers.startRenewalTimeout();

                  resolve(iceServers);
               }
            } else {
               Log.warn('Found no valid ICE server');

               reject('ice-servers-not-found');
            }
         }).fail((xhr, textStatus, error) => {
            Log.warn('RTC peer config request failed with status: ' + textStatus, error);

            reject('request-not-possible');
         });
      });
   }

   private static startRenewalTimeout() {
      let validity = Client.getStorage().getItem('iceValidity');

      if (!validity) {
         return;
      }

      let ttl = validity - (new Date()).getTime();

      setTimeout(() => {
         IceServers.get();
      }, ttl * 1000);
   }
}
