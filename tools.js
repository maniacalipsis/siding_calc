//Tool =================================================================================
class Tool
{
   //Basic tool for Drawer
   constructor(parent_)
   {
      //private props
      this._parent=parent_;
      this._toolPanel=null;
   }
   
   get parent()
   {
      return this._parent;
   }
   
   get toolPanel()
   {
      return this._toolPanel;
   }
   
   set active(val_)
   {
      if (this.toolPanel)
         this.toolPanel.classList.toggle('active',val_);
   }
}

//Steps =================================================================================
class StepsTool extends Tool
{
   //Basic tool for Drawer
   constructor(parent_)
   {
      super(parent_);
      
      //private props
      this._step=0;
      this._farestStep=0;
      this._maxSteps=7;
      this._figureType='';
      
      this._figuresSwap=null;
      this._selectedCut=null;
      
      var sender=this;
      //Init steps selector
      this._stepSelectors=[];
      var stpStructs=[
                        {tagName:'div',className:'sel enabled',childNodes:[{tagName:'span',textContent:'1. Фигура'}],dataset:{step:0}},
                        {tagName:'div',childNodes:[{tagName:'span',textContent:'2. Размер'}],dataset:{step:1}},
                        {tagName:'div',childNodes:[{tagName:'span',textContent:'3. Вырез'}],dataset:{step:2}},
                        {tagName:'div',childNodes:[{tagName:'span',textContent:'4. Размер выреза'}],dataset:{step:3}},
                        {tagName:'div',childNodes:[{tagName:'span',textContent:'5. Раскладка'}],dataset:{step:4}},
                        {tagName:'div',childNodes:[{tagName:'span',textContent:'6. Выбор материала'}],dataset:{step:5}},
                        {tagName:'div',childNodes:[{tagName:'span',textContent:'7. Результат'}],dataset:{step:6}},
                     ];
      for (var stpStruct of stpStructs)
         this._stepSelectors.push(buildNodes(stpStruct));
      
      var stepsBar=document.querySelector('.steps_bar');
      if (stepsBar)
         for (var stpSel of this._stepSelectors)
         {
            stpSel.addEventListener('click',function(e_){sender.step=parseInt(this.dataset.step);});
            stepsBar.appendChild(stpSel);
         }
      
      this._hintBlocks=[];
      var hintStructs=[
                         {tagName:'div',className:'hint sel',innerHTML:'Выберите фигуру поверхности, на которую нужно укладывать материал (фасад, кровля, стена)'},
                         {tagName:'div',className:'hint',innerHTML:'Введите размеры фигуры поверхности, на которую нужно укладывать материал (фасад, кровля, стена)'},
                         {tagName:'div',className:'hint',innerHTML:'Выберите фигуру выреза (оконный/дверного проем, арка)'},
                         {tagName:'div',className:'hint',innerHTML:'Введите размеры фигуры выреза (оконного/дверного проема, арки)'},
                         {tagName:'div',className:'hint',innerHTML:'Выберите направление раскладки (ориентация панели в процессе монтажа)'},
                         {tagName:'div',className:'hint',innerHTML:''},
                         {tagName:'div',className:'hint',innerHTML:''},
                      ];
      for (var hintStruct of hintStructs)
         this._hintBlocks.push(buildNodes(hintStruct));
      
      var hintBar=document.querySelector('.hint_bar');
      if (hintBar)
         for (var hintBlk of this._hintBlocks)
            hintBar.appendChild(hintBlk);
      
      //Create tool panel
      var struct={
                    tagName:'div',
                    className:'panel steps',
                    childNodes:[
                                  {tagName:'h2',className:'figure',textContent:'Шаг 1. Фигура'},
                                  {tagName:'h2',className:'cut',textContent:'Шаг 3. Вырез'},
                                  {tagName:'h3',textContent:'Выберите фигуру'},
                                  {
                                     tagName:'div',
                                     className:'figure_sel flex around',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'rect'     ,className:'rect'     ,onclick:function(e_){sender._figureType='rect'; sender.step++;}},'Прямоугольник']},
                                                   {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'trapezoid',className:'trapezoid',onclick:function(e_){sender._figureType='trapezoid'; sender.step++;}},'Трапеция']},
                                                   {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'triangle' ,className:'triangle' ,onclick:function(e_){sender._figureType='triangle'; sender.step++;}},'Треугольник']},
                                                   {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'polyline' ,className:'polyline' ,onclick:function(e_){sender._figureType='polyline'; sender.step++;}},'Произвольная фигура']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'cuts hidden',
                                     childNodes:[
                                                   {tagName:'h3',textContent:'Изменить вырез'},
                                                   {tagName:'div',className:'figure_sel flex'}
                                                ]
                                  },
                                  {tagName:'div',className:'nav',childNodes:[{tagName:'input',type:'button',className:'alt prev',value:'Назад',onclick:function(e_){sender.step--;}},{tagName:'input',type:'button',value:'Далее',onclick:function(e_){sender.step++;}}]}
                               ]
                 };
      this._toolPanel=buildNodes(struct);
      
      //Cuts selector
      this._cutsPanel=this._toolPanel.querySelector('.cuts');
      this._cutsContainer=this._cutsPanel.querySelector('.figure_sel');
   }
   
   //public props
   get name(){return 'steps';}
   
   get parent()
   {
      return this._parent;
   }
   
   get toolPanel()
   {
      return this._toolPanel;
   }
   
   set active(val_)
   {
      if (this.toolPanel)
         this.toolPanel.classList.toggle('active',val_);
   }
   
   get step(){return this._step;}
   set step(val_)
   {
      //Set step
      if ((0<=val_)&&(val_<=this._maxSteps))
         this._step=val_;
      
      if (this._step>this._farestStep) //Disallow random acess to the steps that wasn't reached sequentially.
         this._farestStep=this._step;
      
      //Force step to very start if there is no figures was drawed
      if ((this._step>1)&&this.parent.figures.length==0)
      {
         this.step=0;
         return 0;
      }
      
      //Update direct step selectors
      for (var i=0;i<this._stepSelectors.length;i++)
      {
         this._stepSelectors[i].classList.toggle('sel',i==this._step);
         this._stepSelectors[i].classList.toggle('enabled',i<=this._farestStep);
      }
      
      //Update hint blocks
      for (var i=0;i<this._hintBlocks.length;i++)
         this._hintBlocks[i].classList.toggle('sel',i==this._step);
      
      //Toggle between resulting compound figure and separate source figures
      if (this._step<4)
      {
         if (this._figuresSwap)  //Restore source figures
         {
            this.parent.removeAll();
            for (var figure of this._figuresSwap)
               this.parent.addFigure(figure);
            
            this._figuresSwap=null;
         }
      }
      else  //Remember source figures, then make a compound one from them
      {
         if (!this._figuresSwap)
         {
            this._figuresSwap=this.parent.figures;
            
            var figures=this.parent.figures;
            var compound=this.parent.intersectFigures(figures[0],figures.slice(1),'diff');
            this.parent.removeAll();
            this.parent.addFigure(compound);
         }
      }
      
      this._repaintCutsList();
      
      //Step-specific operations:
      switch (this._step)
      {
         case 0:
         {
            if (this.parent.figures.length>0)
            {
               if (confirm('Начать сначала?\n(Все фигуры будут удалены)'))
               {
                  this.parent.removeAll();
                  this._toolPanel.classList.remove('cut');
                  this.parent.activeTool=this;
                  this._figureType='';
               }
               else
                  this.step++;
            }
            break;
         }
         case 1:
         {
            var tool=null;
            var figures=this.parent.figures;
            if (figures.length==0)
            {
               if (this._figureType)
               {
                  this.parent.style.fill='#C8D3E6';
                  tool=this.parent.getToolByName(this._figureType);
               }
               else this.step=0;
            }
            else
            {
               tool=this.parent.getToolByName(figures[0].type);
               tool.figure=figures[0];
            }
            
            if (tool)
            {
               tool.toolPanel.classList.remove('cut');
               this.parent.activeTool=tool;
            }
            
            break;
         }
         case 2:
         {
            this._toolPanel.classList.add('cut');
            this.parent.activeTool=this;
            this._figureType='';
            
            break;
         }
         case 3:
         {
            var selection=this.parent.selection;
            if ((this._figureType=='')&&(selection.length==0))
               this.step++;
            else
            {
               
               var tool=null;
               if (selection.length>0)
               {
                  tool=this.parent.getToolByName(selection[0].type);
                  tool.figure=selection[0];
               }
               else
                  tool=this.parent.getToolByName(this._figureType);
               
               this.parent.deselectAll();
               this.parent.style.fill='#FFFFFF';
               if (tool)
               {
                  tool._toolPanel.classList.add('cut');
                  this.parent.activeTool=tool;
               }
            }
            break;
         }
         case 4:
         {
            var tool=this.parent.getToolByName('calc');
            if (tool)
            {
               tool.toolPanel.classList.remove('material');
               tool.toolPanel.classList.remove('result');
               tool.toolPanel.classList.remove('contacts');
               tool.toolPanel.classList.remove('final');
               tool.toolPanel.classList.add('layout');
               this.parent.activeTool=tool;
               
               if (this._step<this._farestStep)
               {
                  this.parent.fitToViewport(this.parent.figures);
                  tool.calcFilling();
               }
            }
            break;
         }
         case 5:
         {
            var tool=this.parent.getToolByName('calc');
            if (tool)
            {
               tool.toolPanel.classList.remove('layout');
               tool.toolPanel.classList.remove('result');
               tool.toolPanel.classList.remove('contacts');
               tool.toolPanel.classList.remove('final');
               tool.toolPanel.classList.add('material');
               this.parent.activeTool=tool;
               
               if (this._step<this._farestStep)
               {
                  this.parent.fitToViewport(this.parent.figures);
                  tool.calcFilling();
               }
            }
            break;
         }
         case 6:
         {
            var tool=this.parent.getToolByName('calc');
            if (tool)
            {
               tool.toolPanel.classList.remove('layout');
               tool.toolPanel.classList.remove('material');
               tool.toolPanel.classList.remove('contacts');
               tool.toolPanel.classList.remove('final');
               tool.toolPanel.classList.add('result');
               this.parent.activeTool=tool;
               
               this.parent.fitToViewport(this.parent.figures);
               tool.calcFilling();
            }
            break;
         }
         case 7:
         {
            var tool=this.parent.getToolByName('calc');
            if (tool)
            {
               tool.toolPanel.classList.remove('layout');
               tool.toolPanel.classList.remove('material');
               tool.toolPanel.classList.remove('result');
               tool.toolPanel.classList.remove('final');
               tool.toolPanel.classList.add('contacts');
               this.parent.activeTool=tool;
               
               tool.calcFilling();
            }
            break;
         }
      }
   }
   
   //private methods
   _repaintCutsList()
   {
      var figures=this.parent.figures;
      if ((figures.length>1)&&this._cutsPanel&&this._cutsContainer)
      {
         this._cutsContainer.innerHTML='';
         for (var i=1;i<figures.length;i++)
         {
            var sender=this;
            var struct={
                          tagName:'div',
                          childNodes:[
                                        {tagName:'input',type:'button',className:figures[i].type,value:'',dataset:{indx:i},onclick:function(e_){sender.parent.select(sender.parent.figures[parseInt(this.dataset.indx)]);}},
                                        {tagName:'input',type:'button',className:'tool clr',value:'✕',title:'Удалить',dataset:{indx:i},onclick:function(e_){sender.parent.removeFigures(sender.parent.figures[parseInt(this.dataset.indx)]); sender._repaintCutsList();}}
                                     ]
                       };
            this._cutsContainer.appendChild(buildNodes(struct));
         }
         
         this._cutsPanel.classList.remove('hidden');
      }
      else if (this._cutsPanel)
         this._cutsPanel.classList.add('hidden');
   }
   
   //public methods
}

