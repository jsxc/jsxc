<?php

OCP\User::checkLoggedIn();

OCP\App::setActiveNavigationEntry( 'ojsxc' );
$tmpl = new OCP\Template( 'ojsxc', 'main', 'user' );
$tmpl->printPage();
?>
