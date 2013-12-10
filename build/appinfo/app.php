<?php

/**
 * ownCloud - JavaScript XMPP Chat
 *
 * Copyright (c) 2013 Klaus Herberth <klaus@jsxc.org> <br>
 * Released under the MIT license
 * 
 * @author Klaus Herberth
*/

OCP\App::registerAdmin ( 'ojsxc', 'settings' );

// ############# Javascript #############
OCP\Util::addScript ( 'ojsxc', 'plugin/jquery.slimscroll' );
OCP\Util::addScript ( 'ojsxc', 'plugin/jquery.fullscreen' );
OCP\Util::addScript ( 'ojsxc', 'lib/strophe' );

OCP\Util::addScript ( 'ojsxc', 'plugin/strophe.muc' );
OCP\Util::addScript ( 'ojsxc', 'plugin/strophe.disco' );
OCP\Util::addScript ( 'ojsxc', 'plugin/strophe.caps' );
OCP\Util::addScript ( 'ojsxc', 'strophe.jingle/strophe.jingle' );
OCP\Util::addScript ( 'ojsxc', 'strophe.jingle/strophe.jingle.session' );
OCP\Util::addScript ( 'ojsxc', 'strophe.jingle/strophe.jingle.sdp' );
OCP\Util::addScript ( 'ojsxc', 'strophe.jingle/strophe.jingle.adapter' );

OCP\Util::addScript ( 'ojsxc', 'otr/build/dep/salsa20' );
OCP\Util::addScript ( 'ojsxc', 'otr/build/dep/bigint' );
OCP\Util::addScript ( 'ojsxc', 'otr/build/dep/crypto' );
OCP\Util::addScript ( 'ojsxc', 'otr/build/dep/eventemitter' );
OCP\Util::addScript ( 'ojsxc', 'otr/build/otr' );
OCP\Util::addScript ( 'ojsxc', 'lib/jsxc.lib' );
OCP\Util::addScript ( 'ojsxc', 'lib/jsxc.lib.webrtc' );
OCP\Util::addScript ( 'ojsxc', 'lib/jsxc.lib.muc' );

OCP\Util::addScript ( 'ojsxc', 'ojsxc' );

// ############# CSS #############
OCP\Util::addStyle ( 'ojsxc', 'jquery.mCustomScrollbar' );
OCP\Util::addStyle ( 'ojsxc', 'main' );
OCP\Util::addStyle ( 'ojsxc', 'webrtc' );
OCP\Util::addStyle ( 'ojsxc', 'muc' );
// OCP\Util::addStyle ( 'ojsxc', 'log' );

?>