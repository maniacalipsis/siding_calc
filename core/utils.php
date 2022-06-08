<?php
/*==================================*/
/* The Pattern Engine Version 3.0   */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Core utility functions           */
/*==================================*/

/*===========================================================================================================*/
/* This file is part of The Pattern Engine.                                                                  */
/* The Pattern Engine is free software: you can redistribute it and/or modify it under the terms of the      */
/* GNU General Public License as published by the Free Software Foundation, either version 3 of the License. */
/* The Pattern Engine is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;           */
/* without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.                 */
/* See the GNU General Public License for more details.                                                      */
/* You should have received a copy of the GNU General Public License along with The Pattern Engine.          */
/* If not, see http://www.gnu.org/licenses/.                                                                 */
/*===========================================================================================================*/

//Depends on:
// settings.php

/* Unsorted */
/* NOTE: functions in this section are may be a subject to reallocate among other sections */

function is_not_null($val_)
{
   //May be used as callback for e.g. array_filter().
   
   return !is_null($val_);
}

function similar($a_,$b_)
{
   //$a_ == $b_ - Equal (after type juggling); $a_ === $b_ - Identical (both types and values are equal); same($a_,$b_) - meaning the similar things.
   //In some cases like a request, 0 and false doesn't means the same as NULL, "" and []. Also "" and [] are means the same - the "nothing".
   //Thus both of == and === aren't suitable for testing two values for similarity.
   //As the == is more equal for the task, the same() uses it after excluding of that cases when the == "misses".
   
   return (($a_===0||$a_===false)&&(is_null($b_)||$b_===""||$b_===[]))||(($b_===0||$b_===false)&&(is_null($a_)||$a_===""||$a_===[])) ? false : (($a_===""&&$b_===[])||($b_===""&&$a_===[]) ? true : $a_==$b_);
}

/* --------------------------------------- string utilities --------------------------------------- */
function to_bool($val_)
{
   //Returns true if val_ may be understood as some variation of boolean true.

   return (is_bool($val_) ? $val_ : preg_match("/^(1|\+|on|ok|true|positive|y|yes|да)$/i",$val_));   //All, what isn't True - false.
}

function is_any_bool($val_)
{
   //Detects can the val_ be considered a some kind of boolean.
   
   return preg_match("/^(1|\+|on|ok|true|y|yes|да|0|-|off|not ok|false|negative|n|no|нет)$/i",$val_);
}

function concat_links(...$links_)
{
   //Concatenates several parts of URL path.
   
   $res="";
   $cnt=count($links_);
   for ($i=0;$i<$cnt-1;$i++)
      $res.=preg_replace("/\\/index\\.([xs]?htm[l]?|php)$/i","/",$links_[$i]);
   return $res;
}

function split_multi_query($multi_query_)
{
   //Explodes concatenated SQL queries.
   
   $res=[];
   
   $not_quoted=true;
   $query_start=0;
   $len=strlen($multi_query_);
   for ($i=0;$i<$len;$i++)
   {
      if (($multi_query_[$i]=="'")&&($multi_query_[$i-1]!="\\"))
         $not_quoted=!$not_quoted;
      elseif (($multi_query_[$i]==";")&&$not_quoted)
      {
         $query=trim(substr($multi_query_,$query_start,$i-$query_start));
         if ($query!="")
            $res[]=$query.";";
         $query_start=$i+1;
      }
   }
   $query=trim(substr($multi_query_,$query_start));
   if ($query!="")
      $res[]=$query.";";
   
   return $res;
}

function mb_ucfirst($str_)
{
   //While mb_convert_case() has no native option to uppercase only the first letter as ucfirst() do, this function will do this instead it.
   
   return $str_=="" ? $str_ : mb_convert_case(mb_substr($str_,0,1),MB_CASE_UPPER).mb_convert_case(mb_substr($str_,1),MB_CASE_LOWER);
}

function mb_icmp($str1_,$str2_)
{
   //Multibyte case insensitive compare
   
   return strcmp(mb_convert_case($str1_,MB_CASE_LOWER),mb_convert_case($str2_,MB_CASE_LOWER));
}

function blend_with_spices($substance_,$spice_)
{
   //Blends login and password withh salt and pepper before frying with hash().
   //This function works in pair with the same JS one on the client side.
   
   $len=min(mb_strlen($substance_),mb_strlen($spice_));
   $mix="";
   for ($i=0;$i<$len;$i++)
      $mix.=mb_substr($spice_,$i,1).mb_substr($substance_,$i,1);
   $mix.=(mb_strlen($spice_)>$len) ? mb_substr($spice_,$len) : mb_substr($substance_,$len);
   
   return $mix;
}

/* --------------------------------------- array utilities --------------------------------------- */
function array_keys_to_labels(array $array_)
{
   //It is like array_keys(), but also adds [[ ]] to use keys in str_replace.
   //Usage: $data=["a"=>1,"b"=>2,"sum"=>3]; $template="[[a]]+[[b]]=[[sum]]"; echo str_replace(array_keys_to_labels($data),$data,$template);
   
   $res=[];
   
   foreach ($array_ as $key=>$val)
      $res[]="[[".$key."]]";
   
   return $res;
}

