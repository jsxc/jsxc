<?php
OCP\User::checkLoggedIn();
OCP\JSON::callCheck();

$secret = OCP\Config::getAppValue('ojsxc', 'iceSecret');
$user = OCP\User::getUser();

$data = array();
$data['url'] = OCP\Config::getAppValue('ojsxc', 'iceUrl');//$user.':'.
$data['username'] = OCP\Config::getAppValue('ojsxc', 'iceUsername')?: ($secret? time(): $user);
$data['credential'] = OCP\Config::getAppValue('ojsxc', 'iceCredential')?: ($secret? base64_encode(hash_hmac('sha1', $data['username'], $secret, true)):'');
$data['ttl'] = OCP\Config::getAppValue('ojsxc', 'iceTtl')?: 60*60*12;

OCP\JSON::encodedPrint($data);
?>