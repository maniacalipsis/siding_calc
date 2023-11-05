<?php
define("PAGE_ROOT","");
define("ROOT_DIR",$_SERVER["DOCUMENT_ROOT"].PAGE_ROOT);
define("JSON_ENCODE_OPTIONS",JSON_HEX_APOS|JSON_HEX_QUOT|JSON_PARTIAL_OUTPUT_ON_ERROR);
define('FLOAT_PRECISION',2);

require_once(ROOT_DIR."/config.php");

require_once(ROOT_DIR."/core/utils.php");
require_once(ROOT_DIR."/core/database.php");
require_once(ROOT_DIR."/tcpdf-config.php");
require_once(ROOT_DIR."/TCPDF/tcpdf.php");
require_once(ROOT_DIR."/pdf_drawing.php");

function rnd_bytes($len_)
{
   $res="";
   if (function_exists("random_bytes"))
      $res=random_bytes($len_);
   else
   {
      $chrs="0123456789abcdef";
      for ($i=0;$i<$len_;$i++)
         $res.=$chrs[(int)rand(0,15)];
   }
   return $res;
}

function calc_store_results($data_,$res_)
{
   if ($data_&&$res_)
      if (db_connect(DB_HOST,DB_NAME,DB_LOGIN,DB_PASSWORD,"utf8"))
      {
         $queries=[
                     "CREATE TABLE IF NOT EXISTS `siding` ( `s_index` int(20) UNSIGNED NOT NULL auto_increment, `s_figures` text NULL DEFAULT NULL , `s_stripes` text NULL DEFAULT NULL , `s_lengths` text NULL DEFAULT NULL , `s_total` decimal(23,3) UNSIGNED NOT NULL DEFAULT '0' , `s_waste` decimal(43,3) UNSIGNED NOT NULL DEFAULT '0' , `s_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(`s_index`));",
                     "INSERT INTO `siding` (`s_figures`,`s_stripes`,`s_lengths`,`s_total`,`s_waste`) VALUES (".data_to_query(json_encode($data_,JSON_ENCODE_OPTIONS)).",".data_to_query(json_encode($res_["scans"],JSON_ENCODE_OPTIONS)).",".data_to_query(json_encode($res_["panels"],JSON_ENCODE_OPTIONS)).",".data_to_query($res_["total"]).",".data_to_query($res_["waste"]).");"
                  ];
         
         perform_queries($queries);
      }
}

function decode_material($material_)
{
   $aliases=["mv"=>"Сэндвич панели МВ","pp"=>"Сэндвич панели ПП","ppu"=>"Сэндвич панели ППу","profc25"=>"Профнастил C-2.5","profc10"=>"Профнастил C-10","profhc20"=>"Профнастил HC-20","profhc44"=>"Профнастил HC-44","profh57"=>"Профнастил H-57"];
   
   $res=[
           "name"=>$aliases[$material_["name"]]??"",
           "price"=>(float)($material_["price"]??0),
           "thikness"=>(float)($material_["n"]??0),
           "max_len"=>(float)($material_["max_len"]??0),
        ];
   return $res;
}

function decode_opts($opts_)
{
   $res=[];
   
   $aliases=["spec"=>"Спецификация","drawing"=>"Чертеж раскладки","optimize"=>"Оптимизация раскладки","price"=>"Расчет стоимости"];
   foreach ($opts_ as $opt)
      $res[$opt]=$aliases[$opt];
   
   return $res;
}

