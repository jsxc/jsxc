<?php
OCP\JSON::callCheck();

$data = array();
$data['boshUrl'] = OCP\Config::getAppValue('ojsxc', 'boshUrl');
$data['xmppDomain'] = OCP\Config::getAppValue('ojsxc', 'xmppDomain');
$data['xmppResource'] = OCP\Config::getAppValue('ojsxc', 'xmppResource');
OCP\JSON::encodedPrint($data);
?>