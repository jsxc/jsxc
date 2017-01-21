/**
 * This namespace handle the notice system.
 *
 * @namspace jsxc.notice
 * @memberOf jsxc
 */
jsxc.notice = {
   /** Number of notices. */
   _num: 0,

   /**
    * Loads the saved notices.
    *
    * @memberOf jsxc.notice
    */
   load: function() {
      // reset list
      $('#jsxc_notice ul li').remove();
      $('#jsxc_notice > span').text('');
      jsxc.notice._num = 0;

      var saved = jsxc.storage.getUserItem('notices') || [];
      var key = null;

      for (key in saved) {
         if (saved.hasOwnProperty(key)) {
            var val = saved[key];

            jsxc.notice.add(val, val.fnName, val.fnParams, key);
         }
      }
   },

   /**
    * Add a new notice to the stack;
    *
    * @memberOf jsxc.notice
    * @param {Object} data
    * @param {String} data.msg Header message
    * @param {String} data.description Notice description
    * @param {String} fnName Function name to be called if you open the notice
    * @param fnParams Array of params for function
    * @param {String} id Notice id
    */
   add: function(data, fnName, fnParams, id) {
      var nid = id || Date.now();
      var list = $('#jsxc_notice ul');
      var notice = $('<li/>');
      var msg = data.msg;
      var description = data.description;

      notice.click(function() {
         jsxc.notice.remove(nid);

         jsxc.exec(fnName, fnParams);

         return false;
      });

      if (data.type) {
         notice.addClass('jsxc_' + data.type + 'icon');
      }

      notice.text(msg);
      notice.attr('title', description || '');
      notice.attr('data-nid', nid);
      list.append(notice);

      $('#jsxc_notice > span').text(++jsxc.notice._num);

      var saved = jsxc.storage.getUserItem('notices') || {};

      if (!id) {
         saved[nid] = {
            msg: msg,
            description: description,
            type: data.type,
            fnName: fnName,
            fnParams: fnParams
         };
         jsxc.storage.setUserItem('notices', saved);

         jsxc.notification.notify(msg, description || '', null, true, jsxc.CONST.SOUNDS.NOTICE);
      }

      if (Object.keys(saved).length > 3 && list.find('.jsxc_closeAll').length === 0) {
         // add close all button
         var closeAll = $('<li>');
         closeAll.addClass('jsxc_closeAll jsxc_deleteicon jsxc_warning');
         closeAll.text($.t('Close_all'));
         closeAll.prependTo(list);
         closeAll.click(jsxc.notice.removeAll);
      } else if (Object.keys(saved).length <= 3 && list.find('.jsxc_closeAll').length !== 0) {
         // remove close all button
         list.find('.jsxc_closeAll').remove();
      }
   },

   /**
    * Removes notice from stack
    *
    * @memberOf jsxc.notice
    * @param nid The notice id
    */
   remove: function(nid) {
      var el = $('#jsxc_notice li[data-nid=' + nid + ']');

      el.remove();
      $('#jsxc_notice > span').text(--jsxc.notice._num || '');

      var s = jsxc.storage.getUserItem('notices') || {};
      delete s[nid];
      jsxc.storage.setUserItem('notices', s);

      if (Object.keys(s).length <= 3 && $('#jsxc_notice .jsxc_closeAll').length !== 0) {
         // remove close all button
         $('#jsxc_notice .jsxc_closeAll').remove();
      }
   },

   /**
    * Remove all notices.
    */
   removeAll: function() {
      jsxc.notice._num = 0;
      jsxc.storage.setUserItem('notices', {});

      $('#jsxc_notice ul').empty();
      $('#jsxc_notice > span').text('');
   },

   /**
    * Check if there is already a notice for the given function name.
    *
    * @memberOf jsxc.notice
    * @param {string} fnName Function name
    * @returns {boolean} True if there is >0 functions with the given name
    */
   has: function(fnName) {
      var saved = jsxc.storage.getUserItem('notices') || [];
      var has = false;

      $.each(saved, function(index, val) {
         if (val.fnName === fnName) {
            has = true;

            return false;
         }
      });

      return has;
   }
};
