<?php
//NOTE: Place all settings specific to environment here.

error_reporting(E_ALL);
define("PAGE_ROOT","/calculat5");
define("ROOT_DIR",rtrim($_SERVER["DOCUMENT_ROOT"],"/").PAGE_ROOT);

define("SERVER_HOST","ntkzavod.com.ua");
define("MAIL_SENDER","info@".SERVER_HOST);
define("ADMIN_EMAIL","info@allzap.pro,vda777@gmail.com");

define("DB_HOST","vpromo2.mysql.tools");
define("DB_NAME","vpromo2_calc3");
define("DB_LOGIN","vpromo2_calc3");
define("DB_PASSWORD","h90Mm(f8@L");

define("SHOW_PAGE_START_END",false);

//Include env-independent part of code:
require_once(ROOT_DIR."/main.php");
?>