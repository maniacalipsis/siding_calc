<?php

define ('K_TCPDF_EXTERNAL_CONFIG', true);
define ('K_PATH_MAIN', $_SERVER["DOCUMENT_ROOT"].'/TCPDF/');
//define ('K_PATH_URL', '');

define ('K_PATH_FONTS', K_PATH_MAIN.'fonts/');

/**
 * Default images directory.
 * By default it is automatically set but you can also set it as a fixed string to improve performances.
 */
define('K_PATH_IMAGES', __DIR__.'/images/');
define('PDF_HEADER_LOGO', 'logo.png');
define('PDF_HEADER_LOGO_WIDTH', 30);

define('K_PATH_CACHE', sys_get_temp_dir().'/');
define('K_BLANK_IMAGE', '_blank.png');


define('PDF_CREATOR', 'TCPDF');
define('PDF_AUTHOR', 'proallzap.in.ua');
define('PDF_HEADER_TITLE', 'Рассчёт сайдинга');
define('PDF_HEADER_STRING', "proallzap.in.ua");

define('PDF_PAGE_FORMAT', 'A4');
define('PDF_PAGE_ORIENTATION', 'P');
define('PDF_UNIT', 'mm');
define('PDF_DRAWING_PAGE_FORMAT', 'A4');
define('PDF_DRAWING_PAGE_ORIENTATION', 'L');
define('PDF_DRAWING_AREA',['lb'=>['x'=>30,'y'=>185],'rt'=>['x'=>275,'y'=>30]]);  //NOTE: sizes of the figures may exceed the drawing area at the top and left sides.

define('PDF_MARGIN_HEADER', 5);
define('PDF_MARGIN_FOOTER', 10);
define('PDF_MARGIN_TOP', 27);
define('PDF_MARGIN_BOTTOM', 25);
define('PDF_MARGIN_LEFT', 15);
define('PDF_MARGIN_RIGHT', 15);

define('PDF_FONT_NAME_MAIN', 'freesans');
define('PDF_FONT_SIZE_MAIN', 10);
define('PDF_FONT_NAME_DATA', 'freesans');
define('PDF_FONT_SIZE_DATA', 8);
define('PDF_FONT_MONOSPACED', 'freemono');

define('PDF_TITLE_COLOR',[23,94,182]);   //RGB
define('PDF_TEXT_COLOR',[51,51,51]);  //RGB
define('PDF_HEADER_LINE_COLOR',[128,128,128]);  //RGB

define('PDF_FIGURE_STROKE',["all"=>["width"=>0.5,"cap"=>"butt","join"=>"miter","dash"=>0,"color"=>[26,94,179]]]);  //RGB
define('PDF_FIGURE_FILL',[200,211,230]);  //RGB
define('PDF_OVERLAY_STROKE',["all"=>["width"=>0.25,"cap"=>"butt","join"=>"miter","dash"=>0,"color"=>[0,255,255]]]);  //RGB
define('PDF_OVERLAY_FILL',[]/*[0,255,255]*/);  //RGB
define('PDF_OVERLAY_TEXT_COLOR',[26,94,179]);  //RGB

define('PDF_IMAGE_SCALE_RATIO', 1.25);
define('HEAD_MAGNIFICATION', 1.1);
define('K_CELL_HEIGHT_RATIO', 1.25);
define('K_TITLE_MAGNIFICATION', 1.3);
define('K_SMALL_RATIO', 2/3);

define('K_THAI_TOPCHARS', true);

/**
 * If true allows to call TCPDF methods using HTML syntax
 * IMPORTANT: For security reason, disable this feature if you are printing user HTML content.
 */
define('K_TCPDF_CALLS_IN_HTML', false);
define('K_TCPDF_THROW_EXCEPTION_ERROR', false);

?>