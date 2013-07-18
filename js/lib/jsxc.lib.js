/**
 * @file Mainscript of the javascript xmpp client
 * @author Klaus Herberth
 * @version 0.1b
 * 
 * Libraries:
 * [1] Strophe.js, https://github.com/metajack/strophejs
 * need modified version: https://github.com/sualko/strophejs/
 * [2] OTR MP in JS, https://github.com/arlolra/otr/
 * need modified version: https://github.com/sualko/otr
 * 
 * Specs:
 * XMPP: IM and Presence, http://xmpp.org/rfcs/rfc3921.html
 * OTR v3, http://www.cypherpunks.ca/otr/Protocol-v3-4.0.0.html
 */

/*
 * TODO:
 * - (status notification)
 * - (CSPRNG)
 * - (make window list scrollable)
 * - add roster slide from ojsxc
 * - user info
 * - translate strings
 * - multiuser storage
 * - check roster loading on opera
 * - resource-handling
 */

/**
 * JavaScript Xmpp Chat namespace
 * @namespace jsxc
 */
var jsxc = {
    chief: false, //True if i'm the chief
    role_allocation: false, //True if the role allocation is finished
    to: null, //Timeout for keepalive
    toBusy: null, //Timeout after normal keepalive starts
    keepalive: null, //Interval for keepalive
    buddyList: new Array(), //list of otr objects
    restore: false, //True if last activity was 10 min ago
    restoreCompleted: false, //True if restore is complete
    triggeredFromForm: false, //True if login through form
    triggeredFromBox: false, //True if login through box
    triggeredFromElement: false, //True if logout through element click
    triggeredFromLogout: false, //True if logout through logout click
    status: new Array('offline', 'away', 'online'),
    msgstate: new Array('plaintext', 'encrypted', 'finished'),
    ls: new Array(), //last values which we wrote into localstorage (IE workaround)
    storageNotConform: null, //storage event is even fired if I write something into storage (IE workaround)
    //0: conform, 1: not conform, 2: not shure
    toSNC: null, //Timeout for storageNotConform test
    dialogOpen: false,
    jids: new Array(),
    /**
     * Starts the action
     * 
     * @param {object} options
     */
    init: function(options) {

        if (options)
            $.extend(jsxc.options, options);

        jsxc.debug = jsxc.options.debug;    //Shortcut

        jsxc.storageNotConform = jsxc.storage.getItem('storageNotConform') || 2;

        //detect language
        if (jsxc.options.autoLang && navigator.language)
            lang = navigator.language.substr(0, 2);
        else
            lang = jsxc.options.defaultLang;

        //set language
        jsxc.l = jsxc.l10n.en;
        $.extend(jsxc.l, jsxc.l10n[lang]);

        //Check localStorage
        if (typeof(localStorage) === 'undefined') {
            jsxc.debug("Browser doesn't support localStorage.");
            return;
        }

        //Check flash
        if (jsxc.options.checkFlash && !jsxc.hasFlash()) {
            jsxc.debug("No flash plugin for cross-domain requests.");
            return;
        }

//        //Check bosh url
//        if(!jsxc.options.xmpp.url){
//            jsxc.debug("No BOSH url defined.");
//            return;
//        }

        //Prepare notifications
        var noti = jsxc.storage.getItem('notification') || 2;
        if (jsxc.options.notification && noti > 0 && jsxc.notification.hasSupport()) {
            if (jsxc.notification.hasPermission())
                jsxc.notification.init();
            else
                jsxc.notification.prepareRequest();
        } else {
            //No support => disable
            jsxc.options.notification = false;
        }

        //Register eventlistener for the storage event
        window.addEventListener('storage', jsxc.onStorage, false);

        var lastActivity = jsxc.storage.getItem('lastActivity') || 0;

        if ((new Date()).getTime() - lastActivity < 1000 * 60 * 10)
            jsxc.restore = true;

        //Check if we have to establish a new connection
        if (!jsxc.storage.getItem('rid') || !jsxc.storage.getItem('sid') || !jsxc.restore) {
            jsxc.debug('Looking for login form');
            //Looking for a login form
            if (!jsxc.options.loginForm.form || !jsxc.el_exists(jsxc.options.loginForm.form))
                return;
            jsxc.debug('Form found');
            //create jquery object
            jsxc.options.loginForm.form = $(jsxc.options.loginForm.form);

            //Add jsxc login action to form
            jsxc.options.loginForm.form.submit(function() {

                jsxc.gui.showWaitAlert(jsxc.l.please_wait_until_we_logged_you_in);

                jsxc.options.xmpp.jid = jsxc.options.loginForm.preJid($(jsxc.options.loginForm.jid).val());
                jsxc.options.xmpp.password = $(jsxc.options.loginForm.pass).val();

                jsxc.triggeredFromForm = true;

                jsxc.xmpp.login();

                //Trigger submit in jsxc.xmpp.connected()
                return false;
            });

            return;
        }

        jsxc.gui.init();

        //Looking for logout element
        if (jsxc.options.logoutElement !== null && jsxc.options.logoutElement.length > 0) {
            jsxc.options.logoutElement.one('click', function() {
                jsxc.options.logoutElement = $(this);
                jsxc.triggeredFromLogout = true;
                return jsxc.xmpp.logout();
            });
        }

        if (typeof(jsxc.storage.getItem('alive')) === 'undefined' || !jsxc.restore) {
            jsxc.onChief();
        } else {
            jsxc.checkChief();
        }
    },
    hasFlash: function() {
        return (typeof (navigator.plugins) === "undefined" || navigator.plugins.length === 0) ?
                !!(new ActiveXObject("ShockwaveFlash.ShockwaveFlash")) : navigator.plugins["Shockwave Flash"];
    },
    /** 
     * Triggered if changes are recognized
     * @function
     * @param {event} e Storageevent
     * @param {String} e.key Keyname which triggered event
     * @param {Object} e.oldValue Old Value for key
     * @param {Object} e.newValue New Value for key
     * @param {String} e.url
     */
    onStorage: function(e) {

        //skip
        if (e.key == 'jsxc_rid' || e.key == 'jsxc_lastActivity')
            return;

        //Workaround for non-conform browser: Triggered event on every page (own)
        if (jsxc.storageNotConform > 0 && jsxc.ls.length > 0) {

            var val = e.newValue;
            try {
                val = JSON.parse(val);
            } catch (e) {
            }

            var index = $.inArray(JSON.stringify({key: e.key, value: val}), jsxc.ls);

            if (index >= 0) {

                //confirm that the storage event is not fired regularly
                if (jsxc.storageNotConform > 1) {
                    window.clearTimeout(jsxc.toSNC);
                    jsxc.storageNotConform = 1;
                    jsxc.storage.setItem('storageNotConform', 1);
                }

                jsxc.ls.splice(index, 1);
                return;
            }
        }

        //Workaround for non-conform browser
        if (e.oldValue == e.newValue) {
            return;
        }

        var cid = e.key.replace(/^jsxc_[a-z]+_(.*)/i, '$1');

        if (e.key.match(/^jsxc_chat_/)) {

            data = JSON.parse(e.newValue)[0];

            if (jsxc.chief && data.direction === 'out') {
                jsxc.buddyList[cid].sendMsg(data.msg);
            }

            jsxc.gui.window._postMessage(cid, data.direction, data.msg);
            return;
        }

        if (e.key.match(/^jsxc_window_/)) {

            if (!e.newValue) {
                jsxc.gui.window._close(cid);
                return;
            }

            if (!e.oldValue) {
                jsxc.gui.window.open(cid);
                return;
            }

            n = JSON.parse(e.newValue);

            if (n.minimize)
                jsxc.gui.window._hide(cid);
            else
                jsxc.gui.window._show(cid);

            jsxc.gui.window.setText(cid, n.text);

            return;
        }

        if (e.key.match(/^jsxc_smp_/)) {

            if (!e.newValue) {

                jsxc.gui.dialog.close();

                if (jsxc.chief)
                    jsxc.buddyList[cid].sm.abort();

                return;
            }

            n = JSON.parse(e.newValue);

            if (typeof(n.data) != 'undefined') {

                jsxc.otr.onSmpQuestion(cid, n.data);

            } else if (jsxc.chief && n.sec) {
                jsxc.gui.dialog.close();

                jsxc.otr.sendSmpReq(cid, n.sec, n.quest);
            }
        }

        if (!jsxc.chief && e.key.match(/^jsxc_buddy_/)) {

            if (!e.newValue) {
                jsxc.gui.roster.purge(cid);
                return;
            }
            if (!e.oldValue) {
                jsxc.gui.roster.add(cid);
                return;
            }

            n = JSON.parse(e.newValue);
            o = JSON.parse(e.oldValue);

            jsxc.gui.update(cid);

            if (o.status !== n.status || o.sub !== n.sub)
                jsxc.gui.roster.reorder(cid);
        }

        if (jsxc.chief && e.key.match(/^jsxc_buddy_/)) {

            if (!e.newValue) {
                jsxc.xmpp.removeBuddy(o.jid);
                return;
            }

            n = JSON.parse(e.newValue);
            o = JSON.parse(e.oldValue);

            if (o.transferReq !== n.transferReq) {
                jsxc.storage.updateItem('buddy_' + cid, 'transferReq', -1);

                if (n.transferReq === 0)
                    jsxc.otr.goPlain(cid);
                if (n.transferReq === 1)
                    jsxc.otr.goEncrypt(cid);
            }

            if (o.name !== n.name) {
                jsxc.gui.roster._rename(cid, n.name);
            }
        }

        //logout
        if (e.key == 'jsxc_sid') {
            if (!e.newValue) {
//                if (jsxc.chief && jsxc.xmpp.conn) {
//                    jsxc.xmpp.conn.disconnect();
//                    jsxc.triggeredFromElement = true;
//                }
                jsxc.xmpp.logout();

            }
            return;
        }

        //react if someone ask, if there is a chief
        if (jsxc.chief && e.key === 'jsxc_alive') {
            jsxc.storage.ink('alive');
            return;
        }

        //chief alive
        if (!jsxc.chief && (e.key == 'jsxc_alive' || e.key == 'jsxc_alive_busy') && !jsxc.triggeredFromElement) {

            //reset timeout
            window.clearTimeout(jsxc.to);
            jsxc.to = window.setTimeout('jsxc.checkChief()', ((e.key == 'jsxc_alive') ? jsxc.options.timeout : jsxc.options.busyTimeout) + jsxc.random(60));

            //only call the first time
            if (!jsxc.role_allocation)
                jsxc.onSidekick();

            return;
        }

        if (e.key === 'jsxc_friendReq') {
            n = JSON.parse(e.newValue);

            if (n === null) {
                jsxc.gui.dialog.close();
            } else if (jsxc.chief && n.approve >= 0) {
                jsxc.xmpp.resFriendReq(n.jid, n.approve);
            } else if (!jsxc.chief && n.approve < 0) {
                jsxc.gui.showApproveDialog(n.jid);
            }
        }

        if (jsxc.chief && e.key.match(/^jsxc_add_/)) {
            n = JSON.parse(e.newValue);

            jsxc.xmpp.addBuddy(n.username, n.alias);
        }
    },
    /**
     * Called if the script is a sidekick
     * @function
     */
    onSidekick: function() {
        jsxc.debug('I am the sidekick.');

        jsxc.role_allocation = true;

        jsxc.restoreRoster();
        jsxc.restoreWindows();
        jsxc.restoreCompleted = true;
    },
    /**
     * Called if the script is the chief
     * @function
     */
    onChief: function() {
        jsxc.debug('I am chief.');

        jsxc.chief = true;

        //Init local storage
        jsxc.storage.setItem('alive', 0);
        jsxc.storage.setItem('alive_busy', 0);
        if (!jsxc.storage.getItem('windowlist'))
            jsxc.storage.setItem('windowlist', new Array());

        //Sending keepalive signal
        jsxc.startKeepAlive();

        //create or load DSA key
        jsxc.otr.createDSA();

        //create otr objects, if we lost the chief
        if (jsxc.role_allocation) {
            $.each(jsxc.storage.getItem('windowlist'), function(index, val) {
                jsxc.otr.create(val);
            });
        }

        jsxc.role_allocation = true;

        if (jsxc.restore && !jsxc.restoreCompleted) {
            jsxc.restoreRoster();
            jsxc.restoreWindows();
            jsxc.restoreCompleted = true;
        }

        jsxc.xmpp.login();
    },
    /**
     * Checks if there is a chief
     * @function
     */
    checkChief: function() {
        jsxc.debug('checkChief');
        jsxc.to = window.setTimeout('jsxc.onChief()', 500);
        jsxc.storage.ink('alive');
    },
    /**
     * Start sending keepalive signal
     */
    startKeepAlive: function() {
        jsxc.keepalive = window.setInterval('jsxc.keepAlive()', jsxc.options.timeout - 1000);
    },
    /**
     * Sends the keepalive signal
     * @function
     */
    keepAlive: function() {
        jsxc.storage.ink('alive');

        if (jsxc.role_allocation)
            jsxc.storage.setItem('lastActivity', (new Date()).getTime());
    },
    /**
     * Send one keepalive signal with higher timeout, and than resume with normal signal
     * @returns {undefined}
     */
    keepBusyAlive: function() {
        if (jsxc.toBusy)
            window.clearTimeout(jsxc.toBusy);
        if (jsxc.keepalive)
            window.clearInterval(jsxc.keepalive);

        jsxc.storage.ink('alive_busy');
        jsxc.toBusy = window.setTimeout('jsxc.startKeepAlive()', jsxc.options.busyTimeout - 1000);
    },
    /** 
     * Generats a random integer number between 0 and max
     * @param {Integer} max
     * @return {Integer} random integer between 0 and max
     */
    random: function(max) {
        return Math.floor(Math.random() * max);
    },
    /**
     * Checks if there is a element with the given selector
     * @param {String} selector jQuery selector
     * @return{Boolean}
     */
    el_exists: function(selector) {
        return $(selector).length > 0;
    },
    /** 
     * Creates a css compatible string from a jid
     * @param {type} jid
     * @returns {String} css compatible string
     */
    jidToCid: function(jid) {
        var cid = Strophe.getBareJidFromJid(jid).replace('@', '-').replace('.', '-');

        jsxc.jids[cid] = jid;

        return cid;
    },
    /**
     * Send message to buddy and display this to the user
     * @param {String} cid
     * @param {String} msg message to be send
     */
    sendMessage: function(cid, msg) {

        if (jsxc.chief)
            jsxc.buddyList[cid].sendMsg(msg);

        jsxc.gui.window.postMessage(cid, 'out', msg);
    },
    /**
     * Restore roster
     */
    restoreRoster: function() {
        var buddies = jsxc.storage.getItem('buddylist');

        if (buddies === null)
            return;

        if (!buddies) {
            jsxc.debug('No saved buddylist.');
            return;
        }

        $.each(buddies, function(index, value) {
            jsxc.gui.roster.add(value);
        });
    },
    /**
     * Restore all windows
     */
    restoreWindows: function() {
        var windows = jsxc.storage.getItem('windowlist');

        if (windows === null)
            return;

        $.each(windows, function(index, cid) {
            var window = jsxc.storage.getItem('window_' + cid);

            if (!window) {
                jsxc.debug('Associated window-element is missing: ' + cid);
                return true;
            }

            jsxc.gui.window.init(cid);

            if (!window.minimize)
                jsxc.gui.window.show(cid);
            else
                jsxc.gui.window.hide(cid);

            jsxc.gui.window.setText(cid, window.text);
        });
    },
    submitLoginForm: function() {
        var form = jsxc.options.loginForm.form.off('submit');

        if (form.find('#submit')) {
            form.find('#submit').click();
        } else {
            form.submit();
        }
    },
    escapeHTML: function(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
    /**
     * executes only one of the given events
     * 
     * @param {string} obj.key eventname
     * @param {function} obj.value function to execute
     * @returns {string} namespace of all events
     */
    switchEvents: function(obj) {
        var ns = Math.random().toString(36).substr(2, 12);
        var self = this;

        $.each(obj, function(key, val) {
            $(document).one(key + '.' + ns, function() {
                $(document).off('.' + ns);

                val.apply(self, arguments);
            })
        });

        return ns;
    },
    isHidden: function() {
        return document.hidden || document.webkitHidden || document.mozHidden || document.msHidden;
    }

};

/**
 * Set some options for the chat
 * @namespace jsxc.options
 */
jsxc.options = {
    timeout: 3000, //Timeout for the keepalive signal
    busyTimeout: 15000, //Timeout for the keepalive signal if the chief is busy

    otr: {//OTR options (see [2])
        debug: true
    },
    xmpp: {//xmpp options (see [1])
        url: null,
        jid: null,
        password: null,
    },
    loginForm: {//If all 3 properties are set, the login form is used
        form: null, //jquery object from form
        jid: null, //jquery object from input element which contains the jid
        pass: null, //jquery object from input element which contains the password
        preJid: function(jid) {
            return jid;
        } //manipulate jid from input element
    },
    logoutElement: null, //jquery object from logout element

    debug: function(msg) {
    }, //Debug function

    checkFlash: true, //If false, the application may crash, if the user didn't install flash

    numberOfMsg: 10, //How many messages should be logged?

    defaultLang: 'en', //Default language
    autoLang: true, //auto language detection

    rosterAppend: 'body', //Place for roster

    notification: true

};

/**
 * Handle functions for chat window's and buddylist
 * @namespace jsxc.gui
 */
jsxc.gui = {
    emotions: [
        [':-) :)', 'smile.png'],
        [':-D :D', 'grin.png'],
        [':-( :(', 'sad.png'],
        [';-) ;)', 'wink.png'],
        [':-P :P', 'tonguesmile.png'],
        ['=-O', 'surprised.png'],
        [':kiss: :-*', 'kiss.png'],
        ['8-) :cool:', 'sunglassess.png'],
        [':\'-(', 'crysad.png'],
        [':-/', 'doubt.png'],
        ['O:-) O:)', 'angel.png'],
        [':-X :X', 'zip.png'],
        ['>:o', 'angry.png'],
        [':yes:', 'thumbsup.png'],
        [':beer:', 'beer.png'],
        [':devil:', 'devil.png'],
        [':kissing:', 'kissing.png'],
        [':love:', 'love.png'],
        [':zzz:', 'tired.png']
    ],
    /**
     * Creates application skeleton
     */
    init: function() {
        $('body').append(
                $(jsxc.gui.template.get('windowList'))
                );

        jsxc.gui.roster.init();

        //prepare regexp for emotions
        $.each(jsxc.gui.emotions, function(i, val) {
            reg = val[0].replace(/(\/|\||\*|\.|\+|\?|\^|\$|\(|\)|\[|\]|\{|\})/g, '\\$1');
            reg = '\(' + reg.split(' ').join('\)\|\(') + '\)';
            jsxc.gui.emotions[i][2] = new RegExp(reg, 'g');
        });

        //We need this often, so we creates some template jquery objects
        jsxc.gui.windowTemplate = $(jsxc.gui.template.get('chatWindow'));
        jsxc.gui.buddyTemplate = $(jsxc.gui.template.get('rosterBuddy'));
    },
    /** 
     * Updates Information in roster and chatbar
     * @param {String} cid CSS compatible jid
     */
    update: function(cid) {
        var data = jsxc.storage.getItem('buddy_' + cid);

        if (!data) {
            jsxc.debug('No data for ' + cid);
            return;
        }

        var ri = $('#' + cid);                        //roster item from user
        var we = jsxc.gui.getWindow(cid);           //window element from user
        var ue = $('#' + cid + ', #jsxc_window_' + cid);  //both

        //Attach data to corresponding roster item
        ri.data(data);

        //Add online status
        ue.removeClass('jsxc_' + jsxc.status.join(' jsxc_'))
                .addClass('jsxc_' + jsxc.status[data.status]);

        //Change name and add title
        ue.find('.jsxc_name').text(data.name)
                .attr('title', 'is ' + jsxc.status[data.status]);

        //Update gui according to encryption state
        switch (data.msgstate) {
            case 0:
                we.find('.jsxc_transfer').removeClass('jsxc_enc jsxc_fin')
                        .attr('title', jsxc.l.your_connection_is_unencrypted);
                we.find('.jsxc_settings .jsxc_verification').addClass('jsxc_disabled');
                we.find('.jsxc_settings .jsxc_transfer').text(jsxc.l.start_private);
                break;
            case 1:
                we.find('.jsxc_transfer').addClass('jsxc_enc')
                        .attr('title', jsxc.l.your_connection_is_encrypted);
                we.find('.jsxc_settings .jsxc_verification').removeClass('jsxc_disabled');
                we.find('.jsxc_settings .jsxc_transfer').text(jsxc.l.close_private);
                break;
            case 2:
                we.find('.jsxc_settings .jsxc_verification').addClass('jsxc_disabled');
                we.find('.jsxc_transfer').removeClass('jsxc_enc')
                        .addClass('jsxc_fin')
                        .attr('title', jsxc.l.your_buddy_closed_the_private_connection);
                we.find('.jsxc_settings .jsxc_transfer').text(jsxc.l.close_private);
                break;
        }

        //update gui according to verification state
        if (data.trust) {
            we.find('.jsxc_transfer').addClass('jsxc_trust')
                    .attr('title', jsxc.l.your_buddy_is_verificated);
        }

        //update gui according to subscription state
        if (data.sub && data.sub !== 'both') {
            ri.addClass('jsxc_oneway').find('.jsxc_name').attr('title', jsxc.l.you_have_only_a_subscription_in_one_way);
        } else {
            ri.removeClass('jsxc_oneway');
        }
    },
    /**
     * Returns the window element
     * @param {String} cid
     * @returns {jquery}
     */
    getWindow: function(cid) {
        return $('#jsxc_window_' + cid);
    },
    /**
     * Creates and show loginbox
     */
    showLoginBox: function() {
        jsxc.gui.dialog.open(jsxc.gui.template.get('loginBox'));

        $('#jsxc_dialog').find('form').submit(function() {

            jsxc.gui.dialog.close();
            jsxc.gui.showWaitAlert(jsxc.l.please_wait_until_we_logged_you_in);

            $(this).find('input[type=submit]').prop('disabled', true);

            jsxc.options.xmpp.jid = $(this).find('#jsxc_username').val();
            jsxc.options.xmpp.password = $(this).find('#jsxc_password').val();

            jsxc.triggeredFromBox = true;
            jsxc.options.loginForm.form = $(this);

            jsxc.xmpp.login();

            return false;
        });
    },
    /**
     * Creates and show the fingerprint dialog
     * @param {String} cid
     */
    showFingerprints: function(cid) {

        jsxc.gui.dialog.open(jsxc.gui.template.get('fingerprintsDialog', cid));
    },
    /**
     * Creates and show the verification dialog
     * @param {String} cid
     */
    showVerification: function(cid) {

        //verification only possible if the connection is encrypted
        if (jsxc.storage.getItem('buddy_' + cid).msgstate !== 1) {
            jsxc.debug('Connection not encrypted');
            return;
        }

        jsxc.gui.dialog.open(jsxc.gui.template.get('authenticationDialog', cid), {'noClose': true});

        //Add handler

        $('#jsxc_facebox > div:gt(0)').hide();
        $('#jsxc_facebox select').change(function(ev) {
            $('#jsxc_facebox > div:gt(0)').hide();
            $('#jsxc_facebox > div:eq(' + $(this).prop('selectedIndex') + ')').slideDown();
        });

        //Manual
        $('#jsxc_facebox > div:eq(1) a.creation').click(function() {
            if (jsxc.chief)
                jsxc.buddyList[cid].trust = true;

            jsxc.storage.updateItem('buddy_' + cid, 'trust', true);

            jsxc.gui.dialog.close();

            jsxc.storage.updateItem('buddy_' + cid, 'trust', true)
            jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.conversation_is_now_verified);
            jsxc.gui.update(cid);
        });

        //Question
        $('#jsxc_facebox > div:eq(2) a.creation').click(function() {
            var div = $('#jsxc_facebox > div:eq(2)');
            var sec = div.find('#jsxc_secret2').val();
            var quest = div.find('#jsxc_quest').val();

            if (sec === '' || quest === '') {
                //Add information for the user which form is missing
                div.find('input[value=""]').addClass('jsxc_invalid').keyup(function() {
                    if ($(this).val().match(/.*/))
                        $(this).removeClass('jsxc_invalid');
                });
                return;
            }

            if (jsxc.chief)
                jsxc.otr.sendSmpReq(cid, sec, quest);
            else
                jsxc.storage.setItem('smp_' + cid, {sec: sec, quest: quest});

            jsxc.gui.dialog.close();

            jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.verification_query_sent);
        });

        //Secret
        $('#jsxc_facebox > div:eq(3) .creation').click(function() {
            var div = $('#jsxc_facebox > div:eq(3)');
            var sec = div.find('#jsxc_secret').val();

            if (sec === '') {
                //Add information for the user which form is missing
                div.find('#jsxc_secret').addClass('jsxc_invalid').keyup(function() {
                    if ($(this).val().match(/.*/))
                        $(this).removeClass('jsxc_invalid');
                });
                return;
            }

            if (jsxc.chief)
                jsxc.otr.sendSmpReq(cid, sec);
            else
                jsxc.storage.setItem('smp alert();_' + cid, {sec: sec, quest: null});

            jsxc.gui.dialog.close();

            jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.verification_query_sent);
        });
    },
    /**
     * Create and show approve dialog
     * @param {type} from valid jid
     */
    showApproveDialog: function(from) {
        jsxc.gui.dialog.open(jsxc.gui.template.get('approveDialog'), {'noClose': true});

        $('#jsxc_dialog .jsxc_their_jid').text(Strophe.getBareJidFromJid(from));

        $('#jsxc_dialog .jsxc_deny').click(function() {
            jsxc.xmpp.resFriendReq(from, false);
        });

        $('#jsxc_dialog .jsxc_approve').click(function() {
            var data = jsxc.storage.getItem('buddy_' + jsxc.jidToCid(from));

            jsxc.xmpp.resFriendReq(from, true);

            //If friendship is not mutual show contact dialog
            if (!data || data.sub === 'from')
                //@TODO: replace with gui.dialog
                $(document).one('afterClose.facebox', function() {
                    jsxc.gui.showContactDialog(from);
                });
        });
    },
    /**
     * Create and show dialog to add a buddy
     * @param {type} [username]
     */
    showContactDialog: function(username) {
        jsxc.gui.dialog.open(jsxc.gui.template.get('contactDialog'));

        //If we got a friendship request, we would display the username in our response
        if (username)
            $('#jsxc_username').val(username);

        $('#jsxc_dialog .creation').click(function() {
            var username = $('#jsxc_username').val();
            var alias = $('#jsxc_alias').val();

            //Check if the username is valid
            if (!username || !username.match(/^[\w-_.]+@[\w-_.]+$/g)) {
                //Add notification
                $('#jsxc_username').addClass('jsxc_invalid').keyup(function() {
                    if ($(this).val().match(/^[\w-_.]+@[\w-_.]+$/g))
                        $(this).removeClass('jsxc_invalid');
                });
                return false;
            }
            jsxc.xmpp.addBuddy(username, alias);

            jsxc.gui.dialog.close();
        });
    },
    /**
     * Create and show dialog to remove a buddy
     * @param {type} cid
     * @returns {undefined}
     */
    showRemoveDialog: function(cid) {

        jsxc.gui.dialog.open(jsxc.gui.template.get('removeDialog', cid));

        var data = jsxc.storage.getItem('buddy_' + cid);

        $('#jsxc_dialog .creation').click(function() {
            if (jsxc.chief)
                jsxc.xmpp.removeBuddy(data.jid);
            else
                jsxc.gui.roster.purge(cid);

            jsxc.storage.removeItem('buddy_' + cid);

            jsxc.gui.dialog.close();
        });
    },
    /**
     * Create and show a wait dialog
     * @param {type} msg message to display to the user
     * @returns {undefined}
     */
    showWaitAlert: function(msg) {
        jsxc.gui.dialog.open(jsxc.gui.template.get('waitAlert', null, msg), {
            'noClose': true
        });
    },
    /**
     * Create and show a wait dialog
     * @param {type} msg message to display to the user
     * @returns {undefined}
     */
    showAlert: function(msg) {
        jsxc.gui.dialog.open(jsxc.gui.template.get('alert', null, msg));
    },
    /**
     * Create and show a auth fail dialog
     * @returns {undefined}
     */
    showAuthFail: function() {
        jsxc.gui.dialog.open(jsxc.gui.template.get('authFailDialog'));

        $('#jsxc_dialog .creation').click(function() {
            jsxc.gui.dialog.close();
        });

        $('#jsxc_dialog .jsxc_cancel').click(function() {
            jsxc.submitLoginForm();
        });
    },
    /**
     * Create and show a confirm dialog
     * @param {String} msg Message
     * @param {function} confirm 
     * @param {function} dismiss
     * @returns {undefined}
     */
    showConfirmDialog: function(msg, confirm, dismiss) {
        jsxc.gui.dialog.open(jsxc.gui.template.get('confirmDialog', null, msg));

        if (confirm)
            $('#jsxc_dialog .creation').click(confirm);

        if (dismiss)
            $('#jsxc_dialog .jsxc_cancel').click(dismiss);
    }
};