function generate_report_text($opts_,$size_,$material_,$panels_,$res_,$contacts_=null,$figures_dump_=null)
{
   ob_start();
?>
<!DOCTYPE HTML>
<HTML LANG="ru">
<HEAD>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
</HEAD>
<BODY>
<?
   if ($contacts_)
   {
?>
<H3>Данные пользователя</H3>
<TABLE>
   <TR><TH>Имя</TH><TD><?=$contacts_["name"]?></TD></TR>
   <TR><TH>Телефон</TH><TD><?=$contacts_["phone"]?></TD></TR>
   <TR><TH>E-mail</TH><TD><?=$contacts_["email"]?></TD></TR>
</TABLE>
<H3>Запрос</H3>
<UL>
<?
      foreach ($opts_ as $opt)
      {
?>
   <LI><?=$opt?></LI>

<?
      }
?>
</UL>
<?
      if ($figures_dump_)
      {
         ?>
<H4>Фигуры</H4>
<DIV><?=$figures_dump_?></DIV>
         <?
      }
   }
?>
<H2>Расчет</H2>
<H3>Исходные данные</H3>
<TABLE CELLSPACING="0" CELLPADDING="5">
   <TR><TH BORDER="1">Ширина, м</TH><TD BORDER="1"><?=round($size_["w"],FLOAT_PRECISION)?></TD></TR>
   <TR><TH BORDER="1">Высота, м</TH><TD BORDER="1"><?=round($size_["h"],FLOAT_PRECISION)?></TD></TR>
   <TR><TH BORDER="1">Материал</TH><TD BORDER="1"><?=$material_["name"]?>, <?=$material_["thikness"]?></TD></TR>
</TABLE>
<H3>Результаты рассчета</H3>
<TABLE CELLSPACING="0" CELLPADDING="5">
   <TR><TH BORDER="1">Количество, шт</TH><TD BORDER="1"><?=$res_["count"]?></TD></TR>
   <TR><TH BORDER="1">Количество, м.кв</TH><TD BORDER="1"><?=round($res_["total_s"],FLOAT_PRECISION)?></TD></TR>
   <TR><TH BORDER="1">Площадь отходов, м.кв</TH><TD BORDER="1"><?=round($res_["waste"],FLOAT_PRECISION)?></TD></TR>
</TABLE>
<H3>Спецификация</H3>
<TABLE CELLSPACING="0" CELLPADDING="5">
   <TR><TH BORDER="1">Панель, м</TH><TH BORDER="1">Количество, шт</TH></TR>
<?
   foreach ($panels_ as $panel)
   {
?>
   <TR><TD BORDER="1"><?=round((float)$panel["length"],FLOAT_PRECISION)?></TD><TD BORDER="1"><?=(int)$panel["cnt"]?></TD></TR>

<?
   }
?>
</TABLE>
</BODY>
</HTML>
<?php
   return ob_get_clean();
}

function email_to_admin()
{
   $opts=decode_opts($_REQUEST["opts"]??[]);
   $contacts=array_map("htmlspecialchars",$_REQUEST["contacts"]??[]);
   $figures_dump="";//htmlspecialchars(json_encode($_REQUEST["figures"],JSON_ENCODE_OPTIONS));
   $b_box=bounding_box($_REQUEST["figures"]??[],false);
   $size=["w"=>$b_box["rt"]["x"]-$b_box["lb"]["x"],"h"=>$b_box["rt"]["y"]-$b_box["lb"]["y"]];
   $material=decode_material($_REQUEST["material"]??[]);
   $calc_results=[
                    "count"=>(int)$_REQUEST["res"]["count"],
                    "total_l"=>(float)$_REQUEST["res"]["total_l"],
                    "total_s"=>(float)$_REQUEST["res"]["total_s"],
                    "waste"=>(float)$_REQUEST["res"]["waste"],
                 ];
   
   $recipients=ADMIN_EMAIL;
   $subj="Расчет раскладки";
   $text=generate_report_text($opts,$size,$material,$_REQUEST["res"]["panels"],$calc_results,$contacts,$figures_dump);
   $attachments=[["tmp_name"=>__DIR__."/output/".date("Ymd-His-").bin2hex(rnd_bytes(5)).".pdf","name"=>"siding.pdf"]];
   generate_pdf($opts,$_REQUEST["figures"],$_REQUEST["res"]["scans"],$text,[],[],$attachments[0]["tmp_name"]);
   
   $res=send_email($recipients,$subj,$text,$attachments,MAIL_SENDER);
   
   if ($res)   //DEBUG condition
      unlink($attachments[0]["tmp_name"]);
   
   return $res;
}