//Hand Pan =================================================================================
class HandPanTool extends Tool
{
   //Hand tool for pannind viewport in Drawer
   constructor(parent_)
   {
      super(parent_);
      
      //private props
      this._panStart=null;
      
      //Create tool panel
      var sender=this;
      var struct={
                    tagName:'div',
                    className:'panel hand_pan',
                    childNodes:[
                                  {tagName:'input',type:'button',className:'tool toggle',value:'',title:'Двигать холст',onclick:function(e_){sender.parent.activeTool=sender;}}
                               ]
                 };
      this._toolPanel=buildNodes(struct);
   }
   
   get name(){return 'hand_pan';}
   
   onMouseMove(e_)
   {
      if (!(e_.buttons&0b001))
         this._panStart=null;
      
      if (this._panStart)
      {
         var delta={x:e_.layerX-this._panStart.x,y:e_.layerY-this._panStart.y};
         this._panStart={x:e_.layerX,y:e_.layerY};
         this.parent.pan(delta,true);
      }
      else
         this.parent.setCursor({x:e_.layerX,y:e_.layerY},true);
   }
   
   onMouseDown(e_)
   {
      if (e_.buttons&0b001)
         this._panStart={x:e_.layerX,y:e_.layerY};
   }
   
   onMouseUp(e_)
   {
      if (e_.buttons&0b001)
         this._panStart=null;
   }
}

//FigureTool =================================================================================
class FigureTool extends Tool
{
   //Basic figures drawing tool for Drawer
   constructor (parent_,type_)
   {
      super(parent_);
      
      //private props
      this._type=type_;
      this._figure=null;
      this._isNew=true;
   }
   