function array_take_a_place(&$array_,$value_=NULL)
{
   //Takes a place for a new element in the array and returns its key
   
   array_push($array_,$value_);
   end($array_);
   return key($array_);
}

function set_element_recursively(&$array_,array $key_sequence_,$value_)
{
   //[Re]places $value_ into multidimensional $array_, using a sequence of keys from the argument $key_sequence_. Makes missing dimensions.
   
   $curr_key=array_shift($key_sequence_);
   if ($curr_key=="")
      $curr_key=array_take_a_place($array_); //if key is empty, then new element with autoincremental numeric index will be appended.
   
   if (count($key_sequence_)>0)
   {
      if (!is_array($array_[$curr_key]))
         $array_[$curr_key]=[];
      set_element_recursively($array_[$curr_key],$key_sequence_,$value_);
   }
   else
      $array_[$curr_key]=$value_;
}

function get_array_element($array_,array $key_sequence_)
{
   foreach ($key_sequence_ as $key)
      if (is_array($array_))
         $array_=$array_[$key];
      else
      {
         $array_=NULL;
         break;
      }
   
   return $array_;
}

function rows_search($needle_key_,$needle_val_,array $rows_,$cmp_func_=NULL)
{
   //Returns key of the row if row has matched element or boolean false otherwise.
   
   $res=false;
   
   if (is_null($cmp_func_))
   {
      foreach ($rows_ as $key=>$row)
         if ($row[$needle_key_]==$needle_val_)
         {
            $res=$key;
            break;
         }
   }
   else
   {
      foreach ($rows_ as $key=>$row)
         if ($cmp_func_($row[$needle_key_],$needle_val_)==0)
         {
            $res=$key;
            break;
         }
   }
   
   return $res;
}

/* --------------------------------------- [de]serialization --------------------------------------- */
function deserialize_nameval($text_,$separator_="\n",$eq_="=",$val_trim_mask_=" \t")
{
   //Argument $text_ is a common set of parameters in name=value (by default) or any similar format.
   //$separator_ is substr which separates parameters, $eq_ separates name and value of each parameter
   //Reuslt is an associative array.
   $res=[];

   $lines=explode($separator_,$text_);
   foreach ($lines as $line)
      {
         $pair=explode($eq_,$line,2);
         $name=trim($pair[0]);
         if ($name!="")
            $res[$name]=trim($pair[1],$val_trim_mask_);
      }

   return $res;
}

function deserialize_url_query($req_)
{
   //This function is suitable to parse any string, containing arry serialized like an URL query. Multidimensional arrays are supported.
   //NOTE: empty key names are understood literally: "=a&=b" will be parsed as [""=>"b"],
   //      but keys with empty indexes will result array with autoincremental indexes: "k[]=a&k[]=b" will be parsed as ["k"=>["a","b"]].
   //NOTE: unlike builtin parse_str(), this function don't restricts key names to valid variable identifiers and don't applies any replacements to them.
   //NOTE: to avoid incorrect parsing, keys and values that may contain "&", "=", "[" and "]" should be urlencode()d.
   
   $res=[];
   
   $statements=explode("&",$req_);
   foreach ($statements as $statement)
      if ($statement!="")
      {
         $pair=explode("=",$statement,2);
         if (preg_match("/^([^\[\]]+)\[(.*)\]$/",$pair[0],$name_matches))
            {
               $keys=explode("][",$name_matches[2]);
               array_unshift($keys,$name_matches[1]);
               set_element_recursively($res,array_map(rawurldecode,$keys),rawurldecode($pair[1]));
            }
         else
            $res[rawurldecode($pair[0])]=rawurldecode($pair[1]);
      }
   
   return $res;
}

function serialize_url_query($url_query_,$parent_=NULL)
{
   $res_arr=[];
   
   foreach ($url_query_ as $key=>$val)
   {
      $full_key=isset($parent_) ? $parent_."[".rawurlencode($key)."]" : rawurlencode($key);
      $res_arr[]=is_array($val) ? serialize_url_query($val,$full_key) : $full_key."=".rawurlencode($val);
   }
   
   return implode("&",$res_arr);
}

function deserialize_rel_url($reqstr_,$clean_=false)
{
   //NOTE: setting $clean_ to true will make result irreversible. But this is useful if you want to parse the URL-path to request parameters.
   
   $parts=explode("?",$reqstr_,2);
   
   //explode URL path to the enumerated array:
   $enumerated=array_map(rawurldecode,explode("/",trim($parts[0],"/")));
   
   if ($clean_)
   {
     $last_i=count($enumerated)-1;
     $enumerated[$last_i]=preg_replace("/[.](php|html|shtml|htm|xml)$/i","",$enumerated[$last_i]);
     if (strtolower($enumerated[$last_i])=="index")
        unset($enumerated[$last_i]);
   }
      
   //parse URL query to the associative array:
   $associative=deserialize_url_query($parts[1]);
      
   return array_merge($enumerated,$associative);
}

