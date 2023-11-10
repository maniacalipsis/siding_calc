import {cancelEvent,buildNodes,clone} from './core/js_utils.js';
import * as GU from './graph_utils.js';
import {HandPanTool} from './tools.js';
import {CalcTool} from './calc.js';

if (!('structuredClone' in (globalThis??window)))
   (globalThis??window).structuredClone=clone;

export class Drawer
{
   constructor(params_)
   {
      //initialization
      if (params_.mainBox)
      {
         //Bind to DOM
         this._mainBox=params_.mainBox;
         this._paintBox=this._mainBox.querySelector('.paintbox');
         this._toolBox=this._mainBox.querySelector('.toolbox');
         
         if (this._paintBox)
         {
            //Create canvases:
            this._underlay=document.createElement('canvas');
            this._paintBox.appendChild(this._underlay);
            
            this._canvas=document.createElement('canvas');
            this._paintBox.appendChild(this._canvas);
            
            this._overlay=document.createElement('canvas');
            this._paintBox.appendChild(this._overlay);
            
            //Setup statusbar:
            var sbBox=this._mainBox.querySelector('.statusbar');
            if (sbBox)
            {
               var structs=[
                              {
                                 tagName:'div',
                                 className:'cell zoom',
                                 textContent:'Zoom:',
                                 childNodes:[{tagName:'span',className:'value'}]
                              },
                              {
                                 tagName:'div',
                                 className:'cell cursor x',
                                 textContent:'X:',
                                 childNodes:[{tagName:'span',className:'value'}]
                              },
                              {
                                 tagName:'div',
                                 className:'cell cursor y',
                                 textContent:'Y:',
                                 childNodes:[{tagName:'span',className:'value'}]
                              }
                           ];
               for (var struct of structs)
                  sbBox.appendChild(buildNodes(struct));
               
               this._statusBar.zoomBox=sbBox.querySelector('.zoom .value');
               this._statusBar.xBox=sbBox.querySelector('.cursor.x .value');
               this._statusBar.yBox=sbBox.querySelector('.cursor.y .value');
            }
            
            //Assign listeners:
            window.addEventListener('resize'   ,(e_)=>{this.onResize(e_);});
            window.addEventListener('keypress' ,(e_)=>{this.onKeyPress(e_);}); 
            window.addEventListener('keydown'  ,(e_)=>{this.onKeyDown(e_);});
            window.addEventListener('keyup'    ,(e_)=>{this.onKeyUp(e_);});
            this._overlay.addEventListener('mousemove',(e_)=>{this.onMouseMove(e_);});
            this._overlay.addEventListener('click'    ,(e_)=>{this.onClick(e_);});
            this._overlay.addEventListener('mousedown',(e_)=>{this.onMouseDown(e_);});
            this._overlay.addEventListener('mouseup'  ,(e_)=>{this.onMouseUp(e_);});
            this._overlay.addEventListener('wheel'    ,(e_)=>{this.onWheel(e_);});
            
            //Register tools
            if (params_.tools)
            {
               for (var toolClass of params_.tools)
               {
                  var tool=new toolClass(this);
                  this._tools.push(tool);
                  var panel=tool.toolPanel;
                  if (panel)
                     this._toolBox.appendChild(panel);
               }
               
               if (this._tools.length>0)
                  this.activeTool=this._tools[0];
            }
            
            //Initially adjust canvas sizes and repaint
            this.resize();
            this._origin.y=this._overlay.height-20;
            this.repaint();
            this.refreshStatusbar();
            
            for (let tool of this._tools) //TODO: Was removed in prod.
               tool.onReady?.();          //
         }
         else
            console.error('No paintBox');
      }
      else
         console.error('No mainBox');
   }
   
   //public props
   style={stroke:'#1A5EB3',fill:'#C8D3E6'};                                 //Drawing style (current FG and BG colors)
   crosshairStyle={radius:-1,color:'rgba(56,80,125,1)'};                    //Crosshair style
   gridStyle={radius:3,minSpacing:10,factor:10,color:'rgba(0,0,0,0.15)'};   //Grid style
   axesStyle={radius:-1,color:'rgba(200,211,248,1)',textColor:'rgba(100,141,196,1)'};                       //Axes style
   background='#FFFFFF';                                                    //Background
   zoomStep=2;        //Step of zoom
   gridSize=0.1;      //Grid size in meters
   snap=true;         //Snap cursor to grid
   showGrid=true;     //Grid visibility.
   showAxes=true;     //Axes visibility.
   showNormals=false; //Show normals of polyline segments
   showSizes=1;       //Show sizes of: 1 - selected figures, 2 - all figures
   showVertCoords=1;  //Show coordinates of figure verticles: 1 - figure under cursor, 2 - selected figures, 3 - all figures
   precision=3;       //Precision of displaying values
   ppm=81/25.4*1000;  //Scaling factor (px per meter)
   unitsFactor=1;     //Native units is a meters. unitsFactor allows to display values in mm, cm, km etc.
   
   get cursor(){return {...this._cursor};}
   set cursor(pos_){this.setCursor(pos_);}
   setCursor(pos_,isCanvasCoords_)
   {
      if (isCanvasCoords_)
         pos_=this.pointToWorld(pos_);
      
      //Snap to grid
      if (this.snap)
         if (!this.snapToFigures(pos_))
            pos_=this.snapToGrid(pos_);
      
      //Set cursor
      if (!isNaN(pos_.x))
         this._cursor.x=pos_.x;
      if (!isNaN(pos_.y))
         this._cursor.y=pos_.y;
      this._cursor=GU.roundPoint(this._cursor);
      
      this.repaintOverlay();
      this.refreshStatusbar();
   }
   
   get zoom(){return this._zoomLevel;}
   set zoom(newZoom_)
   {
      //Set new zoom
      var cursorAtCanvas=this.pointToCanvas(this.cursor);      //Remember cursor position relatively to canvas
      
      this._zoomLevel=Math.min(1,Math.max(newZoom_,0.0025));   //Set new zoom
      
      var newCurAtCanvas=this.pointToCanvas(this.cursor);      //Restore cursor position on the canvas
      this._origin.x+=(cursorAtCanvas.x-newCurAtCanvas.x);     //
      this._origin.y+=(cursorAtCanvas.y-newCurAtCanvas.y);     //
      
      this.repaint();
      this.refreshStatusbar();
   }
   
