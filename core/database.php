<?
/*==================================*/
/* The Pattern Engine Version 3.0   */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Core database-related functions  */
/*----------------------------------*/
/* DB driver: MySQLi                */
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
// utils.php
// core.php

//Description:
// This module isolates DB interface, in this case - mysqli. Also it contains some functions intended to make parameterized queries and other like this.
// It is NOT designed to make full abstraction from data source. It is important. Anyway this engine designed to work with SQL and MySQL in particular.
// It is only possible but not guaranteed that it may be modified to work with something significantly different from MySQL.

$MYSQLI=null;  //global mysqli object. NOTE: It's not recommended to use it directly in other .php, to keep independence from DB driver.

//connection -------------------------------------------------------     
function db_connect($host_,$db_name_,$user_,$password_,$charset_)   //connects to DB at localhost
{
   global $MYSQLI;
   global $ERRORS;
   
   $connected=false;   
   
   
   $MYSQLI=new mysqli($host_,$user_,$password_,$db_name_);  //try to conect to MySQL
   if ($MYSQLI)
   {
      if ($connected=!$MYSQLI->connect_error)
         $MYSQLI->set_charset($charset_);
      else
          $ERRORS[]="Not connected to DB.".((DEBUG) ? $MYSQLI->connect_error : "");
   }
   
   return $connected;                                             //return result
}

function db_disconnect()   //disconnect from database
{
   global $MYSQLI;

   if (!$MYSQLI->connent_error)  //check that was no errors while connection
      $MYSQLI->close();
}

//Working with tables and their structure ---------------------------------------------------------------------------------------------------------------------------------
//List of MySQL data types:
define("DB_DATA_TYPES",["tinyint",
                        "smallint",
                        "mediumint",
                        "int",
                        "bigint",
                        "enum",
                        "set",
                        "decimal",
                        "float",
                        "double",
                        "varchar",
                        "char",
                        "tinytext",
                        "text",
                        "mediumtext",
                        "longtext",
                        "json",
                        "datetime",
                        "timestamp",
                        "year",
                        "time",
                        "tinyblob",
                        "blob",
                        "mediumblob",
                        "longblob",
                        "varbinary",
                        "binary"]);

//List of types that has no size/values parameter in column definition:
define("DB_DATA_TYPES_NO_PARAM",["tinytext",
                                 "text",
                                 "mediumtext",
                                 "longtext",
                                 "datetime",
                                 "timestamp",
                                 "year",
                                 "time",
                                 "tinyblob",
                                 "blob",
                                 "mediumblob",
                                 "longblob",
                                 "varbinary",
                                 "binary"]);

//List of types that may not have default values except NULL:
define("DB_DATA_TYPES_NO_DEFAULT",["tinytext",
                                   "text",
                                   "mediumtext",
                                   "longtext",
                                   "json",
                                   "tinyblob",
                                   "blob",
                                   "mediumblob",
                                   "longblob",
                                   "varbinary",
                                   "binary"]);

//List of types that may have UNSIGNED attribute:
define("DB_DATA_TYPES_SIGNED",["tinyint",
                               "smallint",
                               "mediumint",
                               "int",
                               "bigint",
                               "decimal",
                               "float",
                               "double"]);

//List of value ranges of numeric types
define("DB_NUMERIC_RANGES",["tinyint"=>[["min"=>-128,"max"=>127],["min"=>0,"max"=>255]],
                            "smallint"=>[["min"=>-32768,"max"=>32767],["min"=>0,"max"=>65535]],
                            "mediumint"=>[["min"=>-8388608,"max"=>8388607],["min"=>0,"max"=>16777215]],
                            "int"=>[["min"=>-2147483648,"max"=>2147483647],["min"=>0,"max"=>4294967295]]]);

//List of named constants in MySQL:
define("DB_CONSTANTS",["NULL",
                       "TRUE",
                       "FALSE",
                       "CURRENT_TIMESTAMP",
                       "CURRENT_DATE",
                       "CURRENT_TIME",
                       "LOCALTIME",
                       "LOCALTIMESTAMP",
                       "UTC_DATE",
                       "UTC_TIME",
                       "UTC_TIMESTAMP"]);

//Protect from SQL injection and query corruption ---------------------------------------------------------------------------------------------------------------------------------
function name_to_query($name_)
{
   //Permanently replaces characters depreciated in the names of databases, tables, columns.
   //This function don't needs complementary decoding one, cause the correct names needs not any encoding.
   return "`".strtr($name_,"\0\"\n\\ `'[](){}<>.,/?!@#$%^&*-+=:;|","_________________________________")."`";
}

function data_to_query($val_)
{
   //General purpose function that protects queries from breaking or injections by means of special characters in data.
   //Usage: "UPDATE `table` SET `col_a`=".data_to_query($value).";";
   //NOTE: performance tests shows that str_replace() noticeably slows code only when it called for huge strings.
   //      But when it applied on a short values, the fact of calling of a function has more effect on execution time, so differentiation of, e.g., numbers will not make it faster because of caling of a type-checking functions.
   //NOTE: In MySQL the TRUE and the FALSE are aliases of '1' and '0', so raw boolean values in the data will be correctly type-casted.
   
   //return is_null($val_) ? "NULL" : "'".str_replace(["\0","`","'"],["[[_0]]","[[_bq]]","[[_q]]"],$val_)."'";
   return is_null($val_) ? "NULL" : (array_search($val_,DB_CONSTANTS)!==false ? $val_ : "'".str_replace(["\0","`","'","\\"],["[[_0]]","[[_bq]]","[[_q]]","[[_bs]]"],$val_)."'");
}

function data_default_to_query($val_)
{
   //Encodes DEFAULT value in column definition. More slow than data_to_query().
   return is_null($val_) ? "NULL" : (array_search($val_,DB_CONSTANTS)!==false ? $val_ : "'".str_replace(["\0","`","'","\\"],["[[_0]]","[[_bq]]","[[_q]]","[[_bs]]"],$val_)."'");
}

