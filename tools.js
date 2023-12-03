import {decorateInputFieldVal,bindEvtInputToDeferredChange,buildNodes,clone,getCookie,DynamicForm,DynamicFormItem,reqServer} from './core/js_utils.js';
import * as GU from './graph_utils.js';

if (!('structuredClone' in (globalThis??window)))
   (globalThis??window).structuredClone=clone;

//Tool =================================================================================
export class Tool
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
var hintStructs={
                   figure:{tagName:'div',className:'hint figure',innerHTML:'Выберите фигуру поверхности, на которую нужно укладывать материал (фасад, кровля, стена)'},
                   figureSize:{tagName:'div',className:'hint figure',innerHTML:'Введите размеры фигуры поверхности, на которую нужно укладывать материал (фасад, кровля, стена)'},
                   cut:{tagName:'div',className:'hint cut',innerHTML:'Выберите фигуру выреза (оконного/дверного проема, арки)'},
                   cutSize:{tagName:'div',className:'hint cut',innerHTML:'Введите размеры фигуры выреза (оконного/дверного проема, арки)'},
                };

export class StepsTool extends Tool
{
   //Basic tool for Drawer
   constructor(parent_)
   {
      super(parent_);

      //Init steps selector:
      var stpStructs=[
                        {tagName:'div',className:'step sel enabled',childNodes:[{tagName:'span',textContent:'1. Начало'}],dataset:{step:0}},
                        {tagName:'div',className:'step',childNodes:[{tagName:'span',textContent:'2. Фигура'}],dataset:{step:0}},
                        {tagName:'div',className:'step',childNodes:[{tagName:'span',textContent:'3. Размер'}],dataset:{step:1}},
                        {tagName:'div',className:'step',childNodes:[{tagName:'span',textContent:'4. Вырез'}],dataset:{step:2}},
                        {tagName:'div',className:'step',childNodes:[{tagName:'span',textContent:'5. Размер выреза'}],dataset:{step:3}},
                        {tagName:'div',className:'step',childNodes:[{tagName:'span',textContent:'6. Раскладка'}],dataset:{step:4}},
                        {tagName:'div',className:'step',childNodes:[{tagName:'span',textContent:'7. Выбор материала'}],dataset:{step:5}},
                        {tagName:'div',className:'step',childNodes:[{tagName:'span',textContent:'8. Результат'}],dataset:{step:6}},
                        {tagName:'div',className:'step',childNodes:[{tagName:'span',textContent:'9. Получить'}],dataset:{step:7}},
                     ];
      for (var stpStruct of stpStructs)
         this._stepSelectors.push(buildNodes(stpStruct));
      
      var stepsBar=document.querySelector('.steps_bar');
      if (stepsBar)
         for (var stpSel of this._stepSelectors)
         {
            stpSel.addEventListener('click',(e_)=>{this.step=parseInt(e_.target.closest('.step').dataset.step);});
            stepsBar.appendChild(stpSel);
         }
      
      //Tool panel:
      let structStart={
                         tagName:'div',
                         className:'panel steps',
                         childNodes:[
                                       {tagName:'h2',className:'start',textContent:'Шаг 1. Начать/открыть проект'},
                                       {
                                          tagName:'div',
                                          className:'flex col x-center gap_m',
                                          childNodes:[
                                                        {tagName:'input',type:'button',className:'next new',value:'Начать новый проект',_collectAs:'btnReStart'},
                                                        {
                                                           tagName:'label',
                                                           className:'file',
                                                           childNodes:[
                                                                          {tagName:'span',textContent:'Открыть файл',className:'caption'},
                                                                          {tagName:'input',type:'file',accept:'application/json',_collectAs:'inpDataFile'},
                                                                      ],
                                                        },
                                                        {tagName:'input',type:'button',className:'next existing',value:'Продолжить',_collectAs:'btnLoadFile'},
                                                     ],
                                       }
                                    ],
                      };
      let structFig={
                       tagName:'div',
                       className:'panel steps',
                       childNodes:[
                                     {tagName:'h2',className:'figure',textContent:'Шаг 2. Фигура'},
                                     hintStructs.figure,
                                     {
                                        tagName:'div',
                                        className:'figure_sel flex around',
                                        childNodes:[
                                                      {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'rect'     ,className:'rect'     ,onclick:(e_)=>{this._figureType='rect'; this.step++;}},'Прямоугольник']},
                                                      {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'trapezoid',className:'trapezoid',onclick:(e_)=>{this._figureType='trapezoid'; this.step++;}},'Трапеция']},
                                                      {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'triangle' ,className:'triangle' ,onclick:(e_)=>{this._figureType='triangle'; this.step++;}},'Треугольник']},
                                                      {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'polyline' ,className:'polyline' ,onclick:(e_)=>{this._figureType='polyline'; this.step++;}},'Произвольная фигура']}
                                                   ]
                                     },
                                     //{tagName:'div',className:'nav',childNodes:[{tagName:'input',type:'button',className:'alt prev',value:'Назад',onclick:(e_)=>{this.step--;}},{tagName:'input',type:'button',className:'next',value:'Далее',onclick:(e_)=>{this.step++;}}]}
                                  ],
                    };
      let structCut={
                       tagName:'div',
                       className:'panel steps cut',
                       childNodes:[
                                     {tagName:'h2',className:'cut',textContent:'Шаг 4. Вырез'},
                                     hintStructs.cut,
                                     {
                                        tagName:'div',
                                        className:'figure_sel flex around',
                                        childNodes:[
                                                      {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'rect'     ,className:'rect'     ,onclick:(e_)=>{this._figureType='rect'; this.step++;}},'Прямоугольник']},
                                                      {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'trapezoid',className:'trapezoid',onclick:(e_)=>{this._figureType='trapezoid'; this.step++;}},'Трапеция']},
                                                      {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'triangle' ,className:'triangle' ,onclick:(e_)=>{this._figureType='triangle'; this.step++;}},'Треугольник']},
                                                      {tagName:'label',childNodes:[{tagName:'input',type:'button',name:'polyline' ,className:'polyline' ,onclick:(e_)=>{this._figureType='polyline'; this.step++;}},'Произвольная фигура']}
                                                   ]
                                     },
                                     {
                                        tagName:'div',
                                        className:'cuts',
                                        childNodes:[
                                                      {tagName:'h3',textContent:'Изменить вырез'},
                                                      {tagName:'div',className:'figure_sel flex',_collectAs:'cutsContainer'}
                                                   ],
                                        _collectAs:'cutsPanel',
                                     },
                                     {tagName:'div',className:'nav',childNodes:[{tagName:'input',type:'button',className:'alt prev',value:'Назад',onclick:(e_)=>{this.step--;}},{tagName:'input',type:'button',className:'next',value:'Далее',onclick:(e_)=>{this.step++;}}]}
                                  ]
                    };
      this._toolPanels={
                          start:buildNodes(structStart,this._panelNodes),
                          figs :buildNodes(structFig,this._panelNodes),
                          cuts :buildNodes(structCut,this._panelNodes),
                       };
      this._toolPanel=this._toolPanels.start;
      
      //Init events:
      this._panelNodes.btnReStart.addEventListener('click',(e_)=>{if (this.parent.figuresLength==0) this.step++; else if (confirm('Начать сначала?\n(Все фигуры будут удалены)')) {this.parent.clear(); this.step++;} else this.step+=2; });
      this._panelNodes.btnLoadFile.addEventListener('click',(e_)=>{this._loadLocalFile().then((isLoaded_)=>{this.step+=(1+isLoaded_);}).catch((err_)=>{alert(err_); this._panelNodes.inpDataFile.value=null;});});
      
      //Open file by URL:
      let matches=document.location.search.match(/(?<=[?&]f\=)[0-9a-z]+/i);
      if (matches?.[0])
         reqServer(null,{action:'recall_data',f:matches[0]})
            .then((ans_)=>{if (ans_.status=='success') this._restoreData(ans_); else alert(ans_.errors?.join('\n')??'Не удалось получить данные по ссылке.');})
            .catch((xhr_)=>{alert('Не удалось запросить данные по ссылке.');});
   }
   
   //private props
   _step=0;
   _farestStep=0;
   _maxSteps=8;
   _figureType='';
   
   _stepSelectors=[];
   _selectedCut=null;
   _panelNodes={};
   
   //public props
   get name(){return 'steps';}
   get parent(){return this._parent;}
   get toolPanel(){return this._toolPanel;}
   
   get active(){return super.active;}
   set active(val_)
   {
      super.active=val_;
      if (this.toolPanel)
         this.toolPanel.classList.toggle('active',val_);
   }
   
   get step(){return this._step;}
   set step(val_)
   {
      //Set step
      let oldStep=this._step;
      
      if ((0<=val_)&&(val_<=this._maxSteps))
         this._step=val_;
      
      if (this._step>this._farestStep) //Disallow random acess to the steps that wasn't reached sequentially.
         this._farestStep=this._step;
      
      //Force step to very start if there is no figures was drawed
      if ((this._step>1)&&(this.parent.figuresLength==0)&&(!this._figureType))
         return (this._step=0);  //ALERT: EMERGENCY RETURN IS HERE !!!!!!!!!!!!!!!!
      
      //Update direct step selectors
      for (var i=0;i<this._stepSelectors.length;i++)
      {
         this._stepSelectors[i].classList.toggle('sel',i==this._step);
         this._stepSelectors[i].classList.toggle('enabled',i<=this._farestStep);
      }
      
      this._repaintCutsList();
      
      //Step-specific operations:
      switch (this._step)
      {
         case 0:
         {
            //Create or open a new project:
            this._switchToolPanel(this._toolPanels.start);
            
            break;
         }
         case 1:
         {
            //Choose main figure type:
            
            if (this.parent.figuresLength>0)
               this.step++;   //Skip this step.
            else
            {
               this._switchToolPanel(this._toolPanels.figs);
               this.parent.activeTool=this;
               /*At this point this._figureType is expected to be set by one of the buttons.*/
            }
            
            break;
         }
         case 2:
         {
            //Create/setup main figure:
            let tool=null;
            if (this.parent.figuresLength==0)
            {
               this.parent.style.fill='#C8D3E6';
               tool=this.parent.getToolByName(this._figureType);
            }
            else
               tool=this.parent.getToolByName(this.parent.at(0).type);
            
            if (tool)
            {
               this.parent.activeTool=tool;
               tool.bindToFigure(this.parent.at(0));
            }
            
            //this._saveState();
            
            break;
         }
         case 3:
         {
            //Choose cut figure type:
            this._switchToolPanel(this._toolPanels.cuts);
            this.parent.activeTool=this;
            this._figureType='';
            
            //this._saveState();
            
            break;
         }
         case 4:
         {
            //Add/setup cuts:
            if ((this._figureType=='')&&(this.parent.selectionLength==0))
               this.step+=(oldStep>this.step ? -1 : +1);
            else
            {
               var tool=null;
               if (this.parent.selectionLength>0)
               {
                  tool=this.parent.getToolByName(this.parent.selectionAt(0).tool);
                  tool.bindToFigure(this.parent.selectionAt(0));
                  this.parent.deselectAll();
               }
               else
                  tool=this.parent.getToolByName(this._figureType);
               
               this.parent.style.fill='#FFFFFF';
               if (tool)
               {
                  this.parent.activeTool=tool;
                  tool.mode='cut';
               }
            }
            
            //this._saveState();
            break;
         }
         case 5:
         {
            //Setup layout:
            var tool=this.parent.getToolByName('calc');
            if (tool)
            {
               tool.activeView='layout';
               this.parent.activeTool=tool;
               
               if (this._step<this._farestStep)
               {
                  this.parent.fitToViewport(this.parent.figuresIt);
                  tool.calcFilling();
               }
            }
            
            //this._saveState();
            break;
         }
         case 6:
         {
            //Choose coverage params:
            var tool=this.parent.getToolByName('calc');
            if (tool)
            {
               tool.activeView='material';
               this.parent.activeTool=tool;
               
               if (this._step<this._farestStep)
               {
                  this.parent.fitToViewport(this.parent.figuresIt);
                  tool.calcFilling();
               }
            }
            break;
         }
         case 7:
         {
            //Choose siding:
            var tool=this.parent.getToolByName('calc');
            if (tool)
            {
               tool.activeView='result';
               this.parent.activeTool=tool;
               
               this.parent.fitToViewport(this.parent.figuresIt);
               tool.calcFilling();
               
               if (tool.lnkSaveLocal.href)
                  URL.revokeObjectURL(tool.lnkSaveLocal.getAttribute('href'));
               tool.lnkSaveLocal.setAttribute('href',URL.createObjectURL(new Blob([JSON.stringify(this._collectData(),null,3)],{type:"application/json"})));
            }
            break;
         }
         case 8:
         {
            //Display siding layout:
            var tool=this.parent.getToolByName('calc');
            if (tool)
            {
               tool.activeView='contacts';
               this.parent.activeTool=tool;
               
               tool.calcFilling();
            }
            break;
         }
      }
   }
   
   //public methods
   onReady()
   {
      //Recall figures:
      //this._restoreState();
      if (this.parent.figuresLength>0)
         this.step=0;
   }
   
   prev()
   {
      //Helper method for null-chained call.
      this.step--;
   }
   
   next()
   {
      //Helper method for null-chained call.
      this.step++;
   }
   
   //private methods
   _switchToolPanel(newPanel_)
   {
      if (this._toolPanel&&this._toolPanel.parentNode&&newPanel_)
         this._toolPanel.parentNode.replaceChild(newPanel_,this._toolPanel);
      this._toolPanel=newPanel_;
   }
   
   _repaintCutsList()
   {
      if (this._panelNodes.cutsPanel&&this._panelNodes.cutsContainer)
      {
         this._panelNodes.cutsContainer.innerHTML='';
         for (let [i,figure] of this.parent.figuresEnt)
            if (figure.mode=='cut')
            {
               let struct={
                             tagName:'div',
                             childNodes:[
                                           {tagName:'input',type:'button',className:figure.type,value:'',dataset:{indx:i},onclick:(e_)=>{this.parent.select(this.parent.at(parseInt(e_.target.dataset.indx)));}},
                                           {tagName:'input',type:'button',className:'tool clr',value:'✕',title:'Удалить',dataset:{indx:i},onclick:(e_)=>{this.parent.splice(parseInt(e_.target.dataset.indx),1); this._repaintCutsList();}},
                                        ],
                          };
               this._panelNodes.cutsContainer.appendChild(buildNodes(struct));
            }
         
         this._panelNodes.cutsPanel.classList.remove('hidden');
      }
      else if (this._panelNodes.cutsPanel)
         this._panelNodes.cutsPanel.classList.add('hidden');
   }
   
   _saveState()
   {
      let mem=this._parent.getToolByName('memory');
      mem?.memorize('siding_calc_figures',this._parent.list());
   }
   
   _restoreState()
   {
      let mem=this._parent.getToolByName('memory');
      this._parent.clear();
      this._parent.append(...(mem?.recall('siding_calc_figures')??[]));
   }
   
   _collectData()
   {
      let calc=this._parent.getToolByName('calc');
      //NOTE: Keep in sync with validation in the store_data().
      let res={
                 figures:this._parent.list(),
                 material:calc.material,
                 cutAxis:calc.cutAxis,
                 cutOffset:calc.cutOffset,
                 crossbars:calc.crossbars,
              };
      return res;
   }
   
   _fixData(data_)
   {
      let res=data_;
      
      if (data_ instanceof Array)
      {
         for (let i in data_)
            data_[i]=this._fixData(data_[i]);
      }
      else if (data_ instanceof Object)
      {
         for (let k in data_)
            data_[k]=this._fixData(data_[k]);
      }
      else 
      {
         let num=parseFloat(data_);
         if (!isNaN(num))
            res=num;
      }
      
      return res;
   }
   
   _restoreData(data_)
   {
      data_=this._fixData(data_);
      console.log(data_);
      
      this._parent.clear();
      this._parent.append(...(data_.figures??[]));
      
      let calc=this._parent.getToolByName('calc');
      calc.material=data_?.material;
      calc.cutAxis=data_?.cutAxis??'x';
      calc.cutOffset=data_?.cutOffset??0;
      calc.crossbars=data_?.crossbars??[];
   }
   
   _loadLocalFile()
   {
      return new Promise((onResolve,onReject)=>{
                                                  if (this._panelNodes.inpDataFile.files.length>0)
                                                  {
                                                     let reader=new FileReader();
                                                     reader.addEventListener('load',(e_)=>{
                                                                                             try
                                                                                             {
                                                                                                let data=JSON.parse(reader.result);
                                                                                                this._restoreData(data);
                                                                                                onResolve(true);
                                                                                             }
                                                                                             catch (ex)
                                                                                             {
                                                                                                onReject(ex.message);
                                                                                             }
                                                                                          });
                                                     reader.addEventListener('error',(e_)=>{onReject('Не удалось загрузить файл.');});
                                                     reader.addEventListener('abort',(e_)=>{onReject('Не удалось загрузить файл.');});
                                                     reader.readAsText(this._panelNodes.inpDataFile.files[0]);
                                                  }
                                                  else
                                                     onResolve(false);
                                               }
                        );
   }
}