   get activeTool() {return this._activeTool;}
   set activeTool(tool_)
   {
      if (tool_)
      {
         if ((tool_ instanceof HandPanTool)&&(this._activeTool instanceof CalcTool))   //TODO: Should be replaced with toolstack.
         {
            this._panTool=tool_;
            tool_.active=true;
         }
         else
         {
            if (this._activeTool)
               this._activeTool.active=false;
            
            this._activeTool=tool_;
            tool_.active=true;
            
            if (this._panTool)
            {
               this._panTool.active=false;
               this._panTool=null;
            }
         }
         
         this.repaintOverlay();
      }
      else if (this._activeTool)
      {
         this._activeTool.active=false;
         this._activeTool=null;
      }
   }
   
   get figuresIt(){return this._figures.values();}
   get figuresEnt(){return this._figures.entries();}
   get figuresLength(){return this._figures.length;}
   
   get selectionIt(){return this._selection.values();}
   get selectionEnt(){return this._selection.entries();}
   get selectionLength(){return this._selection.length;}
   
   get compoundFigure()
   {
      return this._compoundFigureCache??=(this._figures.length>0 ? this.intersectFigures(this._figures.filter((fig_)=>fig_.mode=='add'),this._figures.filter((fig_)=>fig_.mode=='cut'),'diff') : null);
   }
   
   get viewportRect()
   {
      return {x:0,y:0,w:this._overlay.width,h:this._overlay.height};  //NOTE: underlay, canvas and overlay MUST have equal position and size anyway.
   }
   
   get visibleWorld()
   {
      return this.rectToWorld(this.viewportRect);   //Get rect of wisible part of the world
   }
   
   //private props
   _mainBox=null;    //Main container
   _paintBox=null;   //Container of canvases
   _statusBar={};    //Cells for displaying status
   _overlay=null;    //Tools overlay canvas
   _canvas=null;     //Main drawing canvas
   _underlay=null;   //Grid,etc canvas
   
   _zoomLevel=0.05;
   _origin={x:100,y:100};     //Offset of the wrold origin on the canvas (px)
   _tools=[];                 //Toolset
   _activeTool=null;          //Pointer to active tool
   _panTool=null;             //Dynamic pointer to pan tool
   _cursor={x:0,y:0};         //Cursor real world position
   _panStart=null;            //Start point of panning
   
   _figures=[];               //Array of source figures
   _selection=[];             //Array of selected figures
   _compoundFigureCache=null; //A cahce of a compound figure, made from the source one.
   
   //private methods
   resize(size_)
   {
      if (size_===undefined)
         size_={w:this._paintBox.clientWidth,h:this._paintBox.clientHeight};
      
      this._underlay.width=size_.w;
      this._underlay.height=size_.h;
      
      this._canvas.width=size_.w;
      this._canvas.height=size_.h;
      
      this._overlay.width=size_.w;
      this._overlay.height=size_.h;
      
      this.repaint();
   }
   
   lengthToWorld(val_)
   {
      return val_/this._zoomLevel/this.ppm;
   }
   
   lengthToCanvas(val_)
   {
      return Math.round(val_*this._zoomLevel*this.ppm);
   }
   
   pointToWorld(point_)
   {
      var res={};
      
      for (var key in point_)
         switch (key)
         {
            case 'x': {res[key]=(point_[key]-this._origin.x)/this._zoomLevel/this.ppm; break;}
            case 'y': {res[key]=-(point_[key]-this._origin.y)/this._zoomLevel/this.ppm; break;}   //World Y-axes pointing upward, while screen Y-axis pointing downward
         }
      
      return res;
   }
   
   pointToCanvas(point_)
   {
      var res={};
      
      for (var key in point_)
         switch (key)
         {
            case 'x': {res[key]=Math.round(point_[key]*this._zoomLevel*this.ppm+this._origin.x); break;}
            case 'y': {res[key]=Math.round(-point_[key]*this._zoomLevel*this.ppm+this._origin.y); break;}   //World Y-axes pointing upward, while screen Y-axis pointing downward
         }
      
      return res;
   }
   
   rectToWorld(rect_)
   {
      var res=this.pointToWorld(rect_);
      for (var key in rect_)
         switch (key)
         {
            case 'lb':
            case 'rt': {res[key]=this.pointToWorld(rect_[key]); break;}
            case 'w': {res[key]=this.lengthToWorld(rect_[key]); break;}
            case 'h': {res[key]=-this.lengthToWorld(rect_[key]); break;}  //World Y-axes pointing upward, while screen Y-axis pointing downward
         }
      
      return GU.rectNormalize(res);
   }
   
   rectToCanvas(rect_)
   {
      var res=this.pointToCanvas(rect_);
      for (var key in rect_)
         switch (key)
         {
            case 'lb':
            case 'rt': {res[key]=this.pointToCanvas(rect_[key]); break;}
            case 'w': {res[key]=this.lengthToCanvas(rect_[key]); break;}
            case 'h': {res[key]=-this.lengthToCanvas(rect_[key]); break;}  //World Y-axes pointing upward, while screen Y-axis pointing downward
         }
      
      return GU.rectNormalize(res,true);
   }
   