function serialize_rel_url($url_params_)
{
   $res="";
   
   
   //Concat params with integer keys to URL's document path. NOTE: as the path part of the URL is before the query part, so integer keys must be before the non integer.
   reset($url_params_);
   while (is_numeric(key($url_params_)))
   {
      $val=current($url_params_);
      $res.="/".rawurlencode($val);
      next($url_params_);
   }
   if (strrpos($val,".")===false)   //Try to recognize the last param as a directory or a file by existing of a dot character.
      $res.="/";                    //If it has no dot within, then suppose that it is a directory.
   
   //Continue serialization if $url_params_ has non integer keys from query part of the URL.
   $key=key($url_params_);
   if (!is_null($key))
      $res.="?";
   while (!is_null($key))
   {
      $val=current($url_params_);
      $res.="&".(is_array($val) ? serialize_url_query($val,rawurlencode($key)) : rawurlencode($key)."=".rawurlencode($val));
      
      next($url_params_);
      $key=key($url_params_);
   }
   
   //The old implementation:
   //$sep="?";
   //foreach ($url_params_ as $key=>$val)
   //   if (is_numeric($key))
   //      $res.="/".rawurlencode($val);
   //   else
   //   {
   //      $res.=$sep.(is_array($val) ? serialize_url_query($val,rawurlencode($key)) : rawurlencode($key)."=".rawurlencode($val));
   //      
   //      if ($sep=="?")
   //         $sep="&";
   //   }
   
   return $res;
}

function deserialize_descriptor($str_)
{
   //Serialazed query expression descriptor in full form is:
   //See core/readme.txt for detailed information about descriptors.
   //    sql_expression"title"{wrapper?paramstr}#flags
   //sql_expression - `column_name` or any valid select statement.
   //                 While making of SELECT statements, if the sql_expression is defined, then <expression> AS `alias` statement will be made, where alias is the descriptor's key. Without sql_expression, the descriptor's key will be used as name of column.
   //                 For data-modifying queries sql_expression allow mapping between data keys and column names. It should contain `column_name` which to be used in query for that descriptor's key. If it omitted, then descriptor's key will be used as column name.
   //wrapper - wrapper name. It is recommended to exactly designate wrapper in every descriptor and don't rely on DEFAULT_WRAPPER value.
   //paramstr - parameters for wrapper. Generally - is optional, in fact - it depends on each certain wrapper.
   //flags - is a #-separated appendix, defines some boolean properties:
   $descriptor=[];

   if (preg_match("/(\"([^\"\"]*)\")?({(([a-z0-9_]*)([?]([^{}]*))?)})?(#([#a-z0-9]+))?$/i",$str_,$matches))  //this regexp extracts title, wrapper, paramstr and flags
      {
         $expr_len=strlen($str_)-strlen($matches[0]); //expr is that in the beginng of string, what is not matched.
         if ($expr_len)
            $descriptor["expr"]=substr($str_,0,$expr_len);  

         if ($matches[2])
            $descriptor["title"]=$matches[2];
         
         if ($matches[5])
            {
               $descriptor["wrp"]=$matches[5];
               $descriptor["params"]=deserialize_url_query($matches[7]);
            }
         else
            {
               $descriptor["wrp"]=DEFAULT_WRAPPER;
               $descriptor["params"]=DEFAULT_PARAMS;
            }
         
         if (isset($matches[9]))
         {
            $flags=explode("#",$matches[9]);
            foreach ($flags as $flag)
               $descriptor[$flag]=true;
         }
      }
   elseif (DEBUG)
      {
         echo "Function deserialize_descriptor failed to parse string \"".$str_."\":<br>\n";
         echo "<br>\n";
      }
   
   return $descriptor;
}

function deserialize_descriptors($text_,$separator_=DB_LINE_END)
{
   //Userialize the set of descriptor from the text
   
   $desc_list=deserialize_nameval($text_,$separator_);

   foreach($desc_list as $alias=>$str)
      $desc_list[$alias]=deserialize_descriptor($str,$alias);

   return $desc_list;
}

/* --------------------------------------- HTML forms, inputs --------------------------------------- */
function serialize_element_attrs($attrs_=NULL)
{
   //TODO: RENAME THIS FUNCTION TO serialize_element_attrs cause it is reverse for DEserialization.
   
   //This function allows to almost completely make any HTML element from associative array of its attributes. E.g.: echo "<INPUT".serialize_element_attrs(["name"=>"a","class"=>"someclass","value"=>$value]).">";
   //NOTE: but it is actually slower than echo "<INPUT NAME=\"a\" CLASS=\"someclass\" VALUE=\"".$value."\">";
   //NOTE: this function doesn't checks are the attributes correct and suitable for the HTML element you making with it.
   
   $res="";
   if ($attrs_)
   {
      foreach ($attrs_ as $aname_=>$aval_)
         if (preg_match("/^(autofocus|allowfullscreen|checked|disabled|formnovalidate|hidden|multiple|readonly|required|selected)$/i",$aname_))
            $res.=(to_bool($aval_) ? " ".strtoupper($aname_) : "");
         else
            $res.=" ".strtoupper($aname_)."=\"".htmlspecialchars(str_replace("\n"," ",$aval_),ENT_COMPAT|ENT_HTML5)."\"";
   }
   
   return $res;
}