function data_sizevals_to_query($val_)
{
   //Encodes values defined for EMNUM and SET types, separating them from numeric attribute "size" that specified for numeric or character types.
   //NOTE: however, numerics may be safely used in queries without quotation.
   
   $res="";
   
   if (is_null($val_))
      $res="NULL";
   elseif(preg_match("/^\d+(,\d+)?$/",$val_))  //detect size of columns that has type string or numeric.
      $res=$val_;
   else
   {
      //get values that are separated by commas and optionaly quoted with single quotes, ignoring whitespaces out of quotes. Then process these values with data_to_query() and implode back to comma-separated list:
      $res=implode(",",array_map(data_to_query,preg_split("/'?\s*,\s*'?/",preg_replace("/^\s*'?|'?\s*$/","",$val_),-1,PREG_SPLIT_NO_EMPTY)));  //protect from injections using values list of enumerated types.
   }
   
   return $res;
}

function data_to_eq_statement($val_,$prefix_="='",$suffix_="'")
{
   //The same as data_to_query(), but intended for comparison statements.
   //If the $val_ is NULL then 1st argument will be correctly tested for NULL, otherwise the common equality statement will be generated.
   //Examples: "SELECT * FROM `table` WHERE `col_a`".data_to_eq_statement($value).";";
   //          "SELECT * FROM `table` WHERE `col_a`".data_to_eq_statement($value," REGEXP '(^| )","( |$)'").";"; //NOTE: don't foreget quotes in $prefix_ and $suffix_ !
   
   return is_null($val_) ? " IS NULL" : $prefix_.str_replace(["\0","`","'","\\"],["[[_0]]","[[_bq]]","[[_q]]","[[_bs]]"],$val_).$suffix_;
}

function data_from_query($val_)
{
   //General purpose function that decodes special characters in data, encoded by data_to_query() and the same.
   
   return is_null($val_) ? NULL : str_replace(["[[_0]]","[[_bq]]","[[_q]]","[[_bs]]"],["\0","`","'","\\"],$val_);
}

//Working with structure ---------------------------------------------------------------------------------------------------------------------------------
function get_tables($condition_="",$count_rows_=false)
{
   //Get extended info about tables in current database
   
   global $MYSQLI;
   global $ERRORS;
   
   $res=array();
   
   if ($result=$MYSQLI->query("SHOW FULL TABLES ".$condition_.";"))
   {
      while ($row=$result->fetch_row())
      {
         $row=array("table"=>$row[0],"type"=>$row[1]);
         if ($count_rows_)
            $row["rows_total"]=rows_total($row["table"]);
         $res[]=$row;
      }
      $result->free();
   }
   else
      $ERRORS[]=query_report_error($MYSQLI->error,$count_query);
   
   return $res;
}

function rows_total($table_,$condition_="")
{
   global $MYSQLI;
   global $ERRORS;
   
   $res=0;
   
   if ($result=$MYSQLI->query("SELECT COUNT(*) FROM ".name_to_query($table_).$condition_.";"))
   {
      $row=$result->fetch_row();
      $res=$row[0];
      $result->free();
   }
   else
      $ERRORS[]=query_report_error($MYSQLI->error,$count_query);
   
   return $res;
}

function table_exists($table_)
{
   //Returns true if table exists or false otherwise
   
   global $MYSQLI;
   
   $res=false;
   
   if (($table_!="")&&($result=$MYSQLI->query("SHOW TABLES LIKE ".data_to_query($table_).";"))) //NOTE: here the table name is a data for LIKE operator.
   {
      $res=($result->num_rows>0);
      $result->free();
   }
   
   return $res;
}

function get_columns($table_,$condition_="")
{
   //Returns parsed description of table columns
   
   global $MYSQLI;
   global $ERRORS;
   
   $res=array();
   
   $query="SHOW FULL COLUMNS FROM ".name_to_query($table_).$condition_.";";
   if ($result=$MYSQLI->query($query))
   {
      while ($row=$result->fetch_assoc())
      {
         $description=array("name"=>$row["Field"]);
         
         //Type
         if (preg_match("/^([a-z]+)(\((.*)\))?( unsigned)?$/",$row["Type"],$matches)) //parse type definition: $matches=["0"=>"type_name(size) unsigned","1"=>"type_name","2"=>"(size)","3"=>"size","4"=>" unsigned"];
         {
            $description["type"]=$matches[1];
            if (isset($matches[3]))
               $description["size"]=$matches[3];   //NOTE: for the types ENUM and SET, the "size" would contain list of values.
            if (array_search($description["type"],DB_DATA_TYPES_SIGNED)!==false)
               $description["unsigned"]=isset($matches[4]);
         }
         //Collation
         $description["collation"]=$row["Collation"];
         //Null
         $description["null"]=to_bool($row["Null"]);
         //Default
         if (!is_null($row["Default"])||$description["null"])  //NOTE: If column may be NULL, then NULL in Default means NULL literally, otherwise it means that default value is not set.
            $description["default"]=$row["Default"];           //      In both cases is_null($description["default"])==true but in the second case the $description will have no key "default" at all.
         //Extra
         $description["extra"]=$row["Extra"];                  //NOTE: may be: "auto_increment", "on update CURRENT_TIMESTAMP", "VIRTUAL GENERATED" or "VIRTUAL STORED"
         //Keys
         $description["key"]=$row["Key"];                      //NOTE: PRI - column is (or a part of) the primary key, UNI - it is the first column of unique index, MUL - it is the first column of nonunique index.
         //Privileges
         $description["privileges"]=$row["Privileges"];
         //Comment
         $description["comment"]=$row["Comment"];
         
         //append to result
         $res[]=$description;
      }
      $result->free();
   }
   else
      $ERRORS[]=query_report_error($MYSQLI->error,$query);
   
   return $res;
}