   paintCross(canvas_,pos_,style_,isCanvasCoords_)
   {
      //Paints crosshair.
      
      var context=canvas_.getContext('2d');
      
      if (!isCanvasCoords_)
         pos_=this.pointToCanvas(pos_);
      
      //Two lines making cross (initially: a point)
      var cross={
                  vert:{start:{x:pos_.x,y:pos_.y},end:{x:pos_.x,y:pos_.y}},
                  hor: {start:{x:pos_.x,y:pos_.y},end:{x:pos_.x,y:pos_.y}}
                };
      
      if (style_.radius>0)
      {
         //Set crosshair with some radius:
         var radius=(isCanvasCoords_ ? style_.radius : this.lengthToCanvas(style_.radius));
         cross.vert.start.y-=radius;
         cross.vert.end.y+=radius;
         cross.hor.start.x-=radius;
         cross.hor.end.x+=radius;
      }
      else
      {
         //Set croshair over whole canvas:
         cross.vert.start.y=0;
         cross.vert.end.y=this._overlay.height;
         cross.hor.start.x=0;
         cross.hor.end.x=this._overlay.width;
      }
      
      //Paint crosshair:
      context.beginPath();
      context.strokeStyle=style_.color;
      context.moveTo(cross.vert.start.x,cross.vert.start.y);
      context.lineTo(cross.vert.end.x,cross.vert.end.y);
      
      context.moveTo(cross.hor.start.x,cross.hor.start.y);
      context.lineTo(cross.hor.end.x,cross.hor.end.y);
      context.stroke();
   }
   
   paintCrossesGrid(canvas_,rect_,step_,style_,isCanvasCoords_)
   {
      //Paints grid from small crosses.
      
      var corners=(rect_.lb&&rect_.rt ? rect_ : GU.rectCorners(rect_,isCanvasCoords_));
      var pos={};
      
      var yStart=(isCanvasCoords_ ? corners.rt.y : corners.lb.y);
      var yEnd=(isCanvasCoords_ ? corners.lb.y : corners.rt.y)
         
      pos.y=yStart;
      do
      {
         pos.x=corners.lb.x;
         do
         {
            this.paintCross(canvas_,pos,style_,isCanvasCoords_);
            pos.x+=step_;
         }
         while (pos.x<=corners.rt.x);
         pos.y+=step_;
      }
      while (pos.y<=yEnd);
   }
   
   paintSolidGrid(canvas_,rect_,step_,style_,isCanvasCoords_)
   {
      //Paints simple grid on given canvas_ starting from start_ point with step_ regularity.
      
      console.warn('function paintSolidGrid isn\'t ready now');
   }
   
   paintRect(canvas_,rect_,style_,isCanvasCoords_)
   {
      //Paints grid from small crosses.
      var whRect=GU.rectSize(rect_,isCanvasCoords_);
      if (whRect)
      {
         whRect=(isCanvasCoords_ ? whRect : this.rectToCanvas(whRect));
      
         var context=canvas_.getContext('2d');
         
         context.beginPath();
         context.rect(whRect.x,whRect.y,whRect.w,whRect.h);
         if (style_.mode=='cut')
         {
            context.save();
            context.clip();
            context.clearRect(0,0,canvas_.width,canvas_.height);
            context.restore();
         }
         else if (style_.fill)
         {
            context.fillStyle=style_.fill;
            context.fill();
         }
         if (style_.stroke)
         {
            context.strokeStyle=style_.stroke;
            context.stroke();
         }
      }
   }
   
   paintVector(canvas_,vector_,style_,isCanvasCoords_)
   {
      //TODO: add XYWH to LB RT conversion
      if (vector_.rt&&vector_.lb)
      {
         var context=canvas_.getContext('2d');
         context.beginPath();
         var pt=(isCanvasCoords_ ? vector_.lb : this.pointToCanvas(vector_.lb));
         context.moveTo(pt.x,pt.y);
         pt=(isCanvasCoords_ ? vector_.rt : this.pointToCanvas(vector_.rt));
         context.lineTo(pt.x,pt.y);
         
         if (style_.stroke)
         {
            context.strokeStyle=style_.stroke;
            context.stroke();
         }
      }
   }
   
   paintPolyline(canvas_,points_,style_,isCanvasCoords_)
   {
      if (points_&&points_.length>1)
      {
         var context=canvas_.getContext('2d');
         
         context.beginPath();
         var pt=(isCanvasCoords_ ? points_[0] : this.pointToCanvas(points_[0]));
         context.moveTo(pt.x,pt.y);
         for (var i=1;i<points_.length;i++)
         {
            pt=(isCanvasCoords_ ? points_[i] : this.pointToCanvas(points_[i]));
            context.lineTo(pt.x,pt.y);
         }
         
         style_.mode=(GU.isNormalsOutside(points_) ? 'add' : 'cut');
         
         if (style_.fill||style_.closed||style_.mode=='cut')
            context.closePath();
         
         if (style_.mode=='cut')
         {
            context.save();
            context.clip();
            context.clearRect(0,0,canvas_.width,canvas_.height);
            context.restore();
         }
         else if (style_.fill)
         {
            context.fillStyle=style_.fill;
            context.fill();
         }
         if (style_.stroke)
         {
            context.strokeStyle=style_.stroke;
            context.stroke();
         }
         
         if (style_.markPoints)
            for (var i=0;i<points_.length;i++)
            {
               pt=(isCanvasCoords_ ? points_[i] : this.pointToCanvas(points_[i]));
               this.paintCross(canvas_,pt,{radius:7,color:(i==0 ? 'lime' : i==points_.length-1 ? 'orange' : 'yellow')},true);
            }
      }
   }
   