function html_select($name_,array $variants_,$default_="",$attrs_=[])
{
   //Arguments:
   // $name_ - name of the element.
   // $variants_ - "key"=>"val" associative array of variants of choise, where "key" is an actual value of option and "val" is a text displaying for the option.
   // $default_ - the value of selected option.
   // $attrs_ - any attributes, suitable for this HTML element.
   
   //NOTE: set attribute "multiple" to allow multiple selection
   $res="<SELECT NAME=\"".$name_.($attrs_["multiple"] ? "[]" : "")."\"".serialize_element_attrs($attrs_).">";
   
   $defaults=is_array($default_) ? $default_ : explode(",",$default_);
   foreach ($variants_ as $val=>$opt)
   {
      $sel="";
      if (is_array($opt))
      {
         $opt_text=$opt["text"];
         $opt_attrs=serialize_element_attrs($opt["attrs"]);
      }
      else
      {
         $opt_text=$opt;
         $opt_attrs="";
      }
      
      if ($attrs_["multiple"])
      {
         foreach ($defaults as $def)
            if (similar($val,$def))
            {
               $sel=" SELECTED";
               break;
            }
      }
      elseif (similar($val,$default_))
         $sel=" SELECTED";
      
      $res.="<OPTION VALUE=\"".htmlspecialchars($val,ENT_COMPAT|ENT_HTML5)."\"".$opt_attrs.$sel.">".$opt_text."</OPTION>";
   }
   
   $res.="</SELECT>";
   
   return $res;
}

function pager($info_,array $templates_=NULL,$page_key_="page")
{
   //Displays info about amount of data and the list of links (or other elements) to available pages while paginal data output.
   //Arguments:
   // $info_ - array with info about amount of available data usually provided by function get_data(). Contains following keys: "rows_per_page","count","total","page","page_start","page_end","pages_total". See descriptions of get_data() and make_limit_clause() for details.
   // $page_key_ - the key within URL_PARAMS that is to hold value of requested page. E.g. in URL "/some-data/5/" where page is 5, $page_key_==1; or if URL is like "/some-data/?page=5" - the default value "page" is suitable.
   // $templates_ - array containing 6 subtemplates of pager:
   //       [0] and [5] - are opening and closing parts of pager block.
   //       [1] and [4] - are templates for the links to first and last pages (but if the current page is the first or the last, then corresponding part will not be displayed).
   //       [2] and [3] - are templates for elements of the page list: [2] is template for the current page and [3] is template for the other ones.
   //    Following labels are available for each of them:
   //       [[rows_per_page]], [[count]], [[total]], [[page_start]], [[page_end]] - are info about rows.
   //       [[first_link]] - link to the first page, that hasn't page paremeter.
   //       [[prev_link]], [[next_link]] - links to the previous and the next pages (may be equal to first_link under certain conditions).
   //       [[prev]], [[next]] - numbers of the previous and the next pages.
   //       [[page]] - for the [0],[1],[2],[4] and [5] subtemplates it is a number of the currently displayed page. For the subtemplate [3] it is a number of the each page in page list.
   //       [[link]] - valid only for the subtemplate [3], it is a link to certain page in pages list.
   //       [[last_link]] - link to the last page.
   //       [[pages_total]]" - number of the last page.
   //
   //NOTE: function get_data() will prowide nothing but $info_["count"] if selection mode is not paginal.
   
   $res="";
   
   if ($info_)
   {
      //Use default templates if no special given
      if (!$templates_)  //Both NULL and [] are should be substituted with default templates, but may attempt to use an undersized array (also, as an oversized).
         $templates_=["<DIV>","<A HREF=\"[[first_link]]\" CLASS=\"first\">&lt;&lt;</A><A HREF=\"[[prev_link]]\" CLASS=\"prev\">&lt;</A>","<SPAN CLASS=\"current\">[[page]]</SPAN>","<A HREF=\"[[link]]\">[[page]]</A>","<A HREF=\"[[next_link]]\" CLASS=\"next\">&gt;</A><A HREF=\"[[last_link]]\" CLASS=\"last\">&gt;&gt;</A>","</DIV>"];
      
      //Get URL params if they aren't defined globally
      $url_par=deserialize_rel_url($_SERVER["REQUEST_URI"]);   //NOTE: pager() can't use the const URL_PARAMS because it is parsed in irreversible mode.
      
      //Prepare constant data (links to the first and last pages, total number of pages, etc.)
      $const_data=$info_;
      unset($const_data["page"]); //cause "[[page]]" is also a label in [2] and [3] subtemplates that are templates for the items in page list.
      
      if (!is_numeric($page_key_))                                                                                       //first page
         unset($url_par[$page_key_]);                                                                                    //
      $const_data["first_link"]=serialize_rel_url($url_par);                                                             //
      
      $url_par[$page_key_]=max(1,$info_["page"]-1);                                                                      //previous page
      $const_data["prev_page"]=$url_par[$page_key_];                                                                     //
      $const_data["prev_link"]=($const_data["prev_page"]==1) ? $const_data["first_link"] : serialize_rel_url($url_par);  //
      
      $url_par[$page_key_]=min($info_["pages_total"],$info_["page"]+1);                                                  //next page
      $const_data["next_page"]=$url_par[$page_key_];                                                                     //
      $const_data["next_link"]=serialize_rel_url($url_par);                                                              //
      
      $url_par[$page_key_]=$info_["pages_total"];                                                                        //last page
      $const_data["last_link"]=($info_["pages_total"]==1) ? $const_data["first_link"] : serialize_rel_url($url_par);     //
      
      $data_keys=array_keys_to_labels($const_data);                                                                      //
      for ($i=0;$i<6;$i++)                                                                                               //
         $templates_[$i]=str_replace($data_keys,$const_data,$templates_[$i]);                                              //insert constant data into whole template atonce
      
      //Start output
      $res=str_replace("[[page]]",$info_["page"],$templates_[0]);         //opening pager block
      
      if ($info_["page"]>1)                                                //block for links to the first and previous pages
         $res.=str_replace("[[page]]",$info_["page"],$templates_[1]);     //
      
      $start=max(1,$info_["page"]-5);                                      //11 nearby pages:
      $end=min($info_["page"]+5,$info_["pages_total"]);
      for ($p=$start;$p<=$end;$p++)
         if ($p==$info_["page"])
            $res.=str_replace("[[page]]",$info_["page"],$templates_[2]);  // list element for current page
         else
         {
            $url_par[$page_key_]=$p;
            $link=($p==1) ? $const_data["first_link"] : serialize_rel_url($url_par);
            $res.=str_replace(["[[page]]","[[link]]"],[$p,$link],$templates_[3]);        // list element for other pages
         }
      
      if ($info_["page"]<$info_["pages_total"])                            //block for links to the naxt and last pages
         $res.=str_replace("[[page]]",$info_["page"],$templates_[4]);     //
      
      $res.=str_replace("[[page]]",$info_["page"],$templates_[5]);        //closing pager block
   }
   
   return $res;
}