//Hand Pan =================================================================================
export class HandPanTool extends Tool
{
   //Hand tool for pannind viewport in Drawer
   constructor(parent_)
   {
      super(parent_);
      
      //private props
      this._panStart=null;
      
      //Tool panel:
      let struct={
                    tagName:'div',
                    className:'panel hand_pan',
                    childNodes:[
                                  {tagName:'input',type:'button',className:'tool toggle',value:'',title:'Двигать холст',onclick:(e_)=>{this.parent.activeTool=this;}}
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
export class FigureTool extends Tool
{
   //Basic figures drawing tool for Drawer
   constructor (parent_,type_,uiStruct_)
   {
      super(parent_);
      
      this._type=type_;
      this._createPanel(uiStruct_);
   }
   
   //public props
   get active(){return super.active;}
   set active(val_)
   {
      //if (val_)
      //   this.bindToFigure(this.parent.selectionAt(0));  //Take a figure from selection.
      //else
      //   this.bindToFigure(null);   //Unbind.
      //
      super.active=val_;
   }
   
   get mode(){return this._mode;}
   set mode(newVal_)
   {
      if (['add','cut'].indexOf(newVal_)>-1)
      {
         this._mode=newVal_;
         this.toolPanel.classList.toggle('cut',this._mode=='cut');
      }
      else
         console.error('Invalid value of FigureTool.mode assigned',newVal_);
   }
   
   //private props
   _type='';
   _mode='add';
   _figure=null;
   _UIElements={};   //Collection for easy access to the UI elements of the tool.
   
   //public methods
   bindToFigure(figure_)
   {
      //Binds/unbinds tool to the given figure.
      
      if (figure_?.tool==this.name)
      {
         this._figure=figure_;
         this.mode=this._figure.mode;
      }
      else
      {
         this._figure=null;
      }
   }
   
   unbind()
   {
      //A shorthand for this.bindToFigure(null).
      
      this._figure=null;
   }
   
   submitFigure()
   {
      //Submits the editing figure to the parent.
      
      if (this._figure)
      {
         let indx=this.parent.indexOf(this._figure);
         if (indx>-1)
            this.parent.splice(indx,1,this._figure);
         else
            this.parent.append(this._figure);
      }
      this.unbind();
   }
   
   //private methods
   _createPanel(struct_)
   {
      this._toolPanel=buildNodes(struct_,this._UIElements);
      
      for (let key in this._UIElements.inputs)
      {
         decorateInputFieldVal(this._UIElements.inputs[key]);
         bindEvtInputToDeferredChange(this._UIElements.inputs[key]);
         this._UIElements.inputs[key].addEventListener('change',(e_)=>{this.updateFigureFromInputs();});
      }
      
      this._UIElements.btnPrev  .addEventListener('click',(e_)=>{this.parent.getToolByName('steps')?.prev(); e_.target.blur();});
      this._UIElements.btnAddCut.addEventListener('click',(e_)=>{this.submitFigure(); this.parent.getToolByName('steps')?.prev(); e_.target.blur();});
      this._UIElements.btnNext  .addEventListener('click',(e_)=>{this.submitFigure(); this.parent.getToolByName('steps')?.next(); e_.target.blur();});
   }
   
   _updateInputs(data_)
   {
      for (var key in data_)
         this._UIElements.inputs[key].valueAsMixed=data_[key].toFixed(Math.ceil(-Math.log10(this._UIElements.inputs[key].step)));
   }
   
   _makeFigure(figData_)
   {
      //Helper method, fills common props of a figure.
      
      return {type:this._type,tool:this.name,mode:this.mode,...figData_};
   }
}

//Rect Tool =================================================================================
export class RectTool extends FigureTool
{
   //Rect tool class
   constructor (parent_)
   {
      //Tool panel:
      let struct={
                    tagName:'div',
                    className:'panel rect',
                    childNodes:[
                                  {tagName:'h2',className:'figure',textContent:'Шаг 2. Размер'},
                                  {tagName:'h2',className:'cut',textContent:'Шаг 4. Размер выреза'},
                                  {
                                     tagName:'div',
                                     className:'opts size',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Ширина:'},{tagName:'input',type:'number',name:'rect[w]',step:0.001,value:0,_collectAs:['inputs','w']},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Высота:'},{tagName:'input',type:'number',name:'rect[h]',step:0.001,value:0,_collectAs:['inputs','h']},'м']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'opts pos',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние слева:'},{tagName:'input',type:'number',name:'rect[x]',step:0.01,value:0,_collectAs:['inputs','x']},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние от цоколя:'},{tagName:'input',type:'number',name:'rect[y]',step:0.01,value:0,_collectAs:['inputs','y']},'м']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'nav',
                                     childNodes:[
                                                   {tagName:'input',type:'button',className:'alt prev',value:'Назад',_collectAs:'btnPrev'},
                                                   {tagName:'input',type:'button',className:'add_cut',value:'Добавить вырез',_collectAs:'btnAddCut'},
                                                   {tagName:'input',type:'button',className:'next',value:'Далее',_collectAs:'btnNext'},
                                                ],
                                  },
                               ]
                 };
      super(parent_,'rect',struct);
   }
   
