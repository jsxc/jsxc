<?php

OCP\User::checkAdminUser();

OCP\Util::addScript( "ojsxc", "admin" );

$tmpl = new OCP\Template( 'ojsxc', 'settings');

$tmpl->assign('boshUrl', OCP\Config::getAppValue('ojsxc', 'boshUrl'));
$tmpl->assign('xmppDomain', OCP\Config::getAppValue('ojsxc', 'xmppDomain'));
$tmpl->assign('xmppResource', OCP\Config::getAppValue('ojsxc', 'xmppResource'));

return $tmpl->fetchPage();
?>