/* --------------------------------------- error reporting,etc --------------------------------------- */
function message_box($type_,$messages_)
{
   return "<DIV CLASS=\"message ".$type_."\">".(is_array($messages_) ? "<P>".implode("</P><P>",$messages_)."</P>" : $messages_)."</DIV>";
}

function code_report($msg_,$code_)
{
   return $msg_."<PRE>".htmlspecialchars($code_,ENT_COMPAT|ENT_HTML5)."</PRE>";
}

function query_report_error($error_,$query_)
{
   global $LOCALE;
   
   return $LOCALE["Error_in_query"].": ".$error_."<PRE>".htmlspecialchars($query_,ENT_COMPAT|ENT_HTML5)."</PRE>";
}
function query_report_success($affected_rows_,$query_)
{
   global $LOCALE;
   
   return $LOCALE["Query_succeeded"].", ".$LOCALE["affected_rows"].": ".$affected_rows_."<BR>\n<PRE>".htmlspecialchars($query_,ENT_COMPAT|ENT_HTML5)."</PRE>";
}

define("SPOILER_FOLDED","");
define("SPOILER_UNFOLDED","unfolded");
define("SPOILER_SEMI","semi");
function spoiler($contents_,$state_=SPOILER_FOLDED,$additional_classes_="")
{
   return "<DIV CLASS=\"spoiler ".$additional_classes_." ".$state_."\">\n".
          "  <DIV CLASS=\"button top\"></DIV>\n".
          "  <DIV CLASS=\"content\">\n".
          $contents_.
          "  </DIV>\n".
          "  <DIV CLASS=\"button bottom\"></DIV>\n".
          "</DIV>\n";
}

function dump(...$args_)
{
   foreach ($args_ as $arg)
   {
      echo "\n<pre>";
      var_dump($arg);
      echo "</pre>\n";
   }
}

function dumpr(...$args_)
{
   foreach ($args_ as $arg)
   {
      echo "\n<pre>";
      
      if (is_array($arg))
         print_r($arg);
      else
         echo $arg;
      
      echo "</pre>\n";
   }
}