   //public props
   get name(){return 'rect';}
   
   //public methods
   bindToFigure(figure_)
   {
      super.bindToFigure(figure_);
      this._updateInputs(this._figure ? GU.rectSize(this._figure.rect) : {x:0,y:0,w:0,h:0});
   }
   
   updateFigureFromInputs()
   {
      let vect={};
      for (let key in this._UIElements.inputs)
         vect[key]=this._UIElements.inputs[key].valueAsMixed;
      
      let rect=GU.rectCorners(vect);
      if (this._testRect(rect))
      {
         rect=GU.rectNormalize(rect);
         this._figure??=this._makeFigure({rect:null,style:{...this.parent.style}});
         this._figure.rect=rect;
         
         this.parent.fitToViewport(this.parent.figuresLength ? this.parent.figuresIt : this._figure);
      }
   }
   
   onRepaintOverlay(overlay_)
   {
      if (this._figure)
      {
         if (this.parent.indexOf(this._figure)<0)
         {
            this.parent.paintRect(overlay_,GU.rectNormalize(structuredClone(this._figure.rect)),this._figure.style);
         }
         else
         {
            //Paint selection frame
            var rect=structuredClone(this._figure.rect);
            this.parent.paintRect(overlay_,GU.rectNormalize(rect),{stroke:'rgba(55,184,88,1)'});
            
            //Paint handlers
            var points=(this._figure.type=='rect' ? GU.outlineRect(this._figure.rect) : this._figure.points);
            for (var pt of points)
            {
               pt=this.parent.pointToCanvas(pt);
               var handler={x:pt.x-4,y:pt.y-4,w:8,h:8};
               this.parent.paintRect(overlay_,handler,{fill:'rgba(55,184,88,1)'},true);
            }
         }
      }
   }
   
