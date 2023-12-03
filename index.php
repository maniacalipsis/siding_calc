<?php
//NOTE: Place all settings specific to environment here.

error_reporting(E_ERROR);
define("PAGE_ROOT","");
define("ROOT_DIR",rtrim($_SERVER["DOCUMENT_ROOT"],"/").PAGE_ROOT);

define("STORAGE_DIR",rtrim($_SERVER["DOCUMENT_ROOT"],"/")."/.storage");

define("SERVER_HOST","calc.ntkzavod.com.ua");
define("MAIL_SENDER","info@".SERVER_HOST);
define("ADMIN_EMAIL","info@allzap.pro,vda777@gmail.com");

define("DB_HOST","vpromo2.mysql.tools");
define("DB_NAME","vpromo2_calc3");
define("DB_LOGIN","vpromo2_calc3");
define("DB_PASSWORD","h90Mm(f8@L");

define("SHOW_PAGE_START_END",true);
define("REMOVE_TMP_PDFS",false);

//Include env-independent part of code:
require_once(ROOT_DIR."/main.php");
?>