/* --------------------------------------- File sistem utils --------------------------------------- */
//scan_catalog filtering
define("SCANCAT_FOLDERS",1);
define("SCANCAT_FILES",2);
define("SCANCAT_HIDDEN",4);
//scan_catalog sorting
define("SORTCAT_ASC",0);
define("SORTCAT_DESC",1);
define("SORTCAT_BY_NAME",2);
define("SORTCAT_BY_SIZE",4);
define("SORTCAT_BY_CREATED",8);
define("SORTCAT_BY_MODIFIED",16);
define("SORTCAT_BY_FORMAT",32);
define("SORTCAT_BY_EXT",64);
function scan_catalog($catalog_,$options_=[])
{
   //Options:
   // "sort" - is a binary combination of <comparing_attribute>&<sort_direction>. Comparing attributes are: SORTCAT_NAME, SORTCAT_SIZE, SORTCAT_CREATED, SORTCAT_MODIFIED, SORTCAT_FORMAT or SORTCAT_EXT. NOTE: these constants should NOT be combited together.
   //          Sort directions are: SORTCAT_ASC and SORTCAT_DESC. NOTE: ascending sorting is default and it is not necessary to designate it literally.
   // "filter" - regexp
   // "show"   - binary mask, defines what type of FS entries will be shown: SCANCAT_FOLDERS, SCANCAT_FILES, SCANCAT_HIDDEN.
   // "group"  - list folders and files separately. If true, array ["folders"=>[<folder_entries...>],"files"=>[<file_entries...>]] will be returned, otherwise - [<any_entries...>].
   // "extended" - display additional info about files and folders. If true, each returned entry will be array like ["name"=>"<entrie_name>",<entrie_attributes...>], otherwise each returned entry will be a string containing its name.
   
   $res=($options_["group"] ? ["folders"=>[],"files"=>[]] : []);
   
   //Init default options
   if (is_null($options_["show"]))
      $options_["show"]=SCANCAT_FOLDERS|SCANCAT_FILES;
   
   //Init filter
   if (is_array($options_["filter"]))
   {
      $filter_folders=$options_["filter"]["folders"];
      $filter_files  =$options_["filter"]["files"];
   }
   else
      $filter_folders=$filter_files=$options_["filter"];
      
   //Get catalog contents
   $names=scandir($catalog_);
   foreach ($names as $name)
      if (($name!=".")&&($name!=".."))   //Skip "." and "..", then apply filter if it has defined.
      {
         $pass=true; //Pass the entry into result
         
         $fullpath=$catalog_."/".$name;
         $is_dir=is_dir($fullpath);
         $is_hidden=($name[0]==".");
         
         //Filter entry by flags (file/folder,hidden)
         $flags=($is_dir ? SCANCAT_FOLDERS : SCANCAT_FILES)|($is_hidden ? SCANCAT_HIDDEN : 0);
         if (!($flags&$options_["show"]))
            $pass=false;
         
         //Filter entry by name
         if ($is_dir&&$filter_folders&&!preg_match($filter_folders,$name))
            $pass=false;
         elseif (!$is_dir&&$filter_files&&!preg_match($filter_files,$name))
            $pass=false;
         
         //Append entry to result
         if ($pass)
         {
            if ($options_["extended"])
            {
               $entry=[
                        "name"=>$name,
                        "ext"=>file_ext($name),
                        "hidden"=>$is_hidden,
                        "link"=>is_link($fullpath)
                      ];
               if ($entry["link"])
               {
                  $fullpath=readlink($fullpath);
                  $entry["link_to"]=$fullpath;
                  $entry["broken"]=!file_exists($fullpath);
               }
               if (!$entry["broken"])
               {
                  $entry["size"]=filesize($fullpath);
                  $entry["mime"]=mime_content_type($fullpath);
                  $entry["permissions"]=fileperms($fullpath);
                  $entry["owner"]=fileowner($fullpath);
                  $entry["group"]=filegroup($fullpath);
                  $entry["created"]=filectime($fullpath);
                  $entry["modified"]=filemtime($fullpath);
               }
            }
            else
               $entry=$name;
            
            //Group entries
            if ($options_["group"])
               $res[($is_dir ? "folders" : "files")][]=$entry;
            else
               $res[]=$entry;
         }
      }
   
   //Sort entries with callbacks
   $acceptable_sort=($options_["extended"] ? 0b1111110 : SORTCAT_BY_NAME);
   if ($options_["sort"]&$acceptable_sort)
   {
      $sort_callback="scan_cat_cmp_".$options["sort"];
      if ($options_["group"])
      {
         usort($res["folders"],$sort_callback);
         usort($res["files"],$sort_callback);
      }
      else
         usort($res,$sort_callback);
   }
   
   return $res;
}
//Comparing callbacks for scan_catalog():
function scan_cat_cmp_2($a_,$b_)   //name asc
{
   return is_array($a_) ? strnatcmp($a_["name"],$b_["name"]) : strnatcmp($a_,$b_);
}
function scan_cat_cmp_3($a_,$b_)   //name desc
{
   return is_array($a_) ? strnatcmp($b_["name"],$a_["name"]) : strnatcmp($b_,$a_);
}
function scan_cat_cmp_4($a_,$b_)   //size asc
{
   return $a_["size"]-$b_["size"];
}
function scan_cat_cmp_5($a_,$b_)   //size desc
{
   return $b_["size"]-$a_["size"];
}
function scan_cat_cmp_8($a_,$b_)   //created asc
{
   return $a_["created"]-$b_["created"];
}
function scan_cat_cmp_9($a_,$b_)   //created desc
{
   return $b_["created"]-$a_["created"];
}
function scan_cat_cmp_16($a_,$b_)  //modified asc
{
   return $a_["modified"]-$b_["modified"];
}
function scan_cat_cmp_17($a_,$b_)  //modified desc
{
   return $b_["modified"]-$a_["modified"];
}
function scan_cat_cmp_32($a_,$b_)  //format asc
{
   return strnatcmp($a_["format"],$b_["format"]);
}
function scan_cat_cmp_33($a_,$b_)  //format desc
{
   return strnatcmp($b_["format"],$a_["format"]);
}
function scan_cat_cmp_64($a_,$b_)  //extension asc
{
   return strnatcmp($a_["ext"],$b_["ext"]);
}
function scan_cat_cmp_65($a_,$b_)  //extension desc
{
   return strnatcmp($b_["ext"],$a_["ext"]);
}