   //private methods
   _testRect(rect_)
   {
      var res=false;
      
      if (!(isNaN(rect_?.lb?.x)||isNaN(rect_?.lb?.y)||isNaN(rect_?.rt?.x)||isNaN(rect_?.rt?.y)))
      {
         let size=GU.rectSize(rect_);
         res=((size.w!=0)&&(size.h!=0));
      }
      
      return res;
   }
}

//Polyline-based Tools ==========================================================================
class APolyLineTool extends FigureTool
{
   //Abstract class for polyline-based tools.
   constructor (parent_,uiStruct_)
   {
      super(parent_,'polyline',uiStruct_);
   }
   
   //public methods
   bindToFigure(figure_)
   {
      super.bindToFigure(figure_);
      this._updateInputs(this._paramsFromPoints(figure_?.points));
   }
   
   updateFigureFromInputs()
   {
      let points=this._pointsFromInputs();
      if (this._valiatePoints(points))
      {
         this._figure??=this._makeFigure({points:null,style:{...this.parent.style}});
         this._figure.points=points;
         
         this.parent.fitToViewport(this.parent.figuresLength ? this.parent.figuresIt : this._figure);
      }
   }
   
   onRepaintOverlay(overlay_)
   {
      if (this._figure)
      {
         if (this.parent.indexOf(this._figure)<0)
            this.parent.paintPolyline(overlay_,this._figure.points,this._figure.style);
      }
   }
   