/**
 * Handle functions related to the gui of the roster
 * @namespace jsxc.gui.roster
 */
jsxc.gui.roster = {
    /**
     * Init the roster skeleton
     * @returns {undefined}
     */
    init: function() {
        $(jsxc.options.rosterAppend + ':first').append(
                $(jsxc.gui.template.get('roster'))
                );

        $('#jsxc_roster .jsxc_addBuddy').click(function() {
            jsxc.gui.showContactDialog();
        });

        $('#jsxc_roster ul').slimScroll({
            distance: '3px',
            height: ($('#jsxc_roster').height() - 70) + 'px',
            width: $('#jsxc_roster ul').width() + 'px',
            color: '#fff',
            opacity: '0.5'
        });

        $(document).trigger('ready.roster.jsxc');
    },
    /**
     * Create roster item and add it to the roster
     * @param {String} cid CSS compatible jid
     */
    add: function(cid) {
        var bud = jsxc.gui.buddyTemplate.clone().attr('id', cid);

        jsxc.gui.roster.insert(cid, bud);

        bud.click(function() {
            jsxc.gui.window.open(cid);
        });

        bud.find('.jsxc_rename').click(function() {
            jsxc.gui.roster.rename(cid);
            return false;
        });

        bud.find('.jsxc_delete').click(function() {
            jsxc.gui.showRemoveDialog(cid);
            return false;
        });

        jsxc.gui.update(cid);

        //update scrollbar
        $('#jsxc_roster ul').slimScroll({
            scrollTo: '0px'
        });
    },
    /**
     * Insert roster item. First order: online > away > offline. Second order: alphabetical of the name
     * @param {type} cid
     * @param {jquery} li roster item which should be insert
     * @returns {undefined}
     */
    insert: function(cid, li) {

        var data = jsxc.storage.getItem('buddy_' + cid);
        var listElements = $('#jsxc_roster ul > li');
        var insert = false;

        //Insert buddy with no mutual friendship to the end
        var status = (data.sub === 'both') ? data.status : -1;

        listElements.each(function() {

            thisStatus = ($(this).data('sub') === 'both') ? $(this).data('status') : -1;

            if (($(this).data('name').toLowerCase() > data.name.toLowerCase() && thisStatus === status) ||
                    thisStatus < status) {

                $(this).before(li);
                insert = true;

                return false;
            }
        });

        if (!insert)
            li.appendTo('#jsxc_roster ul');
    },
    /**
     * Initiate reorder of roster item
     * @param {type} cid
     * @returns {undefined}
     */
    reorder: function(cid) {
        jsxc.gui.roster.insert(cid, jsxc.gui.roster.remove(cid));
    },
    /**
     * Removes buddy from roster
     * @param {String} cid CSS compatible jid
     * @return {JQueryObject} Roster list element
     */
    remove: function(cid) {
        return $('#' + cid).detach();
    },
    /**
     * Removes buddy from roster and clean up
     * @param {String} cid CSS compatible jid
     */
    purge: function(cid) {
        if (jsxc.chief) {
            jsxc.storage.removeItem('buddy_' + cid);
            jsxc.storage.removeItem('otr_' + cid);
            jsxc.storage.removeItem('otr_version_' + cid);
            jsxc.storage.removeItem('chat_' + cid);
            jsxc.storage.removeItem('window_' + cid);
            jsxc.storage.removeElement('buddylist', cid);
            jsxc.storage.removeElement('windowlist', cid);
        }

        jsxc.gui.window._close(cid);
        jsxc.gui.roster.remove(cid);
    },
    /**
     * Create input element for rename action
     * @param {type} cid
     * @returns {undefined}
     */
    rename: function(cid) {
        var name = $('#' + cid + ' .jsxc_name');
        var input = $('<input type="text" name="name"/>');

        name = name.replaceWith(input);

        input.val(name.text());
        input.keypress(function(ev) {
            if (ev.which !== 13)
                return;

            input.replaceWith(name);
            jsxc.gui.roster._rename(cid, $(this).val());

            $(document).off('click');
        });

        //Disable html click event, if click on input
        input.click(function() {
            return false;
        });

        $('html').one('click', function() {
            input.replaceWith(name);
            jsxc.gui.roster._rename(cid, input.val());
        });
    },
    /**
     * Rename buddy
     * @param {type} cid
     * @param {type} newname new name of buddy
     * @returns {undefined}
     */
    _rename: function(cid, newname) {
        if (jsxc.chief) {
            var d = jsxc.storage.getItem('buddy_' + cid);
            var iq = $iq({type: 'set'}).c('query', {xmlns: 'jabber:iq:roster'}).c('item', {jid: d.jid, name: newname});
            jsxc.xmpp.conn.sendIQ(iq);
        }

        jsxc.storage.updateItem('buddy_' + cid, 'name', newname);
        jsxc.gui.update(cid);
    }

};

