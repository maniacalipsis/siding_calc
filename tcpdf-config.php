<?php
define("K_TCPDF_EXTERNAL_CONFIG", true);

define("K_PATH_MAIN",rtrim(ROOT_DIR."/")."/TCPDF/");
define("K_PATH_IMAGES",rtrim(ROOT_DIR."/")."/.pdf_assets/");   //Not only images but other assets for pdf generation.
define("K_PATH_FONTS",K_PATH_MAIN."fonts/");
define("K_PATH_CACHE",sys_get_temp_dir()."/");

define("PDF_CREATOR","TCPDF");
define("PDF_AUTHOR" ,"ntkzavod.com.ua");
define("PDF_HEADER_TITLE" ,"");
define("PDF_HEADER_STRING","");

define("PDF_PAGE_FORMAT", "A4");
define("PDF_PAGE_ORIENTATION", "L");

define("PDF_HEADER_LOGO","logo.png");
define("PDF_HEADER_LOGO_WIDTH", 297);
define("K_BLANK_IMAGE","_blank.png");

define("PDF_INFO_AREA",["x"=>20,"y"=>40,"w"=>250,"h"=>140]);
define("PDF_PREAMBLE" ,["path"=>K_PATH_IMAGES."preamble.html","x"=>20,"y"=>40,"w"=>250,"h"=>140]);
define("PDF_ADS_TEXT" ,["path"=>K_PATH_IMAGES."ads.html","x"=>20,"y"=>40,"w"=>160,"h"=>140]);
define("PDF_ADS_IMAGE",["path"=>K_PATH_IMAGES."ads_img.jpg","x"=>185,"y"=>60,"w"=>90,"h"=>61,"dpi"=>150]);
define("PDF_UNIT", "mm");
define("PDF_DRAWING_PAGE_FORMAT", "A4");
define("PDF_DRAWING_PAGE_ORIENTATION", "L");
define("PDF_DRAWING_TITLE",["title"=>"<H2>Раскладка</H2>","x"=>20,"y"=>40,"w"=>250,"h"=>20]);
define("PDF_DRAWING_AREA",["lb"=>["x"=>30,"y"=>200],"rt"=>["x"=>267,"y"=>60]]);  //NOTE: sizes of the figures may exceed the drawing area at the top and left sides.

define("PDF_MARGIN_HEADER", 0);
define("PDF_MARGIN_FOOTER", 0);
define("PDF_MARGIN_TOP", 40);
define("PDF_MARGIN_BOTTOM", 8);
define("PDF_MARGIN_LEFT", 0);
define("PDF_MARGIN_RIGHT", 0);

define("PDF_FONT_NAME_MAIN", "freesans");
define("PDF_FONT_SIZE_MAIN", 10);
define("PDF_FONT_NAME_DATA", "freesans");
define("PDF_FONT_SIZE_DATA", 8);
define("PDF_FONT_MONOSPACED", "freemono");

define("PDF_TITLE_COLOR",[23,94,182]);   //RGB
define("PDF_TEXT_COLOR",[51,51,51]);  //RGB
define("PDF_HEADER_LINE_COLOR",[255,255,255]);  //RGB

define("PDF_FIGURE_STROKE",["all"=>["width"=>0.5,"cap"=>"butt","join"=>"miter","dash"=>0,"color"=>[26,94,179]]]);  //RGB
define("PDF_FIGURE_FILL",[200,211,230]);  //RGB
define("PDF_OVERLAY_STROKE",["all"=>["width"=>0.25,"cap"=>"butt","join"=>"miter","dash"=>0,"color"=>[0,255,255]]]);  //RGB
define("PDF_OVERLAY_FILL",[]/*[0,255,255]*/);  //RGB
define("PDF_OVERLAY_TEXT_COLOR",[26,94,179]);  //RGB

define("PDF_IMAGE_SCALE_RATIO", 1.25);
define("HEAD_MAGNIFICATION", 1.1);
define("K_CELL_HEIGHT_RATIO", 1.25);
define("K_TITLE_MAGNIFICATION", 1.3);
define("K_SMALL_RATIO", 2/3);

define("K_THAI_TOPCHARS", true);

/**
 * If true allows to call TCPDF methods using HTML syntax
 * IMPORTANT: For security reason, disable this feature if you are printing user HTML content.
 */
define("K_TCPDF_CALLS_IN_HTML", false);
define("K_TCPDF_THROW_EXCEPTION_ERROR", false);

?>