function email_to_user()
{
   $opts=decode_opts($_REQUEST["opts"]);
   $b_box=bounding_box($_REQUEST["figures"],false);
   $size=["w"=>$b_box["rt"]["x"]-$b_box["lb"]["x"],"h"=>$b_box["rt"]["y"]-$b_box["lb"]["y"]];
   $material=decode_material($_REQUEST["material"]);
   $calc_results=[
                    "count"=>(int)$_REQUEST["res"]["count"],
                    "total_l"=>(float)$_REQUEST["res"]["total_l"],
                    "total_s"=>(float)$_REQUEST["res"]["total_s"],
                    "waste"=>(float)$_REQUEST["res"]["waste"],
                 ];
   
   $recipients=trim(explode(",",$_REQUEST["contacts"]["email"])[0]); //Deny to make massive emailing
   $subj="Расчет раскладки";
   $text=generate_report_text($opts,$size,$material,$_REQUEST["res"]["panels"],$calc_results);
   $attachments=[["tmp_name"=>__DIR__."/output/".date("Ymd-His-").bin2hex(rnd_bytes(5)).".pdf","name"=>"siding.pdf"]];
   generate_pdf($opts,$_REQUEST["figures"],$_REQUEST["res"]["scans"],$text,PDF_PREAMBLE,["text"=>PDF_ADS_TEXT,"image"=>PDF_ADS_IMAGE],$attachments[0]["tmp_name"]);
   
   $res=send_email($recipients,$subj,$text,$attachments,MAIL_SENDER);
   
   if ($res)   //DEBUG condition
      unlink($attachments[0]["tmp_name"]);
   
   return $res;
}