function get_indexes($table_,$condition_="")
{
   //Returns parsed description of table keys
   
   global $MYSQLI;
   global $ERRORS;
   
   $indexes=array();
   
   $query="SHOW INDEX FROM `".$table_."`".$condition_.";";
   if ($result=$MYSQLI->query($query))
   {
      while ($row=$result->fetch_assoc())
      {
         if (!$indexes[$row["Key_name"]])
            $indexes[$row["Key_name"]]=[
                                          "name"=>$row["Key_name"],
                                          "cols"=>[],
                                          "unique"=>!to_bool($row["Non_unique"]),
                                          "null"=>to_bool($row["Null"]),
                                          "type"=>$row["Index_type"],
                                          "cardinality"=>$row["Cardinality"],
                                          "sub_part"=>$row["Sub_part"],
                                          "packed"=>$row["Packed"],
                                          "collation"=>$row["Collation"],
                                          "comment"=>$row["Index_comment"]
                                       ];
         $indexes[$row["Key_name"]]["cols"][$row["Seq_in_index"]]=$row["Column_name"];
      }
      $result->free();
   }
   else
      $ERRORS[]=query_report_error($MYSQLI->error,$query);
      
   return array_values($indexes);   //output data preferably should be a numerically indexed array.
}

function make_column_definition($col_)
{
   //Makes column definition for CREATE TABLE or ALTER TABLE queries from data provided by get_columns().
   
   $type=DB_DATA_TYPES[array_search($col_["type"],DB_DATA_TYPES)];   //if type was incorrect, then type with index 0 will be used instead
   
   return $type.   //type
          (array_search($type,DB_DATA_TYPES_NO_PARAM)===false ? "(".data_sizevals_to_query($col_["size"]).")" : "").    //size or values
          ($col_["unsigned"]&&(array_search($type,DB_DATA_TYPES_SIGNED)!==false) ? " UNSIGNED" : "").                   //UNSIGNED attribute for numeric types
          ($col_["null"] ? " NULL" : " NOT NULL").                                                                      //is NULL values available
          (array_search($col_["default"],DB_DATA_TYPES_NO_DEFAULT)!==false ? ($col_["null"] ? " DEFAULT NULL" : "") : (!$col_["null"]&&is_null($col_["default"]) ? "" : " DEFAULT ".data_default_to_query($col_["default"]))).  //default column value
          " ".$col_["extra"]. //TODO: $col_["extra"] is unsafe for injections.
          (is_null($col_["comment"]) ? "" : " COMMENT ".data_to_query($col_["comment"]));
}

function make_create_table_query($table_,$cols_,$options_=[])
{
   
   //column definitions:
   $definitions=[];
   foreach ($cols_ as $r=>$col)
      $definitions[]=name_to_query($col["name"])." ".make_column_definition($col);
   
   $pkey_cnt=0;
   foreach ($cols_ as $r=>$col)
      switch ($col["key"])
      {
         case "PRI":
         {
            if ($pkey_cnt==0)
            {
               $definitions[]="PRIMARY KEY(".name_to_query($col["name"]).")";
               $pkey_cnt++;
            }
            break;
         }
         case "UNI":
         {
            $definitions[]="UNIQUE KEY(".name_to_query($col["name"]).")";
            break;
         }
         case "MUL":
         {
            $definitions[]="KEY(".name_to_query($col["name"]).")";
            break;
         }
      }
   
   return "CREATE ".($options_["temporary"] ? "TEMPORARY " : "")."TABLE ".($options_["if_not_exists"] ? "IF NOT EXISTS " : "").name_to_query($table_)." (\n".implode(",\n",$definitions).");";
}

function make_alter_queries($table_,$cols_,$old_names_)
{
   $res=array();
   
   $query_start="ALTER TABLE ".name_to_query($table_);
   
   foreach ($cols_ as $r=>$col)
   {
      $rename=(isset($old_names_[$r]["name"])&&$col["name"]!=$old_names_[$r]["name"]);
      
      $res[]=$query_start.($rename ? " CHANGE ".name_to_query($old_names_[$r]["name"])." " : " MODIFY ").name_to_query($col["name"])." ".make_column_definition($col).";";
   }
   
   return $res;
}

function make_alter_add_queries($table_,$cols_,$after_)
{
   $res=array();
   
   $query_start="ALTER TABLE ".name_to_query($table_)." ADD ";
   
   $after_is_arr=$after_&&is_array($after_); //NOTE: ignore empty arrays.
   
   $prev=$after_is_arr ? 0 : $after_;
   foreach ($cols_ as $r=>$col)
   {
      $target=$after_is_arr ? $after_[$r] : $prev;
      if ($target==-1)
         $position=" FIRST";
      elseif ($target)
         $position=" AFTER ".name_to_query($target);
      else
         $position="";
      
      $res[]=$query_start.name_to_query($col["name"])." ".make_column_definition($col).$position.";";  //This single query is placed into array just for straight compatibility with perform_queries().
      
      $prev=$col["name"];
   }
   
   return $res;
}

function make_alter_drop_queries($table_,$cols_)
{
   $res=array();
   
   $query_start="ALTER TABLE ".name_to_query($table_)." ";
   
   $statements=array();
   foreach ($cols_ as $col)
      $statements[]="DROP COLUMN ".name_to_query($col["name"]);
   
   $res[]=$query_start.implode(", ",$statements).";"; //This single query is placed into array just for straight compatibility with perform_queries().
   
   return $res;
}