   paintVertCoords(canvas_,figures_)
   {
      figures_=((figures_ instanceof Array)||(figures_[Symbol.iterator]) ? figures_ : (figures_ ? [figures_] : []));
      if (figures_.length>0)
      {
         var context=canvas_.getContext('2d');
         var color='#646464';
         var textSize=Math.max(Math.floor(Math.min(8+(150*this._zoomLevel),40)*0.75),9);  //px - text size
         var textOffs=2+Math.min(Math.floor(50*this._zoomLevel),5);   //px - text offset above line
         context.fillStyle=color;
         context.font=textSize+'px sans-serif';
         
         for (var figure of figures_)
         {
            var points=[];
            var center=false;
            switch (figure.type)
            {
               case 'polyline':
               {
                  points=figure.points;
                  var box=GU.pointsBoundingBox(figure.points);
                  if (box)
                     center=GU.midPoint(box.lb,box.rt);
                  
                  break;
               }
               case 'compound':
               {
                  for (var subPts of figure.polyLines)
                     points=points.concat(subPts);
                  
                  var box=GU.pointsBoundingBox(points);
                  if (box)
                     center=GU.midPoint(box.lb,box.rt);
                  
                  break;
               }
               case 'rect':
               default:
               {
                  var rect=(figure.rect ? figure.rect : figure);
                  if (GU.rectType(rect))
                  {
                     points.push(rect.lb);
                     points.push({x:rect.lb.x,y:rect.rt.y});
                     points.push(rect.rt);
                     points.push({x:rect.rt.x,y:rect.lb.y});
                     var rect=GU.rectCorners(rect);
                     if (rect)
                        center=GU.midPoint(rect.lb,rect.rt);
                  }
               }
            }
            
            if (points&&points.length>0&&center)
               for (var pt of points)
               {
                  //Position the text near the point
                  context.textAlign=(pt.x<center.x ? 'right' : (pt.x==center.x ? 'center' : 'left'));
                  var xOffs=(pt.x<center.x ? -textOffs : (pt.x==center.x ? 0 : textOffs));
                  var yOffs=(pt.y<center.y ? textOffs+textSize : (pt.y==center.y ? 0 : -textOffs));
                  
                  //Draw coordinates
                  var pos=this.pointToCanvas(pt);
                  context.fillText('('+GU.roundVal(pt.x)+','+GU.roundVal(pt.y)+')',pos.x+xOffs,pos.y+yOffs);
               }
         }
      }
   }
   
   paintSizes(canvas_,figures_)
   {
      figures_=((figures_ instanceof Array)||(figures_[Symbol.iterator]) ? figures_ : (figures_ ? [figures_] : []));
      
      //Collect bounding boxes
      var boxes=[];
      for (var figure of figures_)
      {
         switch (figure.type)
         {
            case 'polyline':
            {
               var box=GU.pointsBoundingBox(figure.points);
               if (box)
                  boxes.push({box:box,type:'polyline'});
               
               break;
            }
            case 'compound':
            {
               for (var points of figure.polyLines)
               {
                  var box=GU.pointsBoundingBox(points);
                  if (box)
                     boxes.push({box:box,type:'polyline'});
               }
               
               break;
            }
            case 'rect':
            default:
            {
               var rect=(figure.rect ? figure.rect : figure);
               if (GU.rectType(rect))
               {
                  box=GU.rectCorners(rect);
                  boxes.push({box:box,type:'rect'});
               }
            }
         }
      }
      
      if (boxes.length>0)
      {
         var context=canvas_.getContext('2d');
         var color='#646464';
         var extLen=Math.floor(Math.min(12+(150*this._zoomLevel),40));  //px - length of extension lines
         var sizeOffs=1+Math.floor(extLen/6);   //px - offset of size line
         var textSize=Math.max(Math.floor(extLen*0.75),10);  //px - text size
         var textOffs=2+Math.min(Math.floor(50*this._zoomLevel),5);   //px - text offset above line
         var arrowL=12;    //px - size line arrow length
         var arrowW=4;     //px - half of sihe line arrow width
         console.log('extLen',extLen);
         context.strokeStyle=color;
         context.fillStyle=color;
         context.font=textSize+'px sans-serif';
         context.textAlign='center';
         
         for (var box of boxes)
         {
            var size=GU.rectSize(box.box);
            box.box=this.rectToCanvas(box.box);
            //Paint W --------------------
            var x1=box.box.lb.x;
            var x2=box.box.rt.x;
            var y1=(box.type=='polyline' ? box.box.rt.y+Math.abs(box.box.rt.y-box.box.lb.y)/2 : box.box.rt.y);
            var y2=box.box.rt.y-extLen;
            
            //Extension lines
            context.beginPath();
            context.moveTo(x1,y1);
            context.lineTo(x1,y2);
            context.moveTo(x2,y1);
            context.lineTo(x2,y2);
            
            //Size line
            if (Math.abs(box.box.rt.x-box.box.lb.x)<arrowL*3)
            {
               x1-=arrowL;
               x2+=arrowL;
            }
            y2+=sizeOffs;
            context.moveTo(x1,y2);
            context.lineTo(x2,y2);
            
            context.stroke();
            
            //Arrows
            
            
            //Text
            context.fillText(GU.roundVal(size.w)+'m',x1+Math.abs(x2-x1)/2,y2-textOffs);
            
            //Paint H --------------------
            var x1=(box.type=='polyline' ? box.box.lb.x+Math.abs(box.box.rt.x-box.box.lb.x)/2 : box.box.lb.x);
            var x2=box.box.lb.x-extLen;
            var y1=box.box.lb.y;
            var y2=box.box.rt.y;
            
            //Extension lines
            context.beginPath();
            context.moveTo(x1,y1);
            context.lineTo(x2,y1);
            context.moveTo(x1,y2);
            context.lineTo(x2,y2);
            
            //Size line
            if (Math.abs(box.box.rt.x-box.box.lb.x)<arrowL*3)
            {
               y1-=arrowL;
               y2+=arrowL;
            }
            x2+=sizeOffs;
            context.moveTo(x2,y1);
            context.lineTo(x2,y2);
            
            context.stroke();
            
            //Text
            x2-=textOffs;
            y2+=Math.abs(y2-y1)/2;
            context.moveTo(x2,y2);
            context.save();
            context.translate(x2,y2);
            context.rotate(-Math.PI/2);
            context.fillText(GU.roundVal(size.h)+'m',0,0);
            context.rotate(Math.PI/2);
            context.translate(-x2,-y2);
            context.restore();
            
         }
      }
   }
   