function generate_pdf($opts_,$figures_,$scans_,$text_,$preamble_=[],$ads_=[],$out_path_="")
{
   $pdf=new TCPDF(PDF_PAGE_ORIENTATION,PDF_UNIT,PDF_PAGE_FORMAT,true,"UTF-8",false);

   // set document information
   $pdf->SetCreator(PDF_CREATOR);
   $pdf->SetAuthor(PDF_AUTHOR);
   $pdf->SetTitle(PDF_HEADER_TITLE);
   
   // set default header data
   $pdf->SetHeaderData(PDF_HEADER_LOGO,PDF_HEADER_LOGO_WIDTH,PDF_HEADER_TITLE,PDF_HEADER_STRING,PDF_TITLE_COLOR,PDF_HEADER_LINE_COLOR);
   $pdf->setFooterData(PDF_TEXT_COLOR,PDF_HEADER_LINE_COLOR);
   
   // set header and footer fonts
   $pdf->setHeaderFont([PDF_FONT_NAME_MAIN,'',PDF_FONT_SIZE_MAIN]);
   $pdf->setFooterFont([PDF_FONT_NAME_DATA,'',PDF_FONT_SIZE_DATA]);

   // set default monospaced font
   $pdf->SetDefaultMonospacedFont(PDF_FONT_MONOSPACED);

   // set margins
   $pdf->SetMargins(PDF_MARGIN_LEFT,PDF_MARGIN_TOP,PDF_MARGIN_RIGHT);
   $pdf->SetHeaderMargin(PDF_MARGIN_HEADER);
   $pdf->SetFooterMargin(PDF_MARGIN_FOOTER);

   // set auto page breaks
   $pdf->SetAutoPageBreak(TRUE, PDF_MARGIN_BOTTOM);

   // set image scale factor
   $pdf->setImageScale(PDF_IMAGE_SCALE_RATIO);
   
   //Create page with preamble -----------------------------------------------------
   if ($preamble_&&$preamble_["path"]&&file_exists($preamble_["path"]))
   {
      $pdf->SetDrawColor(PDF_TEXT_COLOR[0],PDF_TEXT_COLOR[1],PDF_TEXT_COLOR[2]);
      $pdf->SetLineWidth(PDF_FIGURE_STROKE["all"]["width"]);
      $pdf->SetTextColor(PDF_TEXT_COLOR[0],PDF_TEXT_COLOR[1],PDF_TEXT_COLOR[2]);
      $pdf->SetFontSize(PDF_FONT_SIZE_MAIN);
      
      $pdf->AddPage(PDF_PAGE_ORIENTATION,PDF_PAGE_FORMAT,true);
      
      $text=file_get_contents($preamble_["path"]);
      $pdf->writeHTMLCell($preamble_["w"],$preamble_["h"],$preamble_["x"],$preamble_["y"],$text,0,1,0,true,"",true);
   }
   
   //Create page with drawing -----------------------------------------------------
   if ($opts_["drawing"])
   {
      $pdf->SetDrawColor(PDF_TEXT_COLOR[0],PDF_TEXT_COLOR[1],PDF_TEXT_COLOR[2]);
      $pdf->SetLineWidth(PDF_FIGURE_STROKE["all"]["width"]);
      $pdf->SetTextColor(PDF_TEXT_COLOR[0],PDF_TEXT_COLOR[1],PDF_TEXT_COLOR[2]);
      $pdf->SetFontSize(PDF_FONT_SIZE_MAIN);
      
      $pdf->AddPage(PDF_DRAWING_PAGE_ORIENTATION,PDF_DRAWING_PAGE_FORMAT,true);
      
      $pdf->writeHTMLCell(PDF_DRAWING_TITLE["w"],PDF_DRAWING_TITLE["h"],PDF_DRAWING_TITLE["x"],PDF_DRAWING_TITLE["y"],PDF_DRAWING_TITLE["title"],0,1,0,true,"",true);
      
      //$pdf->SetLineStyle(PDF_FIGURE_STROKE);
      //$pdf->SetFillColor(PDF_FIGURE_FILL);
      
      $b_box=bounding_box($figures_,true);
      foreach ($scans_ as $scan) //if scans are wide, they may significantly outstand from the figure sizes.
         foreach ($scan as $stripe)
         {
            if ($stripe["rect"]["rt"]["y"]>$b_box["rt"]["y"])
               $b_box["rt"]["y"]=$stripe["rect"]["rt"]["y"];
            if ($stripe["rect"]["rt"]["x"]>$b_box["rt"]["x"])
               $b_box["rt"]["x"]=$stripe["rect"]["rt"]["x"];
         }
      $tr_vect=translation_vector($b_box,PDF_DRAWING_AREA);
      //dumpr($figures_);
      //dumpr($b_box);
      //dumpr($tr_vect);
      //die();
      foreach ($figures_ as $figure)
         draw_figure($figure,PDF_FIGURE_STROKE,PDF_FIGURE_FILL,$pdf,$tr_vect,true);
      
      //dumpr($scans_);
      //die();
      
      //$pdf->SetFillColor(PDF_OVERLAY_FILL[0],PDF_OVERLAY_FILL[1],PDF_OVERLAY_FILL[2]);
      foreach ($scans_ as $scan)
         foreach ($scan as $stripe)
            draw_text_cell(round($stripe["l"],FLOAT_PRECISION),$stripe["rect"],10,PDF_OVERLAY_TEXT_COLOR,PDF_OVERLAY_STROKE,PDF_OVERLAY_FILL,0,$pdf,$tr_vect);
   }
   
   //Create page with information -----------------------------------------------------
   $pdf->SetDrawColor(PDF_TEXT_COLOR[0],PDF_TEXT_COLOR[1],PDF_TEXT_COLOR[2]);
   $pdf->SetLineWidth(PDF_FIGURE_STROKE["all"]["width"]);
   $pdf->SetTextColor(PDF_TEXT_COLOR[0],PDF_TEXT_COLOR[1],PDF_TEXT_COLOR[2]);
   $pdf->SetFontSize(PDF_FONT_SIZE_MAIN);
   
   $pdf->AddPage(PDF_PAGE_ORIENTATION,PDF_PAGE_FORMAT,true);
   
   $pdf->writeHTMLCell(PDF_INFO_AREA["w"],PDF_INFO_AREA["h"],PDF_INFO_AREA["x"],PDF_INFO_AREA["y"],$text_,0,1,0,true,"",true);

   //Create page with advertising -----------------------------------------------------
   if ($ads_["text"]||$ads_["image"])
   {
      $pdf->AddPage(PDF_PAGE_ORIENTATION,PDF_PAGE_FORMAT,true);
      if ($ads_["text"]["path"]&&file_exists($ads_["text"]["path"]))
      {
         $text=file_get_contents($ads_["text"]["path"]);
         $pdf->writeHTMLCell($ads_["text"]["w"],$ads_["text"]["h"],$ads_["text"]["x"],$ads_["text"]["y"],$text,0,1,0,true,"",true);
      }
      if ($ads_["image"]["path"]&&file_exists($ads_["image"]["path"]))
      {
         $pdf->setJPEGQuality(75);
         $pdf->Image($ads_["image"]["path"],$ads_["image"]["x"],$ads_["image"]["y"],$ads_["image"]["w"],$ads_["image"]["h"],"","TC",true,$ads_["image"]["dpi"]);
      }
   }
   
   //Output resulting file
   $pdf->Output($out_path_,"F");
   //$pdf->Output(__DIR__.'/output/example_001.pdf','F');
}