function format_bytes($val_,$precision_=2,$space_=" ")
{
   $prefixes=["B","KB","MB","GB","TB"];   //binary prefixes
   $pow=floor(log($val_,1024));           //get real power of $val_
   $pow=min($pow,count($prefixes)-1);
   return round($val_/(1<<($pow*10)),$precision_).$space_.$prefixes[$pow];
}

function permissions_to_str($perm_)
{
   return decoct($perm_&0777); //TODO: change to rwx
}

function permissions_to_int($perm_)
{
   return (is_int($perm_) ? $perm_ : ""); //TODO:
}

function file_ext($name_)
{
   //Return an extension from file name or path. Works correctly with unix hidden files.
   
   return (preg_match("/[^\\/]+\\.([^.\\/]+)$/",$name_,$matches) ? $matches[1] : "");
}

function escape_file_path($path_)
{
   //Removes potentially riskful, illegal and masking characters and character sequences.
   //  It is NOT recommended to use this function at high loaded scripts and large cycles, if it not very necessary.
   //if $path_ starts not from "/", then it is resolving as relative from top directory
   
   $path_=preg_replace("/[\\t\\r\\n\\\\<>{}@#$&~!%:;*?`\"'\\0]/m","",$path_); //remove disallowed characters
   $path_=preg_replace("/^\\.{2}\\/|\\/(\s*\\.{2}\s*\\/)+/","/",$path_);      //remove /../
   $path_=preg_replace("/\\/+/","/",$path_);                                  //collapse multiple slashes (//)
   
   return $path_;
}

function escape_file_name($name_)
{
   //Removes path to file, leaves only name. removes illegal and masking characters.
   
   $name_=preg_replace("/[\\t\\r\\n\\/\\\\<>{}@#$&~!%:;*?`\"'\\0]/m","",$name_); //remove disallowed characters
   if ($name_=="."||$name_=="..") //disallow special names
      $name_="";
   
   return $name_;
}

function abs_path($path_,$root_="")
{
   //Force $path_ to absolute according to the $root_ directory
   if (!$root_)
      $root_=$_SERVER["DOCUMENT_ROOT"];
   
   $root_=rtrim($root_,"/")."/";                      //set trailing slash to the root directory
   if (($path_[0]!="/")||(strncmp($path_,$root_,strlen($path_))!=0)) //attach $path_ to the $root_ directory
      $path_=$root_.ltrim($path_,"/");
   
   return $path_;
}

function rel_path($path_,$root_="")
{
   //Extracts relative path from absolute
   if (!$root_)
      $root_=$_SERVER["DOCUMENT_ROOT"];
   
   $root_=rtrim($root_,"/");                          //remove trailing slash from the root directory
   $root_len=strlen($root_);
   if (strncmp($path_,$root_,$root_len)==0)
      $path_=substr($path_,$root_len);
   
   return $path_;
}

function place_uploaded_files($key_,$dir_,$filter_="",$max_size_=0,$max_count_=0)
{
   //Move one or multiple uploaded files with their original names to the given directory.
   // $key_ - input's name.
   // $dir_ - destination directory above $_SERVER["DOCUMENT_ROOT"].
   // $filter_ - regexp to filter-out unwanted files. If "" - any files will be accepted.
   // $max_size_ - maximum file size allowed.
   // $max_count_ - maximum number of files may be moved to the destination.
   
   $moved=0;
   
   //Prepare list of successfully uploaded files
   $files=[];
   if (is_array($_FILES[$key_]["error"]))
   {
      $up_errs=$_FILES[$key_]["error"];
      $up_tmps=$_FILES[$key_]["tmp_name"];
      $up_names=$_FILES[$key_]["name"];
      $up_sizes=$_FILES[$key_]["size"];
   }
   else
   {
      $up_errs=[$_FILES[$key_]["error"]];
      $up_tmps=[$_FILES[$key_]["tmp_name"]];
      $up_names=[$_FILES[$key_]["name"]];
      $up_sizes=[$_FILES[$key_]["size"]];
   }
   
   //Filter files and place them to the destination
   $dir_=rtrim(abs_path($dir_),"/")."/";  //Get absolute path to destination directory.
   foreach ($up_errs as $i=>$error)
      if (!$error)
      {
         $up_names[$i]=escape_file_name(basename($up_names[$i]));
         if (is_uploaded_file($up_tmps[$i])&&(!$filter_||preg_match($filter_,$up_names[$i]))&&(!$max_size_||$up_sizes[$i]<=$max_size_))
            if (move_uploaded_file($up_tmps[$i],$dir_.$up_names[$i]))
               $moved++;
         
         if ($max_count_&&$moved>=$max_count_)
            break;
      }
   
   return $moved;
}