jsxc.gui.dialog = {
    open: function(data, o) {

        var options = {
            onComplete: function() {
                $(document).trigger('complete.dialog.jsxc');
            },
            onClosed: function() {
                $(document).trigger('close.dialog.jsxc');
            },
            onCleanup: function() {
                $(document).trigger('cleanup.dialog.jsxc');
            }
        };
        var opt = o || {};

        if (opt.noClose) {
            options.modal = true;
            delete opt.noClose;
        }

        $.extend(options, opt);

        $.fancybox('<div id="jsxc_dialog">' + data + '</div>', options);

        return $('#jsxc_dialog');
    },
    close: function() {
        jsxc.debug('close dialog');
        $.fancybox.close();
    }
};

/**
 * Handle functions related to the gui of the window
 * @namespace jsxc.gui.window
 */
jsxc.gui.window = {
    /**
     * Init a window skeleton
     * @param {String} cid
     * @returns {undefined}
     */
    init: function(cid) {
        if (jsxc.el_exists('#jsxc_window_' + cid))
            return jsxc.gui.getWindow(cid);

        var win = jsxc.gui.windowTemplate.clone().attr('id', 'jsxc_window_' + cid).hide().appendTo('#jsxc_windowList > ul').show('slow');
        var data = jsxc.storage.getItem('buddy_' + cid);

        //Attach jid to window
        win.data('jid', data.jid);

        //Add handler

        win.find('.jsxc_settings').click(function() {
            $(this).find('ul').slideToggle();
            window.clearTimeout($(this).find('ul').data('timer'));
        }).mouseleave(function() {
            var ul = $(this).find('ul');
            ul.data('timer', window.setTimeout(function() {
                ul.slideUp();
            }, 2000));
        }).mouseenter(function() {
            window.clearTimeout($(this).find('ul').data('timer'));
        });

        win.find('.jsxc_verification').click(function() {
            jsxc.gui.showVerification(cid);
        });

        win.find('.jsxc_fingerprints').click(function() {
            jsxc.gui.showFingerprints(cid);
        });

        win.find('.jsxc_transfer').click(function(ev) {
            jsxc.otr.toggleTransfer(cid);
        });

        win.find('.jsxc_bar').click(function(ev) {
            jsxc.gui.window.toggle(cid);
        });

        win.find('.jsxc_close').click(function(ev) {
            jsxc.gui.window.close(cid);
        });

        win.find('.jsxc_clear').click(function(ev) {
            jsxc.gui.window.clear(cid);
        });

        win.find('.jsxc_textinput').keyup(function(ev) {
            var body = $(this).val();

            if (ev.which === 13)
                body = '';

            jsxc.storage.updateItem('window_' + cid, 'text', body);
        });

        win.find('.jsxc_textinput').keypress(function(ev) {
            if (ev.which !== 13 || !$(this).val())
                return;

            jsxc.sendMessage(cid, $(this).val());

            $(this).val('');
        });

        win.find('.jsxc_textarea').slimScroll({
            height: '200px',
            distance: '3px'
        });

        win.find('.jsxc_window').hide();

        win.find('.jsxc_name').disableSelection();

        if ($.inArray(cid, jsxc.storage.getItem('windowlist')) < 0) {

            //add window to windowlist
            var wl = jsxc.storage.getItem('windowlist');
            wl.push(cid);
            jsxc.storage.setItem('windowlist', wl);

            //init window element in storage
            jsxc.storage.setItem('window_' + cid, {minimize: true, text: ''});
        }

        jsxc.gui.window.restoreChat(cid);

        jsxc.gui.update(cid);

        //create related otr object
        if (jsxc.chief && !jsxc.buddyList[cid])
            jsxc.otr.create(cid);

        $(document).trigger('init.window.jsxc', [win]);

        return win;
    },
    /**
     * Open a window, related to the cid. If the window doesn't exist, it will be created.
     * @param {String} cid
     * @returns {unresolved}
     */
    open: function(cid) {
        var win = jsxc.gui.window.init(cid);
        jsxc.gui.window.show(cid);
        jsxc.gui.window.highlight(cid);

        win.find('.jsxc_textinput').focus();

        return win;
    },
    /**
     * Close chatwindow and clean up
     * @param {String} cid CSS compatible jid
     */
    close: function(cid) {

        if (!jsxc.el_exists('#jsxc_window_' + cid)) {
            jsxc.debug('[Warning] Want to close a window, that is not open.');
            return;
        }

        jsxc.storage.removeElement('windowlist', cid);
        jsxc.storage.removeItem('window_' + cid);

        jsxc.gui.window._close(cid);
    },
    /**
     * Close chatwindow
     * @param {String} cid
     * @returns {undefined}
     */
    _close: function(cid) {
        $('#jsxc_window_' + cid).hide('slow', function() {
            $(this).remove();
        });
    },
    /**
     * Toggle between minimize and maximize of the text area
     * @param {String} cid CSS compatible jid
     */
    toggle: function(cid) {

        if (jsxc.gui.getWindow(cid).find('.jsxc_window').is(':hidden'))
            jsxc.gui.window.show(cid);
        else
            jsxc.gui.window.hide(cid);
    },
    /**
     * Maximize text area and save
     * @param {String} cid
     * @returns {undefined}
     */
    show: function(cid) {

        jsxc.storage.updateItem('window_' + cid, 'minimize', false);

        jsxc.gui.window._show(cid);
    },
    /**
     * Maximize text area
     * @param {String} cid
     * @returns {undefined}
     */
    _show: function(cid) {
        $('#jsxc_window_' + cid + ' .jsxc_window').slideDown();

        //remove unread flag
        jsxc.gui.getWindow(cid).removeClass('jsxc_unreadMsg');

        //If the area is hidden, the scrolldown function doesn't work. So we call it here.
        jsxc.gui.window.scrollDown(cid);
    },
    /**
     * Minimize text area and save
     * @param {String} cid
     * @returns {undefined}
     */
    hide: function(cid) {
        jsxc.storage.updateItem('window_' + cid, 'minimize', true);

        jsxc.gui.window._hide(cid);
    },
    /**
     * Minimize text area
     * @param {String} cid
     * @returns {undefined}
     */
    _hide: function(cid) {
        $('#jsxc_window_' + cid + ' .jsxc_window').slideUp();
    },
    /**
     * Highlight window
     * @param {type} cid
     * @returns {undefined}
     */
    highlight: function(cid) {
        $('#jsxc_window_' + cid + ' ').effect('highlight', {color: 'orange'}, 2000);
    },
    /**
     * Scroll chat area to the bottom
     * @param {String} cid CSS compatible jid
     */
    scrollDown: function(cid) {
        var chat = $('#jsxc_window_' + cid + ' .jsxc_textarea');

        //check if chat exist
        if (chat.length === 0)
            return;

        chat.slimScroll({
            scrollTo: (chat.get(0).scrollHeight + 'px')
        });
    },
    /**
     * Write Message to chat area and save
     * @param {String} cid CSS compatible jid
     * @param {String} direction 'in' message is received or 'out' message is send
     * @param {String} msg Message to display
     */
    postMessage: function(cid, direction, msg) {
        var chat = jsxc.storage.getItem('chat_' + cid) || [];
        var data = jsxc.storage.getItem('buddy_' + cid);

        if (chat.length > jsxc.options.numberOfMsg)
            chat.pop();

        //escape html
        msg = jsxc.escapeHTML(msg);

        //exceptions:

        if (direction === 'out' && data.msgstate === 2) {
            direction = 'sys';
            msg = jsxc.l.your_message_wasnt_send_please_end_your_private_conversation;
        }

        if (direction === 'in' && data.msgstate === 2) {
            direction = 'sys';
            msg = jsxc.l.unencrypted_message_received + ' ' + msg;
        }

        if (direction === 'out' && data.sub === 'from') {
            direction = 'sys';
            msg = jsxc.l.your_message_wasnt_send_because_you_have_no_valid_subscription;
        }

        chat.unshift({direction: direction, msg: msg});
        jsxc.storage.setItem('chat_' + cid, chat);

        if (direction === 'in')
            $(document).trigger('postmessagein.jsxc', [jsxc.jids[cid], msg]);

        jsxc.gui.window._postMessage(cid, direction, msg);
    },
    /**
     * Write Message to chat area
     * @param {String} cid CSS compatible jid
     * @param {String} direction 'in' message is received or 'out' message is send
     * @param {String} msg Message to display
     * @param {Bool} restore If true no highlights are used and so unread flag set
     */
    _postMessage: function(cid, direction, msg, restore) {
        var win = jsxc.gui.getWindow(cid);

        if (win.find('.jsxc_textinput').is(':not(:focus)') && jsxc.restoreCompleted && direction === 'in' && !restore)
            jsxc.gui.window.highlight(cid);

        $.each(jsxc.gui.emotions, function(i, val) {
            msg = msg.replace(val[2], '<img alt="$1" title="$1" src="/owncloud/apps/ojsxc/img/emotions/' + val[1] + '"/>')
        });

        $('#jsxc_window_' + cid + ' .jsxc_textarea').append(
                "<div class='jsxc_chatmessage jsxc_" + direction + "'>" + msg + "</div>"
                );

        jsxc.gui.window.scrollDown(cid);

        //if window is hidden set unread flag
        if (win.find('.jsxc_window').is(':hidden') && jsxc.restoreCompleted && !restore)
            win.addClass('jsxc_unreadMsg');
    },
    /**
     * Set text into input area
     * @param {type} cid
     * @param {type} text
     * @returns {undefined}
     */
    setText: function(cid, text) {
        $('#jsxc_window_' + cid + ' .jsxc_textinput').val(text);
    },
    /**
     * Load old log into chat area
     * @param {type} cid
     * @returns {undefined}
     */
    restoreChat: function(cid) {
        var chat = jsxc.storage.getItem('chat_' + cid);

        while (chat !== null && chat.length > 0) {
            c = chat.pop();
            jsxc.gui.window._postMessage(cid, c.direction, c.msg, true);
        }
    },
    /**
     * Clear chat history
     * @param {type} cid
     * @returns {undefined}
     */
    clear: function(cid) {
        jsxc.storage.setItem('chat_' + cid, []);
        $('#jsxc_window_' + cid + ' .jsxc_textarea').empty();
    }
};

