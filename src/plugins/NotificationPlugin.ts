import { AbstractPlugin } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import Translation from '../util/Translation';
import Notification from '../Notification';
import { Presence } from '../connection/AbstractConnection';
import { SOUNDS } from '../CONST';
import { IContact } from '@src/Contact.interface';
import { IMessage } from '@src/Message.interface';
import Client from '@src/Client';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

const defaultFavicon =
   'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PCFET0NUWVBFIHN2ZyAgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiB4bWw6c3BhY2U9InByZXNlcnZlIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgd2lkdGg9IjIwMHB4IiBoZWlnaHQ9IjIwMHB4IiB4PSIwcHgiIHk9IjBweCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMjAwIDIwMCI+PGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF9yaWdodF8iIHkyPSIxLjI3OWUtMTMiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4Mj0iLTEwNzMuMiIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgxMTk2LjYwNCwxNS4zNjg5NzcpIiB5MT0iMTI2Ljg1IiB4MT0iLTEwNzMuMiI+CTxzdG9wIHN0b3AtY29sb3I9IiMxYjM5NjciIG9mZnNldD0iLjAxMSIgLz4JPHN0b3Agc3RvcC1jb2xvcj0iIzEzYjVlYSIgb2Zmc2V0PSIuNDY3IiAvPgk8c3RvcCBzdG9wLWNvbG9yPSIjMDAyYjVjIiBvZmZzZXQ9Ii45OTQ1IiAvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF9sZWZ0XyIgeTI9IjEuMjc5ZS0xMyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgyPSItMTA3My4yIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KC0xLDAsMCwxLC05OTQuNzg4MDEsMTUuMzY3OTc3KSIgeTE9IjEyNi44NSIgeDE9Ii0xMDczLjIiPgk8c3RvcCBzdG9wLWNvbG9yPSIjMWIzOTY3IiBvZmZzZXQ9Ii4wMTEiIC8+CTxzdG9wIHN0b3AtY29sb3I9IiMxM2I1ZWEiIG9mZnNldD0iLjQ2NyIgLz4JPHN0b3Agc3RvcC1jb2xvcj0iIzAwMmI1YyIgb2Zmc2V0PSIuOTk0NSIgLz48L2xpbmVhckdyYWRpZW50PjxwYXRoIGQ9Im0gMTUxLjgwNTEyLDI5LjU1Nzk3OCBjIDAuMDc3LDEuMzEzIC0xLjc4NywwLjk2OCAtMS43ODcsMi4yOTMgMCwzOC41NTEgLTQ2LjU1OCw5Ny4zNjYwMTIgLTkxLjY4Nzk4NSwxMDguNzMwMDEyIHYgMS42MzkgQyAxMTguMjgzMTMsMTM2LjY5OTk5IDE4Ni44OTAxMiw3NC40MTk5NzggMTg4LjQwMDEyLDE1LjM2OTk3NyBsIC0zNi41OTksMTQuMTg5MDAxIHoiIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfcmlnaHRfKSIgLz48cGF0aCBkPSJtIDEzMy42NzMxMiwzNC4zMDA5NzggYyAwLjA3NiwxLjMxMyAwLjEyLDIuNjMgMC4xMiwzLjk1NyAwLDM4LjU1MSAtMzAuNjk4OTgsOTAuNDk3MDEyIC03NS44MjY5ODUsMTAxLjg2MDAxMiB2IDEuNjM5IGMgNTkuMDQ0MDA1LC0yLjc5IDEwNS44MDk5OTUsLTYzLjAyNDAxMiAxMDUuODA5OTk1LC0xMDkuMjAwMDEyIDAsLTIuMzc1IC0wLjEyOCwtNC43MjkgLTAuMzcxLC03LjA1NiBsIC0yOS43Myw4Ljc5OCB6IiBzdHlsZT0iZmlsbDojZTk2ZDFmIiAvPjxwYXRoIGQ9Im0gMTYzLjY5MTEyLDI0Ljk1MTk3OCAtNy42MTY5OSwyLjcyMiBjIDAuMDQxLDAuOTYyIDAuMDY2LDIuMjU0IDAuMDY2LDMuMjI1IDAsNDEuMjE5IC0zNy4yNzEsOTguMjA0MDEyIC04Ny4yNzE5OTUsMTA3LjEyMDAxMiAtMy4yNDUwMSwxLjA4OCAtNy41MzgwMSwyLjA3NyAtMTAuOTMyLDIuOTMxIHYgMS42MzggQyAxMjMuMTkwMTMsMTM3LjAyNzk5IDE2OS4wMzYxMyw3MC43MjE5NzggMTYzLjY5NjEyLDI0Ljk0Nzk3OCBaIiBzdHlsZT0iZmlsbDojZDk1NDFlIiAvPjxwYXRoIGQ9Im0gNTAuMDExLDI5LjU1Njk3OCBjIC0wLjA3NywxLjMxMyAxLjc4NywwLjk2OCAxLjc4NywyLjI5MyAwLDM4LjU1MSA0Ni41NTgwMDcsOTcuMzY2MDEyIDkxLjY4Nzk5LDEwOC43MzAwMTIgdiAxLjYzOSBDIDgzLjUzMywxMzYuNjk4OTkgMTQuOTI2LDc0LjQxODk3OCAxMy40MTYsMTUuMzY4OTc3IGwgMzYuNTk5LDE0LjE4OTAwMSB6IiBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEX2xlZnRfKSIgLz48cGF0aCBkPSJtIDY4LjE0MywzNC4yOTk5NzggYyAtMC4wNzYsMS4zMTMgLTAuMTIsMi42MyAtMC4xMiwzLjk1NyAwLDM4LjU1MSAzMC42OTg5OTUsOTAuNDk3MDEyIDc1LjgyNjk5LDEwMS44NjAwMTIgdiAxLjYzOSBDIDg0LjgwNiwxMzguOTY1OTkgMzguMDQsNzguNzMxOTc4IDM4LjA0LDMyLjU1NTk3OCBjIDAsLTIuMzc1IDAuMTI4LC00LjcyOSAwLjM3MSwtNy4wNTYgbCAyOS43Myw4Ljc5OCB6IiBzdHlsZT0iZmlsbDojYTBjZTY3IiAvPjxwYXRoIGQ9Im0gMzguMTI1LDI0Ljk1MDk3OCA3LjYxNywyLjcyMiBjIC0wLjA0MSwwLjk2MiAtMC4wNjYsMi4yNTQgLTAuMDY2LDMuMjI1IDAsNDEuMjE5IDM3LjI3MSw5OC4yMDQwMTIgODcuMjcxOTksMTA3LjEyMDAxMiAzLjI0NSwxLjA4OCA3LjUzOCwyLjA3NyAxMC45MzIsMi45MzEgdiAxLjYzOCBDIDc4LjYyNiwxMzcuMDI2OTkgMzIuNzgsNzAuNzIwOTc4IDM4LjEyLDI0Ljk0Njk3OCBaIiBzdHlsZT0iZmlsbDojNDM5NjM5IiAvPjxwYXRoIGQ9Im0gMjUuOTg4LDE3Mi4wNzc5OSAtMTMuMzg4LC0xNC42NSBoIDExLjY0MyBsIDkuMTI3LDEwLjI2OCA5LjEyOSwtMTAuMjY4IGggMTEuNjQzIGwgLTEzLjM4NywxNC42NDYgMTQuNDAxLDE0LjcyOCBoIC0xMi4wOSBsIC05LjY5NywtMTAuNjcgLTkuNjkzLDEwLjY3IEggMTEuNTg0IGwgMTQuNDA0LC0xNC43MyB6IiAvPjxwYXRoIGQ9Im0gNTguNTA4LDE1Ny40Mjc5OSBoIDEzLjgzNiBsIDEwLjE4MywxOC45MDUgMTAuMTgzLC0xOC45MDUgaCAxMy44MzE5OSB2IDI5LjM3NCBoIC04Ljc2MTk4MyB2IC0yMS4wOTYgaCAtMC4wOCBMIDg1Ljg5MywxODYuODAxOTkgSCA3OS4xNiBsIC0xMS44MDcsLTIxLjA5NiBoIC0wLjA4MiB2IDIxLjA5NiBoIC04Ljc2NCB2IC0yOS4zNyB6IiAvPjxwYXRoIGQ9Im0gMTEyLjY2MTk5LDE1Ny40Mjc5OSBoIDI0LjU0NiBjIDguNTU5LDAgMTAuNjI4LDQuMzAyIDEwLjYyOCwxMC4wNjMgdiAyLjUxNiBjIDAsNC4zODEgLTEuOTA4LDkuNDEgLTguMjc1LDkuNDEgaCAtMTcuODk0IHYgNy4zODUgaCAtOS4wMDUgdiAtMjkuMzggeiBtIDksMTQuNjkgaCAxMy45OTcgYyAyLjEwOTAxLDAgMi45MjQwMSwtMS4zNzcgMi45MjQwMSwtMy4xMjMgdiAtMS4xMzUgYyAwLC0xLjk5IC0wLjk3NiwtMy4xMjcgLTMuNjk0LC0zLjEyNyBoIC0xMy4yMjcgdiA3LjM4IHoiIC8+PHBhdGggZD0ibSAxNTIuNzIxOTksMTU3LjQyNzk5IGggMjQuNTQ2IGMgOC41NjEsMCAxMC42Myw0LjMwMiAxMC42MywxMC4wNjMgdiAyLjUxNiBjIDAsNC4zODEgLTEuOTA3LDkuNDEgLTguMjc1LDkuNDEgaCAtMTcuODkzIHYgNy4zODUgaCAtOS4wMDggdiAtMjkuMzggeiBtIDkuMDEsMTQuNjkgaCAxMy45OTYgYyAyLjExLDAgMi45MjIsLTEuMzc3IDIuOTIyLC0zLjEyMyB2IC0xLjEzNSBjIDAsLTEuOTkgLTAuOTc0LC0zLjEyNyAtMy42OTMsLTMuMTI3IGggLTEzLjIyNSB2IDcuMzggeiIgLz48L3N2Zz4=';

