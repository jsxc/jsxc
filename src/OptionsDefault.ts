import loginDialog from './ui/dialogs/loginBox'

/** name of container application (e.g. Nextcloud or SOGo) */
export let app_name = 'web applications';

/** How many messages should be logged? */
export let numberOfMessages = 100;

/** Default language */
export let defaultLang = 'en';

/** Place for roster */
export let rosterAppend = 'body';

/** @TODO Set to true if you want to hide offline contacts. (UNUSED) */
export let hideOfflineContacts = false;

//@REVIEW maybe use this as plugin
/**
* @TODO If no avatar is found, this function is called. (UNUSED)
*
* @param jid Jid of that user.
* @this {jQuery} Elements to update with probable .jsxc_avatar elements
*/
export let defaultAvatar = function(jid) {
   // jsxc.gui.avatarPlaceholder($(this).find('.jsxc_avatar'), jid);
};

/**
* This callback processes all settings.
* @callback loadSettingsCallback
* @param settings {object} could be every jsxc option
*/

/**
* @TODO Returns permanent saved settings and overwrite default jsxc.options. (UNUSED)
*
* @memberOf jsxc.options
* @function
* @param username {string} username
* @param password {string} password
* @param cb {loadSettingsCallback} Callback that handles the result
*/
export let loadSettings = null;

/**
* @TODO Call this function to save user settings permanent. (UNUSED)
*
* @memberOf jsxc.options
* @param data Holds all data as key/value
* @param cb Called with true on success, false otherwise
*/
export let saveSettingsPermanent = function(data, cb) {
   cb(true);
};

//@REVIEW maybe use getOption and setOption; this would require to transform Options.get to async function

/**
* Processes user list.
*
* @callback getUsers-cb
* @param {object} list List of users, key: username, value: alias
*/

/**
* Returns a list of usernames and aliases
*
* @function getUsers
* @memberOf jsxc.options
* @param {string} search Search token (start with)
* @param {getUsers-cb} cb Called with list of users
*/
export let getUsers = null;

/** @TODO Options for info in favicon (UNUSED) */
export let favicon = {
   enable: true,

   /** Favicon info background color */
   bgColor: '#E59400',

   /** Favicon info text color */
   textColor: '#fff'
};

/** RTCPeerConfiguration used for audio/video calls. */
export let RTCPeerConfig = {
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
   getSize: function() {
      var w = $(window).width() - $('#jsxc_windowListSB').width();
      var h = $(window).height();

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

/** @TODO (UNUSED) */
export let notification = {
   enable: true,

   /** duration for notification */
   popupDuration: 6000,

   /** Mute notification sound? */
   mute: false,
}

/** @TODO (UNUSED) */
export let storage = window.localStorage;

export let disabledPlugins: Array<string> = [];

export let connectionCallback: (jid: string, status: number, condition?: string) => void = null;

export let onUserRequestsToGoOnline: () => void = loginDialog;

export let xmppBoshUrl: string = undefined;

//@TODO logoutElement