/**
 * 
 * @namespace jsxc.gui.template
 */
jsxc.gui.template = {
    /**
     * Return requested template and replace all placeholder
     * @param {type} name template name
     * @param {type} cid
     * @param {type} msg
     * @returns {String}
     */
    get: function(name, cid, msg) {

        //common placeholder
        var ph = {
            my_priv_fingerprint: jsxc.storage.getItem('priv_fingerprint') ? jsxc.storage.getItem('priv_fingerprint').replace(/(.{8})/g, '$1 ') : jsxc.l.no_available,
            my_jid: jsxc.storage.getItem('jid')
        };

        //placeholder depending on cid
        if (cid) {
            var data = jsxc.storage.getItem('buddy_' + cid);

            $.extend(ph, {
                cid_priv_fingerprint: data.fingerprint ? data.fingerprint.replace(/(.{8})/g, '$1 ') : jsxc.l.no_available,
                cid_jid: data.jid,
                cid_name: data.name
            });
        }

        //placeholder depending on msg
        if (msg) {
            $.extend(ph, {
                msg: msg
            });
        }

        var ret = jsxc.gui.template[name];

        if (typeof(ret) === 'string') {
            ret = ret.replace(/%%([a-zA-Z0-9_-}{]+)%%/g, function(s, key) {
                return jsxc.l[key] || key.replace(/_/gi, ' ');
            });
            ret = ret.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, function(s, key) {
                return ph[key] || s;
            });
            return ret;
        } else {
            jsxc.debug('Template not available: ' + name);
            return name;
        }
    },
    authenticationDialog:
            '<div id="jsxc_facebox">\n\
            <h3>Verification</h3>\n\
            <p>%%Authenticating_a_buddy_helps_%%</p>\n\
            <div>\n\
              <p style="margin:0px;">%%How_do_you_want_to_authenticate_your_buddy%%</p>\n\
              <select size="1">\n\
                <option>%%Select_method%%</option>\n\
                <option>%%Manual%%</option>\n\
                <option>%%Question%%</option>\n\
                <option>%%Secret%%</option>\n\
              </select>\n\
            </div>\n\
            <div>\n\
              <p class=".jsxc_explanation">%%To_verify_the_fingerprint_%%</p>\n\
              <p><strong>%%Your_fingerprint%%</strong><br />\n\
              <span style="text-transform:uppercase">{{my_priv_fingerprint}}</span></p>\n\
              <p><strong>%%Buddy_fingerprint%%</strong><br />\n\
              <span style="text-transform:uppercase">{{cid_priv_fingerprint}}</span></p><br />\n\
              <p class="jsxc_right"><a href="#" onclick="jsxc.gui.dialog.close()">%%Close%%</a> <a href="#" class="button creation">%%Compared%%</a></p>\n\
            </div>\n\
            <div>\n\
              <p class=".jsxc_explanation">%%To_authenticate_using_a_question_%%</p>\n\
              <p><label for="jsxc_quest">%%Question%%:</label><input type="text" name="quest" id="jsxc_quest" /></p>\n\
              <p><label for="jsxc_secret2">%%Secret%%:</label><input type="text" name="secret2" id="jsxc_secret2" /></p>\n\
              <p class="jsxc_right"><a href="#" class="button" onclick="jsxc.gui.dialog.close()">%%Close%%</a> <a href="#" class="button creation">%%Ask%%</a></p>\n\
            </div>\n\
            <div>\n\
              <p class=".jsxc_explanation">%%To_authenticate_pick_a_secret_%%</p>\n\
              <p><label for="jsxc_secret">%%Secret%%:</label><input type="text" name="secret" id="jsxc_secret" /></p>\n\
              <p class="jsxc_right"><a href="#" class="button" onclick="jsxc.gui.dialog.close()">%%Close%%</a> <a href="#" class="button creation">%%Compare%%</a></p>\n\
            </div>\n\
        </div>',
    fingerprintsDialog:
            '<div>\n\
          <p><strong>%%Your_fingerprint%%</strong><br />\n\
          <span style="text-transform:uppercase">{{my_priv_fingerprint}}</span></p>\n\
          <p><strong>%%Buddy_fingerprint%%</strong><br />\n\
          <span style="text-transform:uppercase">{{cid_priv_fingerprint}}</span></p><br />\n\
          <p class="jsxc_right"><a href="#" class="button" onclick="jsxc.gui.dialog.close()">%%Close%%</a></p>\n\
        </div>',
    chatWindow:
            '<li>\n\
            <div class="jsxc_bar">\n\
                <div class="jsxc_name"/>\n\
                <div class="jsxc_cycle"/>\n\
            </div>\n\
            <div class="jsxc_window">\n\
                <div class="jsxc_tools">\n\
                    <div class="jsxc_settings">\n\
                        <ul>\n\
                            <li class="jsxc_fingerprints">%%Fingerprints%%</li>\n\
                            <li class="jsxc_verification">%%Authentifikation%%</li>\n\
                            <li class="jsxc_transfer">%%start_private%%</li>\n\
                            <li class="jsxc_clear">%%clear_history%%</li>\n\
                        </ul>\n\
                    </div>\n\
                    <div class="jsxc_transfer"/>\n\
                    <span class="jsxc_close">X</span>\n\
                </div>\n\
                <div class="jsxc_textarea"/>\n\
                <input type="text" class="jsxc_textinput jsxc_chatmessage jsxc_out" placeholder="...%%Message%%"/>\n\
            </div>\n\
        </li>',
    roster:
            '<div id="jsxc_roster">\n\
            <ul></ul>\n\
            <div class="jsxc_addBuddy">+ %%Add_buddy%%</div>\n\
        </div>',
    windowList:
            '<div id="jsxc_windowList">\n\
            <ul></ul>\n\
        </div>',
    rosterBuddy:
            '<li>\n\
            <div class="jsxc_name"/>\n\
            <div class="jsxc_options">\n\
                <div class="jsxc_rename" title="%%rename_buddy%%"></div>\n\
                <div class="jsxc_delete" title="%%delete_buddy%%">X</div>\n\
            </div>\n\
        </li>',
    loginBox:
            '<h3>%%Login%%</h3>\n\
        <form method="get">\n\
            <p><label for="jsxc_username">%%Username%%:</label>\n\
               <input type="text" name="username" id="jsxc_username" required="required" value="{{my_jid}}"/></p>\n\
            <p><label for="jsxc_password">%%Password%%:</label>\n\
               <input type="password" name="password" required="required" id="jsxc_password" /></p>\n\
            <div class="bottom_submit_section">\n\
                <input type="reset" class="button" name="clear" onclick="jsxc.gui.dialog.close()" value="%%Cancel%%"/>\n\
                <input type="submit" class="button creation" name="commit" value="%%Connect%%"/>\n\
            </div>\n\
        </form>',
    contactDialog:
            '<h3>%%Add_buddy%%</h3>\n\
         <p class=".jsxc_explanation">%%Type_in_the_full_username_%%</p>\n\
         <p><label for="jsxc_username">%%Username%%:</label>\n\
            <input type="text" name="username" id="jsxc_username" required="required" /></p>\n\
         <p><label for="jsxc_alias">%%Alias%%:</label>\n\
            <input type="text" name="alias" id="jsxc_alias" /></p>\n\
         <p class="jsxc_right">\n\
            <a href="#" class="button" onclick="jsxc.gui.dialog.close()">%%Close%%</a> <a href="#" class="button creation">%%Add%%</a>\n\
         </p>',
    approveDialog:
            '<h3>%%Subscription_request%%</h3>\n\
        <p>%%You_have_a_request_from%% <b class="jsxc_their_jid"></b>.</p>\n\
        <p class="jsxc_right"><a href="#" class="button jsxc_deny">%%Deny%%</a> <a href="#" class="button creation jsxc_approve">%%Approve%%</a></p>',
    removeDialog:
            '<h3>Remove Buddy</h3>\n\
        <p>%%You_are_about_to_remove_%%</p>\n\
        <p class="jsxc_right"><a href="#" class="button jsxc_cancel" onclick="jsxc.gui.dialog.close()">%%Cancel%%</a> <a href="#" class="button creation">%%Continue%%</a></p>',
    waitAlert:
            '<h3>%%Please_wait%%</h3>\n\
        <p>{{msg}}</p>\n\
        <p class="jsxc_center"><img src="/owncloud/apps/ojsxc/img/loading.gif" alt="wait" /></p>',
    alert:
            '<h3>%%Alert%%</h3>\n\
        <p>{{msg}}</p>\n\
        <p class="jsxc_right"><a href="#" class="button jsxc_cancel" onclick="jsxc.gui.dialog.close()">%%Ok%%</a></p>',
    authFailDialog:
            '<h3>%%Login_failed%%</h3>\n\
        <p>%%Sorry_we_cant_authentikate_%%</p>\n\
        <p class="jsxc_right">\n\
            <button class="button jsxc_cancel" onclick="jsxc.gui.dialog.close()">%%Continue%%</button>\n\
            <button class="button creation">%%Retry%%</button>\n\
        </p>',
    confirmDialog:
            '<p>{{msg}}</p>\n\
        <p class="jsxc_right">\n\
            <button class="button jsxc_cancel" onclick="jsxc.gui.dialog.close()">%%Dismiss%%</button>\n\
            <button class="button creation" onclick="jsxc.gui.dialog.close()">%%Confirm%%</button>\n\
        </p>'
};