   //private methods
   _preTestPoints(points_,minLength_)
   {
      if (points_.length<minLength_)
         throw new Error('Not enough points');
         
      for (let pt of points_)
         if (isNaN(pt.x)||isNaN(pt.y))
            throw new Error('NaN in point');
   }
   
   _pointsFromInputs()
   {
      let params={};
      for (let key in this._UIElements.inputs)
         params[key]=this._UIElements.inputs[key].valueAsMixed;
      
      return this._pointsFromParams(params);
   }
   
   _paramsFromPoints(points_)
   {
      throw new Error('Call of abstract method');
   }
   
   _pointsFromParams(params_)
   {
      //NOTE: Child class may not implement this method if it overrides _pointsFromInputs() w/o _pointsFromParams().
      throw new Error('Call of abstract method');
   }
   
   _valiatePoints(points_)
   {
      throw new Error('Call of abstract method');
   }
}
//Triangle Tool =================================================================================
export class TriangleTool extends APolyLineTool
{
   //Rect tool class
   constructor (parent_)
   {
      //Tool panel:
      let struct={
                    tagName:'div',
                    className:'panel triangle',
                    childNodes:[
                                  {tagName:'h2',className:'figure',textContent:'Шаг 2. Размер'},
                                  {tagName:'h2',className:'cut',textContent:'Шаг 4. Размер выреза'},
                                  {
                                     tagName:'div',
                                     className:'opts size',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Ш:'},{tagName:'input',type:'number',name:'triangle[w]',step:0.001,value:0,_collectAs:['inputs','w']},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'В:'},{tagName:'input',type:'number',name:'triangle[h]',step:0.001,value:0,_collectAs:['inputs','h']},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'С:'},{tagName:'input',type:'number',name:'triangle[c]',step:0.001,value:0,_collectAs:['inputs','c']},'м']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'opts pos',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние слева:'},{tagName:'input',type:'number',name:'triangle[x]',step:0.01,value:0,_collectAs:['inputs','x']},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние от цоколя:'},{tagName:'input',type:'number',name:'triangle[y]',step:0.01,value:0,_collectAs:['inputs','y']},'м']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'nav',
                                     childNodes:[
                                                   {tagName:'input',type:'button',className:'alt prev',value:'Назад',_collectAs:'btnPrev'},
                                                   {tagName:'input',type:'button',className:'add_cut',value:'Добавить вырез',_collectAs:'btnAddCut'},
                                                   {tagName:'input',type:'button',className:'next',value:'Далее',_collectAs:'btnNext'},
                                                ],
                                  },
                               ],
                 };
      super(parent_,struct);
   }
   
   //public props
   get name(){return 'triangle';}
   
   //public methods
   
   //private methods
   _paramsFromPoints(points_)
   {
      var res={x:0,y:0,w:0,h:0,c:0};
      
      if (points_?.length==3)
      {
         res.x=points_[0].x;
         res.y=points_[0].y;
         res.w=points_[2].x-points_[0].x;
         res.h=points_[1].y-points_[0].y;
         res.c=points_[1].x-points_[0].x;
      }
      
      return res;
   }
   
   _pointsFromParams(params_)
   {
      return [
                {x:params_.x,y:params_.y},                     //Bottom left.
                {x:params_.x+params_.c,y:params_.y+params_.h}, //Top.
                {x:params_.x+params_.w,y:params_.y}            //Bottom right.
             ];
   }
   
   _valiatePoints(points_)
   {
      let res=false;
      try
      {
         this._preTestPoints(points_,3);
         
         if ((points_[2].x-points_[0].x)<Number.EPSILON)
            throw new Error('Triangle base has zero or negative length');
         if ((points_[1].y-points_[0].y)<Number.EPSILON)
            throw new Error('Triangle has zero or negative height');
         
         res=true;
      }
      finally
      {
         return res;
      }
   }
}

