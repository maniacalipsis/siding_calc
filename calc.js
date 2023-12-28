import {RadioGroup,decorateInputFieldVal,bindEvtInputToDeferredChange,buildNodes,DynamicList,DynamicListItem,clone,parseCompleteFloat,reqServer} from './core/js_utils.js';
import * as GU from './graph_utils.js';
import {Tool} from './tools.js';

if (!('structuredClone' in (globalThis??window)))
   (globalThis??window).structuredClone=clone;

export class CalcTool extends Tool
{
   //Siding calc tool for Drawer
   
   constructor(parent_)
   {
      super(parent_);
      
      //Create tool panel:
      let selMaterialOpts=[];
      let matGrp=this._materials.values().next().value?.group??null;
      for (let [key,mat] of this._materials)
      {
         selMaterialOpts.push({tagName:'option',textContent:mat.name,value:key});
         if (mat.group!=matGrp)
         {
            selMaterialOpts.push({tagName:'option',disabled:true,textContent:'---------------'});
            matGrp=mat.group;
         }
      }
      
      var struct={
                    tagName:'div',
                    className:'panel calc',
                    childNodes:[
                                  {tagName:'h2',className:'layout',textContent:'Шаг 5. Раскладка'},
                                  {tagName:'div',className:'hint layout',innerHTML:'Выберите направление раскладки (ориентация панели в процессе монтажа)'},
                                  {
                                     tagName:'div',
                                     className:'opts layout',
                                     childNodes:[
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'Горизонтальная'},{tagName:'input',type:'radio',name:'direction',value:'x',_collectAs:['inputs','direction','x']}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'Вертикальная'},{tagName:'input',type:'radio',name:'direction',value:'y',_collectAs:['inputs','direction','y']}]},
                                                ]
                                  },
                                  {tagName:'h3',className:'layout',textContent:'Прогон/ригель (от правого края)'},
                                  {
                                     tagName:'div',
                                     className:'opts columns layout',
                                     childNodes:[
                                                   {tagName:'div',className:'list p',_collectAs:'blkCrossbars'},
                                                   {
                                                      tagName:'div',
                                                      childNodes:[
                                                                    {tagName:'span',textContent:'Добавить через'},
                                                                    {tagName:'input',type:'number',name:'step',min:0.01,step:0.01,value:1,_collectAs:['inputs','crossbarStep']},
                                                                    {tagName:'span',className:'unit',textContent:'м'},
                                                                    {tagName:'input',className:'tool ok add',type:'button',value:'+',title:'Добавить',onclick:(e_)=>{let crossbars=this._crossbarsList.sorted; this._crossbarsList.add((crossbars[crossbars.length-1]??0)+this.crossbarStep);}}
                                                                 ]
                                                   }
                                                ]
                                  },
                                  {tagName:'h2',className:'material',textContent:'Шаг 6. Выбор материала'},
                                  {
                                     tagName:'select',
                                     name:'material',
                                     className:'opts material',
                                     childNodes:selMaterialOpts,
                                     _collectAs:['inputs','material'],
                                  },
                                  {tagName:'h2',className:'result',textContent:'Шаг 7. Результат'},
                                  {
                                     tagName:'div',
                                     className:'result p',
                                     childNodes:[
                                                   {
                                                      tagName:'div',
                                                      className:'lengths group',
                                                      childNodes:[
                                                                    {tagName:'h3',textContent:'Панели:'},
                                                                    {tagName:'div',className:'scrollbox y p',childNodes:[{tagName:'table',id:'calc_res_lengths'}]},
                                                                 ]
                                                   },
                                                   {
                                                      tagName:'div',
                                                      className:'expense group',
                                                      childNodes:[
                                                                    {tagName:'span',className:'header',textContent:'Всего листов: '},
                                                                    {tagName:'span',className:'value',id:'calc_res_expencies',textContent:'0'},
                                                                 ]
                                                   },
                                                   {
                                                      tagName:'div',
                                                      className:'total group',
                                                      childNodes:[
                                                                    {tagName:'span',className:'header',textContent:'Количество: '},
                                                                    {tagName:'span',className:'value',id:'calc_res_total',textContent:'0'},
                                                                    {tagName:'span',className:'unit',innerHTML:' м<sup>2</sup>'},
                                                                 ]
                                                   },
                                                   {
                                                      tagName:'div',
                                                      className:'waste group',
                                                      childNodes:[
                                                                    {tagName:'span',className:'header',textContent:'Площадь отходов: '},
                                                                    {tagName:'span',className:'value',id:'calc_res_waste',textContent:'0'},
                                                                    {tagName:'span',className:'unit',innerHTML:' м<sup>2</sup>'},
                                                                 ]
                                                   },
                                                   {
                                                      tagName:'div',
                                                      className:'save_local group',
                                                      childNodes:[
                                                                    {tagName:'a',href:'',download:'siding_calc_data.json',textContent:'Сохранить данные проекта',_collectAs:'lnkSaveLocal'},
                                                                 ]
                                                   },
                                                ]
                                  },
                                  {tagName:'h2',className:'contacts',textContent:'Шаг 8. Получить результат'},
                                  {
                                     tagName:'div',
                                     className:'contacts p',
                                     childNodes:[
                                                   {
                                                      tagName:'div',
                                                      className:'options opts',
                                                      childNodes:[
                                                                    {tagName:'input',type:'hidden',name:'res_opts[]',value:'spec'    ,_collectAs:['inputs','resOpts',0]},
                                                                    {tagName:'input',type:'hidden',name:'res_opts[]',value:'drawing' ,_collectAs:['inputs','resOpts',1]},
                                                                    {tagName:'input',type:'hidden',name:'res_opts[]',value:'optimize',_collectAs:['inputs','resOpts',2]},
                                                                    {tagName:'label',className:'checkbox right',childNodes:[{tagName:'span',textContent: 'Расчет стоимости'},{tagName:'input',type:'checkbox',name:'res_opts[]',value:'price',className:'req_price',_collectAs:['inputs','resOpts',3]}]},
                                                                    {tagName:'label',className:'checkbox right',childNodes:[{tagName:'span',textContent: 'Ccылку на проект'},{tagName:'input',type:'checkbox',name:'res_opts[]',value:'link',className:'req_link'  ,_collectAs:['inputs','resOpts',4]}]},
                                                                 ]
                                                   },
                                                   {tagName:'h3',textContent:'Контактные данные'},
                                                   {tagName:'p',childNodes:[{tagName:'b',textContent:'Важно!'},' Чертёж, спецификацию и расчет стоимости мы отправим вам на указанный адрес. Пожалуйста, используйте актуальные данные.']},
                                                   {
                                                      tagName:'div',
                                                      className:'contact opts',
                                                      childNodes:[
                                                                    {tagName:'label',childNodes:[{tagName:'span',className:'req',textContent:'Ваше имя'},{tagName:'input',type:'text',name:'contacts[name]',required:true,value:'',_collectAs:['inputs','contacts','name']}]},
                                                                    {tagName:'label',className:'phone',childNodes:[{tagName:'span',className:'req',textContent:'Телефон'},{tagName:'input',type:'text',name:'contacts[phone]',required:true,pattern:'^\\+?[0-9]{10}$',value:'',_collectAs:['inputs','contacts','phone']}]},
                                                                    {tagName:'label',childNodes:[{tagName:'span',className:'req',textContent:'E-mail'},{tagName:'input',type:'text',name:'contacts[email]',required:true,pattern:'^[a-z0-9\\._%\\+\\-]+@[a-z0-9\\.\\-]+\\.[a-z]{2,4}$',value:'',_collectAs:['inputs','contacts','email']}]}
                                                                 ]
                                                   },
                                                   {tagName:'div',className:'message p',_collectAs:'blkMessage'},
                                                ]
                                  },
                                  {tagName:'div',className:'nav',childNodes:[{tagName:'input',type:'button',className:'alt prev',value:'Назад',_collectAs:'btnPrev'},{tagName:'input',type:'button',className:'next',value:'Далее',_collectAs:'btnNext'},{tagName:'input',type:'button',className:'send',value:'Получить',_collectAs:'btnSend'}]},
                                  {tagName:'div',className:'nav final',childNodes:[{tagName:'input',type:'button',className:'final_prev',value:'Начать сначала'}]}
                               ]
                 };
      this._toolPanel=buildNodes(struct,this._insidesCollection);
      
      this._crossbarsList=new CrossBarsList(this,{itemClass:CrossBar,itemClassParams:{},listNode:this._insidesCollection.blkCrossbars});
      
      //Group the radios:
      this._insidesCollection.inputs.direction=new RadioGroup(Object.entries(this._insidesCollection.inputs.direction));
      //Decorate inputs with prop valueAsMixed:
      this._insidesCollection.inputs.resOpts=new InpArray(Object.entries(this._insidesCollection.inputs.resOpts));
      for (let [key,inp] of Object.entries(this._insidesCollection.inputs))
         if ((inp instanceof HTMLElement)||(inp instanceof RadioGroup))
            decorateInputFieldVal(inp);
      for (let [key,inp] of Object.entries(this._insidesCollection.inputs.contacts))
         decorateInputFieldVal(inp);
      
      //Assign event listeners:
      this._insidesCollection.inputs.direction.onSetValue=(val_)=>{this.cutAxis=val_;};
      this._insidesCollection.inputs.crossbarStep.addEventListener('input',(e_)=>{this.crossbarStep=e_.target.valueAsMixed; this.calcFilling();});
      //this._insidesCollection.inputs.cutOffset.addEventListener('input',(e_)=>{this.cutOffset=e_.target.valueAsMixed; this.calcFilling();});
      this._insidesCollection.inputs.material.addEventListener('change',(e_)=>{this._materialKey=e_.target.valueAsMixed});
      for (let [key,inp] of Object.entries(this._insidesCollection.inputs.contacts))
         inp.addEventListener('input',(e_)=>{e_.target.classList.toggle('invalid',e_.target.value=='');});
      
      this._insidesCollection.btnPrev.addEventListener('click',(e_)=>{var stepsTool=this.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; e_.target.blur();}});
      this._insidesCollection.btnNext.addEventListener('click',(e_)=>{var stepsTool=this.parent.getToolByName('steps'); if (stepsTool){stepsTool.step++; e_.target.blur();}});
      this._insidesCollection.btnSend.addEventListener('click',(e_)=>{this.send();});
   }
   
   onReady()
   {
      //Load params
      let memory=this._parent.getToolByName('memory');
      let param;
      
      param=memory?.recall('siding_calc_axis');
      this.cutAxis=(param=='y' ? param : 'x');
      
      //param=parseFloat(memory?.recall('siding_calc_offset'));
      //if (!isNaN(param))
      //   this._cutOffset=param;
      
      param=parseFloat(memory?.recall('siding_calc_col_step'));
      if (!isNaN(param))
         this._crossbarStep=param;
      
      param=parseFloat(memory?.recall('siding_calc_material'));
      if (this._materials.has(param))
         this._materialKey=param;
      
      param=memory?.recall('siding_calc_user_contacts')??{};
      for (var [key,inp] of Object.entries(this._insidesCollection.inputs.contacts))
         inp.value=param[key]??'';
   }
   
   //public props
   get name(){return 'calc';}
   
   set activeView(nextView_)
   {
      let views=['material','result','contacts','layout'];
      if (views.includes(nextView_))
      {
         for (let view of views)
            this._toolPanel.classList.remove(view);
         this._toolPanel.classList.add(nextView_);
      }
   }
   
   get cutAxis(){return this._cutAxis;}
   set cutAxis(val_)
   {
      this._cutAxis=(val_=='y' ? 'y' : 'x');
      
      this._insidesCollection.inputs.direction.valueAsMixed=this._cutAxis;
      
      var items=this._toolPanel.querySelectorAll('.columns .list .axis');
      for (var item of items)
         item.textContent=this._cutAxis.toUpperCase()+':';
      
      this._parent.getToolByName('memory')?.memorize('siding_calc_axis',this._cutAxis);
   }
   
   get cutOffset(){return this._cutOffset;}
   set cutOffset(val_)
   {
      this._cutOffset=val_;
      
      //this._insidesCollection.inputs.cutOffset.valueAsMixed=this._cutOffset;
      
      this._parent.getToolByName('memory')?.memorize('siding_calc_offset',this._cutOffset);
   }
   
   get crossbarStep(){return this._crossbarStep;}
   set crossbarStep(val_)
   {
      this._crossbarStep=Math.max(val_,0.01);
      
      this._insidesCollection.inputs.crossbarStep.valueAsMixed=this._crossbarStep;
      
      this._parent.getToolByName('memory')?.memorize('siding_calc_col_step',this._crossbarStep);
   }
   
   get crossbars(){return this._crossbarsList.sorted;}
   set crossbars(newVal_){this._crossbarsList.data=newVal_;}
   
   get materialKey(){return this._materialKey;}
   set materialKey(newVal_){if (this._materials.has(newVal_)) this._materialKey=newVal_;}
   
   get material(){return this._materials.get(this._materialKey);}
   
   get lnkSaveLocal(){return this._insidesCollection.lnkSaveLocal;}
   
   visuals=null;
   
   //private props
   _insidesCollection={};
   _inputs={};
   
   _cutOffset=0;
   _cutAxis='x';
   _cutHeight=1;
   _stripeMaxLength=14;
   _crossbarStep=1;   //TODO: obsolete?
   _crossbarsList=null;
   
   _materials=new Map([
                         //Material height and max_len are measured in meters.
                         ['mv'      ,{group:'mv' ,name:'Сэндвич панели МВ' ,thickness:0.050,price:100,height:1.000,max_len:14}],
                         ['pp'      ,{group:'pp' ,name:'Сэндвич панели ПП' ,thickness:0.050,price:101,height:1.000,max_len:14}],
                         ['ppu'     ,{group:'ppu',name:'Сэндвич панели ППу',thickness:0.050,price:102,height:1.160,max_len:14}],
                         ['profc25' ,{group:'cs' ,name:'Профнастил C-2.5'  ,thickness:0.5  ,price:103,height:1.200,max_len:14}],
                         ['profc10' ,{group:'cs' ,name:'Профнастил C-10'   ,thickness:0.5  ,price:104,height:1.145,max_len:14}],
                         ['profhc20',{group:'cs' ,name:'Профнастил НС-20'  ,thickness:0.5  ,price:105,height:1.080,max_len:14}],
                         ['profhc44',{group:'cs' ,name:'Профнастил НС-44'  ,thickness:0.5  ,price:106,height:1.010,max_len:14}],
                         ['profh57' ,{group:'cs' ,name:'Профнастил Н-57'   ,thickness:0.5  ,price:107,height:0.950,max_len:14}],
                      ]);
   _materialKey=this._materials.keys().next().value;
   
   //public methods
   onRepaintOverlay(overlay_)
   {
      if (this.visuals)
      {
         var textSize=12;
         var color='#0072BF';
         var context=overlay_.getContext('2d');
         
         if (this.visuals.bBox)
            this.parent.paintRect(overlay_,this.visuals.bBox,{stroke:'rgba(0,128,255,0.75)'});
         
         if (this.visuals.scans)
            for (var scan of this.visuals.scans)
               for (var stripe of scan)
               {
                  //Paint stripe rect
                  this.parent.paintRect(overlay_,stripe.rect,{fill:'rgba(0,255,255,0.1)',stroke:'rgba(0,255,255,0.5)'});
                  var rect=this.parent.rectToCanvas(stripe.rect);
                  
                  //Write stripe length
                  var pt=GU.midPoint(rect.lb,rect.rt);
                  pt.y+=textSize/2;
                  context.font=textSize+'px sans-serif';
                  context.textAlign='center';
                  context.fillStyle=color;
                  context.fillText(GU.roundVal(stripe.l),pt.x,pt.y);
               }
      }
   }
   
   calcFilling()
   {
      function bBoxSortXCb(b1_,b2_)
      {
         return Math.sign(b1_.bBox.lb.x-b2_.bBox.lb.x);
      }
      function bBoxSortYCb(b1_,b2_)
      {
         return Math.sign(b1_.bBox.lb.y-b2_.bBox.lb.y);
      }
      
      //Calculate filling
      this.visuals={bBox:null,scans:[]};
      
      //Prepare and cleanup:
      let figures=(this.parent.compoundFigure ? [structuredClone(this.parent.compoundFigure)] : []);
      
      //Start calculations
      var lengths=[];
      var usedSquare=0;
      
      if (figures.length)
      {
         var bBox=this.parent.boundingBox(figures,true); //get overall bounding box and assign local boxes to each figure by the way
         this.visuals.bBox=bBox;
         if (bBox)
         {
            //Select cutting axis
            var tang=this.cutAxis;              //Tangent, i.e. axis that lays along cutting direction.
            var norm=(tang=='x' ? 'y' : 'x');   //Normal, i.e. another axis that is normal to cutting.
            
            var scanBox={type:'rect',rect:{lb:{},rt:{}},style:{}};
            scanBox.rect.lb[norm]=GU.roundVal(bBox.lb[norm]+this.cutOffset);
            scanBox.rect.lb[tang]=bBox.lb[tang];
            scanBox.rect.rt[norm]=GU.roundVal(scanBox.rect.lb[norm]+this.material.height);  //rt and lb is on the one cutting line
            scanBox.rect.rt[tang]=bBox.rt[tang];
            
            while (scanBox.rect.lb[norm]<bBox.rt[norm])
            {
               //Get intersection of the matching figures with the scanBox
               //console.log('scanBox',structuredClone(scanBox));
               var pieces=[];
               for (var i=0;i<figures.length;i++)
                  if (!((figures[i].bBox.rt[norm]<=scanBox.rect.lb[norm])||(figures[i].bBox.lb[norm]>=scanBox.rect.rt[norm])))
                  {  
                     var figure=this.parent.intersectFigures(structuredClone(figures[i]),structuredClone(scanBox),'intersect');
                     if (figure)
                     {
                        if (figure.type=='compound')
                        {
                           //console.log('comp figure',figure);
                           for (var points of figure.polyLines)
                              pieces.push({type:'polyline',points:points});
                        }
                        else
                           pieces.push(figure);
                     }
                  }
               
               //Get bounding boxes and sort'em alonside cutting line
               this.parent.boundingBox(pieces,true);  //Assign individual bounding boxes to each piece
               switch (tang)
               {
                  case 'x':{pieces.sort(bBoxSortXCb); break;}
                  case 'y':{pieces.sort(bBoxSortYCb); break;}
               }
               //console.log('pieces',structuredClone(pieces));
               
               var stripes=[];
               //Merge bounding boxes
               for (var piece of pieces)
               {
                  //Calc used square
                  usedSquare+=GU.polyLineSquare(piece.points);
                  
                  //Merge bounding boxes
                  if ((stripes.length>0)&&(piece.bBox.lb[tang]<=stripes[stripes.length-1].rect.rt[tang]))  //NOTE: pieces must be sorted alonside cutting axis (tangent) in ascendent order
                  {
                     stripes[stripes.length-1].rect.rt[tang]=Math.max(piece.bBox.rt[tang],stripes[stripes.length-1].rect.rt[tang]);  //Merge piece bounding box with previous stripe
                     stripes[stripes.length-1].l=(stripes[stripes.length-1].rect.rt[tang]-stripes[stripes.length-1].rect.lb[tang]);
                  }
                  else
                  {
                     var stripe={rect:{lb:{},rt:{}},l:0};
                     stripe.rect.lb[tang]=piece.bBox.lb[tang];
                     stripe.rect.lb[norm]=scanBox.rect.lb[norm];
                     stripe.rect.rt[tang]=piece.bBox.rt[tang];
                     stripe.rect.rt[norm]=scanBox.rect.rt[norm];
                     stripe.l=(stripe.rect.rt[tang]-stripe.rect.lb[tang]);
                     stripes.push(stripe);
                  }
                  
                  //Split last stripe by columns
                  if (stripes.length>0)
                  {
                     var lastStrp=stripes.pop();
                     
                     for (var c of this.crossbars)
                     {
                        var crel=bBox.lb[tang]+c;
                        if ((lastStrp.rect.lb[tang]<crel)&&(crel<lastStrp.rect.rt[tang]))
                        {
                           var part=structuredClone(lastStrp);
                           part.rect.rt[tang]=crel;
                           part.l=GU.roundVal(part.rect.rt[tang]-part.rect.lb[tang]);
                           stripes.push(part);
                           lastStrp.rect.lb[tang]=crel;
                           lastStrp.l=GU.roundVal(lastStrp.rect.rt[tang]-lastStrp.rect.lb[tang]);
                        }
                     }
                     
                     stripes.push(lastStrp);
                     
                  }
               }
               
               //Split stripes by maximum length
               var buff=[];
               for (var stripe of stripes)
               {
                  var cnt=Math.floor(stripe.l/this.material.max_len);
                  var rest=GU.roundVal(stripe.l-cnt*this.material.max_len);
                  var rt={...stripe.rect.rt};
                  if (cnt>0)
                  {
                     for (var s=0;s<cnt;s++)
                     {
                        stripe.rect.rt[tang]=stripe.rect.lb[tang]+this.material.max_len;
                        stripe.l=this.material.max_len;
                        buff.push(structuredClone(stripe));
                        
                        stripe.rect.lb[tang]+=this.material.max_len;
                     }
                  }
                  
                  if (rest>0)
                  {
                     stripe.rect.rt=rt;
                     stripe.l=rest;
                     buff.push(stripe);
                  }
               }
               stripes=buff;
               
               //Add to lengths
               for (var stripe of stripes)
                  lengths.push(stripe.l);
               
               //Save stripes for visualisation 
               this.visuals.scans.push(stripes);
               
               scanBox.rect.lb[norm]=GU.roundVal(scanBox.rect.lb[norm]+this.material.height);   //Increment scanBox position
               scanBox.rect.rt[norm]=GU.roundVal(scanBox.rect.rt[norm]+this.material.height);   //
            }
            console.log('scans',this.visuals.scans);
            
            //Calc ----------------------------------
            var spentSquare=0;
            var totalSquare=0;
            var totalLength=0;
            var groups=[];
            
            //Group lengths and calc total
            lengths.sort(function(l1_,l2_){return Math.sign(l2_-l1_);});   //Sost lengths in descendant order
            for (var l of lengths)
            {
               if (groups.length>0&&groups[groups.length-1].length==l)
                  groups[groups.length-1].cnt++;
               else
                  groups.push({length:l,cnt:1});
               
               totalLength+=l;
               spentSquare+=(l*this.material.height);
            }
            totalSquare=(totalLength*this._cutHeight);
            
            //Display results:
            var node;
            node=document.getElementById('calc_res_lengths');
            if (node)
            {
               while (node.childNodes.length>0)
                  node.removeChild(node.childNodes[0]);
               
               for (var g of groups)
                  node.appendChild(buildNodes({
                                                 tagName:'tr',
                                                 childNodes:[
                                                               {
                                                                  tagName:'td',
                                                                  className:'l',
                                                                  childNodes:[
                                                                                {tagName:'span',className:'value',textContent:g.length.toFixed(3)},
                                                                                {tagName:'span',className:'unit',textContent:' м'}
                                                                             ]
                                                               },
                                                               {
                                                                  tagName:'td',
                                                                  className:'n',
                                                                  childNodes:[
                                                                                {tagName:'span',className:'value',textContent:g.cnt},
                                                                                {tagName:'span',className:'unit',textContent:' шт.'}
                                                                             ]
                                                               }
                                                            ]
                                              }));
            }
            
            node=document.getElementById('calc_res_expencies');
            if (node)
               node.textContent=lengths.length;
            
            node=document.getElementById('calc_res_total');
            if (node)
               node.textContent=totalSquare.toFixed(3);
            
            node=document.getElementById('calc_res_waste');
            if (node)
               node.textContent=(spentSquare-usedSquare).toFixed(3);
            
            this.parent.repaintOverlay();
            
            //Send to server
            this.calculationData={scans:this.visuals.scans,panels:groups,count:lengths.length,total_l:totalLength,total_s:totalSquare,waste:(spentSquare-usedSquare).toFixed(3)};
         }
      }
   }
   
   send()
   {
      //Validate contacts
      try
      {
         let contacts={};
         for (let [key,inp] of Object.entries(this._insidesCollection.inputs.contacts))
            if (inp.reportValidity())
               contacts[key]=inp.valueAsMixed;
            else
               throw new Error('Пожалуйста, заполните все наобходимые поля.');
         
         //Memorize contacts (forms completion doesn't works for them):
         this._parent.getToolByName('memory')?.memorize('siding_calc_user_contacts',contacts);
         
         //Get drawing data:
         let compoundFigure=structuredClone(this.parent.compoundFigure);
         if (compoundFigure.type=='compound')
         {
            compoundFigure.style.modes=[];
            for (var points of compoundFigure.polyLines)
               compoundFigure.style.modes.push(GU.isNormalsOutside(points) ? 'add' : 'cut'); //Add hints for drawing backend (it doesn't recognize normals):
         }
         
         //Fill request:
         var data={
                     action:'request',
                     figures:this._parent.cloneFigures(),
                     drawing:compoundFigure,
                     material:{key:this._materialKey,...this.material},
                     cutAxis:this.cutAxis,
                     cutOffset:this.cutOffset,
                     crossbars:this.crossbars,
                     res:this.calculationData,
                     opts:this._insidesCollection.inputs.resOpts.valueAsMixed,
                     contacts:contacts,
                  }; 
         
         this._report('');
         reqServer(null,data)
            .then((ans_)=>{this._report((ans_.status=='success' ? 'На указанный адрес отправлено письмо с результатами расчета.' : '<b>Ошибка:</b><br>'+ans_.errors.join('<br>')),ans_.status);})
            .catch((xhr_)=>{this._report('Не удалось отправить данные.','error');});
      }
      catch (err)
      {
         this._report(err.message,'error');
      }
   }
   
   //private methods
   _report(mess_,status_)
   {
      this._insidesCollection.blkMessage.innerHTML=mess_;
      this._insidesCollection.blkMessage.classList.toggle('success',status_=='success');
      this._insidesCollection.blkMessage.classList.toggle('error',/^error|fail|failure$/i.test(status_));
   }
}