function make_alter_index_queries($table_,$drop_indexes_=NULL,$add_indexes_=NULL)
{
   //At first, drops indexes listed in $drop_indexes_, then adds ones from $add_indexes_ and do this in a single query. Reason is follow:
   //NOTE: Attempting to "ALTER TABLE ... DROP PRIMARY KEY" on a table when an AUTO_INCREMENT column exists in the key generates an error:
   //      ERROR 1075 (42000): Incorrect table definition; there can be only one auto column and it must be defined as a key.
   //      To make this work without erroring, drop and re-add the new primary key in a single statement, e.g.:
   //      ALTER TABLE mytable DROP PRIMARY KEY, ADD PRIMARY KEY(col1,col2);
   //      -- Posted by Duane Hitz on dev.mysql.com --
   
   $res=array();
   
   $query_start="ALTER TABLE ".name_to_query($table_)." ";
   $statements=array();

   //Drop:
   foreach ($drop_indexes_ as $index)
      $statements[]="DROP ".($index["name"]=="PRIMARY" ? "PRIMARY KEY" : "KEY ".name_to_query($index["name"]));
   
   //Add:
   foreach ($add_indexes_ as $index)
   {
      $statement="ADD ";
      $i_name=$index["name"]!="" ? name_to_query($index["name"])." " : "";
      $type_def1=($index["type"]=="FULLTEXT" ? "FULLTEXT " : (($index["type"]=="RTREE"||$index["type"]=="SPATIAL") ? "SPATIAL " : ""));
      $type_def2=($index["type"]=="BTREE"||$index["type"]=="HASH") ? "USING ".$index["type"]." " : "";
      
      if ($index["name"]=="PRIMARY")
         $statement.="PRIMARY KEY ".$type_def2."(".implode(",",array_map(name_to_query,$index["cols"])).")";
      else
         $statement.=($index["unique"] ? "UNIQUE " : $type_def1)."KEY ".$i_name.$type_def2."(".implode(",",array_map(name_to_query,$index["cols"])).")";
      
      $statements[]=$statement;
   }
   
   $res[]=$query_start.implode(", ",$statements).";";  //This single query is placed into array just for straight compatibility with perform_queries().
   return $res;
}

//Working with data --------------------------------------------------------------------------------------------------------------------------------------
function make_select_statements($descriptors_)
{
   //Makes string of select statements from given descriptors
   
   $sel_statements=array();
   
   foreach ($descriptors_ as $key=>$descriptor)
      $sel_statements[]=($descriptor["expr"] ? $descriptor["expr"]." AS " : "").name_to_query($key);  //make <expr> AS `alias` statement if "expr" is defined.
   
   return implode(",",$sel_statements);
}

function make_join_statements($main_table_,$references_)
{
   //Makes JOIN statements.
   //$references_ - is the deserialized name=val list, where the "name" part contains referencing table and column and the "value" part defines the joining table and its key column:
   //               [referencing_table.]referencing_column=[matching modifier]joining_table.key_column
   //               The "referencing_table" is optional if the "referencing_column" belongs to the $main_table_, but if you want to join some table to another joined one, then specify it exactly.
   //               The "matching_modifier" - is an optional single-character prefix, which allows to designate some alternative statements for matching of foregin rows.
   //Example: $main_table_="table_a"; $references_=[["col_a","table_b.col_b1"],["table_b.col_b2","~table_c.col_c"]]; 
   //Result:  "LEFT JOIN `table_b` ON `table_a`.`col_a`=`table_b`.`col_b1` LEFT JOIN `table_c` ON `table_b`.`col_b2` REGEXP CONCAT('(^|,|\s)',`table_c`.`col_c`,'(,|\s|$)')".
   
   $res="";
   
   
   if ($references_)
   {
      $main_table_=name_to_query($main_table_);
      foreach ($references_ as $local=>$foregin)
      {
         $local=explode(".",$local);
         if (count($local)<2)
            array_unshift($local,$main_table_);       //local[0] - should be a local table, local[1] - should be referencing column.
         $foregin=explode(".",$foregin);              //foregin[0] - the table which is referenced, foregin[1] - key column
         $mod=$foregin[0][0];                         //get matching modifier - char that was after the = sign in unserializes name=val.
         
         //The mostly often used matching statements:
         switch ($mod)
         {
            case "~": {$foregin[0]=substr($foregin[0],1); $foregin=array_map(name_to_query,$foregin); $res.=" LEFT JOIN ".$foregin[0]." ON ".$local[0].".".$local[1]." REGEXP CONCAT('(^|,|\s)',".$foregin[0].".".$foregin[1].",'(,|\s|$)')"; break;}  //match the single value in the space- or comma-separated list
            case "%": {$foregin[0]=substr($foregin[0],1); $foregin=array_map(name_to_query,$foregin); $res.=" LEFT JOIN ".$foregin[0]." ON ".$local[0].".".$local[1]." LIKE CONCAT('%',".$foregin[0].".".$foregin[1].",'%')"; break;}                  //simple inclusion template
            default : {$foregin=array_map(name_to_query,$foregin); $res.=" LEFT JOIN ".$foregin[0]." ON ".$local[0].".".$local[1]."=".$foregin[0].".".$foregin[1]." ";}                                                                                //by default, use common collation
         }
      }
   }
   
   return $res;
}

function make_where_clauses($condition_chunks_,$request_,$already_encoded_=false)
{
   //Compiles WHERE clause from chunked template.
   //$condition_chunks_ - is array of condition template chunks. Each chunk is a optional or mandatory part of complete WHERE clause.
   //                     If the chunk contains a labels like "[[req_param]]" and all corresponding params are exists within $request_, then this chunk will be used in WHERE clause, otherwise it'll be omitted.
   //                     If the chunk not contains any label, it will be used anyway. Thus, this makes possible to make a filter, which depends on that set of parameters that was sent with request.
   //                     NOTE: The labels in condition template shouldn't be quoted, cause data_to_query() do this. 
   //                           Also this means that you may not parameterize names of tables and columns, used in WHERE clause.
   //$request_ - request or environment parameters.
   
   $res="";
   
   if ($condition_chunks_)
   {
      $request_labels=array_keys_to_labels($request_);
      if (!$already_encoded_)
         $request_=array_map(data_to_query,$request_);
      $request=array_combine($request_labels,$request_);
      foreach ($condition_chunks_ as $chunk)   //NOTE: unfortunatelly, each chunk should be checked for labels and this makes impossible to simply skip this cycle if there is no any parameters in $request_.
      {
         if (preg_match_all("/\[\[[a-z0-9_-]{1,32}\]\]/i",$chunk,$matches))   //find labels of parameters ([[req_param]]).
         {
            $matches_defined=array_intersect($matches[0],$request_labels);      //filter labels against existing request parameters:
            if (count($matches_defined)==count($matches[0]))                  // the chunk will be used in WHERE clause if all the labels has matching parameters, otherwise it'll be omitted.
            {
               foreach ($matches_defined as $match)
                  $chunk=str_replace($match,$request[$match],$chunk);         //replace matched labels with values of params.

               $res.=$chunk;
            }
         }
         else
             $res.=$chunk;   //chunks with no labels will be used anyway.
      }
      
      $res=preg_replace("/^\\s*(AND|OR|XOR)\\s*/i","",$res); //remove logical operator from the begining, in case if some first chunks was omitted.
      if ($res!="")
         $res="WHERE ".$res;
   }
   
   return $res;
}