// Main code ================================================================================ //
if (($_SERVER["HTTP_X_REQUESTED_WITH"]??null)=="JSONHttpRequest")
{
   $ans=["status"=>"fail"];
   $errors=[];
   
   calc_store_results($_REQUEST["data"]??[],$_REQUEST["res"]??[]);
      
   if (!email_to_admin())
      $errors[]="Не удалось отправить запрос менеджеру.";
   
   if (!email_to_user())
      $errors[]="Не удалось отправить письмо с результатами.";
   
   if (!$errors)
      $ans["status"]="success";
   else
      $ans["errors"]=$errors;
   
   echo json_encode($ans,JSON_ENCODE_OPTIONS);
}
else
{
?>
<!DOCTYPE HTML>
<HTML LANG="ru">
<HEAD>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<META NAME="HandheldFriendly" CONTENT="true">
<META NAME="viewport" CONTENT="width=device-width, initial-scale=1">
<META NAME="robots" CONTENT="index, follow">
<META NAME="description" CONTENT="[[page_description]]">
<META NAME="keywords" CONTENT="[[page_keywords]]">
<TITLE>SidingCalc</TITLE>
<LINK REL="icon" HREF="<?=PAGE_ROOT?>/favicon.png" TYPE="image/png">
<LINK REL="stylesheet" HREF="<?=PAGE_ROOT?>/main.css" TYPE="text/css">
</HEAD>
<BODY>
   <DIV CLASS="virtus_calc">
      <SCRIPT TYPE="module">
         import {initCheckboxes,initRadios} from '/core/js_utils.js';
         import * as Tools from '/tools.js';
         import {CalcTool} from '/calc.js';
         import {Drawer} from '/drawer.js';
         
         function initDrawer()
         {
            var drawerTools=[
                               Tools.StepsTool,
                               Tools.RectTool,
                               Tools.TriangleTool,
                               Tools.TrapezoidTool,
                               Tools.PolyLineTool,
                               Tools.MemoryTool,
                               CalcTool,
                            ];
            window.drawer=new Drawer({mainBox:document.querySelector('.drawer'),size:{w:1024,h:540},tools:drawerTools});
         }
         document.addEventListener('DOMContentLoaded',initDrawer);
         document.addEventListener('DOMContentLoaded',initCheckboxes);
         document.addEventListener('DOMContentLoaded',initRadios);
      </SCRIPT>
      <DIV CLASS="steps_bar flex"></DIV>
      <DIV CLASS="drawer flex x-stretch">
         <DIV CLASS="main_panel flex col x-stretch">
            <DIV CLASS="paintbox"></DIV>
            <DIV CLASS="statusbar flex"></DIV>
         </DIV>
         <DIV CLASS="scrollbox y">
            <DIV CLASS="toolbox flex col x-stretch"></DIV>
         </DIV>
      </DIV>
   </DIV>
</BODY>
</HTML>
<?php
}
?>