   repaintUnderlay()
   {
      //Clear all
      var context=this._underlay.getContext('2d');
      context.fillStyle=this.background;
      context.fillRect(0,0,this._overlay.width,this._overlay.height);
      
      //Paint grid
      if (this.showGrid)
      {
         //Get proper grid density
         var step=this.gridSize;
         var factor=1;
         var wuMinSpacing=this.lengthToWorld(this.gridStyle.minSpacing); //min grid minSpacing in real world units
         while (step<wuMinSpacing)        //Iteratively increase step 
         {
            factor*=this.gridStyle.factor;
            step*=this.gridStyle.factor;  // until it reach or excceed minimum
         }
         
         //Get grid point nearest to the canvas top left corner
         var gridRect=this.snapToGrid(this.visibleWorld,factor);
         if (this.gridStyle.radius>0)
            this.paintCrossesGrid(this._underlay,gridRect,step,{radius:this.lengthToWorld(this.gridStyle.radius),color:this.gridStyle.color});
         else
            this.paintSolidGrid(this._underlay,gridRect,step,{radius:-1,color:this.gridStyle.color});
      }
      
      //Paint axes
      if (this.showAxes)
      {
         var pos=this.pointToCanvas({x:0,y:0});
         if ((pos.x>=0&&pos.x<=this._underlay.width)||(pos.y>=0&&pos.y<=this._underlay.height))
         {
            this.paintCross(this._underlay,pos,this.axesStyle,true);
            context.fillStyle=this.axesStyle.textColor;
            context.font='bold 14px sans-serif';
            context.textAlign='right';
            context.fillText('X',this._underlay.width-10,pos.y+5+14);  //5px fron axis line, 10px from viewport right
            context.fillText('Y',pos.x-5,10+14); //5px fron axis line, 10px from viewport top
         }
      }
   }
   
   repaintOverlay()
   {
      //Clear all
      var context=this._overlay.getContext('2d');
      context.clearRect(0,0,this._overlay.width,this._overlay.height);
      
      //Paint normals
      //if (this.showNormals)
      //{
      //   for (var i=0;i<this.figure.points.length-1;i++)
      //      if (!GU.ptCmp(this.figure.points[i],this.figure.points[i+1]))
      //      {
      //         var mid=GU.midPoint(this.figure.points[i],this.figure.points[i+1]);
      //         var normal=GU.vectorNormal({lb:mid,rt:this.figure.points[i+1]},0.1);
      //         this.parent.paintVector(overlay_,normal,{stroke:'cyan'});
      //         this.parent.paintCross(overlay_,normal.lb,{radius:this.parent.lengthToWorld(3),color:'cyan'});
      //      }
      //}
      
      //Paint sizes
      if (this.showSizes)
         this.paintSizes(this._overlay,(this.showSizes==2 ? this.figuresIt : this.selectionIt));
      
      //Paint verticle coords
      if (this.showVertCoords)
         this.paintVertCoords(this._overlay,(this.showVertCoords==3 ? this.figuresIt : (this.showVertCoords==2 ? this.selectionIt : this.figuresAtPoint(this._cursor))));
      
      //Tool paint overlay
      if (this.activeTool&&this.activeTool.onRepaintOverlay)
         this.activeTool.onRepaintOverlay(this._overlay);
      
      //Cursor
      this.paintCross(this._overlay,this.cursor,this.crosshairStyle);
   }
   
   repaintCanvas()
   {
      //Clear all
      var context=this._canvas.getContext('2d');
      context.clearRect(0,0,this._canvas.width,this._canvas.height);
      
      switch (this.compoundFigure?.type)
      {
         case 'rect':
         {
            this.paintRect(this._canvas,this.compoundFigure.rect,this.compoundFigure.style);
            break;
         }
         case 'polyline':
         {
            this.paintPolyline(this._canvas,this.compoundFigure.points,this.compoundFigure.style);
            break;
         }
         case 'compound':
         {
            context.save();
            for (var points of this.compoundFigure.polyLines)
               this.paintPolyline(this._canvas,points,this.compoundFigure.style);
            context.restore();
            break;
         }
      }
   }
   
   repaint()
   {
      this.repaintUnderlay();
      this.repaintCanvas();
      this.repaintOverlay();
   }
   
   refreshStatusbar()
   {
      if (this._statusBar.zoomBox)
         this._statusBar.zoomBox.innerHTML=new Number(this._zoomLevel*100).toFixed(3)+'%';
      if (this._statusBar.xBox)
         this._statusBar.xBox.innerHTML=new Number(this._cursor.x/this.unitsFactor).toFixed(this.precision);
      if (this._statusBar.yBox)
         this._statusBar.yBox.innerHTML=new Number(this._cursor.y/this.unitsFactor).toFixed(this.precision);
   }
   
   //public methods
   snapToFigures(pt_)
   {
      //Snap real world point to nearest point amongst figure verticles.
      
      var res=false;
      
      var rad=this.lengthToWorld(8);
      var rnbh={lb:{x:pt_.x-rad,y:pt_.y-rad},rt:{x:pt_.x+rad,y:pt_.y+rad}}; //Rectangular neighbourhood
      var points;
      var indx=-1;
      
      var i=0;
      while ((indx<0)&&(i<this._figures.length))
      {
         switch (this._figures[i].type)
         {
            case 'rect':
            {
               points=GU.outlineRect(this._figures[i].rect);
               indx=points.findIndex((point_)=>GU.isPointInNormalRect(point_,rnbh));
               
               break;
            }
            case 'polyline': 
            {
               points=this._figures[i].points;
               indx=points.findIndex((point_)=>GU.isPointInNormalRect(point_,rnbh));
               
               break;
            }
            case 'compound':
            {
               var l=0;
               while ((indx<0)&&(l<this._figures[i].polyLines.length))
               {
                  points=this._figures[i].polyLines[l];
                  indx=points.findIndex((point_)=>GU.isPointInNormalRect(point_,rnbh));
                  
                  l++;
               }
               
               break;
            }
         }
         
         i++;
      }
      
      if (indx>-1)
      {
         res=true;
         pt_.x=points[indx].x;
         pt_.y=points[indx].y;
      }
      
      return res;
   }
   
   snapToGrid(point_,factor_)
   {
      //Snap real world point to grid.
      //NOTE: rect {x,y,w,h} is also acceptable.
      
      var res=point_;
      var remainder;
      var snapSize=(isNaN(factor_) ? this.gridSize : this.gridSize*factor_);
      
      remainder=res.x/snapSize;
      remainder-=Math.round(remainder);
      res.x=(Math.abs(remainder)<0.5 ? res.x-remainder*snapSize : res.x+remainder*snapSize);
      
      remainder=res.y/snapSize;
      remainder-=Math.round(remainder);
      res.y=(Math.abs(remainder)<0.5 ? res.y-remainder*snapSize : res.y+remainder*snapSize);
      
      return GU.roundPoint(res);
   }
   