   set figure(figure_)
   {
      if (figure_===null)
      {
         this._figure=null;
         this._isNew=true;
      }
      else if (figure_.type==this._type)
      {
         this._figure=figure_;
         this._isNew=false;
      }
   }
   get figure()
   {
      return this._figure;
   }
   
   set active(val_)
   {
      if (val_)
      {
         //Take figure from selection
         //console.log(clone(this.parent.selection),this.parent.selection.length&&this.parent.selection[0].type,this._type);
         if (this.parent.selection.length==1&&this.parent.selection[0].type==this._type)
         {
            this.figure=this.parent.selection[0];
            //this.parent.deselectAll();
         }
      }
      else
      {
         this.figure=null;
      }
      
      super.active=val_;
   }
  
}

//Rect Tool =================================================================================
class RectTool extends FigureTool
{
   //Rect tool class
   constructor (parent_)
   {
      super(parent_,'rect');
      
      //private props
      this._inputs={x:null,y:null,w:null,h:null};
      this.grabbedCorner='';
      
      //Create tool panel
      var sender=this;
      var struct={
                    tagName:'div',
                    className:'panel rect',
                    childNodes:[
                                  {tagName:'h2',className:'figure',textContent:'Шаг 2. Размер'},
                                  {tagName:'h2',className:'cut',textContent:'Шаг 4. Размер выреза'},
                                  {
                                     tagName:'div',
                                     className:'opts size',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Ширина:'},{tagName:'input',type:'number',name:'rect[w]',step:0.01,value:0},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Высота:'},{tagName:'input',type:'number',name:'rect[h]',step:0.01,value:0},'м']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'opts pos',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние слева:'},{tagName:'input',type:'number',name:'rect[x]',step:0.01,value:0},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние от цоколя:'},{tagName:'input',type:'number',name:'rect[y]',step:0.01,value:0},'м']}
                                                ]
                                  },
                                  {tagName:'div',className:'nav',childNodes:[{tagName:'input',type:'button',className:'link add_cut',value:'Добавить вырез'},{tagName:'br'},{tagName:'input',type:'button',className:'alt prev',value:'Назад'},{tagName:'input',type:'button',className:'next',value:'Далее'}]}
                               ]
                 };
      this._toolPanel=buildNodes(struct);
      
      this._inputs.x=this._toolPanel.querySelector('.panel.rect input[name=\'rect[x]\']');
      this._inputs.y=this._toolPanel.querySelector('.panel.rect input[name=\'rect[y]\']');
      this._inputs.w=this._toolPanel.querySelector('.panel.rect input[name=\'rect[w]\']');
      this._inputs.h=this._toolPanel.querySelector('.panel.rect input[name=\'rect[h]\']');
      
      this._inputs.x.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({x:this.value},this);});
      this._inputs.y.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({y:this.value},this);});
      this._inputs.w.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({w:this.value},this);});
      this._inputs.h.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({h:this.value},this);});
      
      this.btnPrev=this._toolPanel.querySelector('.panel.rect input[type=button].prev');
      this.btnAdd=this._toolPanel.querySelector('.panel.rect input[type=button].add_cut');
      this.btnNext=this._toolPanel.querySelector('.panel.rect input[type=button].next');
      this.btnPrev.addEventListener('click',function(e_){var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){sender.parent.activeTool=stepsTool; stepsTool.step--; this.blur();}});
      this.btnAdd.addEventListener('click',function(e_){if (sender.figure&&sender.testRect(sender.figure.rect)&&sender._isNew) sender.parent.addFigure(sender.figure);  sender.figure=null; var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; this.blur();}});
      this.btnNext.addEventListener('click',function(e_){if (sender.figure&&sender.testRect(sender.figure.rect)&&sender._isNew) sender.parent.addFigure(sender.figure);  sender.figure=null; var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step++; this.blur();}});
      
   }
   
   get name(){return 'rect';}
   
   set figure(val_)
   {
      super.figure=val_;
      
      this.updateInputs(this.figure ? rectSize(this.figure.rect) : {x:0,y:0,w:0,h:0});
      
   }
   get figure()
   {
      return super.figure;
   }
   
   //private methods
   updateInputs(size_,actor_)
   {
      for (var key in size_)
         if (this._inputs[key]!=actor_)
            this._inputs[key].value=size_[key].toFixed(2);
   }
   
   newFigureFromInputs()
   {
      var vect={};
      var errors=0;
      for (var key in this._inputs)
      {
         vect[key]=parseCompleteFloat(this._inputs[key].value);
         if (isNaN(vect[key]))
            errors++;
      }
      
      if (!errors)
      {
         var rect=rectCorners(vect);
         
         if (this.testRect(rect))
         {
            this.figure={type:'rect',rect:rectNormalize(rect),style:clone(this.parent.style)};
            this._isNew=true;
         
            this.updateInputs(rectSize(this._figure.rect));
            
            //this.parent.repaintOverlay();
            this.parent.fitToViewport(this.parent.figures.length ? this.parent.figures : this.figure);
         }
      }
   }
   
   //public methods
   newFigureAtCursor(lb_)
   {
      this.figure={type:'rect',rect:{lb:clone(lb_),rt:clone(lb_)},style:clone(this.parent.style)};
      this._isNew=true;
      
      this.updateInputs(rectSize(this._figure.rect));
   }
   
   testRect(rect_)
   {
      var res=false;
      
      if (rect_&&!isNaN(rect_.lb.x)&&!isNaN(rect_.lb.y)&&!isNaN(rect_.rt.x)&&!isNaN(rect_.rt.y))
      {
         var size=rectSize(rect_);
         res=((size.w!=0)&&(size.h!=0));
      }
      
      return res;
   }
   
   applyNewFigure()
   {
      this.figure.rect=rectNormalize(this.figure.rect);
      this.parent.addFigure(this.figure);
      this.figure=null;
   }
   
   modifyFigure(params_,actor_)
   {
      var changed=0;
      if (this.figure)
      {
         var rect=clone(this.figure.rect)
         var vect=rectVect(rect);
         for (var key in params_)
            switch (key)
            {
               case 'x':
               case 'y':
               case 'w':
               case 'h':
               {
                  vect[key]=parseFloat(params_[key])||0;  //Translate NaN to 0
                  changed=changed||1;
                  
                  break;
               }
               case 'rt':
               case 'lb':
               {
                  rect[key].x=parseFloat(params_[key].x)||0;  //Translate NaN to 0
                  rect[key].y=parseFloat(params_[key].y)||0;  //Translate NaN to 0
                  changed=changed||2;
                  
                  break;
               }
               case 'lt':
               {
                  rect.lb.x=parseFloat(params_[key].x)||0;  //Translate NaN to 0
                  rect.rt.y=parseFloat(params_[key].y)||0;  //Translate NaN to 0
                  changed=changed||2;
                  
                  break;
               }
               case 'rb':
               {
                  rect.rt.x=parseFloat(params_[key].x)||0;  //Translate NaN to 0
                  rect.lb.y=parseFloat(params_[key].y)||0;  //Translate NaN to 0
                  changed=changed||2;
                  
                  break;
               }
               case 'style':
               {
                  //TODO:
                  changed=changed||4;
               }
            }
         
         if (changed&1)
            rect=rectCorners(vect); //Set new position and size
         
         if ((changed&3)&&this.testRect(rect))
         {
            this.figure.rect=rect;//rectNormalize(rect);
            this.updateInputs(vect,actor_);
         }
         else
            changed=changed&4;
         
         if (changed)
         {
            //if (this._isNew)
            //   this.parent.repaintOverlay();
            //else
            //   this.parent.repaint();
            
            this.parent.fitToViewport(this.parent.figures.length ? this.parent.figures : this.figure);
         }
      }
      
      return changed;
   }
   
   onMouseDown(e_)
   {
      if (e_.buttons&0b001)
      {
         if (!this.figure)
         {
            this.newFigureAtCursor(this.parent.cursor);
            this.grabbedCorner='rt';
         }
         else
         {
            var rect=this.figure.rect;
            var cursor=this.parent.cursor;
            if (ptCmp(rect.lb,cursor))
               this.grabbedCorner='lb';
            else if (ptCmp(rect.rt,cursor))
               this.grabbedCorner='rt';
            else if (ptCmp({x:rect.lb.x,y:rect.rt.y},cursor))
               this.grabbedCorner='lt';
            else if (ptCmp({x:rect.rt.x,y:rect.lb.y},cursor))
               this.grabbedCorner='rb';
            else if (isPointInRect(cursor,rect)!==false)
               this.grabbedCorner='all';
            else
            {
               this.grabbedCorner='';
               this.figure=null;
            }
         }
      }
   }
   
   onMouseMove(e_)
   {
      if (this.figure)
      {
         if ((e_.buttons&0b001)&&this.grabbedCorner)
         {
            var mod={}
            mod[this.grabbedCorner]=this.parent.cursor;
            this.modifyFigure(mod);
         }
      }
   }
   
   onMouseUp(e_)
   {
      if (this.figure)
      {
         if ((!e_.buttons&0b001)&&this.grabbedCorner)  //Test that the 1st, not anoother, button was released
         {
            var mod={}
            mod[this.grabbedCorner]=this.parent.cursor;
            var changed=this.modifyFigure(mod);
            
            if (this._isNew&&changed)
            {
               this.applyNewFigure();
               //this.parent.selectFigure(this.figure);
            }
         }
      }
   }
   
   onRepaintOverlay(overlay_)
   {
      if (this.figure)
      {
         if (this._isNew)
         {
            this.parent.paintRect(overlay_,rectNormalize(clone(this.figure.rect)),this.figure.style);
         }
         else
         {
            //Paint selection frame
            var rect=clone(this.figure.rect);
            this.parent.paintRect(overlay_,rectNormalize(rect),{stroke:'rgba(55,184,88,1)'});
            
            //Paint handlers
            var points=(this.figure.type=='rect' ? outlineRect(this.figure.rect) : this.figure.points);
            for (var pt of points)
            {
               pt=this.parent.pointToCanvas(pt);
               var handler={x:pt.x-4,y:pt.y-4,w:8,h:8};
               this.parent.paintRect(overlay_,handler,{fill:'rgba(55,184,88,1)'},true);
            }
         }
      }
   }
   
}

