import {buildNodes,clone,parseCompleteFloat,reqServer} from '/core/js_utils.js';
import * as GU from '/graph_utils.js';
import {Tool} from '/tools.js';

export class CalcTool extends Tool
{
   //Siding calc tool for Drawer
   
   constructor(parent_)
   {
      super(parent_);
      
      //private props
      this.visuals=null;
      this.inputs={};
      this.contactInputs=[];
      
      this._cutOffset=0;
      this._cutAxis='x';
      this._cutHeight=1;
      this._stripeMaxLength=14;
      this._crossbarStep=1;   //TODO: obsolete?
      
      this._crossbars=[];
      
      this._material='';
      this._price=0;
      
      //public props
      this.precision=1000;
      
      //Create tool panel
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
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'Горизонтальная'},{tagName:'input',type:'radio',name:'direction',value:'x'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'Вертикальная'},{tagName:'input',type:'radio',name:'direction',value:'y'}]},
                                                ]
                                  },
                                  {tagName:'h3',className:'layout',textContent:'Прогон/ригель (от правого края)'},
                                  {
                                     tagName:'div',
                                     className:'opts columns layout',
                                     childNodes:[
                                                   {tagName:'div',className:'list p'},
                                                   {
                                                      tagName:'div',
                                                      childNodes:[
                                                                    {tagName:'span',textContent:'Добавить через'},
                                                                    {tagName:'input',type:'number',name:'step',min:0.01,step:0.01,value:1},
                                                                    {tagName:'span',className:'unit',textContent:'м'},
                                                                    {tagName:'input',className:'tool ok add',type:'button',value:'+',title:'Добавить',onclick:(e_)=>{this.addCrossbar((this._crossbars.length>0 ? this._crossbars[this._crossbars.length-1] : 0)+this.crossbarStep); this.calcFilling(); e_.target.blur();}}
                                                                 ]
                                                   }
                                                ]
                                  },
                                  {tagName:'h2',className:'material',textContent:'Шаг 6. Выбор материала'},
                                  {
                                     tagName:'select',
                                     name:'material',
                                     className:'opts material',
                                     childNodes:[
                                                   {tagName:'option',textContent:'Сэндвич панели МВ',value:'mv,0.050,100,1.000,14'},
                                     
                                                   {tagName:'option',disabled:true,textContent:'---------------'},
                                                   {tagName:'option',textContent:'Сэндвич панели ПП',value:'pp,0.050,101,1.000,14'},
                                         
                                                   {tagName:'option',disabled:true,textContent:'---------------'},
                                                   {tagName:'option',textContent:'Сэндвич панели ППу',value:'ppu,0.050,102,1.000,14'},
                                                
												   {tagName:'option',disabled:true,textContent:'---------------'},
                                                   {tagName:'option',textContent:'Профнастил C-2.5',value:'profc25,0.5,103,1.200,14'},
                                                   {tagName:'option',textContent:'Профнастил C-10',value:'profc10,0.5,104,1.145,14'},
												   {tagName:'option',textContent:'Профнастил НС-20',value:'profhc20,0.5,105,1.080,14'},
												   {tagName:'option',textContent:'Профнастил НС-44',value:'profhc44,0.5,106,1.010,14'},
												   {tagName:'option',textContent:'Профнастил Н-57',value:'profh57,0.5,107,0.950,14'}
                                                   
                                                ]
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
                                                                    {tagName:'input',type:'hidden',name:'res_opts[]',value:'spec'},
                                                                    {tagName:'input',type:'hidden',name:'res_opts[]',value:'drawing'},
                                                                    {tagName:'input',type:'hidden',name:'res_opts[]',value:'optimize'},
                                                                    {tagName:'label',className:'checkbox right',childNodes:[{tagName:'span',textContent: 'Расчет стоимости'},{tagName:'input',type:'checkbox',name:'res_opts[]',value:'price',className:'req_price'}]}
                                                                 ]
                                                   },
                                                   {tagName:'h3',textContent:'Контактные данные'},
                                                   {tagName:'p',childNodes:[{tagName:'b',textContent:'Важно!'},' Чертёж, спецификацию и расчет стоимости мы отправим вам на указанный адрес. Пожалуйста, используйте актуальные данные.']},
                                                   {
                                                      tagName:'div',
                                                      className:'contact opts',
                                                      childNodes:[
                                                                    {tagName:'label',childNodes:[{tagName:'span',className:'req',textContent:'Ваше имя'},{tagName:'input',type:'text',name:'contacts[name]',dataset:{required:1},value:''}]},
                                                                    {tagName:'label',className:'phone',childNodes:[{tagName:'span',textContent:'Телефон'},{tagName:'input',type:'text',name:'contacts[phone]',dataset:{required:0},value:''}]},
                                                                    {tagName:'label',childNodes:[{tagName:'span',className:'req',textContent:'E-mail'},{tagName:'input',type:'text',name:'contacts[email]',dataset:{required:1},value:''}]}
                                                                 ]
                                                   },
                                                   {tagName:'div',className:'message p hidden'},
                                                ]
                                  },
                                  {tagName:'div',className:'nav',childNodes:[{tagName:'input',type:'button',className:'alt prev',value:'Назад'},{tagName:'input',type:'button',className:'next',value:'Далее'},{tagName:'input',type:'button',className:'send',value:'Получить'}]},
                                  {tagName:'div',className:'nav final',childNodes:[{tagName:'input',type:'button',className:'final_prev',value:'Начать сначала'}]}
                               ]
                 };
      this._toolPanel=buildNodes(struct);
      
      this.inputs.dir=this._toolPanel.querySelectorAll('.panel.calc input[name=\'direction\']');
      this.inputs.crossbarStep=this._toolPanel.querySelector('.panel.calc input[name=\'step\']');
      //this.inputs.offset=this._toolPanel.querySelector('.panel.calc input[name=\'offset\']');
      //this.inputs.cutHeight=this._toolPanel.querySelector('.panel.calc input[name=\'cut_height\']');
      //this.inputs.maxLength=this._toolPanel.querySelector('.panel.calc input[name=\'max_len\']');
      this.contactInputs=this._toolPanel.querySelectorAll('input[name^=contacts]');
      this.inputs.mat=this._toolPanel.querySelectorAll('.panel.calc input[name=\'material\']');
      this.btnPrev=this._toolPanel.querySelector('.panel.calc input[type=button].prev');
      this.btnNext=this._toolPanel.querySelector('.panel.calc input[type=button].next');
      this.btnSend=this._toolPanel.querySelector('.panel.calc input[type=button].send');
      
      for (var radio of this.inputs.dir)
         radio.addEventListener('click',(e_)=>{this.cutAxis=e_.target.value; e_.target.blur();});
      this.inputs.crossbarStep.addEventListener('input',(e_)=>{var val=parseCompleteFloat(e_.target.value); if (!isNaN(val)&&val>0.01){this.crossbarStep=val; this.calcFilling();}});
      //this.inputs.offset.addEventListener('input',(e_)=>{var val=parseCompleteFloat(e_.target.value); if (!isNaN(val)){this.cutOffset=val; this.calcFilling();}});
      //this.inputs.cutHeight.addEventListener('input',(e_)=>{var val=parseCompleteFloat(e_.target.value); if (!isNaN(val)&&val>0.01){this.cutHeight=val; this.calcFilling();}});
      //this.inputs.maxLength.addEventListener('input',(e_)=>{var val=parseCompleteFloat(e_.target.value); if (!isNaN(val)&&val>0.01){this.stripeMaxLength=val; this.calcFilling();}});
      
      for (var radio of this.inputs.mat)
         radio.addEventListener('click',(e_)=>{this.material=e_.target.value; e_.target.blur();});
      
      for (var inp of this.contactInputs)
         inp.addEventListener('input',(e_)=>{e_.target.classList.toggle('invalid',e_.target.value=='');});
      
      this.btnPrev.addEventListener('click',(e_)=>{var stepsTool=this.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; e_.target.blur();}});
      this.btnNext.addEventListener('click',(e_)=>{var stepsTool=this.parent.getToolByName('steps'); if (stepsTool){stepsTool.step++; e_.target.blur();}});
      this.btnSend.addEventListener('click',(e_)=>{
                                                     //Validate contacts
                                                     var messBlk=this._toolPanel.querySelector('.message');
                                                     var errCnt=0;
                                                     var contacts={name:'',phone:'',email:''};
                                                     for (var inp of this.contactInputs)
                                                     {
                                                        contacts[/\[([a-z]+)\]/i.exec(inp.name)[1]]=inp.value;
                                                        var invalid=(inp.value=='');
                                                        inp.classList.toggle('invalid',invalid);
                                                        if (invalid)
                                                           errCnt++;
                                                     }
                                                     //Memorize contacts (forms completion doesn't works for them):
                                                     let param={};
                                                     for (var inp of this.contactInputs)
                                                         param[inp.name]=inp.value;
                                                     this._parent.getToolByName('memory')?.memorize('siding_calc_user_contacts',param);
                                                     
                                                     
                                                     if (errCnt==0)
                                                     {
                                                        var figures=this.parent.figures;
                                                        for (var figure of figures)
                                                           if (figure.type=='compound')
                                                           {
                                                              figure.style.modes=[];
                                                              for (var points of figure.polyLines)
                                                                 figure.style.modes.push(GU.isNormalsOutside(points) ? 'add' : 'cut');
                                                           }
                                                        var data={figures:figures,material:{name:this._material,price:this._price,h:this._cutHeight,max_len:this._stripeMaxLength},res:this.calculationData,opts:[],contacts:contacts}; 
                                                        var optInpts=this._toolPanel.querySelectorAll('input[name^=res_opts]');
                                                        for (var inp of optInpts)
                                                           if (inp.checked)
                                                              data.opts.push(inp.value);
                                                        
                                                        messBlk.classList.remove('error');
                                                        messBlk.classList.remove('success');
                                                        messBlk.classList.add('hidden');
                                                        reqServer(null,data)
                                                           .then((ans_)=>{if (messBlk){var ok=ans_.status=='success'; messBlk.classList.remove('hidden'); messBlk.classList.toggle('error',!ok); messBlk.classList.toggle('success',ok); messBlk.innerHTML=(ok ? 'На указанный адрес отправлено письмо с результатами расчета.' : '<b>Ошибка:</b><br>'+ans_.errors.join('<br>'));}})
                                                           .catch((xhr_)=>{if (messBlk){messBlk.classList.remove('hidden'); messBlk.classList.remove('success'); messBlk.classList.add('error'); messBlk.textContent='Не удалось отправить данные.';}});
                                                     }
                                                     else
                                                     {
                                                        messBlk.classList.remove('hidden');
                                                        messBlk.classList.remove('success');
                                                        messBlk.classList.add('error');
                                                        messBlk.innerHTML='Пожалуйста, заполните все наобходимые поля.';
                                                     }
                                                  });
   }
   
   onReady()
   {
      //Load params
      let param;
      
      param=this._parent.getToolByName('memory')?.recall('siding_calc_axis');
      this.cutAxis=(param=='y' ? param : 'x');
      
      param=parseFloat(this._parent.getToolByName('memory')?.recall('siding_calc_offset'));
      if (!isNaN(param))
         this.cutOffset=param;
      
      param=parseFloat(this._parent.getToolByName('memory')?.recall('siding_calc_cut_height'));
      if (!isNaN(param))
         this.cutHeight=param;
      
      param=parseFloat(this._parent.getToolByName('memory')?.recall('siding_calc_max_len'));
      if (!isNaN(param))
         this.stripeMaxLength=param;
      
      param=parseFloat(this._parent.getToolByName('memory')?.recall('siding_calc_col_step'));
      if (!isNaN(param))
         this.crossbarStep=param;
      
      param=this._parent.getToolByName('memory')?.recall('siding_calc_crossbars');
      if (param)
         for (var crossbar of param)
            this.addCrossbar(crossbar);
         
      this.material=this._parent.getToolByName('memory')?.recall('siding_calc_material');
      
      param=this._parent.getToolByName('memory')?.recall('siding_calc_user_contacts')??{};
      for (var inp of this.contactInputs)
         inp.value=param[inp.name]??'';
   }
   
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
   
   get cutAxis()
   {
      return this._cutAxis;
   }
   set cutAxis(val_)
   {
      this._cutAxis=(val_=='y' ? 'y' : 'x');
      
      for (var radio of this.inputs.dir)
         radio.checked=(radio.value==this._cutAxis);
      
      var items=this._toolPanel.querySelectorAll('.columns .list .axis');
      for (var item of items)
         item.textContent=this._cutAxis.toUpperCase()+':';
      
      this._parent.getToolByName('memory')?.memorize('siding_calc_axis',this._cutAxis);
   }
   
   get cutOffset()
   {
      return this._cutOffset;
   }
   set cutOffset(val_)
   {
      this._cutOffset=val_;
      
      if (this.inputs.offset&&(parseFloat(this.inputs.offset.value)!=this._cutOffset))
         this.inputs.offset.value=this._cutOffset;
      this._parent.getToolByName('memory')?.memorize('siding_calc_offset',this._cutOffset);
   }
   
   get stripeMaxLength()
   {
      return this._stripeMaxLength;
   }
   set stripeMaxLength(val_)
   {
      this._stripeMaxLength=Math.max(val_,0.01);
      
      if (this.inputs.maxLength&&(parseFloat(this.inputs.maxLength.value)!=this._stripeMaxLength))
         this.inputs.maxLength.value=this._stripeMaxLength;
      //this._parent.getToolByName('memory')?.memorize('siding_calc_max_len',this._stripeMaxLength);
   }
   
   get cutHeight()
   {
      return this._cutHeight;
   }
   set cutHeight(val_)
   {
      this._cutHeight=Math.max(val_,0.01);
      
      if (this.inputs.offset)
      {
         this.inputs.offset.max=this._cutHeight;
         this.inputs.offset.min=-this._cutHeight;
         this.inputs.offset.value=Math.min(this.inputs.offset.value,this.inputs.offset.max);
      }
      
      if (this.inputs.cutHeight&&(parseFloat(this.inputs.cutHeight.value)!=this._cutHeight))
         this.inputs.cutHeight.value=this._cutHeight;
      
      //this._parent.getToolByName('memory')?.memorize('siding_calc_cut_height',this._cutHeight);
   }
   
   get crossbarStep()
   {
      return this._crossbarStep;
   }
   set crossbarStep(val_)
   {
      this._crossbarStep=Math.max(val_,0.01);
      
      if (parseFloat(this.inputs.crossbarStep.value)!=this._crossbarStep)
         this.inputs.crossbarStep.value=this._crossbarStep;
      
      this._parent.getToolByName('memory')?.memorize('siding_calc_col_step',this._crossbarStep);
   }
   
   set material(val_)
   {
      if (val_)
      {
         let mat=val_.split(',');
         this._material=mat[0];
         this._price=mat[1];
         this.cutHeight=mat[2];
         this.stripeMaxLength=mat[3];
         
         this._parent.getToolByName('memory')?.memorize('siding_calc_material',val_);
         
         //Set inputs:
         mat[1]='[0-9.]+'; //Replace price with wildcard.
         let regexp=RegExp('^'+mat.join(',')+'$','i');
         for (let radio of this.inputs.mat)
            radio.checked=regexp.test(radio.value);
      }
   }
   
   //private methods
   changeCrossbar(indx_,coord_)
   {
      if (this._crossbars.length>indx_)
      {
         this._crossbars[indx_]=coord_;
         
         this._parent.getToolByName('memory')?.memorize('siding_calc_crossbars',this._crossbars);
      }
   }
   
   //public methods
   addCrossbar(coord_)
   {
      //Adds a crossbar position (point to split the siding).
      if (!isNaN(coord_)&&(!this._crossbars.includes(coord_)))
      {
         var listNode=this._toolPanel.querySelector('.columns .list');
         this._crossbars.push(coord_);
         this._parent.getToolByName('memory')?.memorize('siding_calc_crossbars',this._crossbars);
         
         if (listNode)
         {
            var item=buildNodes({tagName:'div',className:'point',childNodes:[{tagName:'label',childNodes:[{tagName:'span',className:'axis',textContent:this._cutAxis.toUpperCase()+':'},{tagName:'input',type:'number',name:'point',step:0.01,value:coord_},{tagName:'span',className:'unit',textContent:'м'},]},{tagName:'input',className:'tool clr',type:'button',value:'✕',title:'Удалить'}]});
            var input=item.querySelector('input[name=point]');
            var btn=item.querySelector('input[type=button]');
            var indx=this._crossbars.length-1;
            input.addEventListener('input',(e_)=>{var val=parseFloat(e_.target.value); if (!isNaN(val)){this.changeCrossbar(indx,val); this.calcFilling();}});
            btn.addEventListener('click',(e_)=>{this.removeCrossbar(parseFloat(input.value)); listNode.removeChild(item); this.calcFilling(); e_.target.blur();});
            listNode.appendChild(item);
         }
      }
   }
   
   removeCrossbar(coord_)
   {
      var indx=this._crossbars.indexOf(coord_);
      if (indx>-1)
      {
         this._crossbars.splice(indx,1);
         this._parent.getToolByName('memory')?.memorize('siding_calc_crossbars',this._crossbars);
      }
   }
   
   sortCrossbars()
   {
      this._crossbars.sort(function(a_,b_){return Math.sign(a_-b_);});
      
      var items=this._toolPanel.querySelectorAll('.columns .list input[name=point]');
      for (var i=0;i<this._crossbars.length;i++)
         if (items[i])
            items[i].value=this._crossbars[i];
      
      this._parent.getToolByName('memory')?.memorize('siding_calc_crossbars',this._crossbars);
   }
   
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
      var figures=clone(this.parent.figures);
      
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
            scanBox.rect.rt[norm]=GU.roundVal(scanBox.rect.lb[norm]+this.cutHeight);  //rt and lb is on the one cutting line
            scanBox.rect.rt[tang]=bBox.rt[tang];
            
            this.sortCrossbars();
            
            while (scanBox.rect.lb[norm]<bBox.rt[norm])
            {
               //Get intersection of the matching figures with the scanBox
               //console.log('scanBox',clone(scanBox));
               var pieces=[];
               for (var i=0;i<figures.length;i++)
                  if (!((figures[i].bBox.rt[norm]<=scanBox.rect.lb[norm])||(figures[i].bBox.lb[norm]>=scanBox.rect.rt[norm])))
                  {  
                     var figure=this.parent.intersectFigures(clone(figures[i]),clone(scanBox),'intersect');
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
               //console.log('pieces',clone(pieces));
               
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
                     
                     for (var c of this._crossbars)
                     {
                        var crel=bBox.lb[tang]+c;
                        if ((lastStrp.rect.lb[tang]<crel)&&(crel<lastStrp.rect.rt[tang]))
                        {
                           var part=clone(lastStrp);
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
                  var cnt=Math.floor(stripe.l/this.stripeMaxLength);
                  var rest=GU.roundVal(stripe.l-cnt*this.stripeMaxLength);
                  var rt={...stripe.rect.rt};
                  if (cnt>0)
                  {
                     for (var s=0;s<cnt;s++)
                     {
                        stripe.rect.rt[tang]=stripe.rect.lb[tang]+this.stripeMaxLength;
                        stripe.l=this.stripeMaxLength;
                        buff.push(clone(stripe));
                        
                        stripe.rect.lb[tang]+=this.stripeMaxLength;
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
               
               scanBox.rect.lb[norm]=GU.roundVal(scanBox.rect.lb[norm]+this.cutHeight);   //Increment scanBox position
               scanBox.rect.rt[norm]=GU.roundVal(scanBox.rect.rt[norm]+this.cutHeight);   //
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
               spentSquare+=(l*this.cutHeight);
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
}