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
      SEND_WHITESPACE_TAG: true,
      WHITESPACE_START_AKE: true
   },

   /** xmpp options */
   xmpp: {
      url: null,
      jid: null,
      domain: null,
      password: null,
      overwrite: false,
      onlogin: true
   },

   /** default xmpp priorities */
   priority: {
      online: 0,
      chat: 0,
      away: 0,
      xa: 0,
      dnd: 0
   },

   /** If all 3 properties are set, the login form is used */
   loginForm: {
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
       * Action after connected: submit [String] Submit form, false [boolean] Do
       * nothing, continue [String] Start chat
       */
      onConnected: 'submit',

      /**
       * Action after auth fail: submit [String] Submit form, false [boolean] Do
       * nothing, ask [String] Show auth fail dialog
       */
      onAuthFail: 'submit'
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

   /** Timeout for restore in ms */
   loginTimeout: 1000 * 60 * 10,

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
   defaultAvatar: function(jid) {
      jsxc.gui.avatarPlaceholder($(this).find('.jsxc_avatar'), jid);
   },

   /**
    * Returns permanent saved settings and overwrite default jsxc.options.
    * 
    * @memberOf jsxc.options
    * @param username String username
    * @param password String password
    * @returns {object} at least xmpp.url
    */
   loadSettings: function() {

   },

   /**
    * Call this function to save user settings permanent.
    * 
    * @memberOf jsxc.options
    * @param data Holds all data as key/value
    * @returns {boolean} false if function failes
    */
   saveSettinsPermanent: function() {

   },

   carbons: {
      /** Enable carbon copies? */
      enable: false
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
   getUsers: null
};