//Triangle Tool =================================================================================
export class TrapezoidTool extends APolyLineTool
{
   //Rect tool class
   constructor (parent_)
   {
      //Tool panel:
      let struct={
                    tagName:'div',
                    className:'panel trapezoid',
                    childNodes:[
                                  {tagName:'h2',className:'figure',textContent:'Шаг 2. Размер'},
                                  {tagName:'h2',className:'cut',textContent:'Шаг 4. Размер выреза'},
                                  {tagName:'div',className:'size_scheme'}, //Node with the BG defined in main.css.
                                  {
                                     tagName:'div',
                                     className:'opts size',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Ш:'},{tagName:'input',type:'number',name:'trapezoid[w]',step:0.001,value:0,_collectAs:['inputs','w']},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'В:'},{tagName:'input',type:'number',name:'trapezoid[h]',step:0.001,value:0,_collectAs:['inputs','h']},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Ш'},{tagName:'sub',textContent:'2'},{tagName:'span',textContent:':'},{tagName:'input',type:'number',name:'trapezoid[w2]',step:0.001,value:0,_collectAs:['inputs','w2']},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'С:'},{tagName:'input',type:'number',name:'trapezoid[c]',step:0.001,value:0,_collectAs:['inputs','c']},'м']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'opts pos',
                                     childNodes:[
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние слева:'},{tagName:'input',type:'number',name:'trapezoid[x]',step:0.01,value:0,_collectAs:['inputs','x']},'м']},
                                                   {tagName:'label',childNodes:[{tagName:'span',textContent:'Расстояние от цоколя:'},{tagName:'input',type:'number',name:'trapezoid[y]',step:0.01,value:0,_collectAs:['inputs','y']},'м']}
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'nav',
                                     childNodes:[
                                                   {tagName:'input',type:'button',className:'alt prev',value:'Назад',_collectAs:'btnPrev'},
                                                   {tagName:'input',type:'button',className:'add_cut',value:'Добавить вырез',_collectAs:'btnAddCut'},
                                                   {tagName:'input',type:'button',className:'next',value:'Далее',_collectAs:'btnNext'},
                                                ],
                                  },
                               ]
                 };
      super(parent_,struct);
   }
   
   //public props
   get name(){return 'trapezoid';}
   
   //public methods
   
   //private methods
   _paramsFromPoints(points_)
   {
      var res={x:0,y:0,w:0,h:0,w2:0,c:0};
      
      if (points_?.length==4)
      {
         res.x =points_[0].x;
         res.y =points_[0].y;
         res.w =points_[3].x-points_[0].x;
         res.h =points_[1].y-points_[0].y;
         res.w2=points_[2].x-points_[1].x;
         res.c =points_[1].x-points_[0].x;
      }
      
      return res;
   }
   
   _pointsFromParams(params_)
   {
      return [
                {x:params_.x,y:params_.y},                                 //Bottom left.
                {x:params_.x+params_.c,y:params_.y+params_.h},             //Top left.
                {x:params_.x+params_.c+params_.w2,y:params_.y+params_.h},  //Top right.
                {x:params_.x+params_.w,y:params_.y}                        //Bottom right.
             ];
   }
   
   _valiatePoints(points_)
   {
      let res=false;
      try
      {
         this._preTestPoints(points_,4);
         
         if ((points_[3].x-points_[0].x)<Number.EPSILON)
            throw new Error('Trapezoid base has zero or negative length');
         if ((points_[1].y-points_[0].y)<Number.EPSILON)
            throw new Error('Trapezoid has zero or negative height');
         if ((points_[2].x-points_[1].x)<Number.EPSILON)
            throw new Error('Trapezoid top side has zero or negative length');
         
         res=true;
      }
      finally
      {
         return res;
      }
   }
}