/**
 * 
 * @namespace jsxc.xmpp
 */
jsxc.xmpp = {
    conn: null, //connection

    /**
     * Create new connection or attach to old
     * @returns {undefined}
     */
    login: function() {

        var sid = jsxc.storage.getItem('sid');
        var rid = jsxc.storage.getItem('rid');
        var jid = jsxc.storage.getItem('jid');
        var url = jsxc.options.xmpp.url || jsxc.storage.getItem('boshUrl');



        //Register eventlistener
        $(document).bind('connected', jsxc.xmpp.connected);
        $(document).bind('attached', jsxc.xmpp.attached);
        $(document).bind('disconnected', jsxc.xmpp.disconnected);
        $(document).on('ridChange', jsxc.xmpp.onRidChange);

        //Create new connection (no login)
        jsxc.xmpp.conn = new Strophe.Connection(url);

        jsxc.xmpp.conn.xmlInput = function(data) {
            jsxc.debug('Input');
            jsxc.debug(data);
            //Log.show_traffic(data, 'input');
        };
        jsxc.xmpp.conn.xmlOutput = function(data) {
            jsxc.debug('Output');
            jsxc.debug(data);
            //Log.show_traffic(data, 'output');
        };

        var callback = function(status, condition) {

            jsxc.debug(Object.getOwnPropertyNames(Strophe.Status)[status] + ': ' + condition);

            switch (status) {
                case Strophe.Status.CONNECTED:
                    $(document).trigger('connected');
                    break;
                case Strophe.Status.ATTACHED:
                    $(document).trigger('attached');
                    break;
                case Strophe.Status.DISCONNECTED:
                    $(document).trigger('disconnected');
                    break;
                case Strophe.Status.CONNFAIL:
                    jsxc.xmpp.onConnfail(condition);
                    break;
                case Strophe.Status.AUTHFAIL:
                    jsxc.gui.showAuthFail();
                    break;
            }
        };

        if (jsxc.restore && sid && rid) {
            jsxc.debug('Try to attach');
            jsxc.debug('SID: ' + sid);
            jsxc.xmpp.conn.attach(jid, sid, rid, callback);
        } else {
            jsxc.debug('New connection');

            jsxc.xmpp.conn.connect(jsxc.options.xmpp.jid, jsxc.options.xmpp.password, callback);
        }
    },
    logout: function() {

        //instruct all tabs
        jsxc.storage.removeItem('sid');

        if (!jsxc.chief) {
            $('#jsxc_roster').remove();
            $('#jsxc_windowlist').remove();
            return true;
        }

        if (jsxc.xmpp.conn === null)
            return true;

        //Hide dropdown menu
        $('body').click();

        jsxc.triggeredFromElement = true;

        jsxc.xmpp.conn.disconnect();

        //Trigger real logout in jsxc.xmpp.disconnected()
        return false;
    },
    /**
     * Triggered if connection is established
     */
    connected: function() {
        //Save sid and jid
        jsxc.storage.setItem('sid', jsxc.xmpp.conn.sid);
        jsxc.storage.setItem('jid', jsxc.xmpp.conn.jid);
        jsxc.debug('SID: ' + jsxc.xmpp.conn.sid);

        jsxc.storage.setItem('lastActivity', (new Date()).getTime());

        //make shure roster will be reloaded
        jsxc.storage.removeItem('buddylist');

        //submit login form
        if (jsxc.triggeredFromForm) {
            //Trigger normal submit
            jsxc.submitLoginForm();
            return;
        }

        //reload page after login from login box
        if (jsxc.triggeredFromBox) {
            window.location.reload();
            return;
        }

        jsxc.xmpp.connectionReady();
    },
    /**
     * Triggered if connection is attached
     * @returns {undefined}
     */
    attached: function() {

        jsxc.xmpp.conn.addHandler(jsxc.xmpp.onRosterChanged, 'jabber:iq:roster', 'iq', 'set');
        jsxc.xmpp.conn.addHandler(jsxc.xmpp.onMessage, null, 'message', 'chat');
        jsxc.xmpp.conn.addHandler(jsxc.xmpp.onPresence, null, 'presence');

        jsxc.xmpp.connectionReady();
	
        //Only load roaster if necessary
        if (!jsxc.restore || !jsxc.storage.getItem('buddylist')) {
            var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
            jsxc.xmpp.conn.sendIQ(iq, jsxc.xmpp.onRoster);
        }
    },
    /**Triggered if the connection is ready
     * 
     * @returns {undefined}
     */
    connectionReady: function(){
        //disco stuff
        if (jsxc.xmpp.conn.disco) {
            jsxc.xmpp.conn.disco.addIdentity('client', 'web', 'JSXC');
            jsxc.xmpp.conn.disco.addFeature(Strophe.NS.DISCO_INFO);
        }

        //send presence stanza
        var pres = $pres();

        if (jsxc.xmpp.conn.caps)
            pres.c('c', jsxc.xmpp.conn.caps.generateCapsAttrs())

        jsxc.xmpp.conn.send(pres);
        
        $(document).trigger('connectionReady.jsxc');
    },
    /**
     * Triggered if lost connection
     * 
     * @private
     */
    disconnected: function() {
        jsxc.debug('disconnected');

        jsxc.storage.removeItem('sid');
        jsxc.storage.removeItem('rid');

        jsxc.xmpp.conn = null;

        $('#jsxc_windowList').remove();
        $('#jsxc_roster ul').remove();
        $('#jsxc_roster .slimScrollDiv').remove();

        if (jsxc.triggeredFromElement) {
            $('#jsxc_roster').remove();

            if (jsxc.triggeredFromLogout)
                window.location = jsxc.options.logoutElement.attr('href');
        } else {
            $('#jsxc_roster').append(
                    $(document.createElement('p')).text(jsxc.l.no_connection).append(
                    $(document.createElement('a')).attr('href', '#').text(jsxc.l.relogin).click(function() {
                jsxc.gui.showLoginBox();
            })
                    )
                    );
        }
        window.clearInterval(jsxc.keepalive);
    },
    /**
     * Triggered on connection fault
     * @param {String} condition information why we lost the connection
     * @returns {undefined}
     */
    onConnfail: function(condition) {
        jsxc.debug('XMPP connection failed: ' + condition);

        if (jsxc.triggeredFromForm) {
            jsxc.submitLoginForm();
        }
    },
    /**
     * Triggered on initial roster load 
     * @param {dom} iq
     * @returns {undefined}
     */
    onRoster: function(iq) {
        /*
         * <iq from='' type='get' id=''>
         *  <query xmlns='jabber:iq:roster'>
         *      <item jid='' name='' subscription='' />
         *      ...
         *  </query>
         * </iq>
         */

        jsxc.debug('Load roster');

        var buddies = new Array();

        $(iq).find('item').each(function() {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var cid = jsxc.jidToCid(jid);
            var sub = $(this).attr('subscription');

            buddies.push(cid);

            if (jsxc.storage.getItem('buddy_' + cid))
                jsxc.storage.updateItem('buddy_' + cid, {name: name, status: 0, sub: sub});
            else
                jsxc.storage.setItem('buddy_' + cid, {'jid': jid, 'name': name, 'status': 0, sub: sub, 'msgstate': 0, 'transferReq': -1, 'trust': false, 'fingerprint': null});

            jsxc.gui.roster.add(cid);
        });

        jsxc.storage.setItem('buddylist', buddies);

        jsxc.debug('Roster ready');
    },
    /**
     * Triggerd on roster changes
     * @param {dom} iq
     * @returns {Boolean}
     */
    onRosterChanged: function(iq) {
        /*
         * <iq from='' type='set' id=''>
         *  <query xmlns='jabber:iq:roster'>
         *      <item jid='' name='' subscription='' />
         *  </query>
         * </iq>
         */

        $(iq).find('item').each(function() {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var cid = jsxc.jidToCid(jid);
            var sub = $(this).attr('subscription');
            var ask = $(this).attr('ask');

            if (sub === 'remove') {
                jsxc.gui.roster.purge(cid);
            } else if (jsxc.el_exists('#' + cid) && sub !== 'none') {
                jsxc.storage.updateItem('buddy_' + cid, {jid: jid, name: name, sub: sub});
                jsxc.gui.update(cid);
                jsxc.gui.roster.reorder(cid);
            } else if ((!ask && sub !== 'none') || (ask === 'subscribe')) {
                var bl = jsxc.storage.getItem('buddylist');
                bl.push(cid);       //(INFO) push returns the new length
                jsxc.storage.setItem('buddylist', bl);
                jsxc.storage.setItem('buddy_' + cid, {'jid': jid, 'name': name, 'status': 0, sub: sub, 'msgstate': 0, 'transferReq': -1, 'trust': false, 'fingerprint': null});
                jsxc.gui.roster.add(cid);
            }
        });

        //preserve handler
        return true;
    },
    /**
     * Triggered on incoming presence stanzas
     * @param {dom} presence
     * @returns {Boolean}
     */
    onPresence: function(presence) {
        /*
         * <presence xmlns='jabber:client' type='unavailable' from='' to=''/>
         * 
         * <presence xmlns='jabber:client' from='lisa@tower/Tower' to=''>
         *  <priority>5</priority>
         *  <c xmlns='http://jabber.org/protocol/caps' node='http://psi-im.org/caps' ver='caps-b75d8d2b25' ext='ca cs ep-notify-2 html'/>
         * </presence>
         * 
         * <presence xmlns='jabber:client' from='' to=''>
         *  <show>chat</show>
         *  <status></status>
         *  <priority>5</priority>
         *  <c xmlns='http://jabber.org/protocol/caps' node='http://psi-im.org/caps' ver='caps-b75d8d2b25' ext='ca cs ep-notify-2 html'/>
         * </presence>
         */
        var ptype = $(presence).attr('type');
        var jid = $(presence).attr('from');
        var from = Strophe.getBareJidFromJid(jid);
        var to = Strophe.getBareJidFromJid($(presence).attr('to'));
        var cid = jsxc.jidToCid(from);
        var data = jsxc.storage.getItem('buddy_' + cid);
        console.log('=================== OnPresence ====================');
        if (from === to)
            return true;

        if (ptype === 'error') {
            jsxc.debug('[XMPP ERROR] ' + $(presence).attr('code'));
            return true;
        }

        //incoming friendship request
        if (ptype === 'subscribe') {
            jsxc.storage.setItem('friendReq', {jid: from, approve: -1});
            jsxc.gui.showApproveDialog(from);

            return true;
        }
        else if (ptype === 'unavailable') {
            data.status = 0;
        } else {
            var show = $(presence).find('show').text();
            if (show === '' || show === 'chat')
                data.status = 2;
            else
                data.status = 1;
        }

        //If we know the full jid, we will use it
        if (jsxc.el_exists('#jsxc_window_' + cid))
            $('#jsxc_window_' + cid).data('jid', jid);

        data.jid = jid;

        jsxc.storage.setItem('buddy_' + cid, data);

        jsxc.gui.update(cid);
        jsxc.gui.roster.reorder(cid);

        //preserve handler
        return true;
    },
    /**
     * Triggered on incoming message stanzas
     * @param {dom} presence
     * @returns {Boolean}
     */
    onMessage: function(message) {
        /*
         * <message xmlns='jabber:client' type='chat' to='' id='' from=''>
         *  <body>...</body>
         *  <active xmlns='http://jabber.org/protocol/chatstates'/>
         * </message>
         */

        var from = $(message).attr('from');
        var jid = Strophe.getBareJidFromJid(from);
        var cid = jsxc.jidToCid(jid);
        var body = $(message).find('body:first').text();

        if (!body)
            return true;

        $(document).trigger('onmessage.jsxc', [from, body]);

        var win = jsxc.gui.window.init(cid);

        win.data('jid', from);  //If we now the full jid, we use it

        //create related otr object
        if (jsxc.chief && !jsxc.buddyList[cid])
            jsxc.otr.create(cid);

        jsxc.buddyList[cid].receiveMsg(body);

        //preserve handler
        return true;
    },
    /**
     * Triggerd if the rid changed
     * @param {event} ev
     * @param {obejct} data
     * @returns {undefined}
     */
    onRidChange: function(ev, data) {
        jsxc.storage.setItem('rid', data.rid);
    },
    /**
     * response to friendship request
     * @param {string} from jid from original friendship req
     * @param {boolean} approve
     * @returns {undefined}
     */
    resFriendReq: function(from, approve) {
        if (jsxc.chief) {
            jsxc.xmpp.conn.send($pres({
                to: from,
                type: (approve) ? 'subscribed' : 'unsubscribed'
            }));

            jsxc.storage.removeItem('friendReq');
            jsxc.gui.dialog.close();

        } else {
            jsxc.storage.updateItem('friendReq', 'approve', approve);
        }
    },
    /**
     * Add buddy to my friends
     * @param {string} username
     * @param {string} alias
     * @returns {undefined}
     */
    addBuddy: function(username, alias) {
        var cid = jsxc.jidToCid(username);

        if (jsxc.chief) {
            //add buddy to roster (trigger onRosterChanged)
            var iq = $iq({type: 'set'}).c('query', {xmlns: 'jabber:iq:roster'}).c('item', {jid: username, name: alias || ''});
            jsxc.xmpp.conn.sendIQ(iq);

            //send subscription request to buddy
            jsxc.xmpp.conn.send($pres({to: username, type: 'subscribe'}));

            jsxc.storage.removeItem('add_' + cid);
        } else {
            jsxc.storage.setItem('add_' + cid, {username: username, alias: alias || null});
        }
    },
    /**
     * Remove buddy from my friends
     * @param {type} jid
     * @returns {undefined}
     */
    removeBuddy: function(jid) {
        var cid = jsxc.jidToCid(jid);

        //Shortcut to remove buddy from roster and cancle all subscriptions
        var iq = $iq({type: 'set'}).c('query', {xmlns: 'jabber:iq:roster'}).c('item', {jid: jid, subscription: 'remove'});
        jsxc.xmpp.conn.sendIQ(iq);

        jsxc.gui.roster.purge(cid);
    }
};