class InpArray
{
   //Array of arbitrary inputs, represented as one.
   
   constructor(entries_)
   {
      for (let [i,inp] of entries_)
         this._inputs.push(inp);
   }
   
   //public props
   get type()
   {
      //Returns a synthetic type to make user don't mess this class with the radios themselves.
      
      return 'inparray';
   }
   
   get name()
   {
      //Return the radios name. (All radios in the group must have the same name.)
      
      return this._inputs[0]?.name;
   }
   set name(newVal_)
   {
      //Renames all inputs in the array.
      
      for (let inp of this._inputs)
         inp.name=newVal_;
      
      this.on_rename?.();
   }
   
   get value(){return this.valueAsMixed.join(',');}
   set value(newVal_){this.valueAsMixed=newVal_?.split(',')??[];}
   
   get valueAsMixed()
   {
      //Returns a value as array.
      
      let res=[];
      
      for (let inp of this._inputs)
         switch (inp.type)
         {
            case 'checkbox':
            {
               res.push(inp.checked ? inp.value : null);
               break;
            }
            default:
            {
               res.push(inp.value);
            }
         }
      
      return res;
   }
   set valueAsMixed(newVal_)
   {
      //Assigns values from newVal_ to the inputs matching by indexes.
      
      for (let [i,inp] of this._inputs.entries())
         switch (inp.type)
         {
            case 'checkbox':
            {
               inp.checked=(newVal_[i]==inp.value);
               break;
            }
            default:
            {
               inp.value=newVal_[i];
            }
         }
      
      this.onSetValue?.(this.value);
   }
   