function make_where_clauses_from_indexes(array $descriptors_,array $indexes_)
{
   //Makes array of WHERE clauses, one for each [multi]index.
   //NOTE: this function support NULL values within $indexes_.
   //WARNING: Apriory the keys of $descriptors_ array MUST be correct column names or aliases and the "expr" in each descriptor MUST be correct MySQL expression.
   
   $res=array();
   
   $index_columns=array();
   foreach ($descriptors_ as $key=>$descriptor)
      if ($descriptor["index"])
         $index_columns[$key]=$descriptor["expr"] ? $descriptor["expr"] : "`".$key."`";   //NOTE: this "expr" check is remains for simplifying writing of descriptors in included php's
   
   foreach ($indexes_ as $r=>$row)
   {
      $eq_statements=array();
      foreach ($index_columns as $key=>$indx_col)
         $eq_statements[]=$indx_col.data_to_eq_statement($row[$key]);
      
      $res[$r]=" WHERE (".implode(")AND(",$eq_statements).")"; //NOTE: preserv row's keys. It's important.
   }
   
   return $res;
}

function make_where_in_clause_from_indexes(array $descriptors_,array $indexes_)
{
   //Makes single WHERE clause for [multi]index using IN operator
   //NOTE: NULL values are NOT supported: both of "SELECT NULL IN ('1','2',NULL);" and "SELECT NULL IN ('1','2');" returns NULL.
   //WARNING: Apriory the keys of $descriptors_ array MUST be correct column names or aliases and the "expr" in each descriptor MUST be correct MySQL expression.
   
   $index_columns=array();
   foreach ($descriptors_ as $key=>$descriptor)
      if ($descriptor["index"])
         $index_columns[$key]=$descriptor["expr"] ? $descriptor["expr"] : "`".$key."`";   //NOTE: this "expr" check is remains for simplifying writing of descriptors in included php's
   
   $values=array();
   foreach ($indexes_ as $r=>$row)
      $values[]="(".implode(",",array_map(data_to_query,array_intersect_key($row,$index_columns))).")";
   
   return "WHERE (".implode($index_columns).") IN (".implode(",",$values).")";
}

function make_limit_clause(&$info_)
{
   //Makes the LIMIT clause, and by the way returns some extra info about number of pages.
   //Arguments: $info_["total"] - total number of rows available.
   //           $info_["rows_per_page"] - requested number of rows per page.
   //           $info_["page"] - requested page.
   //Output:
   //           $info["page_start"] - number of row that is first in the current page.
   //           $info["page_end"]   - number of row that is last  in the current page.
   //           $info["pages_total"] - total number of pages.
   //NOTE: the values of "rows_per_page" and "page" that are may come fom the outside will be corrected if wrong or out of range.
   
   $res="";
   
   $info_["rows_per_page"]=abs((int)$info_["rows_per_page"]);
   $info_["total"]=abs((int)$info_["total"]);
   $info_["page"]=abs((int)$info_["page"]);
   
   if ($info_["rows_per_page"]<1)   //Unlimited number of empty pages is not a good idea)
      $info_["rows_per_page"]=1;    //
   
   $info_["pages_total"]=ceil($info_["total"]/$info_["rows_per_page"]);
   
   if ($info_["page"]<=0)
      $info_["page"]=1;
   if ($info_["page"]>$info_["pages_total"])
      $info_["page"]=$info_["pages_total"];
      
   $info_["page_start"]=max(0,$info_["page"]-1)*$info_["rows_per_page"]+1;                 //For the front-end representing rows are enumerated from 1
   $info_["page_end"]=min($info_["page_start"]+$info_["rows_per_page"],$info_["total"]);   //
   
   $res="LIMIT ".($info_["page_start"]-1).", ".$info_["rows_per_page"];                    // but not foregetting that they are indexed from 0.
   
   return $res;
}

function select_raw($query_,&$count_=NULL)
{
   //This is for that case if you exactly need data without any processings.
   
   global $MYSQLI;
   global $ERRORS;
   
   $res=[];
   
   if ($result=$MYSQLI->query($query_))
   {
      $res=$result->fetch_all(MYSQLI_ASSOC);
      $count_=$result->num_rows;
      $result->free();
   }
   else
      $ERRORS[]=query_report_error($MYSQLI->error,$count_query);
   
   return $res;
}

function select($query_,&$count_=NULL)
{
   global $MYSQLI;
   global $ERRORS;
   
   $res=[];
   
   if ($result=$MYSQLI->query($query_))
   {
      while ($row=$result->fetch_assoc())
         $res[]=array_map(data_from_query,$row);
      
      $count_=$result->num_rows;
      $result->free();
   }
   else
      $ERRORS[]=query_report_error($MYSQLI->error,$query_);
   
   return $res;
}