//Polyline =====================================================================================
export class PolyLineTool extends APolyLineTool
{
   //Polyline
   constructor(parent_)
   {
      //Tool panel:
      let struct={
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
                                                       childNodes:[],
                                                       _collectAs:'ptsInpListNode',
                                                    },
                                                ]
                                  },
                                  {
                                     tagName:'div',
                                     className:'nav',
                                     childNodes:[
                                                   {tagName:'input',type:'button',className:'alt prev',value:'Назад',_collectAs:'btnPrev'},
                                                   {tagName:'input',type:'button',className:'add_cut',value:'Добавить вырез',_collectAs:'btnAddCut'},
                                                   {tagName:'input',type:'button',className:'next',value:'Далее',_collectAs:'btnNext'},
                                                ],
                                  },
                               ]
                 };
      let ptsInpListItemStruct={
                                  tagName:'div',
                                  className:'item point',
                                  childNodes:[
                                                {tagName:'label',childNodes:[{tagName:'span',textContent:'X:'},{tagName:'input',type:'number',name:'point[0][x]',step:0.001,value:0,_collectAs:['inputs','x']}]},
                                                {tagName:'label',childNodes:[{tagName:'span',textContent:'Y:'},{tagName:'input',type:'number',name:'point[0][y]',step:0.001,value:0,_collectAs:['inputs','y']}]},
                                                {tagName:'input',className:'tool ok add',type:'button',value:'+',title:'Add',_collectAs:'btnAdd'},
                                                {tagName:'input',className:'tool clr',type:'button',value:'✕',title:'Delete',_collectAs:'btnDel'}
                                             ],
                               };
      super(parent_,struct);
      this._ptsInpList=new DynamicForm(this,{itemClass:PolylinePtsItem,itemClassParams:{nodeStruct:ptsInpListItemStruct,inputFieldsListParams:{}},listNode:this._UIElements.ptsInpListNode,minLength:1});
   }
   
   //public props
   get name(){return 'polyline';}
   
   //private props
   _ptsInpList=null;  //DynamicForm for polyline points input.
   
   //public methods
   onRepaintOverlay(overlay_)
   {
      if (this._figure)
      {
         this.parent.paintPolyline(overlay_,this._figure.points,{stroke:'#047C00',fill:'',mode:'add'});
         
         if (this._figure.points.length>1)
         {
            //Paint handlers
            for (var i in this._figure.points)
            {
               pt=this.parent.pointToCanvas(this._figure.points[i]);
               var handler={x:pt.x-4,y:pt.y-4,w:8,h:8};
               this.parent.paintRect(overlay_,handler,{fill:(i==0 ? 'rgba(201,135,6,1)' : 'rgba(55,184,88,1)')},true);
            }
            
            //Highlight points of self-crosssection
            var xPts=GU.selfXSections(this._figure.points,false);
            for (var pt of xPts)
               this.parent.paintCross(overlay_,pt,{radius:this.parent.lengthToWorld(6),color:'#FF0000'});
            
            //Highlight closing
            if (GU.ptCmp(this._figure.points[0],this._figure.points[this._figure.points.length-1])&&GU.ptCmp(this._figure.points[this._figure.points.length-1],this.parent.cursor))
            {
               var radius=this.parent.lengthToWorld(6);
               var rect=GU.moveRect(this.parent.cursor,{x:-radius,y:-radius});
               rect.w=radius*2;
               rect.h=rect.w;
               
               this.parent.paintRect(overlay_,rect,{fill:'#349C37'});
            }
         }
      }
   }
   
   //private methods
   _pointsFromInputs()
   {
      return this._ptsInpList.data;
   }
   
   _paramsFromPoints(points_)
   {
      this._ptsInpList.data=points_??[{x:0,y:0}];
   }
   
   _valiatePoints(points_)
   {
      let res=false;
      try
      {
         this._preTestPoints(points_,3);
         
         if (GU.selfXSections(points_,true).length>0)
            throw new Error('Polyline has self intersections');
         
         res=true;
      }
      finally
      {
         return res;
      }
   }
}

