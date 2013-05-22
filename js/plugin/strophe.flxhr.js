/* flXHR plugin
**
** This plugin implements cross-domain XmlHttpRequests via an invisible
** Flash plugin.
**
** In order for this to work, the BOSH service *must* serve a
** crossdomain.xml file that allows the client access.
**
** flXHR.js should be loaded before this plugin.
*/

/**
 * Modified by Klaus Herberth, 2013
 * https://github.com/sualko/strophejs/tree/master/plugins
 */

Strophe.addConnectionPlugin('flxhr', {
    init: function (conn) {
        // replace Strophe.Request._newXHR with new flXHR version
        // if flXHR is detected
        if (flensed && flensed.flXHR) {
            Strophe.Request.prototype._newXHR = function () {
                var xhr = new flensed.flXHR({
                    autoUpdatePlayer: true,
                    instancePooling: true,
                    noCacheHeader: false,
                    base_path: '/assets/jsxc/lib',
                    onerror: function (err) { 
                        if(err.number == 16){
                            //chrome throw error if we kill long polling request
                            err.srcElement.status = 0;
                            Strophe.warn('Skip flXHR '+err.name+': '+err.message);
                        }else{
                            conn._changeConnectStatus(Strophe.Status.CONNFAIL,
                                                      "flXHR connection error: " + err.message);
                            conn._onDisconnectTimeout();
                        }
                    }
                });
                xhr.onreadystatechange = this.func.bind(null, this);

                return xhr;
            };
        } else {
            Strophe.error("flXHR plugin loaded, but flXHR not found." +
                          "  Falling back to native XHR implementation.");
        }
    }
});