/**
 * Handle long-live data
 * 
 * @namespace jsxc.storage
 */
jsxc.storage = {
    /**
     * Prefix for localstorage
     * 
     * @privat
     */
    prefix: 'jsxc_',
    /**
     * Save item to storage
     * 
     * @function
     * @param {String} key variablename
     * @param {Object} value value
     */
    setItem: function(key, value) {
        key = jsxc.storage.prefix + key;

        //Workaround for non-conform browser
        if (jsxc.storageNotConform > 0 && key != 'jsxc_rid' && key != 'jsxc_lastActivity') {
            if (jsxc.storageNotConform > 1) {
                jsxc.toSNC = window.setTimeout(function() {
                    jsxc.storageNotConform = 0;
                    jsxc.storage.setItem('storageNotConform', 0);
                }, 1000);
            }
            jsxc.debug('setItem: ' + key);
            jsxc.ls.push(JSON.stringify({key: key, value: value}));
        }

        if (typeof(value) === 'object')
            value = JSON.stringify(value);

        localStorage.setItem(key, value);
    },
    /**
     * Load item from storage
     * 
     * @function
     * @param {String} key variablename
     */
    getItem: function(key) {
        key = jsxc.storage.prefix + key;

        var value = localStorage.getItem(key);
        try {
            return JSON.parse(value); 
        } catch (e) {
            return value;
        }
    },
    /**
     * Remove item from storage
     * 
     * @function
     * @param {String} key variablename
     */
    removeItem: function(key) {

        //Workaround for non-conform browser
        if (jsxc.storageNotConform && key != 'rid' && key != 'lastActivity') {
            jsxc.ls.push(JSON.stringify({key: jsxc.storage.prefix + key, value: ''}));
        }

        localStorage.removeItem(jsxc.storage.prefix + key);
    },
    /**
     * Updates value of a variable in a saved object.
     * 
     * @function
     * @param {String} key variablename
     * @param {String|object} variable variablename in object or object with variable/key pairs
     * @param {Object} [value] value
     */
    updateItem: function(key, variable, value) {

        var data = jsxc.storage.getItem(key);

        if (typeof(variable) === 'object') {

            $.each(variable, function(key, val) {
                if (typeof (data[key]) === 'undefined') {
                    jsxc.debug('Variable %s doesn\'t exist in %s.', key, variable);
                    return true;
                }

                data[key] = val;
            });
        } else {
            if (typeof (data[variable]) === 'undefined') {
                jsxc.debug('Variable %s doesn\'t exist.', variable);
                return;
            }

            data[variable] = value;
        }

        jsxc.storage.setItem(key, data);
    },
    /**
     * Inkrements value
     * 
     * @function
     * @param {String} key variablename
     */
    ink: function(key) {

        jsxc.storage.setItem(key, Number(jsxc.storage.getItem(key)) + 1);
    },
    /**
     * Remove element from array or object
     * @param {string} key name of array or object
     * @param {string} name name of element in array or object
     * @returns {undefined}
     */
    removeElement: function(key, name) {
        var item = jsxc.storage.getItem(key);

        if ($.isArray(item)) {
            item = $.grep(item, function(e) {
                return e !== name;
            });
        }
        else if (typeof(item) === 'object') {
            delete item[name];
        }

        jsxc.storage.setItem(key, item);
    }
};