class PolylinePtsItem extends DynamicFormItem
{
   constructor(parent_,params_)
   {
      super(parent_,params_);
      
      for (let key in this._insidesCollection.inputs)
      {
         bindEvtInputToDeferredChange(this._insidesCollection.inputs[key]);
         this._insidesCollection.inputs[key].addEventListener('change',(e_)=>{this._parent._parent.updateFigureFromInputs();});
      }
      this._insidesCollection.btnAdd.addEventListener('click',(e_)=>{this._parent.add({x:0,y:0});});
      this._insidesCollection.btnDel.addEventListener('click',(e_)=>{this._parent.remove(this);});
   }
}

//Memory (internal tool) =====================================================================================
export class MemoryTool extends Tool
{
   get name(){return 'memory';}
   
   memorize(key_,val_)
   {
      //Saves a value in local memory.
      
      if (window.localStorage)
         window.localStorage.setItem(key_,JSON.stringify(val_));
      else
         setCookie(key_,JSON.stringify(val_));
   }
   
   recall(key_)
   {
      //Gets a value from local memory.
      let val=null;
      try
      {
         if (window.localStorage)
            val=window.localStorage.getItem(key_);
         if (val===null)
            val=getCookie(key_);
         val=JSON.parse(val);
      }
      catch (ex)
      {
         console.warn('CalcTool.recall(\''+key_+'\') caugth exception:',ex);
      }
      finally
      {
         return val;
      }
   }
}