   pan(delta_,isCanvasCoords_)
   {
      this._origin=GU.moveRect(this._origin,(isCanvasCoords_ ? delta_ : {x:this.lengthToCanvas(delta_.x),y:this.lengthToCanvas(delta_.y)}));
      
      this.repaint();
      this.refreshStatusbar();
   }
   
   zoomIn(factor_)
   {
      this.zoom=this.zoom*factor_;
   }
   
   fitToViewport(figures_)
   {
      var bBox=this.boundingBox(figures_);
      //console.log(bBox,figures_);
      if (bBox)
      {
         //Add some padding
         var vect=GU.rectVect(bBox);
         vect.w=vect.w*1.1;
         vect.h=vect.h*1.1;
         vect.x-=vect.w*0.05;
         vect.y-=vect.h*0.05;
         
         var lb=this.pointToCanvas(vect);
         this._origin=GU.moveRect(this._origin,{x:-lb.x,y:this._canvas.height-lb.y});
         this._zoomLevel*=Math.min(this.lengthToWorld(this._canvas.width)/vect.w,this.lengthToWorld(this._canvas.height/vect.h));
         this.repaint();
      }
   }
   
   list()
   {
      //Returns a copy of figures array.
      
      return Array.from(this._figures);
   }
   
   at(index_)
   {
      //Returns figure by index.
      
      return this._figures[index_];
   }
   
   indexOf(fig_)
   {
      //Returns index of a figure.
      
      return this._figures.indexOf(fig_);
   }
   
   filter(/*Array.filter() args*/)
   {
      return this._figures.filter(...arguments);
   }
   
   map(/*Array.map() args*/)
   {
      return this._figures.map(...arguments);
   }
   
   flatMap(/*Array.flatMap() args*/)
   {
      return this._figures.flatMap(...arguments);
   }
   
   reduce(/*Array.reduce() args*/)
   {
      return this._figures.reduce(...arguments);
   }
   
   some(/*Array.some() args*/)
   {
      return this._figures.some(...arguments);
   }
   
   append(...figs_)
   {
      //Appends figures.
      
      this._figures.push(...figs_);
      
      this._compoundFigureCache=null;
      this.repaint();
   }
   
   splice(startIndex_,deleteCount_,...figs_)
   {
      //Replaces figures.
      
      let removed=this._figures.splice(startIndex_,deleteCount_,...figs_);
      for (let fig of removed)
         this.deselect(fig);
      
      this._compoundFigureCache=null;
      this.repaint();
      
      return removed;
   }
   
   clear()
   {
      //Removes all figures.
      
      this._figures=[];
      this._selection=[];
      this._compoundFigureCache=null;
      this.repaint();
   }
   
   reorderFigures(figures_,shift_)
   {
      //Raise/lower figures
      
      figures_=((figures_ instanceof Array)||(figures_[Symbol.iterator]) ? figures_ : (figures_ ? [figures_] : []));
      if (figures_.length>0&&shift_!=0)
      {
         for (var figure of figures_)
         {
            var indx=this._figures.indexOf(figure);
            if ((indx>-1)&&((shift_<0&&(indx+shift_>=0))||(shift_>0)))
            {
               this._figures.splice(indx,1);
               this._figures.splice(indx+shift_,0,figure);
            }
         }
         this._compoundFigureCache=null;
         this.repaint();
      }
   }
   
   boundingBox(figures_,assignLocal_)
   {
      //Calc boundung box of single or multiple figures
   
      var res=null;
      //console.log('boundingBox: figures_',figures_);
      
      var figArr=((figures_ instanceof Array)||(figures_[Symbol.iterator]) ? figures_ : [figures_]);
      //console.log('figArr',figArr);
      
      for (var figure of figArr)
         switch (figure.type)
         {
            case 'polyline':
            {
               var subBox=GU.pointsBoundingBox(figure.points);
               if (subBox)
               {
                  if (!res)
                     res=structuredClone(subBox);
                  else
                     res=GU.appendBoundingBox(res,subBox);
                  
                  if (assignLocal_)
                     figure.bBox=structuredClone(subBox);
               }
               
               break;
            }
            case 'compound':
            {
               var cBox=null;
               for (var points of figure.polyLines)
                  if (GU.isNormalsOutside(points))
                  {
                     var subBox=GU.pointsBoundingBox(points);
                     if (!cBox)
                        cBox=structuredClone(subBox);
                     else
                        cBox=GU.appendBoundingBox(cBox,subBox);
                  }
               
               if (cBox)
               {
                  if (!res)
                     res=structuredClone(cBox);
                  else
                     res=GU.appendBoundingBox(res,cBox);
                  
                  if (assignLocal_)
                     figure.bBox=structuredClone(cBox);
               }
               
               break;
            }
            case 'rect':
            default:
            {
               var rect=(figure.rect ? figure.rect : figure);
               if (GU.rectType(rect))
               {
                  rect=GU.rectCorners(rect);
                  
                  if (!res)
                     res=structuredClone(rect);
                  else
                     res=GU.appendBoundingBox(res,rect);
                  
                  if (assignLocal_)
                     figure.bBox=structuredClone(rect);
               }
            }
         }
      
      return res;
   }
   
   moveFigures(figures_,delta_)
   {
      figures_=((figures_ instanceof Array)||(figures_[Symbol.iterator]) ? figures_ : (figures_ ? [figures_] : []));
      if ((delta_.x!=0||delta_.y!=0))
      {
         for (var figure of figures_)
            switch (figure.type)
            {
               case 'rect':
               {
                  figure.rect=GU.moveRect(figure.rect,delta_);
                  break;
               }
               case 'polyline':
               {
                  for (var i=0;i<figure.points.length;i++)
                     figure.points[i]=GU.moveRect(figure.points[i],delta_);
                  
                  break;
               }
               case 'compound':
               {
                  for (var points of figure.polyLines)
                     for (var i=0;i<points.length;i++)
                        points[i]=GU.moveRect(points[i],delta_);
               }
            }
         this._compoundFigureCache=null;
         this.repaint();
      }
   }
   
