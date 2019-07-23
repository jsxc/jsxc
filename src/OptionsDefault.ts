import loginDialog from './ui/dialogs/loginBox'
import { SHOWN } from './CONST';
import { ICEServer } from './IceServers';
import { SettingsCallback } from './FormWatcher';
import { IJID } from './JID.interface';

/* tslint:disable:no-unnecessary-initializer */
// We need to initialize options with undefined, otherwise they will not be exported.

/** name of container application (e.g. Nextcloud or SOGo) */
export let appName = 'web applications';

/** How many messages should be logged? */
export let numberOfMessages = 100;

/** Language as IETF language tag (e.g. en, de, es) */
export let lang = '';

/** Auto language detection */
export let autoLang = true;

/** Place for roster */
export let rosterAppend = 'body';

/** Default visibility of roster */
export let rosterVisibility = SHOWN;

/** Set to true if you want to hide offline contacts */
export let hideOfflineContacts = false;

/** Returns permanent saved settings. */
export let loadOptions: (jid: string, password: string) => Promise<{[id: string]: {[key: string]: any}}> = undefined;

/** This function is called after a watched form or the login box is submitted. */
export let loadConnectionOptions: SettingsCallback = undefined;

/** This function is called if an option gets changed. */
export let onOptionChange: (id: string, key: string, value: any, exportId: () => any) => void = undefined;

/** Returns a list of usernames and aliases */
export let getUsers: (search: string) => Promise<{[uid: string]: string}> = undefined;

/** @TODO Options for info in favicon (UNUSED) */
export let favicon = {
   enable: true,

   /** Favicon info background color */
   bgColor: '#E59400',

   /** Favicon info text color */
   textColor: '#fff'
};

/** This function is called for every avatar element without a user defined avatar. */
export let avatarPlaceholder: (element: JQuery, name: string, color: string, jid?: IJID) => void = ((element: JQuery, text: string, color: string) => {
   element.css({
      'background-color': color,
      'color': '#fff',
      'font-weight': 'bold',
      'text-align': 'center',
      'line-height': '36px', // element.height() + 'px',
      'font-size': '22px', //element.height() * 0.6 + 'px'
   });

   element.text(text[0].toUpperCase());
});

export interface IRTCPeerConfig {
   ttl: number
   url?: string
   withCredentials: boolean
   iceServers: ICEServer[]
}

/** RTCPeerConfiguration used for audio/video calls. */
export let RTCPeerConfig: IRTCPeerConfig = {
   /** Time-to-live for config from url */
   ttl: 3600,

   /** [optional] If set, jsxc requests and uses RTCPeerConfig from this url */
   url: null,

   /** If true, jsxc send cookies when requesting RTCPeerConfig from the url above */
   withCredentials: false,

   /** ICE servers like defined in http://www.w3.org/TR/webrtc/#idl-def-RTCIceServer */
   iceServers: [{
      urls: 'stun:stun.stunprotocol.org'
   }]
};

/** Link to an online user manual */
export let onlineHelp = 'http://www.jsxc.org/manual.html';

/** @TODO (UNUSED) */
export let viewport = {
   getSize() {
      let w = $(window).width() - $('#jsxc_windowListSB').width();
      let h = $(window).height();

      // if (jsxc.storage.getUserItem('roster') === 'shown') {
      //    w -= $('#jsxc_roster').outerWidth(true);
      // }

      return {
         width: w,
         height: h
      };
   }
};

/**
 * Download urls to screen media extensions. (UNUSED)
 *
 * @type {Object}
 * @see example extensions {@link https://github.com/otalk/getScreenMedia}
 */
export let screenMediaExtension = {
   firefox: '',
   chrome: ''
};

/** Options for native browser notifications */
export let notification = {
   enable: true,

   /** duration for notification */
   popupDuration: 6000,

   /** Mute notification sound? */
   mute: false,
};

export let storage = window.localStorage;

export let disabledPlugins: string[] = [];

export let connectionCallback: (jid: string, status: number, condition?: string) => void = null;

export let onUserRequestsToGoOnline: () => void = loginDialog;
