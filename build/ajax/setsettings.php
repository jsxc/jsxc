<?php
/**
 * Copyright (c) 2011, Frank Karlitschek <karlitschek@kde.org>
 * Copyright (c) 2012, Florian Hülsmann <fh@cbix.de>
 * This file is licensed under the Affero General Public License version 3 or later.
 * See the COPYING-README file.
 */

OCP\User::checkAdminUser();
OCP\JSON::callCheck();

OCP\Config::setAppValue('ojsxc', 'boshUrl', $_POST['boshUrl'] );
OCP\Config::setAppValue('ojsxc', 'xmppDomain', $_POST['xmppDomain'] );
OCP\Config::setAppValue('ojsxc', 'xmppResource', $_POST['xmppResource'] );
OCP\Config::setAppValue('ojsxc', 'iceUrl', $_POST['iceUrl'] );
OCP\Config::setAppValue('ojsxc', 'iceUsername', $_POST['iceUsername'] );
OCP\Config::setAppValue('ojsxc', 'iceCredential', $_POST['iceCredential'] );
OCP\Config::setAppValue('ojsxc', 'iceSecret', $_POST['iceSecret'] );
OCP\Config::setAppValue('ojsxc', 'iceTtl', $_POST['iceTtl'] );

echo 'true';