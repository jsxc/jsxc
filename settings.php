<?php

OCP\User::checkAdminUser();

OCP\Util::addScript( "ojsxc", "admin" );

$tmpl = new OCP\Template( 'ojsxc', 'settings');

$tmpl->assign('boshUrl', OCP\Config::getAppValue('ojsxc', 'boshUrl'));
$tmpl->assign('xmppDomain', OCP\Config::getAppValue('ojsxc', 'xmppDomain'));
$tmpl->assign('xmppResource', OCP\Config::getAppValue('ojsxc', 'xmppResource'));
$tmpl->assign('iceUrl', OCP\Config::getAppValue('ojsxc', 'iceUrl'));
$tmpl->assign('iceUsername', OCP\Config::getAppValue('ojsxc', 'iceUsername'));
$tmpl->assign('iceCredential', OCP\Config::getAppValue('ojsxc', 'iceCredential'));

return $tmpl->fetchPage();
?>
