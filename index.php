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
   $aliases=["mv"=>"Сэндвич панели МВ","pp"=>"Сэндвич панели ПП","ppu"=>"Сэндвич панели ППу"];
   
   $res=[
           "name"=>$aliases[$material_["name"]],
           "price"=>(float)$material_["price"],
           "width"=>(float)$material_["h"],
           "max_len"=>(float)$material_["max_len"]
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

function generate_report_text($opts_,$figures_,$material_,$panels_,$res_,$contacts_=null)
{
   ob_start();
?>
<!DOCTYPE HTML>
<HTML LANG="ru">
<HEAD>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
</HEAD>
<BODY>
<?php
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
<?php
      foreach ($opts_ as $opt)
      {
?>
   <LI><?=$opt?></LI>

<?php
      }
?>
</UL>
<H3>Исходные параметры</H3>
<TABLE>
   <TR><TH>Фигуры</TH><TD><?=$figures_?></TD></TR>
   <TR><TH>Материал</TH><TD><?=$material_["name"]?>, <?=$material_["width"]?> (<?=$material_["price"]?>р/п.м.)</TD></TR>
</TABLE>
<?php
   }
   else
   {
?>
<H3>Исходные параметры</H3>
<TABLE>
   <TR><TH>Материал</TH><TD><?=$material_["name"]?>, <?=$material_["width"]?> (<?=$material_["price"]?>р/п.м.)</TD></TR>
</TABLE>
<?php
   }
?>
<H3>Результаты рассчёта</H3>
<TABLE>
   <TR><TH>Всего листов:</TH><TD><?=$res_["count"]?></TD></TR>
   <TR><TH>Количество:</TH><TD><?=$res_["total_s"]?></TD></TR>
<?php
   if ($opts_["price"])
   {
?>
   <TR><TH>Стоимость:</TH><TD><?=round($res_["total_l"]*$material_["price"],FLOAT_PRECISION)?></TD></TR>
<?php
   }
?>
   <TR><TH>Площадь отходов:</TH><TD><?=round($res_["waste"],FLOAT_PRECISION)?></TD></TR>
</TABLE>
<H4>Панели</H4>
<TABLE>
<?php
   foreach ($panels_ as $panel)
   {
?>
   <TR><TD><?=round((float)$panel["length"],FLOAT_PRECISION)?>м</TD><TD><?=(int)$panel["cnt"]?>шт.</TD></TR>

<?php
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
   $opts=decode_opts($_REQUEST["opts"]);
   $contacts=array_map("htmlspecialchars",$_REQUEST["contacts"]);
   $figures=htmlspecialchars(json_encode($_REQUEST["figures"],JSON_ENCODE_OPTIONS));
   $material=decode_material($_REQUEST["material"]);
   $calc_results=[
                    "count"=>(int)$_REQUEST["res"]["count"],
                    "total_l"=>(float)$_REQUEST["res"]["total_l"],
                    "total_s"=>(float)$_REQUEST["res"]["total_s"],
                    "waste"=>(float)$_REQUEST["res"]["waste"],
                 ];
   
   $recipients=ADMIN_EMAIL;
   $subj="Расчет раскладки";
   $text=generate_report_text($opts,$figures,$material,$_REQUEST["res"]["panels"],$calc_results,$contacts);
   $attachments=[["tmp_name"=>__DIR__."/output/".date("Ymd-His-").bin2hex(random_bytes(5)),"name"=>"siding.pdf"]];
   generate_pdf($opts,$_REQUEST["figures"],$_REQUEST["res"]["scans"],$text,$attachments[0]["tmp_name"]);
   
   $res=send_email($recipients,$subj,$text,$attachments,MAIL_SENDER);
   
   unlink($attachments[0]["tmp_name"]);
   
   return $res;
}

function email_to_user()
{
   $opts=decode_opts($_REQUEST["opts"]);
   $contacts=array_map("htmlspecialchars",$_REQUEST["contacts"]);
   $figures=htmlspecialchars(json_encode($_REQUEST["figures"],JSON_ENCODE_OPTIONS));
   $material=decode_material($_REQUEST["material"]);
   $calc_results=[
                    "count"=>(int)$_REQUEST["res"]["count"],
                    "total_l"=>(float)$_REQUEST["res"]["total_l"],
                    "total_s"=>(float)$_REQUEST["res"]["total_s"],
                    "waste"=>(float)$_REQUEST["res"]["waste"],
                 ];
   
   $recipients=trim(explode(",",$_REQUEST["contacts"]["email"])[0]); //Deny to make massive emailing
   $subj="Расчет раскладки";
   $text=generate_report_text($opts,$figures,$material,$_REQUEST["res"]["panels"],$calc_results);
   $attachments=[["tmp_name"=>__DIR__."/output/".date("Ymd-His-").bin2hex(random_bytes(5)),"name"=>"siding.pdf"]];
   generate_pdf($opts,$_REQUEST["figures"],$_REQUEST["res"]["scans"],$text,$attachments[0]["tmp_name"]);
   
   $res=send_email($recipients,$subj,$text,$attachments,MAIL_SENDER);
   
   unlink($attachments[0]["tmp_name"]);
   
   return $res;
}

function generate_pdf($opts_,$figures_,$scans_,$text_,$out_path_="")
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
   
   //Create page with drawing -----------------------------------------------------
   if ($opts_["drawing"])
   {
      $pdf->AddPage(PDF_DRAWING_PAGE_ORIENTATION,PDF_DRAWING_PAGE_FORMAT,true);
      
      //$pdf->SetLineStyle(PDF_FIGURE_STROKE);
      //$pdf->SetFillColor(PDF_FIGURE_FILL);
      
      $b_box=bounding_box($figures_,true);
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
   $pdf->writeHTMLCell(0,0,"","",$text_,0,1,0,true,"",true);
   
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