/**
 * Provides communication between tabs.
 *
 * @namespace jsxc.tab
 */
jsxc.tab = {
   CONST: {
      MASTER: 'master',
      SLAVE: 'slave'
   },

   exec: function(target, cmd, params) {

      params = Array.prototype.slice.call(arguments, 2);
      if (params.length === 1 && $.isArray(params[0])) {
         params = params[0];
      }

      if (target === jsxc.tab.CONST[jsxc.master ? 'MASTER' : 'SLAVE']) {
         jsxc.exec(cmd, params);

         if (jsxc.master) {
            return;
         }
      }

      jsxc.storage.setUserItem('_cmd', {
         target: target,
         cmd: cmd,
         params: params,
         rnd: Math.random() // force storage event
      });
   },

   /*jshint -W098 */
   execMaster: function(cmd, params) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(jsxc.tab.CONST.MASTER);

      jsxc.tab.exec.apply(this, args);
   },
   execSlave: function(cmd, params) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(jsxc.tab.CONST.SLAVE);

      jsxc.tab.exec.apply(this, args);
   }
   /*jshint +W098 */
};
