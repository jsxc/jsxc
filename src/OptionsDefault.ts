/** name of container application (e.g. owncloud or SOGo) */
export let app_name = 'web applications';

/** Timeout for the keepalive signal */
export let timeout = 3000;

/** default xmpp priorities */
export let priority = {
   online: 0,
   chat: 0,
   away: 0,
   xa: 0,
   dnd: 0
};

/** How many messages should be logged? */
export let numberOfMsg = 10;

/** Default language */
export let defaultLang = 'en';

/** auto language detection */
export let autoLang = true;

/** Place for roster */
export let rosterAppend = 'body';

/** duration for notification */
export let popupDuration = 6000;

/**
* This function decides wether the roster will be displayed or not if no
* connection is found.
*/
export let displayRosterMinimized = function() {
   return false;
};

/** Set to true if you want to hide offline buddies. */
export let hideOffline = false;

/**
* If no avatar is found, this function is called.
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
* Returns permanent saved settings and overwrite default jsxc.options.
*
* @memberOf jsxc.options
* @function
* @param username {string} username
* @param password {string} password
* @param cb {loadSettingsCallback} Callback that handles the result
*/
export let loadSettings = null;

/**
* Call this function to save user settings permanent.
*
* @memberOf jsxc.options
* @param data Holds all data as key/value
* @param cb Called with true on success, false otherwise
*/
export let saveSettinsPermanent = function(data, cb) {
   cb(true);
};

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

/** Options for info in favicon */
export let favicon = {
   enable: true,

   /** Favicon info background color */
   bgColor: '#E59400',

   /** Favicon info text color */
   textColor: '#fff'
};

/** @deprecated since v2.1.0. Use now RTCPeerConfig.url. */
export let turnCredentialsPath = null;

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
* Download urls to screen media extensions.
*
* @type {Object}
* @see example extensions {@link https://github.com/otalk/getScreenMedia}
*/
export let screenMediaExtension = {
   firefox: '',
   chrome: ''
};

/** Mute notification sound? */
export let muteNotification = false;

export let storage = window.localStorage;

export let disabledPlugins: Array<string> = [];

export let connectionCallback: (jid: string, status: number, condition?: string) => void = null;

//@TODO show login dialog
export let onUserRequestsToGoOnline: () => void = null;