function get_data(array $params_,&$extra_info_=NULL,$wrapped_request_=NULL)
{
   //Retrieves data from database
   //This is a part of standard data-output pipe. The purpose of this function is to retrieve data for displaying on site pages by means of a complex parameterized queries.
   //It is also designed to retrieve data for output in administrative interface.
   //TODO: think about table locking to guarantee that total number of rows wouldn't change by the time when data will be retrieving.
   //Arguments:
   // $params_ - contains parameters that determines what query have to be formed and executed.
   // $extra_info_ - may be used to acqure info about selected data portion.
   // $wrapped_request_ - the set of parameters, ready to be inserted into query. Normally, this parameter isn't needed, may be except in some extraordinaire cases.
   //NOTE: Apriory the keys of $params_["descriptors_"] arrays MUST be correct column names or aliases and the "expr" in each descriptor MUST be correct MySQL expression.
   //TODO: parameter $wrapped_request_ may be used for optimization, if request was already wrapped for the query just before. But this feature seems useless. 
   //NOTE: as str_replace() rescans whole string after each replacement, and so resulting string grows, define all replacements in order of its length ascending.
   //NOTE: this feature also may allow to parameterized override values, defined in data block, with ones depended on user-provided data.
   
   global $MYSQLI;
   global $ERRORS;
   
   $res=array();
   $extra_info_=array();   //initialize or reset
   
   //Init default params
   if ($params_["query_template"]=="")
      $params_["query_template"]="SELECT [[sel_statements]] FROM `[[table]]` [[references]] [[condition]] [[order]] [[limit]]";
   
   //Collect and wrap request and environment parameters, listed in $params_["qreq_descriptors"].
   $wrapped_request=is_null($wrapped_request_) ? wrap_request($params_["qreq_descriptors"]) : $wrapped_request_; //This is optimization for that case if $wrapped_request was already computed once.
   
   //Encode $wrapped_request with data_to_query() except that values which came from descriptors with "raw" flag.
   $encoded_request=[];
   foreach ($wrapped_request as $key=>$val)
      $encoded_request[$key]=($params_["qreq_descriptors"][$key]["raw"]) ? $val : data_to_query($val); //This feature allows to insert a ready parts of the query, made by request wrappers, while by default these values will be recognized as data.
   
   //Prepare replacements, which are should be inserted into qery template. 
   //WARNING: note that while paginal output "sel_statements","order" and "limit" will be replaced when making of $count_query, so query_template and $wrapped_request MUST NOT contain any clauses that depends on them 
   //         (e.g. any reference to column alias defined in SELECT statements) - doing so will cause an error in $count_query.
   $query_parts_1st_stage=$encoded_request;
   $query_parts_1st_stage["table"]=$params_["table"];
   $query_parts_1st_stage["references"]=make_join_statements($params_["table"],$params_["references"]);
   $query_parts_1st_stage["condition"] =make_where_clauses($params_["condition_chunks"],$encoded_request,true);
   
   //Make query "prepreg"
   $params_["query_template"]=str_replace(array_keys_to_labels($query_parts_1st_stage),$query_parts_1st_stage,$params_["query_template"]);
   
   //Prepare remain replacements
   //NOTE: To define sorting order statically, use $params_["order"].
   //      To sort data in the requested order, define the request descriptor with the "data_sort" key. See also sort_request() wrapper in core_wrappers.php.
   //      Also $params_["order"] may be used as default if no specific sorting order wasn't requested.
   $query_parts_2nd_stage=array(
                                  "order"=>($wrapped_request["data_sort"]!="" ? "ORDER BY ".$wrapped_request["data_sort"] : ($params_["order"]!="" ? "ORDER BY ".$params_["order"] : "")),
                                  "sel_statements"=>make_select_statements($params_["descriptors"]),
                                  "limit"=>"",
                               );
   
   //If data should be retrieved by pages, then get total number of rows, matching to all references and conditions and make LIMIT accorging to requested page.
   if ($params_["paged"])
   {
      $count_parts=array("sel_statements"=>"COUNT(*) AS `total`","order"=>"","limit"=>"");
      $count_query=str_replace(array_keys_to_labels($count_parts),$count_parts,$params_["query_template"]);
      if ($result=$MYSQLI->query($count_query))
      {
         $extra_info_["total"]=$result->fetch_assoc()["total"];                                    //store total number of suitable rows
         $result->free();
         
         $extra_info_["rows_per_page"]=($wrapped_request["rows_per_page"]>0) ? $wrapped_request["rows_per_page"] : $params_["limit"];   //NOTE: If $params_["paged"] is true, then $params_["limit"] provides default rows-per-page value. If request descriptor with key "rows_per_page" allows user to override this value.
         $extra_info_["page"]=$wrapped_request["page"];
         $query_parts_2nd_stage["limit"]=make_limit_clause($extra_info_);                                //and make LIMIT for main query.
      }
      else
         $ERRORS[]=query_report_error($MYSQLI->error,$count_query);
   }
   else
      $query_parts_2nd_stage["limit"]=$params_["limit"]!="" ? "LIMIT ".$params_["limit"] : ""; //Or set limit for non paginal data retrieving
   
   //Make and perform main query
   $query=str_replace(array_keys_to_labels($query_parts_2nd_stage),$query_parts_2nd_stage,$params_["query_template"]);
   return select($query,$extra_info_["count"]);
}

function get_data_by_indexes($params_,$indexes_,$no_null_indexes_=false)
{
   //This is special-purpose function, intended to retrieve data by [requested] primary keys (primary indexes, that is synonymous).
   //The difference between this function and the get_data() is that this one works with variable number sets of parameters. But the get_data() works with only one set of parameters.
   //Arguments:
   // $params_ - fully compatible with $params_ for get_data() and vise versa, but this function uses only "table", "descriptors" and "wrapper_suffix" from this argument.
   // $indexes_ - array of rows that are should contain associative pairs from the keys of index descriptors and values of corresponding key columns. I.e. it allows to get data from tables with multicolumn primary keys.
   // $no_null_indexes_ - if you certain that used indexes shouldn't have NULL values, set this parameter to true to reduse number of queries.
   //NOTE: in fact, columns, that defined by index descriptors, may be not an actual primary key of specified table: this is no matter while gives desired result.
   //NOTE: this function not access $_REQUEST directly to keep independence from indexes source.
   //WARNING: Apriory the "expr" in each descriptor MUST be correct MySQL expression.
   
   global $MYSQLI;
   global $ERRORS;
   
   $res=array();
   
   //Make WHERE clauses and retrieve data
   $where_clauses=($no_null_indexes_) ? [make_where_in_clause_from_indexes($params_["descriptors"],$indexes_)] : make_where_clauses_from_indexes($params_["descriptors"],$indexes_);
   foreach ($where_clauses as $where_clause)
   {
      $query="SELECT ".make_select_statements($params_["descriptors"])."FROM ".name_to_query($params_["table"])." ".$where_clause.";";
      if ($result=$MYSQLI->query($query))
      {
         while ($row=$result->fetch_assoc())
            $res[]=array_map(data_from_query,$row);
         
         $result->free();
      }
      else
         $ERRORS[]=query_report_error($MYSQLI->error,$query);
   }
   
   return $res;
}