   isPointInside(pt_,figure_)
   {
      //Detects is a point into the figure or the rect.
      //NOTE: function returns boolean true if piont is inside, boolean false if point is outside and 0 if point is on the border.
      
      var res=false;
      
      switch (figure_.type)
      {
         case 'polyline':
         {
            res=GU.isPointInPolyline(pt_,figure_.points);
            break;
         }
         case 'compound':
         {
            for (var points of figure_.polyLines)
            {
               res=GU.isPointInPolyline(pt_,points);
               if (res)
                  break;
            }
            break;
         }
         case 'rect':
         default:
         {
            var rect=(figure_.rect ? figure_.rect : figure_);
            res=GU.isPointInRect(pt_,rect);
         }
      }
      
      return res;
   }
   
   unionPolylines(polylines_)
   {
      //Make a union from several polylines
      if (polylines_&&polylines_.length>1)
      {
         for (var i=0;i<polylines_.length-1;i++)
            for (var k=i+1;k<polylines_.length;k++)
               if (polylines_[i]&&polylines_[k])
               {
                  //console.log(i,k);
                  var buff=GU.intersectPolyLines(polylines_[i],polylines_[k],'union');
                  if (buff.length>0)
                     polylines_[i]=buff[0];
                  if (buff.length>1)
                     polylines_[k]=buff[1];
                  else
                     polylines_[k]=null;
               }
         for (var i=0;i<polylines_.length;i++)
            if (polylines_[i]===null)
            {
               polylines_.splice(i,1);
               i--;
            }
      }
      
      return polylines_;
   }
   
   intersectFigures(aFigures_,bFigures_,mode_)
   {
      var res=null;
      
      var aPs=[];
      var bPs=[];
      
      aFigures_=(aFigures_ instanceof Array ? aFigures_ : [aFigures_]);
      bFigures_=(bFigures_ instanceof Array ? bFigures_ : [bFigures_]);
      for (var figure of aFigures_)
         switch (figure.type)
         {
            case 'rect':      {aPs.push(GU.outlineRect(figure.rect)); break;}
            case 'polyline' : {aPs.push(figure.points); break;}
            case 'compound' : {aPs=aPs.concat(figure.polyLines); break;}
         }
      for (var figure of bFigures_)
         switch (figure.type)
         {
            case 'rect':      {bPs.push(GU.outlineRect(figure.rect)); break;}
            case 'polyline' : {bPs.push(figure.points); break;}
            case 'compound' : {bPs=bPs.concat(figure.polyLines); break;}
         }
      
      //At first extract all cutting figures
      var cutLines=[];
      for (var i=0;i<aPs.length;i++)
         if (!GU.isNormalsOutside(aPs[i]))
         {
            cutLines.push(aPs.splice(i,1)[0].reverse());
            i--;
         }
      if (mode_=='cut'||mode_=='diff')
      {
         for (var i=0;i<bPs.length;i++)
            if (!GU.isNormalsOutside(bPs[i]))
               cutLines.push(bPs[i].reverse());
            else
               cutLines.push(bPs[i]);
         
         bPs=[];
      }
      else
         for (var i=0;i<bPs.length;i++)
            if (!GU.isNormalsOutside(bPs[i]))
            {
               cutLines.push(bPs.splice(i,1)[0].reverse()); //turn cutLines to positive
               i--;
            }
      
      aPs=this.unionPolylines(aPs);
      bPs=this.unionPolylines(bPs);
      
      //Then apply intersection other than cut/diff
      if (!(mode_=='cut'||mode_=='diff'))
      {
         var buff=[];
         for (var aP of aPs)
            for (var bP of bPs)
               buff=buff.concat(GU.intersectPolyLines(aP,bP,mode_));
         
         aPs=this.unionPolylines(buff);
      }
      
      if (cutLines.length>0)
      {
         cutLines=this.unionPolylines(cutLines);
         //console.log('Cut: aPs',structuredClone(aPs),'cutLines',structuredClone(cutLines));
         
         var remained=[];
         var pass=0;
         for (var cut of cutLines)
         {
            //console.log('pass',pass);
            var passRes=[];
            for (var i=0;i<aPs.length;i++)
            {
               var buff=GU.intersectPolyLines(aPs[i],cut,'diff');
               //console.log(i,'buff',buff,' from',aPs[i],cut);
               if (buff.length==2&&(buff[0]==aPs[i])&&(buff[1]==cut))   //if the cut is inside aPs[i]
               {
                  passRes.push(buff[0]);
                  //console.log('rem');
                  if (!remained.includes(cut))
                     remained.push(cut);
               }
               else
                  passRes=passRes.concat(buff);
            }
            aPs=passRes;
            pass++;
         }
         //Append remained cut lines
         for (var rem of remained)
            aPs.push(rem);
      }
      
      //console.log('aPs:',structuredClone(aPs));
      
      if (aPs.length==1)
         res={type:'polyline',points:aPs[0],style:structuredClone(aFigures_[0].style)};
      else if (aPs.length>1)
         res={type:'compound',polyLines:aPs,style:structuredClone(aFigures_[0].style)};
      //console.log('res:',structuredClone(res));
      
      return res;
   }
   
   figuresAtPoint(point_,limit_)
   {
      var res=[];
      
      limit_=(!limit_||limit_<0 ? limit_=this._figures.length : limit_);   //Negative, 0 or undefined limit - is no limit.
      
      for (var i=this._figures.length-1;i>=0;i--)
         if (this.isPointInside(point_,this._figures[i])!==false)
         {
            res.push(this._figures[i]);
            limit_--;
            if (limit_==0)
               break;
         }
      
      return res;
   }
   
   deselect(figures_)
   {
      //Remove figures from selection
      
      figures_ =((figures_ instanceof Array)||(figures_[Symbol.iterator]) ? figures_ : [figures_ ]);
      
      for (var figure of figures_)
      {
         var indx=this._selection.indexOf(figure);
         if (indx>-1)
            this._selection.splice(indx,1);
      }
      
      this.repaintOverlay();
   }
   