/**
 * 
 * @namespace jsxc.otr
 */
jsxc.otr = {
    /**
     * Handler for otr receive event
     * @param {string} cid
     * @param {string} msg received message
     */
    receiveMessage: function(cid, msg) {

        if (jsxc.buddyList[cid].msgstate !== 0)
            jsxc.otr.backup(cid);

        jsxc.gui.window.postMessage(cid, 'in', msg);
    },
    /**
     * Handler for otr send event
     * @param {string} jid
     * @param {string} msg message to be send
     */
    sendMessage: function(jid, msg) {
        if (jsxc.buddyList[jsxc.jidToCid(jid)].msgstate !== 0)
            jsxc.otr.backup(jsxc.jidToCid(jid));

        jsxc.xmpp.conn.send($msg({
            to: jid,
            type: 'chat'
        }).c('body').t(msg));
    },
    /**
     * Create new otr instance
     * @param {type} cid
     * @returns {undefined}
     */
    create: function(cid) {
        if (jsxc.buddyList.hasOwnProperty(cid))
            return;

        jsxc.buddyList[cid] = new OTR(jsxc.options.otr);

        jsxc.buddyList[cid].on('status', function(status) {
            switch (status) {
                case OTR.CONST.STATUS_SEND_QUERY:
                    jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.trying_to_start_private_conversation);
                    break;
                case OTR.CONST.STATUS_AKE_SUCCESS:
                    jsxc.storage.updateItem('buddy_' + cid, 'fingerprint', jsxc.buddyList[cid].their_priv_pk.fingerprint());
                    jsxc.storage.updateItem('buddy_' + cid, 'msgstate', 1);
                    jsxc.gui.window.postMessage(cid, 'sys', (jsxc.buddyList[cid].trust ? jsxc.l.Verified : jsxc.l.Unverified) + ' ' + jsxc.l.private_conversation_started);
                    break;
                case OTR.CONST.STATUS_END_OTR:
                    jsxc.storage.updateItem('buddy_' + cid, 'fingerprint', null);

                    if (jsxc.buddyList[cid].msgstate === 0) {   //we abort the private conversation

                        jsxc.storage.updateItem('buddy_' + cid, 'msgstate', 0);
                        jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.private_conversation_aborted);

                    } else {   //the buddy abort the private conversation     

                        jsxc.storage.updateItem('buddy_' + cid, 'msgstate', 2);
                        jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.your_buddy_closed_the_private_conversation_you_should_do_the_same);
                    }
                    break;
                case OTR.CONST.STATUS_SMP_HANDLE:
                    jsxc.keepBusyAlive();
                    break;
            }

            //for encryption and verification state
            jsxc.gui.update(cid);
        });

        jsxc.buddyList[cid].on('smp', function(type, data) {
            switch (type) {
                case 'question':    //verification request received
                    jsxc.otr.onSmpQuestion(cid, data);
                    jsxc.storage.setItem('smp_' + cid, {data: data || null});
                    break;
                case 'trust':       //verification completed
                    if (jsxc.buddyList[cid].trust) {
                        jsxc.otr.backup(cid);
                        jsxc.storage.updateItem('buddy_' + cid, 'trust', true);
                        jsxc.gui.update(cid);
                        jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.conversation_is_now_verified);
                    } else {
                        jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.verification_fails);
                    }
                    jsxc.storage.removeItem('smp_' + cid);
                    jsxc.gui.dialog.close();
                    break;
                default:
                    jsxc.debug('[OTR] sm callback: Unknown type: ' + type);
            }
        });

        //Receive message
        jsxc.buddyList[cid].on('ui', function(msg) {
            jsxc.otr.receiveMessage(cid, msg);
        });

        //Send message
        jsxc.buddyList[cid].on('io', function(msg) {
            jsxc.otr.sendMessage($('#jsxc_window_' + cid).data('jid'), msg);
        });

        jsxc.buddyList[cid].on('error', function(err) {
            jsxc.gui.window.postMessage(cid, 'sys', '[OTR] ' + err);
        });

        jsxc.otr.restore(cid);
    },
    /**
     * show verification dialog with related part (secret or question)
     * @param {type} cid
     * @param {string} [data]
     * @returns {undefined}
     */
    onSmpQuestion: function(cid, data) {
        jsxc.gui.showVerification(cid);

        $('#jsxc_facebox select').prop('selectedIndex', (data ? 2 : 3)).change();
        $('#jsxc_facebox > div:eq(0)').hide();

        if (data) {
            $('#jsxc_facebox > div:eq(2)').find('#jsxc_quest').val(data).prop('disabled', true);
            $('#jsxc_facebox > div:eq(2)').find('.creation').text('Answer');
            $('#jsxc_facebox > div:eq(2)').find('.jsxc_explanation').text(jsxc.l.your_buddy_is_attempting_to_determine_ + ' ' + jsxc.l.to_authenticate_to_your_buddy + jsxc.l.enter_the_answer_and_click_answer);
        } else {
            $('#jsxc_facebox > div:eq(3)').find('.jsxc_explanation').text(jsxc.l.your_buddy_is_attempting_to_determine_ + ' ' + jsxc.l.to_authenticate_to_your_buddy + jsxc.l.enter_the_secret);
        }

        $('#jsxc_facebox a[rel=close]').click(function() {
            jsxc.storage.removeItem('smp_' + cid);

            if (jsxc.chief)
                jsxc.buddyList[cid].sm.abort();
        });
    },
    /**
     * Send verification request to buddy
     * @param {string} cid
     * @param {string} sec secret
     * @param {string} [quest] question
     * @returns {undefined}
     */
    sendSmpReq: function(cid, sec, quest) {
        jsxc.keepBusyAlive();
        jsxc.buddyList[cid].smpSecret(sec, quest);
    },
    /**
     * Toggle encryption state
     * @param {type} cid
     * @returns {undefined}
     */
    toggleTransfer: function(cid) {
        if (jsxc.storage.getItem('buddy_' + cid).msgstate === 0) {
            jsxc.otr.goEncrypt(cid);
        } else {
            jsxc.otr.goPlain(cid);
        }
    },
    /**
     * Send request to encrypt the session
     * @param {type} cid
     * @returns {undefined}
     */
    goEncrypt: function(cid) {
        if (jsxc.chief) {
            jsxc.buddyList[cid].sendQueryMsg();
        } else {
            jsxc.storage.updateItem('buddy_' + cid, 'transferReq', 1);
        }
    },
    /**
     * Abort encryptet session
     * @param {type} cid
     * @returns {undefined}
     */
    goPlain: function(cid) {
        if (jsxc.chief) {
            jsxc.buddyList[cid].endOtr.call(jsxc.buddyList[cid]);
            jsxc.buddyList[cid].init.call(jsxc.buddyList[cid]);

            jsxc.otr.backup(cid);
        } else {
            jsxc.storage.updateItem('buddy_' + cid, 'transferReq', 0);
        }
    },
    /**
     * Backups otr session
     * @param {string} cid
     */
    backup: function(cid) {
        var o = jsxc.buddyList[cid];    //otr object
        var r = {};                     //return value

        if (o === null)
            return;

        //all variables which should be saved
        var savekey = ['our_instance_tag', 'msgstate', 'authstate', 'fragment', 'their_y', 'their_old_y', 'their_keyid',
            'their_instance_tag', 'our_dh', 'our_old_dh', 'our_keyid', 'sessKeys', 'storedMgs', 'oldMacKeys', 'trust', 'transmittedRS', 'ssid',
            'receivedPlaintext', 'authstate', 'send_interval'];

        for (var i = 0; i < savekey.length; i++) {
            r[savekey[i]] = JSON.stringify(o[savekey[i]]);
        }

        if (o.their_priv_pk !== null)
            r['their_priv_pk'] = JSON.stringify(o.their_priv_pk.packPublic());

        if (o.ake.otr_version && o.ake.otr_version !== '')
            r['otr_version'] = JSON.stringify(o.ake.otr_version);

        jsxc.storage.setItem('otr_' + cid, r);
    },
    /**
     * Restore old otr session
     * @param {string} cid
     */
    restore: function(cid) {
        var o = jsxc.buddyList[cid];
        var d = jsxc.storage.getItem('otr_' + cid);

        if (o === null || d === null)
            return;

        for (var key in d) {
            val = JSON.parse(d[key]);
            if (key === 'their_priv_pk' && val !== null)
                val = DSA.parsePublic(val);
            if (key === 'otr_version' && val !== null)
                o.ake.otr_version = val;
            else
                o[key] = val;
        }

        jsxc.buddyList[cid] = o;

        if (o.msgstate === 1 && o.their_priv_pk !== null)
            o._smInit.call(jsxc.buddyList[cid]);
    },
    /**
     * Create or load DSA key
     * @returns {unresolved}
     */
    createDSA: function() {
        if (jsxc.options.otr.priv)
            return;

        if (jsxc.storage.getItem('key') === null) {

            //Create own box, because buildin isn't fast enough
            var bg = $('<div/>').attr('id', 'jsxc_overlay');
            bg.appendTo('body');

            var msg = jsxc.l.now_we_will_create_your_private_key_;
            var inner = '<div id="jsxc_dialog">' + jsxc.gui.template.get('waitAlert', null, msg) + '</div>';
            var box = $('<div>' + inner + '</div>').attr('id', 'jsxc_waitAlert');
            box.appendTo('body');

            //only for debugging
            var start = (new Date()).getTime();
            jsxc.debug('DSA key creation started.');

            var dsa = new DSA();

            jsxc.debug('DSA key creation finished in ' + (((new Date()).getTime() - start) / 1000) + 's');

            //close wait alert
            $('#jsxc_overlay').remove();
            $('#jsxc_waitAlert').remove();

            jsxc.storage.setItem('key', dsa.packPrivate());
            jsxc.options.otr.priv = dsa;

        } else {
            jsxc.debug('DSA key loaded');
            jsxc.options.otr.priv = DSA.parsePrivate(jsxc.storage.getItem('key'));
        }

        jsxc.storage.setItem('priv_fingerprint', jsxc.options.otr.priv.fingerprint());
    }
};