//Triangle Tool =================================================================================
class TriangleTool extends FigureTool
{
   //Rect tool class
   constructor (parent_)
   {
      super(parent_,'polyline');
      
      //private props
      this._inputs={x:null,y:null,w:null,h:null};
      this.grabbedCorner='';
      
      //Create tool panel
      var sender=this;
      var struct={
                    tagName:'div',
                    className:'panel triangle',
                    childNodes:[
                                  {tagName:'h2',className:'figure',textContent:'Шаг 2. Размер'},
                                  {tagName:'h2',className:'cut',textContent:'Шаг 4. Размер выреза'},
                                  {
                                     tagName:'div',
                                     className:'opts size',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Ш:'},{tagName:'input',type:'number',name:'triangle[w]',step:0.01,value:0},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'В:'},{tagName:'input',type:'number',name:'triangle[h]',step:0.01,value:0},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'С:'},{tagName:'input',type:'number',name:'triangle[c]',step:0.01,value:0},'м']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'opts pos',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние слева:'},{tagName:'input',type:'number',name:'triangle[x]',step:0.01,value:0},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние от цоколя:'},{tagName:'input',type:'number',name:'triangle[y]',step:0.01,value:0},'м']}
                                                ]
                                  },
                                  {tagName:'div',className:'nav',childNodes:[{tagName:'input',type:'button',className:'alt prev',value:'Назад'},{tagName:'input',type:'button',className:'add_cut',value:'Добавить вырез'},{tagName:'input',type:'button',className:'next',value:'Далее'}]}
                               ]
                 };
      this._toolPanel=buildNodes(struct);
      
      this._inputs.x=this._toolPanel.querySelector('.panel.triangle input[name=\'triangle[x]\']');
      this._inputs.y=this._toolPanel.querySelector('.panel.triangle input[name=\'triangle[y]\']');
      this._inputs.w=this._toolPanel.querySelector('.panel.triangle input[name=\'triangle[w]\']');
      this._inputs.h=this._toolPanel.querySelector('.panel.triangle input[name=\'triangle[h]\']');
      this._inputs.c=this._toolPanel.querySelector('.panel.triangle input[name=\'triangle[c]\']');
      
      this._inputs.x.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({x:this.value},this);});
      this._inputs.y.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({y:this.value},this);});
      this._inputs.w.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({w:this.value},this);});
      this._inputs.h.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({h:this.value},this);});
      this._inputs.c.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({c:this.value},this);});
      
      this.btnPrev=this._toolPanel.querySelector('.panel.triangle input[type=button].prev');
      this.btnAdd=this._toolPanel.querySelector('.panel.triangle input[type=button].add_cut');
      this.btnNext=this._toolPanel.querySelector('.panel.triangle input[type=button].next');
      this.btnPrev.addEventListener('click',function(e_){var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; this.blur();}});
      this.btnAdd.addEventListener('click',function(e_){if (sender.figure&&sender.testTriangle(sender.figure)&&sender._isNew) sender.parent.addFigure(sender.figure);  sender.figure=null; var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; this.blur();}});
      this.btnNext.addEventListener('click',function(e_){if (sender.figure&&sender.testTriangle(sender.figure)&&sender._isNew) sender.parent.addFigure(sender.figure);  sender.figure=null; var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step++; this.blur();}});
      
   }
   
   get name(){return 'triangle';}
   
   set figure(val_)
   {
      super.figure=val_;
      
      console.log('set figure',val_);
      
      this.updateInputs(this._parametrize(val_));
   }
   get figure()
   {
      return super.figure;
   }
   
   //private methods
   _parametrize(figure_)
   {
      var res={x:0,y:0,w:0,h:0,c:0};
      
      if (figure_&&figure_.points&&figure_.points.length==3)
      {
         res.x=figure_.points[0].x;
         res.y=figure_.points[0].y;
         res.w=figure_.points[2].x-figure_.points[0].x;
         res.h=figure_.points[1].y-figure_.points[0].y;
         res.c=figure_.points[1].x-figure_.points[0].x;
      }
      
      console.log('_parametrize',figure_,res);
      return res;
   }
   
   _pointsFromParams(params_)
   {
      return [
                {x:params_.x,y:params_.y},
                {x:params_.x+params_.c,y:params_.y+params_.h},
                {x:params_.x+params_.w,y:params_.y}
             ];
   }
   
   updateInputs(params_,actor_)
   {
      for (var key in params_)
         if (this._inputs[key]!=actor_)
            this._inputs[key].value=params_[key].toFixed(2);
   }
   
   newFigureFromInputs()
   {
      var params={};
      var errors=0;
      for (var key in this._inputs)
      {
         params[key]=parseCompleteFloat(this._inputs[key].value);
         if (isNaN(params[key]))
            errors++;
      }
      if ((params.w<=0)||(params.h<=0))
         errors++;
      
      console.log('newFigureFromInputs',params,errors);
      
      if (!errors)
      {
         var style=clone(this.parent.style);
         style.closed=true;
         var figure={type:'polyline',points:this._pointsFromParams(params),style:style};
         //console.log(figure);
         if (this.testTriangle(figure))
         {
            
            this.figure=figure;
            this._isNew=true;
            
            this.parent.fitToViewport(this.parent.figures.length ? this.parent.figures : this.figure);
            //this.parent.repaintOverlay();
         }
      }
   }
   
   modifyFigure(newParams_,actor_)
   {
      var changed=0;
      if (this.figure)
      {
         var params=this._parametrize(this.figure);
         
         for (var key in newParams_)
            switch (key)
            {
               case 'x':
               case 'y':
               case 'w':
               case 'h':
               case 'c':
               {
                  params[key]=parseFloat(newParams_[key])||0;  //Translate NaN to 0
                  changed=changed||1;
                  
                  break;
               }
               case 'style':
               {
                  //TODO:
                  changed=changed||4;
                  break;
               }
            }
         
         console.log('modifyFigure',params,changed);
         
         if (changed&1)
         {
            this.figure.points=this._pointsFromParams(params);
            this.updateInputs(params,actor_);
         }
         else
            changed=changed&4;
         
         if (changed)
         {
            //if (this._isNew)
            //   this.parent.repaintOverlay();
            //else
            //   this.parent.repaint();
            this.parent.fitToViewport(this.parent.figures.length ? this.parent.figures : this.figure);
         }
      }
      
      return changed;
   }
   
   //public methods
   testTriangle(figure_)
   {
      var res=false;
      
      if (figure_&&figure_.points&&
          (figure_.points.length==3)&&
          ((figure_.points[2].x-figure_.points[0].x)>0)&&
          ((figure_.points[1].y-figure_.points[0].y)>0))
         res=true;
      
      return res;
   }
   
   applyNewFigure()
   {
      console.log('applyNewFigure',this.figure);
      
      this.parent.addFigure(this.figure);
      this.figure=null;
   }
   
   onRepaintOverlay(overlay_)
   {
      console.log('onRepaintOverlay',this.figure);
      if (this.figure)
      {
         this.parent.paintPolyline(overlay_,this.figure.points,this.parent.style);
      }
   }
}