   deselectAll()
   {
      this._selection=[];
      
      this.repaintOverlay();
   }
   
   select(figures_)
   {
      //Add figure[s] to selection
      
      figures_ =(figures_ instanceof Array ? figures_ : [figures_ ]);
      for (var figure of figures_)
      {
         var indx=this._selection.indexOf(figure);       //Don't select figures already selected.
         if (indx<0)                                     //NOTE: Some functions like intersectFigures() are dependent on order of figures in selection, thus need to avoid of reordering if user will mistakenly select a figure multiple times.
            this._selection.push(figure);
      }
      
      this.repaintOverlay();
   }
   
   selectionAt(indx_)
   {
      return this._selection[indx_];
   }
   
   selectAll()
   {
      this._selection=[].concat(this._figures);
      
      this.repaintOverlay();
   }
   
   onResize(e_)
   {
      this.resize();
      
      //Call tool listener
      if (this.activeTool&&this.activeTool.onResize)
         this.activeTool.onResize(e_);
   }
   
   onKeyPress(e_)
   {
      //var ret=true;
      //
      ////Call tool listener
      //if (this.activeTool&&this.activeTool.onKeyPress)
      //   ret=this.activeTool.onKeyPress(e_);
      //
      //if (ret===false)
      //   return cancelEvent(e_);
   }
   
   onKeyDown(e_)
   {
      //var ret=true;
      //
      //switch (e_.key)
      //{
      //   case ' '://Spacebar
      //   {
      //      var delta={x:-this.cursor.x,y:-this.cursor.y};
      //      this.moveFigures(this._figures,delta);
      //      delta.x=-delta.x;
      //      delta.y=delta.y;
      //      this.pan(delta);
      //      this.cursor={x:0,y:0};
      //      
      //      ret=false;
      //   }
      //}
      //
      ////Call tool listener
      //if (this.activeTool&&this.activeTool.onKeyDown)
      //   ret=(this.activeTool.onKeyDown(e_)!==false)&&ret;
      //
      //console.log('ret',ret);
      //if (ret===false)
      //   return cancelEvent(e_);
   }
   
   onKeyUp(e_)
   {
      //var ret=true;
      //
      ////Call tool listener
      //if (this.activeTool&&this.activeTool.onKeyUp)
      //   ret=this.activeTool.onKeyUp(e_);
      //
      //if (ret===false)
      //   return cancelEvent(e_);
   }
   
   onMouseMove(e_)
   {      
      //if (!((e_.buttons&0b100)||(this._panTool&&(e_.buttons&0b001))))
      //   this._panStart=null;
      //
      //if (this._panStart)
      //{
      //   var delta={x:e_.layerX-this._panStart.x,y:e_.layerY-this._panStart.y};
      //   this._panStart={x:e_.layerX,y:e_.layerY};
      //   this.pan(delta,true);
      //}
      //else
      //   this.setCursor({x:e_.layerX,y:e_.layerY},true);
      //
      ////Call tool listener
      //if (!this._panTool)
      //   if (this.activeTool&&this.activeTool.onMouseMove)
      //      this.activeTool.onMouseMove(e_);
      //
      //return cancelEvent(e_);
   }
   
   onClick(e_)
   {
      //Show message about that the viewport is viewonly.
      var mess=document.getElementById('viewport_inactive_message');
      if (!mess)
      {
         this._paintBox.style.display='flex';
         this._paintBox.style.flexFlow='row';
         this._paintBox.style.justifyContent='center';
         this._paintBox.style.alignItems='center';
         mess=buildNodes({tagName:'div',id:'viewport_inactive_message',style:{padding:'1em 0.75em',color:'#175EB6',fontWeight:'bold',textAlign:'center',background:'none #FFFFFF',boxShadow:'5px 5px 10px rgba(0,0,0,0.6)',zIndex:10},textContent:'Заполните, пожалуйста, поля справа ',childNodes:[{tagName:'span',style:{fontSize:'300%',verticalAlign:'middle',color:'#175EB6'},textContent:'➧'}]});
         this._paintBox.appendChild(mess);
      }
      else
         mess.classList.remove('hidden');
      
      var sender=this;
      if (this.__interval)
         clearInterval(this.__interval);
      
      this.__interval=setTimeout(function(){var mess=document.getElementById('viewport_inactive_message'); if (mess) mess.classList.add('hidden');},3000);
      ////Call tool listener
      //if (this.activeTool&&this.activeTool.onClick)
      //   this.activeTool.onClick(e_);
      //
      //return cancelEvent(e_);
   }
   
   onMouseDown(e_)
   {
      //if ((e_.buttons&0b100)||(this._panTool&&(e_.buttons&0b001)))
      //   this._panStart={x:e_.layerX,y:e_.layerY};
      //
      ////Call tool listener
      //if (!this._panTool)
      //   if (this.activeTool&&this.activeTool.onMouseDown)
      //      this.activeTool.onMouseDown(e_);
      //
      //return cancelEvent(e_);
   }
   
   onMouseUp(e_)
   {
      //if ((e_.button==1)||(this._panTool&&(e_.button==0)))
      //   this._panStart=null;
      //
      ////Call tool listener
      //if (!this._panTool)
      //   if (this.activeTool&&this.activeTool.onMouseUp)
      //      this.activeTool.onMouseUp(e_);
      //   
      //return cancelEvent(e_);
   }
   
   onWheel(e_)
   {
      //var ort=Math.sign(e_.deltaY);
      //this.zoom=this.zoom*(ort<0 ? this.zoomStep : 1/this.zoomStep);
      //
      ////Call tool listener
      //if (this.activeTool&&this.activeTool.onWheel)
      //   this.activeTool.onWheel(e_);
      //
      //return cancelEvent(e_);
   }
   
   getToolByName(name_)
   {
      var res=null;
      
      for (var tool of this._tools)
         if (tool.name&&tool.name==name_)
         {
            res=tool;
            break;
         }
      
      return res;
   }
}
