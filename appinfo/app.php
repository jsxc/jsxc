<?php

/**
* ownCloud - JavaScript XMPP Chat
*
* @author Klaus Herberth
* 
* This library is free software; you can redistribute it and/or
* modify it under the terms of the GNU AFFERO GENERAL PUBLIC LICENSE
* License as published by the Free Software Foundation; either 
* version 3 of the License, or any later version.
* 
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU AFFERO GENERAL PUBLIC LICENSE for more details.
*  
* You should have received a copy of the GNU Affero General Public 
* License along with this library.  If not, see <http://www.gnu.org/licenses/>.
* 
*/

OCP\App::registerAdmin( 'ojsxc', 'settings' );

//############# Javascript #############
OCP\Util::addScript ( 'ojsxc', 'flensed.config' );
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
OCP\Util::addScript ( 'ojsxc', 'lib/facebox' );
OCP\Util::addScript ( 'ojsxc', 'lib/jsxc.lib' );
OCP\Util::addScript ( 'ojsxc', 'lib/jsxc.lib.webrtc' );
OCP\Util::addScript ( 'ojsxc', 'lib/jsxc.lib.muc' );
    
OCP\Util::addScript ( 'ojsxc', 'jsxc' );

//############# CSS #############
OCP\Util::addStyle  ( 'ojsxc', 'facebox' );
OCP\Util::addStyle  ( 'ojsxc', 'jquery.mCustomScrollbar' );
OCP\Util::addStyle  ( 'ojsxc', 'main' );
OCP\Util::addStyle  ( 'ojsxc', 'webrtc' );
OCP\Util::addStyle  ( 'ojsxc', 'muc' );
//OCP\Util::addStyle  ( 'ojsxc', 'log' );