define("MQ_INSERT" ,0b00000001); //Insert new rows avoiding columns with AUTO_INCREMENT 
define("MQ_REPLACE",0b00000010); //Make REPLACE query instead INSERT
define("MQ_EXPORT" ,0b00000100); //Keep values of AUTO_INCREMENT columns
define("MQ_UPDATE" ,0b00001101); //Append ON DUPLICATE KEY UPDATE option
define("DEFAULT_ROWS_PER_QUERY",64);

function make_insert_queries($table_,array $descriptors_,array $data_,$query_method_=MQ_INSERT,$rows_per_query_=DEFAULT_ROWS_PER_QUERY)
{
   //Makes INSERT or REPLACE queries from the data.
   //NOTE: $data_ is array of rows, where each row is associative array with keys, which are should be same to the keys of $descriptors_. Any columns, which has no corresponding descriptor will not be included into query.
   //NOTE: if the table has index with AUTO_INCREMENT, its descriptor should have the "readonly" flag (or this descriptor may be omitted, that is the same).
   //NOTE: As this is data-modifying queries, the descriptors with "readonly" flag will be thrown away.
   //NOTE: "raw" flag in descriptor cancels data_to_query() and allows to set any valid SQL expression within $data_ array. Use this feature with care.
   //WARNING: "raw" flag cancels using of data_to_query() over WHOLE column, so take care to not mix unsafe and unquoted data with SQL expressions there.
   //WARNING: While the keys of $descriptors_ are safe, the "expr" is NOT. 
   //         Anyway, the keys and the "expr" must be correct column/alias names.
   
   //Get columns and prepare descriptors, deleting readonly
   $columns=[];
   foreach ($descriptors_ as $key=>$descriptor)
      if (!$descriptor["readonly"]||($descriptor["index"]&&($query_method_&(MQ_REPLACE|MQ_EXPORT))))  //Don't skip AUTO_INCREMENT indexes (marked with "readonly" flag) in REPLACE and exporting queries. 
         $columns[$key]=$descriptor["expr"] ? $descriptor["expr"] : name_to_query($key);   //NOTE: this "expr" check is remains for simplifying writing of descriptors in included php's
         
   //Prepare column list for UPDATE option
   $append_upd=$query_method_==MQ_UPDATE;
   if ($append_upd)
   {
      $rows_per_query_=1;        //this feature doesn't support values grouping
      $updating_columns=[];      //columns for update statements
      foreach ($descriptors_ as $key=>$descriptor)
         if (!$descriptor["index"])
            $updating_columns[$key]=$columns[$key];   //exclude index columns from update statements
   }
   
   //make queries
   $res=[];
   
   $query_start=($query_method_&MQ_INSERT ? "INSERT" : "REPLACE")." INTO ".name_to_query($table_)." (".implode(",",$columns).") VALUES\n";
   $data_count=count($data_);
   $r=0;
   while ($r<$data_count)
   {
      $values=[];    //start new portion of values
      $upd_str="";   //ON DUPLICATE KEY UPDATE patch
      $query_len=0;  //Counter of rows per query
      
      while (($r<$data_count)&&($query_len<$rows_per_query_))
      {
         //quot data row
         $quoted_row=[];
         foreach ($columns as $key=>$column)
            $quoted_row[$key]=($descriptors_[$key]["raw"] ? $data_[$r][$key] : data_to_query($data_[$r][$key]));
         
         if ($append_upd)
         {
            $upd_statements=[];
            foreach($updating_columns as $key=>$col)
               $upd_statements[]=$col."=".$quoted_row[$key];
            $upd_str="\nON DUPLICATE KEY UPDATE ".implode(",",$upd_statements);
         }
         
         //append quoted row to portion
         $values[]="(".implode(",",$quoted_row).")";
         $query_len++;
         $r++;
      }
      
      $res[]=$query_start.implode(",\n",$values).$upd_str.";";
   }
   
   return $res;
}

function make_update_queries($table_,array $descriptors_,array $data_,array $old_indexes_=NULL)
{
   //Makes UPDATE queries from the data
   //NOTE: this function requires descriptor[s], marked with "index" flag for PRIMARY KEY column[s] to match modified rows to original ones.
   //This function allows to modify primary keys if their old values are given into $old_indexes_ array. 
   //NOTE: The rows into $data_ and $old_indexes_ are corresponds to each other by their keys. Mismatching of enumeration of rows into both arrays may cause unpredictable distortion of the data in the table.
   //If $old_indexes_ is NULL, then the index columns from the $data_ will be excluded from SET statements and will be used for WHERE clauses.
   //If $old_indexes_ is not NULL, then values of index columns from this array will be used for WHERE clauses and corresponding values from $data_ will be used for SET statements, if only their descriptors aren't readonly.
   //NOTE: $data_ is array of rows, where each row is associative array with keys, which are should be same to the keys of $descriptors_. Any columns, which has no corresponding descriptor will not be included into query.
   //NOTE: All "readonly" descriptors other than "index" will be discarded.
   //NOTE: "raw" flag in descriptor cancels data_to_query() and allows to set any valid SQL expression within $data_ array. Use this feature with care.
   //WARNING: "raw" flag cancels using of data_to_query() over WHOLE column, so take care to not mix unsafe and unquoted data with SQL expressions there.
   //WARNING: While the keys of $descriptors_ are safe, the "expr" is NOT. 
   //         Anyway, the keys and the "expr" must be correct column/alias names.
   
   //get columns and prepare descriptors, deleting readonly
   $columns=array();
   foreach ($descriptors_ as $key=>$descriptor)
      if (!$descriptor["readonly"]&&(!$descriptor["index"]||!is_null($old_indexes_)))
         $columns[$key]=$descriptor["expr"] ? $descriptor["expr"] : name_to_query($key);   //NOTE: this "expr" check is remains for simplifying writing of descriptors in included php's
   
   //make queries
   $res=array();
   
   $where_clauses=make_where_clauses_from_indexes($descriptors_,(is_null($old_indexes_) ? $data_ : $old_indexes_));
   
   foreach ($data_ as $r=>$row)
      if ($where_clauses[$r])
      {
         $set_statements=array();
         foreach ($columns as $key=>$column)
            $set_statements[$key]=$column."=".($descriptors_[$key]["raw"] ? $row[$key] : data_to_query($row[$key]));

         $res[$r]="UPDATE ".name_to_query($table_)." SET ".implode(",",$set_statements).$where_clauses[$r].";";
      }
   
   return $res;
}

