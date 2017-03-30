/**
 * Set some options for the chat.
 *
 * @namespace jsxc.options
 */
jsxc.options = {

   /** name of container application (e.g. owncloud or SOGo) */
   app_name: 'web applications',

   /** Timeout for the keepalive signal */
   timeout: 3000,

   /** Timeout for the keepalive signal if the master is busy */
   busyTimeout: 15000,

   /** OTR options */
   otr: {
      enable: true,
      ERROR_START_AKE: false,
      debug: false,
      SEND_WHITESPACE_TAG: false,
      WHITESPACE_START_AKE: true
   },

   /** xmpp options */
   xmpp: {
      /** BOSH url */
      url: null,

      /** XMPP JID*/
      jid: null,

      /** XMPP domain */
      domain: null,

      /** XMPP password */
      password: null,

      /** session id */
      sid: null,

      /** request id */
      rid: null,

      /** True: Allow user to overwrite xmpp settings */
      overwrite: false,

      /** @deprecated since v2.1.0. Use now loginForm.enable. */
      onlogin: null
   },

   /** default xmpp priorities */
   priority: {
      online: 0,
      chat: 0,
      away: 0,
      xa: 0,
      dnd: 0
   },

   /**
    * This function is called if a login form was found, but before any
    * modification is done to it.
    *
    * @memberOf jsxc.options
    * @function
    */
   formFound: null,

   /** If all 3 properties are set and enable is true, the login form is used */
   loginForm: {
      /** False, disables login through login form */
      enable: true,

      /** jquery object from form */
      form: null,

      /** jquery object from input element which contains the jid */
      jid: null,

      /** jquery object from input element which contains the password */
      pass: null,

      /** manipulate JID from input element */
      preJid: function(jid) {
         return jid;
      },

      /**
       * Action after login was called: dialog [String] Show wait dialog, false [boolean] |
       * quiet [String] Do nothing
       */
      onConnecting: 'dialog',

      /**
       * Action after connected: submit [String] Submit form, false [boolean] Do
       * nothing, continue [String] Start chat
       */
      onConnected: 'submit',

      /**
       * Action after auth fail: submit [String] Submit form, false [boolean] | quiet [String] Do
       * nothing, ask [String] Show auth fail dialog
       */
      onAuthFail: 'submit',

      /**
       * True: Attach connection even is login form was found.
       *
       * @type {Boolean}
       * @deprecated since 3.0.0. Use now loginForm.ifFound (true => attach, false => pause)
       */
      attachIfFound: true,

      /**
       * Describes what we should do if login form was found:
       * - Attach connection
       * - Force new connection with loginForm.jid and loginForm.passed
       * - Pause connection and do nothing
       *
       * @type {(attach|force|pause)}
       */
      ifFound: 'attach',

      /**
       * True: Display roster minimized after first login. Afterwards the last
       * roster state will be used.
       */
      startMinimized: false
   },

   /** jquery object from logout element */
   logoutElement: null,

   /** How many messages should be logged? */
   numberOfMsg: 10,

   /** Default language */
   defaultLang: 'en',

   /** auto language detection */
   autoLang: true,

   /** Place for roster */
   rosterAppend: 'body',

   /** Should we use the HTML5 notification API? */
   notification: true,

   /** duration for notification */
   popupDuration: 6000,

   /** Absolute path root of JSXC installation */
   root: '',

   /**
    * This function decides wether the roster will be displayed or not if no
    * connection is found.
    */
   displayRosterMinimized: function() {
      return false;
   },

   /** Set to true if you want to hide offline buddies. */
   hideOffline: false,

   /** Mute notification sound? */
   muteNotification: false,

   /**
    * If no avatar is found, this function is called.
    *
    * @param jid Jid of that user.
    * @this {jQuery} Elements to update with probable .jsxc_avatar elements
    */
   defaultAvatar: null,

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
   loadSettings: null,

   /**
    * Call this function to save user settings permanent.
    *
    * @memberOf jsxc.options
    * @param data Holds all data as key/value
    * @param cb Called with true on success, false otherwise
    */
   saveSettinsPermanent: function(data, cb) {
      cb(true);
   },

   carbons: {
      /** Enable carbon copies? */
      enable: true
   },

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
   getUsers: null,

   /** Options for info in favicon */
   favicon: {
      enable: true,

      /** Favicon info background color */
      bgColor: '#E59400',

      /** Favicon info text color */
      textColor: '#fff'
   },

   /** @deprecated since v2.1.0. Use now RTCPeerConfig.url. */
   turnCredentialsPath: null,

   /** RTCPeerConfiguration used for audio/video calls. */
   RTCPeerConfig: {
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
   },

   /** Link to an online user manual */
   onlineHelp: 'http://www.jsxc.org/manual.html',

   viewport: {
      getSize: function() {
         var w = $(window).width() - $('#jsxc_windowListSB').width();
         var h = $(window).height();

         if (jsxc.storage.getUserItem('roster') === 'shown') {
            w -= $('#jsxc_roster').outerWidth(true);
         }

         return {
            width: w,
            height: h
         };
      }
   },

   /** Maximal storage size for attachments received via data channels (webrtc). */
   maxStorableSize: 1000000,

   /** Options for file transfer. */
   fileTransfer: {
      httpUpload: {
         enable: true
      },
      // @TODO add option to enable/disable data channels
   },

   /** Default option for chat state notifications */
   chatState: {
      enable: true
   },

   /**
    * Download urls to screen media extensions.
    *
    * @type {Object}
    * @see example extensions {@link https://github.com/otalk/getScreenMedia}
    */
   screenMediaExtension: {
      firefox: '',
      chrome: ''
   },

   /**
    * Options for Message Archive Management (XEP-0313)
    */
   mam: {
      enable: false,
      max: null
   }
};