export default class NotificationPlugin extends AbstractPlugin {
   private foreground: boolean = true;
   private favicon: JQuery<HTMLElement> = undefined;
   private savedOrdiginalFavicon: string = null;

   public static getId(): string {
      return 'notification';
   }

   public static getName(): string {
      return 'Desktop Notification';
   }

   public static getDescription(): string {
      return Translation.t('setting-notification-enable');
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor, 90);
      pluginAPI.addAfterReceiveGroupMessageProcessor(this.afterReceiveMessageProcessor, 90);

      pluginAPI.registerPresenceHook(this.onPresence);
      this.pluginAPI = pluginAPI;

      this.favicon = $(document.head).find('link[rel*="icon"]');
      if (this.favicon && this.favicon.length === 0) {
         this.favicon = $('<link href="' + defaultFavicon + '" rel="icon" />');
         $(document.head).append(this.favicon);
         this.savedOrdiginalFavicon = defaultFavicon;
      } else {
         this.savedOrdiginalFavicon = this.favicon.attr('href');
      }

      $(window).on('focus', e => {
         this.foreground = true;
         this.clearCountTitle();
      });

      $(window).on('blur', e => {
         this.foreground = false;
      });
   }

   private afterReceiveMessageProcessor = (
      contact: IContact,
      message: IMessage,
      stanza: Element
   ): Promise<[IContact, IMessage, Element]> => {
      if ((message.getPlaintextMessage() || message.getAttachment()) && message.isIncoming()) {
         Notification.notify({
            title: Translation.t('New_message_from', {
               name: contact.getName(),
            }),
            message: message.getPlaintextMessage(),
            soundFile: SOUNDS.MSG,
            source: contact,
         });

         if (Client.getOption('useNotificationCounter') || true) {
            if (!this.foreground) {
               this.increaseCountTitle();
            }
         }
      }

      return Promise.resolve([contact, message, stanza]);
   };

   public clearCountTitle(): void {
      this.favicon.attr('href', this.savedOrdiginalFavicon);
      this.pluginAPI.getStorage().setItem('unreadmessagecount', '0');
   }

   private getCountSVG(number: string): string {
      return 'data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE svg  PUBLIC "-//W3C//DTD SVG 1.1//EN"  "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="black" height="24" width="24"><rect width="100%" height="100%" style="fill:rgb(0,51,102);stroke-width:3;stroke:rgb(255,255,255)"/><text font-size="135%" font-weight="bold" dominant-baseline="middle" text-anchor="middle" x="50%" y="55%" font-family="monospace" fill="white">{NUMBER}</text></svg>'.replace(
         '{NUMBER}',
         number
      );
   }

   private increaseCountTitle(): void {
      let strcount = this.pluginAPI.getStorage().getItem('unreadmessagecount');
      let count = 0;
      if (strcount) {
         count = parseInt(strcount, 10);
      }

      count++;

      this.favicon.attr('href', this.getCountSVG(count.toString()));
      this.pluginAPI.getStorage().setItem('unreadmessagecount', count.toString());
   }

   private onPresence = (contact: IContact, newPresence, oldPresence) => {
      if (oldPresence !== Presence.offline || newPresence === Presence.offline) {
         return;
      }

      let now = new Date();
      let created = this.pluginAPI.getConnectionCreationDate() || now;

      if (!created || now.valueOf() - created.valueOf() < 2 * 60 * 1000) {
         return;
      }

      Notification.notify({
         title: contact.getName(),
         message: Translation.t('has_come_online'),
         source: contact,
      });
   };
}