jsxc.notification = {
    init: function() {
        $(document).on('postmessagein.jsxc', function(event, jid, msg) {
            jsxc.notification.notify('New message from ' + jid, msg);
        });
    },
    notify: function(title, msg, d) {
        if (!jsxc.options.notification && window.notifications.checkPermission() == 0)
            return; //notifications disabled

        //@TODO: watch multiple tabs
        if (!jsxc.isHidden())
            return; //Tab is visible

        var popup = window.notifications.createNotification(null, title, msg);
        popup.show();

        duration = d || 6000;

        if (duration > 0)
            setTimeout(function() {
                popup.cancel();
            }, duration);
    },
    hasSupport: function() {
        if (window.notifications) {
            return true;
        } else if (window.webkitNotifications) {
            window.notifications = window.webkitNotifications;
            return true;
        } else if (window.mozNotifications) {
            window.notifications = window.mozNotifications;
            return true;
        } else {
            return false;
        }
    },
    prepareRequest: function() {

        $(document).one('onmessage.jsxc', function() {
            jsxc.switchEvents({
                'notificationready.jsxc': function() {
                    jsxc.notification.init();
                    jsxc.storage.setItem('notification', true);
                },
                'notificationfailure.jsxc': function() {
                    jsxc.options.notification = false;
                    jsxc.storage.setItem('notification', false);
                }
            });
            setTimeout(function() {
                jsxc.gui.showConfirmDialog("Should we notify you about new messages in the future?",
                        function() {
                            jsxc.notification.requestPermission();
                        },
                        function() {
                            $(document).trigger('notificationfailure.jsxc');
                        });
            }, 2000);
        });
    },
    requestPermission: function() {
        window.notifications.requestPermission(function() {
            if (jsxc.notification.hasPermission())
                $(document).trigger('notificationready.jsxc');
            else
                $(document).trigger('notificationfailure.jsxc');
        });
    },
    hasPermission: function() {
        return window.notifications.checkPermission() === 0;
    }
}

/**
 * Contains all available translations
 * @namespace jsxc.l10n
 */
jsxc.l10n = {
    en: {
        please_wait_until_we_logged_you_in: 'Please wait until we logged you in...',
        your_connection_is_unencrypted: 'Your connection is unencrypted.',
        your_connection_is_encrypted: 'Your connection is encrypted.',
        your_buddy_closed_the_private_connection: 'Your buddy closed the private connection.',
        start_private: 'Start private',
        close_private: 'Close private',
        your_buddy_is_verificated: 'Your buddy is verificated.',
        you_have_only_a_subscription_in_one_way: 'You have only a subscription in one way.',
        verification_query_sent: 'Verification query sent.',
        your_message_wasnt_send_please_end_your_private_conversation: 'Your message wasn\'t send. Please end your private conversation.',
        unencrypted_message_received: 'Unencrypted message received:',
        your_message_wasnt_send_because_you_have_no_valid_subscription: 'Your message was\'nt send, because you have no valid subscription.',
        no_available: 'No available',
        no_connection: 'No connection!',
        relogin: 'relogin',
        trying_to_start_private_conversation: 'Trying to start private conversation!',
        Verified: 'Verified',
        Unverified: 'Unverified',
        private_conversation_started: 'private conversation started.',
        private_conversation_aborted: 'Private conversation aborted!',
        your_buddy_closed_the_private_conversation_you_should_do_the_same: 'Your buddy closed the private conversation! You should do the same.',
        conversation_is_now_verified: 'Conversation is now verified.',
        verification_fails: 'Verification fails.',
        your_buddy_is_attempting_to_determine_: 'You buddy is attempting to determine if he or she is really talking to you.',
        to_authenticate_to_your_buddy: 'To authenticate to your buddy, ',
        enter_the_answer_and_click_answer: 'enter the answer and click Answer.',
        enter_the_secret: 'enter the secret.',
        now_we_will_create_your_private_key_: 'Now we will create your private key. This can take some time.',
        Authenticating_a_buddy_helps_: 'Authenticating a buddy helps ensure that the person you are talking to is who he or she is saying.',
        How_do_you_want_to_authenticate_your_buddy: 'How do you want to authenticate your buddy?',
        Select_method: 'Select method...',
        Manual: 'Manual',
        Question: 'Question',
        Secret: 'Secret',
        To_verify_the_fingerprint_: 'To verify the fingerprint, contact your buddy via some other authenticated channel, such as the telephone.',
        Your_fingerprint: 'Your fingerprint',
        Buddy_fingerprint: 'Buddy fingerprint',
        Close: 'Close',
        Compared: 'Compared',
        To_authenticate_using_a_question_: 'To authenticate using a question, pick a question whose answer is known only you and your buddy.',
        Ask: 'Ask',
        To_authenticate_pick_a_secret_: 'To authenticate, pick a secret known only to you and your buddy.',
        Compare: 'Compare',
        Fingerprints: 'Fingerprints',
        Authentifikation: 'Authentifikation',
        Message: 'Message',
        Add_buddy: 'Add_buddy',
        rename_buddy: 'rename buddy',
        delete_buddy: 'delete buddy',
        Login: 'Login',
        Username: 'Username',
        Password: 'Password',
        Cancel: 'Cancel',
        Connect: 'Connect',
        Type_in_the_full_username_: 'Type in the full username and optional an alias.',
        Alias: 'Alias',
        Add: 'Add',
        Subscription_request: 'Subscription request',
        You_have_a_request_from: 'You have a request from',
        Deny: 'Deny',
        Approve: 'Approve',
        Remove_buddy: 'Remove buddy',
        You_are_about_to_remove_: 'You are about to remove {{cid_jid}} from your buddy list. All related chats will be closed.  Do you want to continue?',
        Continue: 'Continue',
        Please_wait: 'Please wait',
        Login_failed: 'Login failed',
        Sorry_we_cant_authentikate_: 'Sorry, we can\'t authentikate you at our chat server. Maybe the password is wrong?',
        Retry: 'Retry',
        clear_history: 'Clear history'
    },
    de: {
        please_wait_until_we_logged_you_in: 'Bitte warte bis wir dich eingeloggt haben.',
        your_connection_is_unencrypted: 'Deine Verbindung ist UNverschlüsselt.',
        your_connection_is_encrypted: 'Deine Verbindung ist verschlüsselt.',
        your_buddy_closed_the_private_connection: 'Dein Freund hat die private Verbindung getrennt.',
        start_private: 'Privat starten',
        close_private: 'Privat abbrechen',
        your_buddy_is_verificated: 'Dein Freund ist verifiziert.',
        you_have_only_a_subscription_in_one_way: 'Die Freundschaft ist nur einseitig.',
        verification_query_sent: 'Verifizierungsanfrage gesendet.',
        your_message_wasnt_send_please_end_your_private_conversation: 'Deine Nachricht wurde nicht gesendet. Bitte beende die private Konversation.',
        unencrypted_message_received: 'Unverschlüsselte Nachricht erhalten.',
        your_message_wasnt_send_because_you_have_no_valid_subscription: 'Deine Nachricht wurde nicht gesandt, da die Freundschaft einseitig ist.',
        no_available: 'Nicht verfügbar.',
        no_connection: 'Keine Verbindung.',
        relogin: 'Neu anmelden.',
        trying_to_start_private_conversation: 'Versuche private Konversation zu starten.',
        Verified: 'Verifiziert',
        Unverified: 'Unverifiziert',
        private_conversation_started: 'Private Konversation gestartet.',
        private_conversation_aborted: 'Private Konversation abgebrochen.',
        your_buddy_closed_the_private_conversation_you_should_do_the_same: 'Dein Freund hat die private Konversation beendet. Das solltest du auch tun!',
        conversation_is_now_verified: 'Konversation ist jetzt verifiziert',
        verification_fails: 'Verifizierung fehlgeschlagen.',
        your_buddy_is_attempting_to_determine_: 'Dein Freund versucht herauszufinden ob er wirklich mit dir redet.',
        to_authenticate_to_your_buddy: 'Um dich gegenüber deinem Freund zu verifizieren ',
        enter_the_answer_and_click_answer: 'gib die Antwort ein und klick auf Antworten.',
        enter_the_secret: 'gib das Geheimnis ein.',
        now_we_will_create_your_private_key_: 'Wir werden jetzt deinen privaten Schlüssel generieren. Das kann einige Zeit in anspruch nehmen.',
        Authenticating_a_buddy_helps_: 'Einen Freund zu authentifizieren hilft sicher zustellen, dass die Person mit der du sprichst auch die ist die sie sagt.',
        How_do_you_want_to_authenticate_your_buddy: 'Wie willst du deinen Freund authentifizieren?',
        Select_method: 'Wähle...',
        Manual: 'Manual',
        Question: 'Frage',
        Secret: 'Geheimnis',
        To_verify_the_fingerprint_: 'Um den Fingerprint zu verifizieren kontaktiere dein Freund über einen anderen Kommunikationsweg. Zum Beispiel per Telefonanruf.',
        Your_fingerprint: 'Dein Fingerprint',
        Buddy_fingerprint: 'Sein/Ihr Fingerprint',
        Close: 'Schließen',
        Compared: 'Verglichen',
        To_authenticate_using_a_question_: 'Um die Authentifizierung per Frage durchzuführen, wähle eine Frage bei welcher nur dein Freund die Antwort weiß.',
        Ask: 'Frage',
        To_authenticate_pick_a_secret_: 'Um deinen Freund zu authentifizieren, wähle ein Geheimnis welches nur deinem Freund und dir bekannt ist.',
        Compare: 'Vergleiche',
        Fingerprints: 'Fingerprints',
        Authentifikation: 'Authentifizierung',
        Message: 'Nachricht',
        Add_buddy: 'Freund hinzufügen',
        rename_buddy: 'Freund umbenennen',
        delete_buddy: 'Freund löschen',
        Login: 'Anmeldung',
        Username: 'Benutzername',
        Password: 'Passwort',
        Cancel: 'Abbrechen',
        Connect: 'Verbinden',
        Type_in_the_full_username_: 'Gib bitte den vollen Benutzernamen und optional ein Alias an.',
        Alias: 'Alias',
        Add: 'Hinzufügen',
        Subscription_request: 'Freundschaftsanfrage',
        You_have_a_request_from: 'Du hast eine Anfrage von',
        Deny: 'Ablehnen',
        Approve: 'Bestätigen',
        Remove_buddy: 'Freund entfernen',
        You_are_about_to_remove_: 'Du bist gerade dabei {{cid_jid}} von deiner Kontaktliste zu entfernen. Alle Chats werden geschlossen. Willst du fortfahren?',
        Continue: 'Weiter',
        Please_wait: 'Bitte warten',
        Login_failed: 'Anmeldung fehlgeschlagen',
        Sorry_we_cant_authentikate_: 'Wir können dich leider nicht anmelden. Vielleicht ist dein Passwort falsch?',
        Retry: 'Neuer Versuch',
        clear_history: 'Lösche Verlauf'
    }
};
