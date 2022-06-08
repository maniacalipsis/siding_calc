class CalcTool extends Tool
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
      this._colStep=1;
      
      this._columns=[];
      
      this._material='';
      this._matThickness=0;
      this._price=0;
      
      //public props
      this.precision=1000;
      
      //Create tool panel
      var sender=this;
      var struct={
                    tagName:'div',
                    className:'panel calc',
                    childNodes:[
                                  {tagName:'h2',className:'layout',textContent:'Шаг 5. Раскладка'},
                                  {tagName:'h3',className:'layout',textContent:'Направление раскладки'},
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
                                                                    {tagName:'input',className:'tool ok add',type:'button',value:'+',title:'Добавить',onclick:function(e_){sender.addColumn((sender._columns.length>0 ? sender._columns[sender._columns.length-1] : 0)+sender.colStep); sender.calcFilling(); this.blur();}}
                                                                 ]
                                                   }
                                                ]
                                  },
                                  {tagName:'h2',className:'material',textContent:'Шаг 6. Выбор материала'},
                                  {
                                     tagName:'div',
                                     className:'opts material',
                                     childNodes:[
                                                   {tagName:'h3',textContent:'Сэндвич панели МВ:'},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent: '80мм'},{tagName:'input',type:'radio',name:'material',value:'mv,0.080,100,1.000,14'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'100мм'},{tagName:'input',type:'radio',name:'material',value:'mv,0.100,100,1.000,14'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'120мм'},{tagName:'input',type:'radio',name:'material',value:'mv,0.120,100,1.000,14'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'200мм'},{tagName:'input',type:'radio',name:'material',value:'mv,0.200,100,1.000,14'}]},
                                                   {tagName:'hr'},
                                                   {tagName:'h3',textContent:'Сэндвич панели ПП:'},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent: '60мм'},{tagName:'input',type:'radio',name:'material',value:'pp,0.060,101,1.000,14'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent: '80мм'},{tagName:'input',type:'radio',name:'material',value:'pp,0.080,101,1.000,14'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'100мм'},{tagName:'input',type:'radio',name:'material',value:'pp,0.100,101,1.000,14'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'120мм'},{tagName:'input',type:'radio',name:'material',value:'pp,0.120,101,1.000,14'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'200мм'},{tagName:'input',type:'radio',name:'material',value:'pp,0.200,101,1.000,14'}]},
                                                   {tagName:'hr'},
                                                   {tagName:'h3',textContent:'Сэндвич панели ППу:'},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent: '60мм'},{tagName:'input',type:'radio',name:'material',value:'ppu,0.060,102,1.000,14'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'100мм'},{tagName:'input',type:'radio',name:'material',value:'ppu,0.100,102,1.000,14'}]},
                                                   {tagName:'label',className:'radio right',childNodes:[{tagName:'span',textContent:'120мм'},{tagName:'input',type:'radio',name:'material',value:'ppu,0.120,102,1.000,14'}]}
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
                                                   {tagName:'h3',className:'result',textContent:'Получить результат'},
                                                   {
                                                      tagName:'div',
                                                      className:'options opts',
                                                      childNodes:[
                                                                    {tagName:'label',className:'checkbox right',childNodes:[{tagName:'span',textContent: 'Спецификация'},{tagName:'input',type:'checkbox',name:'res_opts[]',value:'spec',checked:true}]},
                                                                    {tagName:'label',className:'checkbox right',childNodes:[{tagName:'span',textContent: 'Чертеж раскладки'},{tagName:'input',type:'checkbox',name:'res_opts[]',value:'drawing',checked:true}]},
                                                                    {tagName:'label',className:'checkbox right',childNodes:[{tagName:'span',textContent: 'Оптимизация раскладки'},{tagName:'input',type:'checkbox',name:'res_opts[]',value:'optimize'}]},
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
                                  //{tagName:'div',className:'nav final',childNodes:[{tagName:'input',type:'button',className:'alt final_prev',value:'Назад'}]}
                               ]
                 };
      this._toolPanel=buildNodes(struct);
      
      this.inputs.dir=this._toolPanel.querySelectorAll('.panel.calc input[name=\'direction\']');
      this.inputs.colStep=this._toolPanel.querySelector('.panel.calc input[name=\'step\']');
      
      this.contactInputs=sender._toolPanel.querySelectorAll('input[name^=contacts]');
      this.inputs.mat=this._toolPanel.querySelectorAll('.panel.calc input[name=\'material\']');
      this.btnPrev=this._toolPanel.querySelector('.panel.calc input[type=button].prev');
      this.btnNext=this._toolPanel.querySelector('.panel.calc input[type=button].next');
      this.btnSend=this._toolPanel.querySelector('.panel.calc input[type=button].send');
      //this.btnFinalPrev=this._toolPanel.querySelector('.panel.calc input[type=button].final_prev');
      
      for (var radio of this.inputs.dir)
         radio.addEventListener('click',function(e_){sender.cutAxis=this.value; this.blur();});
      this.inputs.colStep.addEventListener('input',function(e_){var val=parseCompleteFloat(this.value); if (!isNaN(val)&&val>0.01){sender.colStep=val; sender.calcFilling();}});
      
      this.inputs.mat[0].checked=true;
      sender.material=this.inputs.mat[0].value;
      for (var radio of this.inputs.mat)
         radio.addEventListener('click',function(e_){sender.material=this.value; this.blur();});
      
      var checkbox=this._toolPanel.querySelector('input.req_price');   //Require phone number only if price calculation was requested
      if (checkbox)
         checkbox.addEventListener('click',function(e_){var inp=sender._toolPanel.querySelector('.phone input'); if (inp) inp.dataset.required=(this.checked ? '1' : '0'); var span=sender._toolPanel.querySelector('.phone span'); if (span) span.classList.toggle('req',this.checked );});
      
      for (var inp of this.contactInputs)
         inp.addEventListener('input',function(e_){this.classList.toggle('invalid',(this.dataset.required==1)&&(this.value==''));});
      
      this.btnPrev.addEventListener('click',function(e_){var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; this.blur();}});
      this.btnNext.addEventListener('click',function(e_){var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step++; this.blur();}});
      this.btnSend.addEventListener('click',function(e_){//Validate contacts
                                                         var messBlk=sender._toolPanel.querySelector('.message');
                                                         var errCnt=0;
                                                         var contacts={name:'',phone:'',email:''};
                                                         for (var inp of sender.contactInputs)
                                                         {
                                                            contacts[/\[([a-z]+)\]/i.exec(inp.name)[1]]=inp.value;
                                                            var invalid=((inp.dataset.required==1)&&(inp.value==''));
                                                            inp.classList.toggle('invalid',invalid);
                                                            if (invalid)
                                                               errCnt++;
                                                         }
                                                         //console.log(contacts);
                                                         
                                                         if (errCnt==0)
                                                         {
                                                            var figures=sender.parent.figures;
                                                            for (var figure of figures)
                                                               if (figure.type=='compound')
                                                               {
                                                                  figure.style.modes=[];
                                                                  for (var points of figure.polyLines)
                                                                     figure.style.modes.push(isNormalsOutside(points) ? 'add' : 'cut');
                                                               }
                                                            var data={figures:figures,material:{name:sender._material,n:sender._matThickness,price:sender._price,h:sender._cutHeight,max_len:sender._stripeMaxLength},res:sender.calculationData,opts:[],contacts:contacts}; 
                                                            var optInpts=sender._toolPanel.querySelectorAll('input[name^=res_opts]');
                                                            for (var inp of optInpts)
                                                               if (inp.checked)
                                                                  data.opts.push(inp.value);
                                                            
                                                            messBlk.classList.remove('error');
                                                            messBlk.classList.remove('success');
                                                            messBlk.classList.add('hidden');
                                                            reqServerPost('',data,function(ans_){/*sender._toolPanel.classList.remove('contacts'); sender._toolPanel.classList.add('final');*/ if (messBlk){var ok=ans_.status=='success'; messBlk.classList.remove('hidden'); messBlk.classList.toggle('error',!ok); messBlk.classList.toggle('success',ok); messBlk.innerHTML=(ok ? '<H2>Успешно!</H2> На указанный адрес отправлено письмо с результатами расчета.' : '<H2>Ошибка:</H2>'+ans_.errors.join('<br>'));}},function(ans_){var messBlk=sender._toolPanel.querySelector('.message'); if (messBlk){messBlk.classList.remove('hidden'); messBlk.classList.remove('success'); messBlk.classList.add('error'); messBlk.textContent='Не удалось отправить данные.';}});
                                                         }
                                                         else
                                                         {
                                                            messBlk.classList.remove('hidden');
                                                            messBlk.classList.remove('success');
                                                            messBlk.classList.add('error');
                                                            messBlk.innerHTML='Пожалуйста, заполните все наобходимые поля.';
                                                         }
                                                        });
      //this.btnFinalPrev.addEventListener('click',function(e_){sender._toolPanel.classList.remove('final'); sender._toolPanel.classList.add('contacts'); var messBlk=sender._toolPanel.querySelector('.message'); if (messBlk){messBlk.classList.remove('success'); messBlk.classList.remove('error'); messBlk.classList.add('hidden'); messBlk.innerHTML='';}});
      
      //Load params
      var val=getCookie('siding_calc_axis');
      this.cutAxis=(val=='y' ? val : 'x');
      var val=parseFloat(getCookie('siding_calc_offset'));
      if (!isNaN(val))
         this.cutOffset=val;
      var val=parseFloat(getCookie('siding_calc_cut_height'));
      if (!isNaN(val))
         this.cutHeight=val;
      var val=parseFloat(getCookie('siding_calc_max_len'));
      if (!isNaN(val))
         this.stripeMaxLength=val;
      var val=parseFloat(getCookie('siding_calc_col_step'));
      if (!isNaN(val))
         this.colStep=val;
      var colsData=getCookie('siding_calc_columns');
      if (colsData)
      {
         var cols=JSON.parse(colsData);
         console.log('cols',cols);
         for (var col of cols)
            this.addColumn(col);
      }
   }
   
   get name(){return 'calc';}
   
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
      
      setCookie('siding_calc_axis',this._cutAxis);
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
      setCookie('siding_calc_offset',this._cutOffset);
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
      //setCookie('siding_calc_max_len',this._stripeMaxLength);
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
      
      //setCookie('siding_calc_cut_height',this._cutHeight);
   }
   
   get colStep()
   {
      return this._colStep;
   }
   set colStep(val_)
   {
      this._colStep=Math.max(val_,0.01);
      
      if (parseFloat(this.inputs.colStep.value)!=this._colStep)
         this.inputs.colStep.value=this._colStep;
      setCookie('siding_calc_col_step',this._colStep);
   }
   
   set material(val_)
   {
      var mat=val_.split(',');
      this._material=mat[0];
      this._matThickness=mat[1];
      this._price=mat[2];
      this.cutHeight=mat[3];
      this.stripeMaxLength=mat[4];
   }
   
   //private methods
   changeColumn(indx_,coord_)
   {
      if (this._columns.length>indx_)
      {
         this._columns[indx_]=coord_;
         
         setCookie('siding_calc_columns',JSON.stringify(this._columns));
      }
   }
   
   //public methods
   addColumn(coord_)
   {
      if (!isNaN(coord_)&&arraySearch(coord_,this._columns)===false)
      {
         var listNode=this._toolPanel.querySelector('.columns .list');
         this._columns.push(coord_);
         setCookie('siding_calc_columns',JSON.stringify(this._columns));
         
         if (listNode)
         {
            var item=buildNodes({tagName:'div',className:'point',childNodes:[{tagName:'label',childNodes:[{tagName:'span',className:'axis',textContent:this._cutAxis.toUpperCase()+':'},{tagName:'input',type:'number',name:'point',step:0.01,value:coord_},{tagName:'span',className:'unit',textContent:'м'},]},{tagName:'input',className:'tool clr',type:'button',value:'✕',title:'Удалить'}]});
            var input=item.querySelector('input[name=point]');
            var btn=item.querySelector('input[type=button]');
            var indx=this._columns.length-1;
            var sender=this;
            input.addEventListener('input',function(e_){var val=parseFloat(this.value); if (!isNaN(val)){sender.changeColumn(indx,val); sender.calcFilling();}});
            btn.addEventListener('click',function(e_){sender.removeColumn(parseFloat(input.value)); listNode.removeChild(item); sender.calcFilling(); this.blur();});
            listNode.appendChild(item);
         }
      }
   }
   
   removeColumn(coord_)
   {
      var indx=arraySearch(coord_,this._columns);
      if (indx!==false)
      {
         this._columns.splice(indx,1);
         setCookie('siding_calc_columns',JSON.stringify(this._columns));
      }
   }
   
   sortColumns()
   {
      this._columns.sort(function(a_,b_){return Math.sign(a_-b_);});
      
      var items=this._toolPanel.querySelectorAll('.columns .list input[name=point]');
      for (var i=0;i<this._columns.length;i++)
         if (items[i])
            items[i].value=this._columns[i];
      
      setCookie('siding_calc_columns',JSON.stringify(this._columns));
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
                  var pt=midPoint(rect.lb,rect.rt);
                  pt.y+=textSize/2;
                  context.font=textSize+'px sans-serif';
                  context.textAlign='center';
                  context.fillStyle=color;
                  context.fillText(stripe.l.toFixed(this.parent.precision),pt.x,pt.y);
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
            scanBox.rect.lb[norm]=roundVal(bBox.lb[norm]+this.cutOffset);
            scanBox.rect.lb[tang]=bBox.lb[tang];
            scanBox.rect.rt[norm]=roundVal(scanBox.rect.lb[norm]+this.cutHeight);  //rt and lb is on the one cutting line
            scanBox.rect.rt[tang]=bBox.rt[tang];
            
            this.sortColumns();
            
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
                  usedSquare+=polyLineSquare(piece.points);
                  
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
                     
                     for (var c of this._columns)
                     {
                        var crel=bBox.lb[tang]+c;
                        if ((lastStrp.rect.lb[tang]<crel)&&(crel<lastStrp.rect.rt[tang]))
                        {
                           var part=clone(lastStrp);
                           part.rect.rt[tang]=crel;
                           part.l=roundVal(part.rect.rt[tang]-part.rect.lb[tang]);
                           stripes.push(part);
                           lastStrp.rect.lb[tang]=crel;
                           lastStrp.l=roundVal(lastStrp.rect.rt[tang]-lastStrp.rect.lb[tang]);
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
                  var rest=roundVal(stripe.l-cnt*this.stripeMaxLength);
                  var rt=clone(stripe.rect.rt);
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
               
               scanBox.rect.lb[norm]=roundVal(scanBox.rect.lb[norm]+this.cutHeight);   //Increment scanBox position
               scanBox.rect.rt[norm]=roundVal(scanBox.rect.rt[norm]+this.cutHeight);   //
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