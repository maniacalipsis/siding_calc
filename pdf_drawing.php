<?php
function points_bounding_box($points_)
{
   $res=["lb"=>array_shift($points_)];
   $res["rt"]=$res["lb"];
   
   foreach ($points_ as $point)
   {
      if ($point["x"]<$res["lb"]["x"])
         $res["lb"]["x"]=$point["x"];
      if ($point["x"]>$res["rt"]["x"])
         $res["rt"]["x"]=$point["x"];
      
      if ($point["y"]<$res["lb"]["y"])
         $res["lb"]["y"]=$point["y"];
      if ($point["y"]>$res["rt"]["y"])
         $res["rt"]["y"]=$point["y"];
   }
   
   return $res;
}

function append_bounding_box(&$resBox_,$box_)
{
   if ($box_["lb"]["x"]<$resBox_["lb"]["x"])
      $resBox_["lb"]["x"]=$box_["lb"]["x"];
   if ($box_["rt"]["x"]>$resBox_["rt"]["x"])
      $resBox_["rt"]["x"]=$box_["rt"]["x"];
   
   if ($box_["lb"]["y"]<$resBox_["lb"]["y"])
      $resBox_["lb"]["y"]=$box_["lb"]["y"];
   if ($box_["rt"]["y"]>$resBox_["rt"]["y"])
      $resBox_["rt"]["y"]=$box_["rt"]["y"];
   
   return $resBox_;
}

function bounding_box(&$figures_,$assign_local_=false)
{
   $b_boxes=[];
   
   foreach ($figures_ as &$figure)
   {
      switch ($figure["type"])
      {
         case "rect":
         {
            $b_box=$figure["rect"];
            break;
         }
         case "polyline":
         {
            $b_box=points_bounding_box($figure["points"]);
            break;
         }
         case "compound":
         {
            $b_box=null;
            foreach ($figure["polyLines"] as $i=>$points)
               if ($figure["style"]["modes"][$i]!="cut")
               {
                  $sub_box=points_bounding_box($points);
                  $b_box=($b_box ? append_bounding_box($b_box,$sub_box) : $sub_box);
               }
            break;
         }
      }
      if ($assign_local_)
         $figure["bBox"]=$b_box;
      
      $b_boxes[]=$b_box;
   }
   
   $res=array_shift($b_boxes);
   foreach ($b_boxes as $b_box)
      append_bounding_box($res,$b_box);
   
   return $res;
}

function translation_vector($world_rect_,$page_rect_)
{
   $res=["x"=>0,"y"=>0,"w"=>1,"h"=>1];
   
   $scale_x=($page_rect_["rt"]["x"]-$page_rect_["lb"]["x"])/($world_rect_["rt"]["x"]-$world_rect_["lb"]["x"]);
   $scale_y=($page_rect_["lb"]["y"]-$page_rect_["rt"]["y"])/($world_rect_["rt"]["y"]-$world_rect_["lb"]["y"]); //NOTE: page Y is inverted.
   
   $scale=min($scale_x,$scale_y);
   
   $res["w"]=$scale;
   $res["h"]=$scale;
   
   $res["x"]=$world_rect_["lb"]["x"]*$scale+$page_rect_["lb"]["x"];
   $res["y"]=$page_rect_["rt"]["y"]+($page_rect_["lb"]["y"]-$page_rect_["rt"]["y"]);
   
   return $res;
}

function translate_point($point_,$tr_vect_)
{
   return [
             "x"=>$point_["x"]*$tr_vect_["w"]+$tr_vect_["x"],
             "y"=>$tr_vect_["y"]-$point_["y"]*$tr_vect_["h"]
          ];
}

function draw_figure($figure_,$stroke_,$fill_,$pdf_,$tr_vect_,$draw_sizes_=false)
{
   $draw_mode=($stroke_ ? "D" : "").($fill_ ? "F" : "");
   
   switch ($figure_["type"])
   {
      case "polyline":
      {
         $p_data=[];
         foreach ($figure_["points"] as $point)
         {
            $point=translate_point($point,$tr_vect_);
            $p_data[]=$point["x"];
            $p_data[]=$point["y"];
         }
         $pdf_->Polygon($p_data,$draw_mode,$stroke_,($figure_["style"]["mode"]=="cut" ? [255,255,255] : $fill_),true);
         
         break;
      }
      case "compound":
      {
         foreach ($figure_["polyLines"] as $i=>$points)
         {
            $p_data=[];
            foreach ($points as $point)
            {
               $point=translate_point($point,$tr_vect_);
               $p_data[]=$point["x"];
               $p_data[]=$point["y"];
            }
            $pdf_->Polygon($p_data,$draw_mode,$stroke_,($figure_["style"]["modes"][$i]=="cut" ? [255,255,255] : $fill_),true);
         }
         break;
      }
      case "rect":
      default:
      {
         $lb=translate_point($figure_["rect"]["lb"],$tr_vect_);
         $rt=translate_point($figure_["rect"]["rt"],$tr_vect_);
         $pdf_->Rect($lb["x"],$rt["y"],$rt["x"]-$lb["x"],$lb["y"]-$rt["y"],$draw_mode,["all"=>$stroke_],($figure_["style"]["mode"]=="cut" ? [255,255,255] : $fill_));
         break;
      }
   }
   
   if ($draw_sizes_)
   {
      //TODO: draw figure sizes
   }
}

function draw_text_cell($text_,$rect_,$font_size_,$color_,$stroke_,$fill_,$rotation_,$pdf_,$tr_vect_=null)
{
   $lb=($tr_vect_ ? translate_point($rect_["lb"],$tr_vect_) : $rect["lb"]);
   $rt=($tr_vect_ ? translate_point($rect_["rt"],$tr_vect_) : $rect_["rt"]);
   
   $cell_h=$lb["y"]-$rt["y"];
   $font_size=min($cell_h/0.3528,PDF_FONT_SIZE_DATA);
   
   $pdf_->SetDrawColor($stroke_["all"]["color"][0],$stroke_["all"]["color"][1],$stroke_["all"]["color"][2]);
   $pdf_->SetLineWidth($stroke_["all"]["width"]);
   $pdf_->SetTextColor($color_[0],$color_[1],$color_[2]);
   $pdf_->SetFontSize($font_size);
   $pdf_->SetXY($lb["x"],$rt["y"]);
   $pdf_->Cell($rt["x"]-$lb["x"],$cell_h,$text_,1,0,"C",false,"",0,true,"T","M");
}

?>