   //private props
   _inputs=[];
}


class CrossBarsList extends DynamicList
{
   //public props
   get data(){return super.data;}
   set data(data_)
   {
      super.data=this._sort(data_);
      this._isSorted=true;
      
      this.onUpdate();
   }
   
   get sorted(){return (this._isSorted ? this.data : this._sort(this.data));} //Returns sorted data w/o modifying of original.
   
   //private props
   _isSorted=false;
   
   //public methods
   add(mixed_)
   {
      let newItem=super.add(mixed_);
      this.onUpdate();
      
      return newItem;
   }
   
   remove(mixed_)
   {
      super.remove(mixed_);
      this.onUpdate();
   }
   
   sort()
   {
      this.data=this.data; //Reassigning of the data causes sorting.
   }
   
   onUpdate()
   {
      this._parent?.calcFilling();
   }
   
   //private methods
   _sort(data_)
   {
      return data_.sort(function(a_,b_){return Math.sign(a_-b_);});
   }
}

class CrossBar extends DynamicListItem
{
   constructor(parent_,params_)
   {
      params_.nodeStruct??={
                              tagName:'div',
                              className:'point',
                              childNodes:[
                                            {
                                               tagName:'label',
                                               childNodes:[
                                                             {tagName:'span',className:'axis',textContent:'X:',_collectAs:'axis'},
                                                             {tagName:'input',type:'number',name:'point',step:0.01,value:0,_collectAs:'inpCoord'},
                                                             {tagName:'span',className:'unit',textContent:'м'},
                                                          ],
                                            },
                                            {tagName:'input',className:'tool clr',type:'button',value:'✕',title:'Удалить',_collectAs:'btnDel'}
                                         ],
                           };
      super(parent_,params_);
      
      decorateInputFieldVal(this._insidesCollection.inpCoord);
      bindEvtInputToDeferredChange(this._insidesCollection.inpCoord)
      this._insidesCollection.inpCoord.addEventListener('change',(e_)=>{this._parent?.onUpdate();});
      this._insidesCollection.inpCoord.addEventListener('blur',(e_)=>{this._parent?.sort();});
      this._insidesCollection.btnDel.addEventListener('click',(e_)=>{this._parent?.remove(this);});
   }
   
   get data()
   {
      return this._insidesCollection.inpCoord.valueAsMixed;
   }
   set data(data_)
   {
      this._insidesCollection.inpCoord.valueAsMixed=data_;
      //this._parent?.update()
   }
}