function make_delete_queries($table_,array $descriptors_,array $indexes_)
{
   //Makes DELETE queries using indexes from the data
   //NOTE: $indexes_ is array of rows, where each row is associative array with keys, which are should be same to the keys of $descriptors_. All columns that not corresponds to index descriptors will be ignored.
   //NOTE: this function requires descriptor[s], marked with "index" flag to match rows that shall be deleted.
   //      If index is not "readonly" then column should contain an array with old and new values of this column: ["old"=>"original_value","new"=>"probably_modified_value"]. Old value will be used in WHERE clause and the new one will be placed within SET statements.
   //      If index is "readonly", then column should contain its value directly and it will be used in WHERE clause.
   //NOTE: All "readonly" descriptors other than "index" will be discarded.
   
   //make queries
   $res=array();
   
   $where_clauses=make_where_clauses_from_indexes($descriptors_,$indexes_);   //NOTE: MySQL function IN() doesn't support NULL, so make_where_in_clause_from_indexes() may not be used here.
   
   foreach ($where_clauses as $where_clause)
      $res[]="DELETE FROM ".name_to_query($table_)." ".$where_clause.";";
   
   return $res;
}

function perform_queries(array $queries_,array &$report_=null,$stop_on_fail_=true)
{
   //Performs array of queries. Returns consequent array of results of given queries and detailed report about each of them.
   //Arguments:
   // $queries_ - array of queries to perform.
   // $report_ - if is NULL - it receives only number of queries given and number of succeeded ones, otherwise it also receives detailed information about each query performed.
   // $stop_on_fail_ - if true, all queries after the first error will not be performed and returned array will be rather shorter than array of queries.
   //Result:
   // Array of mixed values that may be one of the follow: 
   //    - selected data if query is SELECT,
   //    - number of affected rows if query should modify data,
   //    - boolean false if query failed.
   //NOTE: this function returns $MYSQLI->insert_id within $report_ element for each query that returns boolean result. It doesn't care about does this query actually generated it.
   
   global $MYSQLI;
   global $ERRORS;
   global $LOCALE;
   
   //perform
   $res=[];
   
   $make_report=!is_null($report_);
   $report_=["total"=>count($queries_),"succeeded"=>0,"details"=>[]];
   
   foreach ($queries_ as $i=>$query)
   {
      $result=$MYSQLI->query($query);
      if ($result)
      {
         $insert_id=null;
         if (is_bool($result))
         {
            $res[$i]=$MYSQLI->affected_rows;
            $insert_id=$MYSQLI->insert_id;
         }
         else
         {
            $res[$i]=$result->fetch_all(MYSQLI_ASSOC);
            $result->free();
         }
         
         $report_["succeeded"]++;
         if ($make_report)
            $report_["details"][$i]=["status"=>"success","affected_rows"=>$MYSQLI->affected_rows,"insert_id"=>$insert_id,"message"=>query_report_success($MYSQLI->affected_rows,$query)];
      }
      else
      {
         $res[$i]=false;
         
         if ($make_report)
            $report_["details"][$i]=["status"=>"error","message"=>query_report_error($MYSQLI->error,$query)];
         else
            $ERRORS[]=query_report_error($MYSQLI->error,$query);
         
         if ($stop_on_fail_)
         {
            if ($make_report)
               $report_["details"][$i]=["status"=>"error","message"=>$LOCALE["Queries_aborted"]];
            break;
         }
      }
   }
   
   if ($make_report)
   {
      if ($report_["total"]==$report_["succeeded"])
      {
         $report_["status"]="success";
         $report_["message"]=$LOCALE["All_queries_succeeded"];
      }
      elseif ($report_["succeeded"]>0)
      {
         $report_["status"]="warning";
         $report_["message"]=$LOCALE["Some_queries_succeeded"].": ".$report_["succeeded"]." ".$LOCALE["from"]." ".$report_["total"];
      }
      else
      {
         $report_["status"]="error";
         $report_["message"]=$LOCALE["All_queries_"]." ".$LOCALE["from"]." ".$report_["total"]." ".$LOCALE["_are_failed"];
      }
   }
   
   return $res;
}

function get_insert_id()
{
   global $MYSQLI;
   
   return $MYSQLI->insert_id;
}

function lock_tables($lock_read_,$lock_write_=NULL)
{
   global $MYSQLI;
   
   $list=[];
   
   if (is_array($lock_read_))
      foreach ($lock_read_ as $table)
         $list[]=name_to_query($table)." READ";
   elseif ($lock_read_)
      $list[]=name_to_query($lock_read_)." READ";
   
   if (is_array($lock_write_))
      foreach ($lock_write_ as $table)
         $list[]=name_to_query($table)." WRITE";
   elseif ($lock_write_)
      $list[]=name_to_query($lock_write_)." WRITE";
   
   return $MYSQLI->query("LOCK TABLES ".implode(",",$list).";");
}

function unlock_tables()
{
   global $MYSQLI;
   
   return $MYSQLI->query("UNLOCK TABLES;");
}
?>