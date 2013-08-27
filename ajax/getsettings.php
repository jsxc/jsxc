<?php
OCP\JSON::callCheck();

$data = array();
$data['boshUrl'] = OCP\Config::getAppValue('ojsxc', 'boshUrl');
$data['xmppDomain'] = OCP\Config::getAppValue('ojsxc', 'xmppDomain');
$data['xmppResource'] = OCP\Config::getAppValue('ojsxc', 'xmppResource');
$data['iceUrl'] = OCP\Config::getAppValue('ojsxc', 'iceUrl');
$data['iceUsername'] = OCP\Config::getAppValue('ojsxc', 'iceUsername');
$data['iceCredential'] = OCP\Config::getAppValue('ojsxc', 'iceCredential');
OCP\JSON::encodedPrint($data);
?>