//Triangle Tool =================================================================================
class TrapezoidTool extends FigureTool
{
   //Rect tool class
   constructor (parent_)
   {
      super(parent_,'polyline');
      
      //private props
      this._inputs={x:null,y:null,w:null,h:null};
      this.grabbedCorner='';
      
      //Create tool panel
      var sender=this;
      var struct={
                    tagName:'div',
                    className:'panel trapezoid',
                    childNodes:[
                                  {tagName:'h2',className:'figure',textContent:'Шаг 2. Размер'},
                                  {tagName:'h2',className:'cut',textContent:'Шаг 4. Размер выреза'},
                                  {
                                     tagName:'div',
                                     className:'opts size',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Ш:'},{tagName:'input',type:'number',name:'trapezoid[w]',step:0.01,value:0},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'В:'},{tagName:'input',type:'number',name:'trapezoid[h]',step:0.01,value:0},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Ш'},{tagName:'sub',textContent:'2'},{tagName:'span',textContent:':'},{tagName:'input',type:'number',name:'trapezoid[w2]',step:0.01,value:0},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'С:'},{tagName:'input',type:'number',name:'trapezoid[c]',step:0.01,value:0},'м']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'opts pos',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние слева:'},{tagName:'input',type:'number',name:'trapezoid[x]',step:0.01,value:0},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние от цоколя:'},{tagName:'input',type:'number',name:'trapezoid[y]',step:0.01,value:0},'м']}
                                                ]
                                  },
                                  {tagName:'div',className:'nav',childNodes:[{tagName:'input',type:'button',className:'alt prev',value:'Назад'},{tagName:'input',type:'button',className:'add_cut',value:'Добавить вырез'},{tagName:'input',type:'button',className:'next',value:'Далее'}]}
                               ]
                 };
      this._toolPanel=buildNodes(struct);
      
      this._inputs.x=this._toolPanel.querySelector('.panel.trapezoid input[name=\'trapezoid[x]\']');
      this._inputs.y=this._toolPanel.querySelector('.panel.trapezoid input[name=\'trapezoid[y]\']');
      this._inputs.w=this._toolPanel.querySelector('.panel.trapezoid input[name=\'trapezoid[w]\']');
      this._inputs.h=this._toolPanel.querySelector('.panel.trapezoid input[name=\'trapezoid[h]\']');
      this._inputs.w2=this._toolPanel.querySelector('.panel.trapezoid input[name=\'trapezoid[w2]\']');
      this._inputs.c=this._toolPanel.querySelector('.panel.trapezoid input[name=\'trapezoid[c]\']');
      
      this._inputs.x.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({x:this.value},this);});
      this._inputs.y.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({y:this.value},this);});
      this._inputs.w.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({w:this.value},this);});
      this._inputs.h.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({h:this.value},this);});
      this._inputs.w2.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({w2:this.value},this);});
      this._inputs.c.addEventListener('input',function(e_){if(!sender.figure) sender.newFigureFromInputs(); else sender.modifyFigure({c:this.value},this);});
      
      this.btnPrev=this._toolPanel.querySelector('.panel.trapezoid input[type=button].prev');
      this.btnAdd=this._toolPanel.querySelector('.panel.trapezoid input[type=button].add_cut');
      this.btnNext=this._toolPanel.querySelector('.panel.trapezoid input[type=button].next');
      this.btnPrev.addEventListener('click',function(e_){var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; this.blur();}});
      this.btnAdd.addEventListener('click',function(e_){if (sender.figure&&sender.testTrapezoid(sender.figure)&&sender._isNew) sender.parent.addFigure(sender.figure);  sender.figure=null; var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; this.blur();}});
      this.btnNext.addEventListener('click',function(e_){if (sender.figure&&sender.testTrapezoid(sender.figure)&&sender._isNew) sender.parent.addFigure(sender.figure);  sender.figure=null; var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step++; this.blur();}});
      
   }
   
   get name(){return 'trapezoid';}
   
   set figure(val_)
   {
      super.figure=val_;
      
      console.log('set figure',val_);
      
      this.updateInputs(this._parametrize(val_));
   }
   get figure()
   {
      return super.figure;
   }
   
   //private methods
   _parametrize(figure_)
   {
      var res={x:0,y:0,w:0,h:0,w2:0,c:0};
      
      if (figure_&&figure_.points&&figure_.points.length==4)
      {
         res.x=figure_.points[0].x;
         res.y=figure_.points[0].y;
         res.w=figure_.points[3].x-figure_.points[0].x;
         res.h=figure_.points[1].y-figure_.points[0].y;
         res.w2=figure_.points[2].x-figure_.points[1].x;
         res.c=figure_.points[1].x-figure_.points[0].x;
      }
      
      console.log('_parametrize',figure_,res);
      return res;
   }
   
   _pointsFromParams(params_)
   {
      return [
                {x:params_.x,y:params_.y},
                {x:params_.x+params_.c,y:params_.y+params_.h},
                {x:params_.x+params_.c+params_.w2,y:params_.y+params_.h},
                {x:params_.x+params_.w,y:params_.y}
             ];
   }
   
   updateInputs(params_,actor_)
   {
      for (var key in params_)
         if (this._inputs[key]!=actor_)
            this._inputs[key].value=params_[key].toFixed(2);
   }
   
   newFigureFromInputs()
   {
      var params={};
      var errors=0;
      for (var key in this._inputs)
      {
         params[key]=parseCompleteFloat(this._inputs[key].value);
         if (isNaN(params[key]))
            errors++;
      }
      if ((params.w<=0)||(params.h<=0))
         errors++;
      
      console.log('newFigureFromInputs',params,errors);
      
      if (!errors)
      {
         var style=clone(this.parent.style);
         style.closed=true;
         var figure={type:'polyline',points:this._pointsFromParams(params),style:style};
         //console.log(figure);
         if (this.testTrapezoid(figure))
         {
            
            this.figure=figure;
            this._isNew=true;
            
            //this.parent.repaintOverlay();
            this.parent.fitToViewport(this.parent.figures.length ? this.parent.figures : this.figure);
         }
      }
   }
   
   modifyFigure(newParams_,actor_)
   {
      var changed=0;
      if (this.figure)
      {
         var params=this._parametrize(this.figure);
         
         for (var key in newParams_)
            switch (key)
            {
               case 'x':
               case 'y':
               case 'w':
               case 'h':
               case 'w2':
               case 'c':
               {
                  params[key]=parseFloat(newParams_[key])||0;  //Translate NaN to 0
                  changed=changed||1;
                  
                  break;
               }
               case 'style':
               {
                  //TODO:
                  changed=changed||4;
                  break;
               }
            }
         
         console.log('modifyFigure',params,changed);
         
         if (changed&1)
         {
            this.figure.points=this._pointsFromParams(params);
            this.updateInputs(params,actor_);
         }
         else
            changed=changed&4;
         
         if (changed)
         {
            //if (this._isNew)
            //   this.parent.repaintOverlay();
            //else
            //   this.parent.repaint();
            this.parent.fitToViewport(this.parent.figures.length ? this.parent.figures : this.figure);
         }
      }
      
      return changed;
   }
   
   //public methods
   testTrapezoid(figure_)
   {
      var res=false;
      
      if (figure_&&figure_.points&&
          (figure_.points.length==4)&&
          ((figure_.points[3].x-figure_.points[0].x)>0)&&
          ((figure_.points[1].y-figure_.points[0].y)>0)&&
          ((figure_.points[2].x-figure_.points[1].x)>0))
         res=true;
      
      return res;
   }
   
   applyNewFigure()
   {
      console.log('applyNewFigure',this.figure);
      
      this.parent.addFigure(this.figure);
      this.figure=null;
   }
   
   onRepaintOverlay(overlay_)
   {
      console.log('onRepaintOverlay',this.figure);
      if (this.figure)
      {
         this.parent.paintPolyline(overlay_,this.figure.points,this.parent.style);
      }
   }
}

