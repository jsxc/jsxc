/**
 * Load message object with given uid.
 *
 * @class Message
 * @memberOf jsxc
 * @param {string} uid Unified identifier from message object
 */
/**
 * Create new message object.
 *
 * @class Message
 * @memberOf jsxc
 * @param {object} args New message properties
 * @param {string} args.bid
 * @param {direction} args.direction
 * @param {string} args.msg
 * @param {boolean} args.encrypted
 * @param {boolean} args.forwarded
 * @param {boolean} args.sender
 * @param {integer} args.stamp
 * @param {object} args.attachment Attached data
 * @param {string} args.attachment.name File name
 * @param {string} args.attachment.size File size
 * @param {string} args.attachment.type File type
 * @param {string} args.attachment.data File data
 */

jsxc.Message = function() {

   /** @member {string} */
   this._uid = null;

   /** @member {boolean} */
   this._received = false;

   /** @member {boolean} */
   this.encrypted = null;

   /** @member {boolean} */
   this.forwarded = false;

   /** @member {integer} */
   this.stamp = new Date().getTime();

   this.type = jsxc.Message.PLAIN;

   if (typeof arguments[0] === 'string' && arguments[0].length > 0 && arguments.length === 1) {
      this._uid = arguments[0];

      this.load(this._uid);
   } else if (typeof arguments[0] === 'object' && arguments[0] !== null) {
      $.extend(this, arguments[0]);
   }

   if (!this._uid) {
      this._uid = new Date().getTime() + ':msg';
   }
};

/**
 * Load message properties.
 *
 * @memberof jsxc.Message
 * @param  {string} uid
 */
jsxc.Message.prototype.load = function(uid) {
   var data = jsxc.storage.getUserItem('msg', uid);

   if (!data) {
      jsxc.debug('Could not load message with uid ' + uid);
   }

   $.extend(this, data);
};

/**
 * Save message properties and create thumbnail.
 *
 * @memberOf jsxc.Message
 * @return {Message} this object
 */
jsxc.Message.prototype.save = function() {
   var history;

   if (this.bid) {
      history = jsxc.storage.getUserItem('history', this.bid) || [];

      if (history.indexOf(this._uid) < 0) {
         if (history.length > jsxc.options.get('numberOfMsg')) {
            jsxc.Message.delete(history.pop());
         }
      } else {
         history = null;
      }
   }

   if (Image && this.attachment && this.attachment.type.match(/^image\//i) && this.attachment.data && !this.attachment.thumbnail) {
      var sHeight, sWidth, sx, sy;
      var dHeight = 100,
         dWidth = 100;
      var canvas = $("<canvas>").get(0);

      canvas.width = dWidth;
      canvas.height = dHeight;

      var ctx = canvas.getContext("2d");
      var img = new Image();

      img.src = this.attachment.data;

      if (img.height > img.width) {
         sHeight = img.width;
         sWidth = img.width;
         sx = 0;
         sy = (img.height - img.width) / 2;
      } else {
         sHeight = img.height;
         sWidth = img.height;
         sx = (img.width - img.height) / 2;
         sy = 0;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);

      this.attachment.thumbnail = canvas.toDataURL('image/jpeg', 0.3);

      if (this.direction === 'out') {
         // save storage
         this.attachment.data = null;
      }
   }

   var data;

   if (this.attachment && this.attachment.size > jsxc.options.maxStorableSize && this.direction === 'in') {
      jsxc.debug('Attachment to large to store');

      data = this.attachment.data;
      this.attachment.data = null;
      this.attachment.persistent = false;

      //@TODO inform user
   }

   jsxc.storage.setUserItem('msg', this._uid, this);

   if (history) {
      history.unshift(this._uid);

      jsxc.storage.setUserItem('history', this.bid, history);
   }

   if (data && this.attachment) {
      this.attachment.data = data;
   }

   return this;
};

/**
 * Remove object from storage.
 *
 * @memberOf jsxc.Message
 */
jsxc.Message.prototype.delete = function() {
   jsxc.Message.delete(this._uid);
};

/**
 * Returns object as jquery object.
 *
 * @memberOf jsxc.Message
 * @return {jQuery} Representation in DOM
 */
jsxc.Message.prototype.getDOM = function() {
   return jsxc.Message.getDOM(this._uid);
};

/**
 * Mark message as received.
 *
 * @memberOf jsxc.Message
 */
jsxc.Message.prototype.received = function() {
   this._received = true;
   this.save();

   this.getDOM().addClass('jsxc_received');
};

/**
 * Returns true if the message was already received.
 *
 * @memberOf jsxc.Message
 * @return {boolean} true means received
 */
jsxc.Message.prototype.isReceived = function() {
   return this._received;
};

/**
 * Remove message with uid.
 *
 * @memberOf jsxc.Message
 * @static
 * @param  {string} uid message uid
 */
jsxc.Message.delete = function(uid) {
   var data = jsxc.storage.getUserItem('msg', uid);

   if (data) {
      jsxc.storage.removeUserItem('msg', uid);

      if (data.bid) {
         var history = jsxc.storage.getUserItem('history', data.bid) || [];

         history = $.grep(history, function(el) {
            return el !== uid;
         });

         jsxc.storage.setUserItem('history', data.bid, history);
      }
   }
};

/**
 * Returns message object as jquery object.
 *
 * @memberOf jsxc.Message
 * @static
 * @param  {string} uid message uid
 * @return {jQuery} jQuery representation in DOM
 */
jsxc.Message.getDOM = function(uid) {
   return $('#' + uid.replace(/:/g, '-'));
};

/**
 * Message direction can be incoming, outgoing or system.
 *
 * @typedef {(jsxc.Message.IN|jsxc.Message.OUT|jsxc.Message.SYS)} direction
 */

/**
 * @constant
 * @type {string}
 * @default
 */
jsxc.Message.IN = 'in';

/**
 * @constant
 * @type {string}
 * @default
 */
jsxc.Message.OUT = 'out';

/**
 * @constant
 * @type {string}
 * @default
 */
jsxc.Message.SYS = 'sys';

jsxc.Message.HTML = 'html';

jsxc.Message.PLAIN = 'plain';
