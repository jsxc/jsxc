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

OCP\App::addNavigationEntry( array( 
	'id' => 'apptemplate',
	'order' => 74,
	'href' => OCP\Util::linkTo( 'ojsxc', 'index.php' ),
	'icon' => OCP\Util::imagePath( 'ojsxc', 'example.png' ),
	'name' => 'Chat'
));

OCP\Util::addScript ( 'ojsxc', 'flensed.config' );
OCP\Util::addScript ( 'ojsxc', 'plugin/jquery.slimscroll' );
OCP\Util::addScript ( 'ojsxc', 'lib/strophe' );
//OCP\Util::addScript ( 'ojsxc', 'lib/flXHR' );
//OCP\Util::addScript ( 'ojsxc', 'plugin/strophe.flxhr' );
OCP\Util::addScript ( 'ojsxc', 'lib/seedrandom' );
OCP\Util::addScript ( 'ojsxc', 'lib/bigint' );
OCP\Util::addScript ( 'ojsxc', 'lib/crypto' );
OCP\Util::addScript ( 'ojsxc', 'lib/eventemitter' );
OCP\Util::addScript ( 'ojsxc', 'lib/otr' );
OCP\Util::addScript ( 'ojsxc', 'lib/facebox' );
OCP\Util::addScript ( 'ojsxc', 'lib/jsxc.lib' );
OCP\Util::addScript ( 'ojsxc', 'log' );
OCP\Util::addScript ( 'ojsxc', 'jsxc' );

OCP\Util::addStyle  ( 'ojsxc', 'facebox' );
OCP\Util::addStyle  ( 'ojsxc', 'jquery.mCustomScrollbar' );
OCP\Util::addStyle  ( 'ojsxc', 'main' );
//OCP\Util::addStyle  ( 'ojsxc', 'log' );