//Polyline =====================================================================================
class PolyLineTool extends FigureTool
{
   //Polyline
   constructor(parent_)
   {
      super(parent_,'polyline');
      
      //private props
      this._inputList=null;
      this._grabbedPoint=-1;
      
      //Create tool panel
      var sender=this;
      var struct={
                    tagName:'div',
                    className:'panel line',
                    childNodes:[
                                  {tagName:'h2',className:'figure',textContent:'Шаг 2. Координаты вершин'},
                                  {tagName:'h2',className:'cut',textContent:'Шаг 4. Координаты вершин выреза'},
                                  {
                                     tagName:'div',
                                     className:'opts',
                                     childNodes:[
                                                    {
                                                       tagName:'div',
                                                       className:'points',
                                                       childNodes:[
                                                                     {
                                                                        tagName:'div',
                                                                        className:'point',
                                                                        childNodes:[
                                                                                      {tagName:'label',childNodes:[{tagName:'span',textContent:'X:'},{tagName:'input',type:'number',name:'point[x]',step:0.01,value:0}]},
                                                                                      {tagName:'label',childNodes:[{tagName:'span',textContent:'Y:'},{tagName:'input',type:'number',name:'point[y]',step:0.01,value:0}]},
                                                                                      {tagName:'input',className:'tool ok add',type:'button',value:'+',title:'Add'},
                                                                                      {tagName:'input',className:'tool clr',type:'button',value:'✕',title:'Delete'}
                                                                                   ],
                                                                        dataset:{indx:0}
                                                                     }
                                                                  ]
                                                    },
                                                    //{tagName:'div',className:'actions',childNodes:[{tagName:'input',type:'button',className:'tool del cancel',value:'',title:'Cancel'},{tagName:'input',type:'button',className:'tool ok draw',value:'',title:'Draw'}]},
                                                ]
                                  },
                                  {tagName:'div',className:'nav',childNodes:[{tagName:'input',type:'button',className:'alt prev',value:'Назад'},{tagName:'input',type:'button',className:'add_cut',value:'Добавить вырез'},{tagName:'input',type:'button',className:'next',value:'Далее'}]}
                               ]
                 };
      this._toolPanel=buildNodes(struct);
      this._inputList=this._toolPanel.querySelector('.panel.line .opts .points');
      this.initInputNode(this._inputList.childNodes[0]);
      
      this.btnPrev=this._toolPanel.querySelector('.panel.line input[type=button].prev');
      this.btnAdd=this._toolPanel.querySelector('.panel.line input[type=button].add_cut');
      this.btnNext=this._toolPanel.querySelector('.panel.line input[type=button].next');
      this.btnPrev.addEventListener('click',function(e_){var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; this.blur();}});
      this.btnAdd.addEventListener('click',function(e_){if (sender.figure&&sender.testLine(sender.figure)&&sender._isNew) sender.applyNewFigure(); sender.figure=null; var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step--; this.blur();}});
      this.btnNext.addEventListener('click',function(e_){if (sender.figure&&sender.testLine(sender.figure)&&sender._isNew) sender.applyNewFigure(); sender.figure=null; var stepsTool=sender.parent.getToolByName('steps'); if (stepsTool){stepsTool.step++; this.blur();}});
      
   }
   
   get name(){return 'polyline';}
   
   set figure(val_)
   {
      super.figure=val_;
      
      this.updateInputs();
   }
   get figure()
   {
      return this._figure;
   }
   
   //private methods
   testLine(figure_)
   {
      return (figure_.points.length>2&&(selfXSections(figure_.points,figure_.style.closed).length==0));
   }
   
   applyNewFigure()
   {
      if (!isNormalsOutside(this.figure.points))
         this.figure.points.reverse();
      
      if (ptCmp(this.figure.points[0],this.figure.points[this.figure.points.length-1]))
         this.figure.points.pop();
      
      var style=clone(this.parent.style);
      style.closed=true;
      
      this.parent.addFigure({type:'polyline',points:this.figure.points,style:style});
      this.figure=null;
   }
   
   initInputNode(node_)
   {
      var sender=this;
      var inpX=node_.querySelector('input[name=\'point[x]\']');
      var inpY=node_.querySelector('input[name=\'point[y]\']');
      var btnA=node_.querySelector('input[type=button].add');
      var btnX=node_.querySelector('input[type=button].clr');
      inpX.addEventListener('input',function(e_){sender.onCoordInput('x',this.closest('.point').dataset.indx,this.value);});
      inpY.addEventListener('input',function(e_){sender.onCoordInput('y',this.closest('.point').dataset.indx,this.value);});
      btnX.addEventListener('click',function(e_){sender.onBtnXClick(this.closest('.point').dataset.indx); this.blur();});
      btnA.addEventListener('click',function(e_){sender.onBtnAddClick(this.closest('.point').dataset.indx); this.blur();});
   }
   
   updateNthInput(n_,pt_)
   {
      if (n_>=0&&n_<this._inputList.childNodes.length)
      {
         this._inputList.childNodes[n_].dataset.indx=n_;
         
         var inpX=this._inputList.childNodes[n_].querySelector('input[name=\'point[x]\']');
         var inpY=this._inputList.childNodes[n_].querySelector('input[name=\'point[y]\']');
         if (inpX)
            inpX.value=pt_.x.toFixed(6);
         
         if (inpY)
            inpY.value=pt_.y.toFixed(6);
      }
   }
   
   updateInputs()
   {
      if (this._inputList)
      {
         var nodes=this._inputList.children;
         var toRemove=this._inputList.children.length-1;
         if (this.figure&&this.figure.points.length>0)
         {
            var points=this.figure.points;
            //console.log('figure',nodes,points);
            for (var i=0;i<points.length;i++)
            {
               if (nodes.length<=i)
               {
                  //console.log('add node');
                  var newNode=nodes[nodes.length-1].cloneNode(true);
                  var sender=this;
                  this.initInputNode(newNode);
                  this._inputList.appendChild(newNode);
               }
               this.updateNthInput(i,points[i]);
            }
            toRemove=nodes.length-points.length;
         }
         
         for (var i=0;i<toRemove;i++)
            this._inputList.removeChild(nodes[nodes.length-1]);
         
         this.parent.repaint();
      }
   }
   
   onCoordInput(axis_,index_,val_)
   {
      //Coordinates numeric input handler
      
      console.log('onCoordInput',index_,axis_,val_);
      val_=parseCompleteFloat(val_);
      if (!isNaN(val_))
      {
         if (!this._figure)
         {
            var item=this._inputList.children[0];
            var inpX=item.querySelector('input[name=\'point[x]\']');
            var inpY=item.querySelector('input[name=\'point[y]\']');
            var pt={x:parseCompleteFloat(inpX.value),y:parseCompleteFloat(inpY.value)};
            
            if (!(isNaN(pt.x)||isNaN(pt.y)))
               this.insertPoint(this.parent.snapToGrid(pt),index_+1);
         }
         else if (this._figure.points.length>index_)
         {
            this._figure.points[index_][axis_]=val_;       //Update existing point
            //this.parent.repaint();
            this.parent.fitToViewport(this.parent.figures.length ? this.parent.figures : this.figure);
         }
      }
   }
   
   onBtnAddClick(index_)
   {
      //Add point button handler
      console.log('onBtnAddClick',index_);
      index_=parseInt(index_); 
      var pt={x:0,y:0};
      
      if (this._figure&&((index_+1)<this._figure.points.length))
      {
         pt=midPoint(this._figure.points[index_],this._figure.points[index_+1]);  //New point splits a polyline segment
         console.log('subdiv',index_);
      }
      else if (this._figure&&this._figure.style.closed)
      {
         pt=midPoint(this._figure.points[index_],this._figure.points[0]);       //New point splits segment between last and first points of a closed figure
         console.log('subdiv last',index_);
      }
      else
      {
         var item=this._inputList.childNodes[this._inputList.children.length-1];
         var inpX=item.querySelector('input[name=\'point[x]\']');
         var inpY=item.querySelector('input[name=\'point[y]\']');
         var x=parseCompleteFloat(inpX.value);
         var y=parseCompleteFloat(inpY.value);
         
         if (!isNaN(x))
            pt.x=x;
         if (!isNaN(y))
            pt.y=y;
         
         console.log('add new',index_,pt);
      }
      this.insertPoint(this.parent.snapToGrid(pt),index_+1);
   }
   
   onBtnXClick(index_)
   {
      //Remove point button handler
      
      this.removePoint(index_);
   }
   
   //public methods
   removePoint(indx_)
   {
      if (this.figure&&this.figure.points.length>3)
      {
         this.figure.points.splice(indx_,1);
         
      }
      this.updateInputs();
   }
   
   insertPoint(pt_,indx_)
   {
      if (!this.figure)
      {
         this.figure={type:'polyline',points:[],style:clone(this.parent.style)};
         this._isNew=true;
         
         this.figure.points.push(roundPoint(clone(pt_))); //Add root point
      }
      
      if (indx_===undefined||this.figure.points.length<indx_)
      {
         if (ptCmp(this.figure.points[0],pt_)&&this.testLine(this.figure))
            this.applyNewFigure();
         else
         {
            this.figure.points.push(clone(pt_)); //Add new point
            console.log('add pt');
         }
      }
      else
         this.figure.points.splice(indx_,0,roundPoint(clone(pt_)));
      
      this.updateInputs();
   }
   
   onClick(e_)
   {
      if (this._isNew)
         this.insertPoint(this.parent.cursor);
   }
   
   onMouseDown(e_)
   {
      if (!this._isNew&&this.figure)
      {
         for (var i=0;i<this.figure.points.length;i++)
            if (ptCmp(this.figure.points[i],this.parent.cursor))
            {
               this._grabbedPoint=i;
               break;
            }
         //console.log(this._grabbedPoint);
      }
   }
   
   onKeyDown(e_)
   {
      var ret=true;
      
      if (this.figure&&this.figure.points.length>1)
      {
         switch (e_.key)
         {
            case 'End':
            case 'Enter':
            {
               //Apply path
               
               var figure={type:'polyline',points:this.figure.points,style:clone(this.parent.style)};
               var buff=null;
               
               if (ptCmp(figure.points[0],figure.points[figure.points.length-1]))   //Remove closing point
               {
                  buff=figure.points.pop();
                  figure.style.closed=true;
               }
               
               if (selfXSections(figure.points,figure.style.closed).length==0)
                  this.applyNewFigure();
               else if (buff)
                  figure.points.push(buff);
               
               ret=false;
               break;
            }
            case 'Backspace':
            {
               //Remove last point
               this.figure.points.pop();
               ret=false;
               break;
            }
            case 'Escape':
            {
               //Cancel path
               this.figure=null;
               ret=false;
               break;
            }
            case 'Control':
            {
               //Lock cursor
               var prev=this.figure.points[this.figure.points.length-2];
               var last=this.figure.points[this.figure.points.length-1];
               if (Math.abs(last.y-prev.y)<Math.abs(last.x-prev.x))
               {
                  last.y=prev.y;
                  this.parent.setCursor(last);
                  //this.parent.lockCursor({x:false,y:true});
               }
               else
               {
                  last.x=prev.x;
                  this.parent.setCursor(last);
                  //this.parent.lockCursor({x:true,y:false});
               }
               
               ret=false;
               break;
            }
         }
      }
      
      return ret;
   }
   
   onKeyUp(e_)
   {
      var ret=true;
      
      switch (e_.key)
      {
         case 'Control':
         {
            //TODO: lock cursor
            break;
         }
      }
      
      return ret;
   }
   
   onMouseMove(e_)
   {
      //Move last (free) point
      if (this.figure&&this.figure.points.length>0)
      {
         if (this._isNew)
         {
            var rad=this.parent.lengthToWorld(8);
            var rnbh={lb:{x:this.parent.cursor.x-rad,y:this.parent.cursor.y-rad},rt:{x:this.parent.cursor.x+rad,y:this.parent.cursor.y+rad}}; //Rectangular neighbourhood
            var nearStart=isPointInNormalRect(this.figure.points[0],rnbh);
            if (nearStart)
               this.parent.setCursor(this.figure.points[0]);
               
            this.figure.points[this.figure.points.length-1].x=this.parent.cursor.x;
            this.figure.points[this.figure.points.length-1].y=this.parent.cursor.y;
            this.updateNthInput(this.figure.points.length-1,this.figure.points[this.figure.points.length-1]);
         }
         else if (this._grabbedPoint>=0&&this._grabbedPoint<this.figure.points.length)
         {
            this.figure.points[this._grabbedPoint].x=this.parent.cursor.x;
            this.figure.points[this._grabbedPoint].y=this.parent.cursor.y;
            this.updateNthInput(this._grabbedPoint,this.figure.points[this._grabbedPoint]);
            this.parent.repaint();
         }
         else
            this._grabbedPoint=-1;
      }
   }
   
   onMouseUp(e_)
   {
      if (this.figure&&this.figure.points.length>0)
      {
         if (!this._isNew)
         {
            if (this._grabbedPoint>=0&&this._grabbedPoint<this.figure.points.length)
            {
               this.figure.points[this._grabbedPoint].x=this.parent.cursor.x;
               this.figure.points[this._grabbedPoint].y=this.parent.cursor.y;
               this.updateNthInput(this._grabbedPoint,this.figure.points[this._grabbedPoint]);
               this.parent.repaint();
            }
            this._grabbedPoint=-1;
         }
      }
   }
      
   //public methods
   onRepaintOverlay(overlay_)
   {
      if (this.figure)
      {
         this.parent.paintPolyline(overlay_,this.figure.points,{stroke:'#047C00',fill:'',mode:'add'});
         
         if (this.figure.points.length>1)
         {
            //Paint handlers
            for (var i in this.figure.points)
            {
               pt=this.parent.pointToCanvas(this.figure.points[i]);
               var handler={x:pt.x-4,y:pt.y-4,w:8,h:8};
               this.parent.paintRect(overlay_,handler,{fill:(i==0 ? 'rgba(201,135,6,1)' : 'rgba(55,184,88,1)')},true);
            }
            
            //Highlight points of self-crosssection
            var xPts=selfXSections(this.figure.points,false);
            for (var pt of xPts)
               this.parent.paintCross(overlay_,pt,{radius:this.parent.lengthToWorld(6),color:'#FF0000'});
            
            //Highlight closing
            if (ptCmp(this.figure.points[0],this.figure.points[this.figure.points.length-1])&&ptCmp(this.figure.points[this.figure.points.length-1],this.parent.cursor))
            {
               var radius=this.parent.lengthToWorld(6);
               var rect=moveRect(this.parent.cursor,{x:-radius,y:-radius});
               rect.w=radius*2;
               rect.h=rect.w;
               
               this.parent.paintRect(overlay_,rect,{fill:'#349C37'});
            }
         }
      }
   }
   
}