function check_perms($path_,$perms_list_)
{
   //
   
   $res=["perms"=>0,"top_dir"=>""];
   
   $max_matched=0;
   foreach ($perms_list_ as $dir=>$perms)
   {
      $len=strlen($dir);
      if ((strncmp($path_,$dir,$len)==0)&&($len>$max_matched))  //Find permissions with the most long path amongst all matching ones.
      {
         $res["perms"]=$perms; //Current permissions
         $res["top_dir"]=$dir; //The topmost directory permitted at selected branch of FS-tree
         $max_matched=$len;
      }
   }
   
   return $res;
}

function rmdir_r($path_)
{
   //Remove deirectory recursively. 
   //NOTE: exec("rm -rf ".$path_) is good thing, but may not work on some hostings. 
   
   $path_=rtrim($path_,"/");
   $list=scan_catalog($path_,["group"=>"true","show"=>SCANCAT_FOLDERS|SCANCAT_FILES|SCANCAT_HIDDEN]);
   foreach ($list["files"] as $file)
      unlink($path_."/".$file);
   
   foreach ($list["folders"] as $folder)
   {
      $dir=$path_."/".$folder;
      rmdir_r($dir);
      rmdir($dir);
   }
   
   rmdir($path_);
}

/* --------------------------------------- email --------------------------------------- */
function send_email($recipients_,$subject_,$text_,$attachments_=null,$sender_=DEFAULT_EMAIL_SENDER)
{
   //Send an email with optional attachments
   //Arguments:
   // $recipients_ - array or string with comma-separated list of recipient emails
   // $subject_ - email subject
   // $text_ - email text
   // $attachments_ - array of attachments. Each element may be a path to file on server or assoc array with two fileds: ["name"=>"original-file-name","tmp_name"=>"/absolute/filepath"]. The last case is to attach uploaded file directly from temp folder.
   // $sender_ - an email that will appears in From and Reply-To. 
   
   //WARNING: contents of $text_, $subject_ and file names and paths in $attachments_ array are MUST BE MADE SAFE in advance.
   //NOTE: If you have/need any restrictions for attachments, you have to test and filter $attachments_ in advance.
   //      This function only test
   
   global $LOCALE;
   global $ERRORS;
   
   //Detect text mime subtype
   $is_html=preg_match("/<([!]doctype|html|body)/i",substr($text_,24));
   $text_type="text/".($is_html ? "html" : "plain")."; charset=\"utf-8\"";

   if (!$is_html)
      $text_=wordwrap($text_,70);   //wrap too long strings into 70 characters max in according with email specification
   
   //Make email:
   if (!$attachments_)              //Make a simple email
   {
      $content_main_type=$text_type;
      $content=$text_;
   }
   else  //Make email with attachments
   {
      //Include text:
      $content_main_type="multipart/mixed; boundary=\"/*--------*/\"";
      $content="--/*--------*/\n".
               "Content-type: ".$text_type."\r\n".
               "Content-Transfer-Encoding: base64\r\n\r\n".
               base64_encode($text_)."\r\n";

      //Attach files:
      foreach($attachments_ as $attachment)
      {
         $attachment=(is_array($attachment) ? $attachment : ["name"=>basename($attachment),"tmp_name"=>$attachment]);
         
         if (!$attachment["error"]&&file_exists($attachment["tmp_name"])) //Retest file existence, but don't emit error if it wasn't found
         {
            //Get and encode file contents:
            $file_content=base64_encode(file_get_contents($attachment["tmp_name"]));
               
            //Try to detect file type:
            $file_type="application/octet-stream";                      //By default - recognize file as untyped binary stream.
            if (function_exists("finfo_open"))                          //If the finfo PECL extention exists,
            {                                                           //   try to obtain real mime type of file:
               $finfo=finfo_open(FILEINFO_MIME_TYPE);                   // - open finfo database
               $file_type=finfo_file($finfo,$attachment["tmp_name"]);   // - try to get file type
               finfo_close($finfo);                                     // - close finfo database
            }
            
            //Append file as part of message:
            $content.="--/*--------*/\r\n".
                      "Content-type: ".$file_type."; name=\"".$attachment["name"]."\"\r\n".
                      "Content-Transfer-Encoding: base64\r\n".
                      "Content-Disposition: attachment\r\n\r\n".
                      $file_content."\r\n";
         }
      }

      $content."/*--------*/--";   //insert message end
   }
   
   //Make headers:
   $headers="From: ".$sender_."\r\n".
            "Reply-To: ".$sender_."\r\n".
            "X-Mailer: PHP/".phpversion()."\r\n".
            "Content-type: ".$content_main_type."\r\n";
   
   if (is_array($recipients_))
      $recipients_=implode(",",$recipients_);
   
   //Send
   //dump($recipients_,$subject_,$content,$headers);
   //return true;
   return mail($recipients_,$subject_,$content,$headers);
}

?>