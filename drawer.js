class Drawer
{
   constructor(params_)
   {
      //private props
      this._mainBox=null;   //Main container
      this._paintBox=null;  //Container of canvases
      this._statusBar={};   //Cells for displaying status
      this._overlay=null;   //Tools overlay canvas
      this._canvas=null;    //Main drawing canvas
      this._underlay=null;  //Grid,etc canvas
      
      this._zoomLevel=0.05;
      this._origin={x:100,y:100};    //Offset of the wrold origin on the canvas (px)
      this._tools=[];                //Toolset
      this._activeTool=null;         //Pointer to active tool
      this._panTool=null;            //Dynamic pointer to pan tool
      this._cursor={x:0,y:0};        //Cursor real world position
      this._panStart=null;           //Start point of panning
      
      this._figures=[];     //Array of drawed figures
      this._selection=[];   //Array of selected figures
      
      //public props
      this.style={stroke:'#1A5EB3',fill:'#C8D3E6'};                                 //Drawing style (current FG and BG colors)
      this.crosshairStyle={radius:-1,color:'rgba(56,80,125,1)'};                    //Crosshair style
      this.gridStyle={radius:3,minSpacing:10,factor:10,color:'rgba(0,0,0,0.15)'};   //Grid style
      this.axesStyle={radius:-1,color:'rgba(200,211,248,1)'};                       //Axes style
      this.background='#FFFFFF';                                                    //Background
      this.zoomStep=2;        //Step of zoom
      this.gridSize=0.1;      //Grid size in meters
      this.snap=true;         //Snap cursor to grid
      this.showGrid=true;     //Grid visibility.
      this.showAxes=true;     //Axes visibility.
      this.showNormals=false; //Show normals of polyline segments
      this.showSizes=1;       //Show sizes of: 1 - selected figures, 2 - all figures
      this.precision=3;       //Precision of displaying values
      this.ppm=81/25.4*1000;  //Scaling factor (px per meter)
      this.unitsFactor=1;     //Native units is a meters. unitsFactor allows to display values in mm, cm, km etc.
      
      //initialization
      if (params_.mainBox)
      {
         //Bind to DOM
         this._mainBox=params_.mainBox;
         this._paintBox=this._mainBox.querySelector('.paintbox');
         this._toolBox=this._mainBox.querySelector('.toolbox');
         
         if (this._paintBox)
         {
            //Create canvases
            this._underlay=document.createElement('canvas');
            this._paintBox.appendChild(this._underlay);
            
            this._canvas=document.createElement('canvas');
            this._paintBox.appendChild(this._canvas);
            
            this._overlay=document.createElement('canvas');
            this._paintBox.appendChild(this._overlay);
            
            //Setup statusbar
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
            
            //Assign listeners
            var sender=this;//closure
            window.addEventListener('resize'   ,function(e_){sender.onResize(e_);});
            window.addEventListener('keypress' ,function(e_){sender.onKeyPress(e_);}); 
            window.addEventListener('keydown'  ,function(e_){sender.onKeyDown(e_);});
            window.addEventListener('keyup'    ,function(e_){sender.onKeyUp(e_);});
            this._overlay.addEventListener('mousemove',function(e_){sender.onMouseMove(e_);});
            this._overlay.addEventListener('click'    ,function(e_){sender.onClick(e_);});
            this._overlay.addEventListener('mousedown',function(e_){sender.onMouseDown(e_);});
            this._overlay.addEventListener('mouseup'  ,function(e_){sender.onMouseUp(e_);});
            this._overlay.addEventListener('wheel'    ,function(e_){sender.onWheel(e_);});
            
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
         }
         else
            console.error('No paintBox');
      }
      else
         console.error('No mainBox');
   }
   
   get cursor()
   {
      return clone(this._cursor);
   }
   set cursor(pos_)
   {
      this.setCursor(pos_);
   }
   
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
      this._cursor=roundPoint(this._cursor);
      
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
         if ((tool_ instanceof HandPanTool)&&(this._activeTool instanceof CalcTool))
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
   
   get figures(){return this._figures;}
   getFigures()
   {
      //Copy list of figures
      var res=[];
      
      for (var figure of this._figures)
         res.push(figure);
      
      return res;
   }
   
   get selection(){return this._selection;}
   getSelection()
   {
      //Copy current selection list
      var res=[];
      
      for (var figure of this._selection)
         res.push(figure);
      
      return res;;
   }
   
   get viewportRect()
   {
      return {x:0,y:0,w:this._overlay.width,h:this._overlay.height};  //NOTE: underlay, canvas and overlay MUST have equal position and size anyway.
   }
   
   get visibleWorld()
   {
      return this.rectToWorld(this.viewportRect);   //Get rect of wisible part of the world
   }
   
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
      
      return rectNormalize(res);
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
      
      return rectNormalize(res,true);
   }
   
   paintCross(canvas_,pos_,style_,isCanvasCoords_)
   {
      //Paints crosshair
      
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
         //Set crosshair with some radius
         var radius=(isCanvasCoords_ ? style_.radius : this.lengthToCanvas(style_.radius));
         cross.vert.start.y-=radius;
         cross.vert.end.y+=radius;
         cross.hor.start.x-=radius;
         cross.hor.end.x+=radius;
      }
      else
      {
         //Set croshair over whole canvas
         cross.vert.start.y=0;
         cross.vert.end.y=this._overlay.height;
         cross.hor.start.x=0;
         cross.hor.end.x=this._overlay.width;
      }
      
      //Paint crosshair
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
      //Paint grid from small crosses
      
      var corners=(rect_.lb&&rect_.rt ? rect_ : rectCorners(rect_,isCanvasCoords_));
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
      //Paints simple grid on given canvas_ starting from start_ point with step_ regularity
      
      console.warn('function paintSolidGrid isn\'t ready now');
   }
   
   paintRect(canvas_,rect_,style_,isCanvasCoords_)
   {
      //Paint grid from small crosses
      var whRect=rectSize(rect_,isCanvasCoords_);
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
         
         style_.mode=(isNormalsOutside(points_) ? 'add' : 'cut');
         
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
   
   paintSizes(canvas_,figures_)
   {
      figures_=(figures_ instanceof Array ? figures_ : (figures_ ? [figures_] : []));
      
      //Collect bounding boxes
      var boxes=[];
      for (var figure of figures_)
      {
         switch (figure.type)
         {
            case 'polyline':
            {
               var box=pointsBoundingBox(figure.points);
               if (box)
                  boxes.push({box:box,type:'polyline'});
               
               break;
            }
            case 'compound':
            {
               for (var points of figure.polyLines)
               {
                  var box=pointsBoundingBox(points);
                  if (box)
                     boxes.push({box:box,type:'polyline'});
               }
               
               break;
            }
            case 'rect':
            default:
            {
               var rect=(figure.rect ? figure.rect : figure);
               if (rectType(rect))
               {
                  box=rectCorners(rect);
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
            var size=rectSize(box.box);
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
            context.fillText(roundVal(size.w)+'m',x1+Math.abs(x2-x1)/2,y2-textOffs);
            
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
            context.fillText(roundVal(size.h)+'m',0,0);
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
            this.paintCross(this._underlay,pos,this.axesStyle,true);
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
      //      if (!ptCmp(this.figure.points[i],this.figure.points[i+1]))
      //      {
      //         var mid=midPoint(this.figure.points[i],this.figure.points[i+1]);
      //         var normal=vectorNormal({lb:mid,rt:this.figure.points[i+1]},0.1);
      //         this.parent.paintVector(overlay_,normal,{stroke:'cyan'});
      //         this.parent.paintCross(overlay_,normal.lb,{radius:this.parent.lengthToWorld(3),color:'cyan'});
      //      }
      //}
      
      //Paint sizes
      if (this.showSizes)
      {
         this.paintSizes(this._overlay,(this.showSizes==2 ? this.figures : this.selection));
      }
         
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
      
      for (var figure of this.figures)
      {
         switch (figure.type)
         {
            case 'rect':
            {
               this.paintRect(this._canvas,figure.rect,figure.style);
               break;
            }
            case 'polyline':
            {
               this.paintPolyline(this._canvas,figure.points,figure.style);
               break;
            }
            case 'compound':
            {
               context.save();
               for (var points of figure.polyLines)
                  this.paintPolyline(this._canvas,points,figure.style);
               context.restore();
               break;
            }
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
      
      function testPoint(rnbh_,point_)
      {
         return isPointInNormalRect(point_,rnbh_);
      }
      
      var res=false;
      
      var rad=this.lengthToWorld(8);
      var rnbh={lb:{x:pt_.x-rad,y:pt_.y-rad},rt:{x:pt_.x+rad,y:pt_.y+rad}}; //Rectangular neighbourhood
      var points;
      var indx=false;
      
      var i=0;
      while ((indx===false)&&(i<this._figures.length))
      {
         switch (this._figures[i].type)
         {
            case 'rect':
            {
               points=outlineRect(this._figures[i].rect);
               indx=arraySearch(rnbh,points,testPoint);
               
               break;
            }
            case 'polyline': 
            {
               points=this._figures[i].points;
               indx=arraySearch(rnbh,points,testPoint);
               
               break;
            }
            case 'compound':
            {
               var l=0;
               while ((indx===false)&&(l<this._figures[i].polyLines.length))
               {
                  points=this._figures[i].polyLines[l];
                  indx=arraySearch(rnbh,points,testPoint);
                  
                  l++;
               }
               
               break;
            }
         }
         
         i++;
      }
      
      if (indx!==false)
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
      
      return roundPoint(res);
   }
   
   pan(delta_,isCanvasCoords_)
   {
      this._origin=moveRect(this._origin,(isCanvasCoords_ ? delta_ : {x:this.lengthToCanvas(delta_.x),y:this.lengthToCanvas(delta_.y)}));
      
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
         var vect=rectVect(bBox);
         vect.w=vect.w*1.1;
         vect.h=vect.h*1.1;
         vect.x-=vect.w*0.05;
         vect.y-=vect.h*0.05;
         
         var lb=this.pointToCanvas(vect);
         this._origin=moveRect(this._origin,{x:-lb.x,y:this._canvas.height-lb.y});
         this._zoomLevel*=Math.min(this.lengthToWorld(this._canvas.width)/vect.w,this.lengthToWorld(this._canvas.height/vect.h));
         this.repaint();
      }
   }
   
   addFigure(figure_)
   {
      if (figure_)
      {
         this._figures.push(figure_);
         this.repaint();
      }
   }
   
   removeFigures(figures_)
   {
      //Remove figures
      figures_=(figures_ instanceof Array ? figures_ : (figures_ ? [figures_] : []));
      for (var figure of figures_)
      {
         var indx=arraySearch(figure,this._figures)
         if (indx!==false)
         {
            this.deselect(figure);
            this._figures.splice(indx,1);
         }
      }
      
      this.repaint();
   }
   
   removeAll()
   {
      //Remove figure
      this._figures=[];
      this._selection=[];

      this.repaintCanvas();
   }
   
   
   reorderFigures(figures_,shift_)
   {
      //Raise/lower figures
      
      figures_=(figures_ instanceof Array ? figures_ : (figures_ ? [figures_] : []));
      if (figures_.length>0&&shift_!=0)
      {
         for (var figure of figures_)
         {
            var indx=arraySearch(figure,this._figures);
            if (indx!==false&&((shift_<0&&(indx+shift_>=0))||(shift_>0)))
            {
               this._figures.splice(indx,1);
               this._figures.splice(indx+shift_,0,figure);
            }
         }
         this.repaint();
      }
   }
   
   boundingBox(figures_,assignLocal_)
   {
      //Calc boundung box of single or multiple figures
   
      var res=null;
      //console.log('boundingBox: figures_',figures_);
      
      var figArr=(figures_ instanceof Array ? figures_ : [figures_]);
      //console.log('figArr',figArr);
      
      for (var figure of figArr)
         switch (figure.type)
         {
            case 'polyline':
            {
               var subBox=pointsBoundingBox(figure.points);
               if (subBox)
               {
                  if (!res)
                     res=clone(subBox);
                  else
                     res=appendBoundingBox(res,subBox);
                  
                  if (assignLocal_)
                     figure.bBox=clone(subBox);
               }
               
               break;
            }
            case 'compound':
            {
               var cBox=null;
               for (var points of figure.polyLines)
                  if (isNormalsOutside(points))
                  {
                     var subBox=pointsBoundingBox(points);
                     if (!cBox)
                        cBox=clone(subBox);
                     else
                        cBox=appendBoundingBox(cBox,subBox);
                  }
               
               if (cBox)
               {
                  if (!res)
                     res=clone(cBox);
                  else
                     res=appendBoundingBox(res,cBox);
                  
                  if (assignLocal_)
                     figure.bBox=clone(cBox);
               }
               
               break;
            }
            case 'rect':
            default:
            {
               var rect=(figure.rect ? figure.rect : figure);
               if (rectType(rect))
               {
                  rect=rectCorners(rect);
                  
                  if (!res)
                     res=clone(rect);
                  else
                     res=appendBoundingBox(res,rect);
                  
                  if (assignLocal_)
                     figure.bBox=clone(rect);
               }
            }
         }
      
      return res;
   }
   
   moveFigures(figures_,delta_)
   {
      figures_=(figures_ instanceof Array ? figures_ : (figures_ ? [figures_] : []));
      if ((figures_.length>0)&&(delta_.x!=0||delta_.y!=0))
      {
         for (var figure of figures_)
            switch (figure.type)
            {
               case 'rect':
               {
                  figure.rect=moveRect(figure.rect,delta_);
                  break;
               }
               case 'polyline':
               {
                  for (var i=0;i<figure.points.length;i++)
                     figure.points[i]=moveRect(figure.points[i],delta_);
                  
                  break;
               }
               case 'compound':
               {
                  for (var points of figure.polyLines)
                     for (var i=0;i<points.length;i++)
                        points[i]=moveRect(points[i],delta_);
               }
            }
         
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
            res=isPointInPolyline(pt_,figure_.points);
            break;
         }
         case 'compound':
         {
            for (var points of figure_.polyLines)
            {
               res=isPointInPolyline(pt_,points);
               if (res)
                  break;
            }
            break;
         }
         case 'rect':
         default:
         {
            var rect=(figure_.rect ? figure_.rect : figure_);
            res=isPointInRect(pt_,rect);
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
                  var buff=intersectPolyLines(polylines_[i],polylines_[k],'union');
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
            case 'rect':      {aPs.push(outlineRect(figure.rect)); break;}
            case 'polyline' : {aPs.push(figure.points); break;}
            case 'compound' : {aPs=aPs.concat(figure.polyLines); break;}
         }
      for (var figure of bFigures_)
         switch (figure.type)
         {
            case 'rect':      {bPs.push(outlineRect(figure.rect)); break;}
            case 'polyline' : {bPs.push(figure.points); break;}
            case 'compound' : {bPs=bPs.concat(figure.polyLines); break;}
         }
      
      //At first extract all cutting figures
      var cutLines=[];
      for (var i=0;i<aPs.length;i++)
         if (!isNormalsOutside(aPs[i]))
         {
            cutLines.push(aPs.splice(i,1)[0].reverse());
            i--;
         }
      if (mode_=='cut'||mode_=='diff')
      {
         for (var i=0;i<bPs.length;i++)
            if (!isNormalsOutside(bPs[i]))
               cutLines.push(bPs[i].reverse());
            else
               cutLines.push(bPs[i]);
         
         bPs=[];
      }
      else
         for (var i=0;i<bPs.length;i++)
            if (!isNormalsOutside(bPs[i]))
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
               buff=buff.concat(intersectPolyLines(aP,bP,mode_));
         
         aPs=this.unionPolylines(buff);
      }
      
      if (cutLines.length>0)
      {
         cutLines=this.unionPolylines(cutLines);
         //console.log('Cut: aPs',clone(aPs),'cutLines',clone(cutLines));
         
         var remained=[];
         var pass=0;
         for (var cut of cutLines)
         {
            //console.log('pass',pass);
            var passRes=[];
            for (var i=0;i<aPs.length;i++)
            {
               var buff=intersectPolyLines(aPs[i],cut,'diff');
               //console.log(i,'buff',buff,' from',aPs[i],cut);
               if (buff.length==2&&(buff[0]==aPs[i])&&(buff[1]==cut))   //if the cut is inside aPs[i]
               {
                  passRes.push(buff[0]);
                  //console.log('rem');
                  if (!arraySearch(cut,remained))
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
      
      //console.log('aPs:',clone(aPs));
      
      if (aPs.length==1)
         res={type:'polyline',points:aPs[0],style:clone(aFigures_[0].style)};
      else if (aPs.length>1)
         res={type:'compound',polyLines:aPs,style:clone(aFigures_[0].style)};
      //console.log('res:',clone(res));
      
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
      
      figures_ =(figures_ instanceof Array ? figures_ : [figures_ ]);
      
      for (var figure of figures_)
      {
         var indx=arraySearch(figure,this._selection);
         if (indx!==false)
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
         var indx=arraySearch(figure,this._selection);   //Don't select figures already selected.
         if (indx===false)                               //NOTE: Some functions like intersectFigures() are dependent on order of figures in selection, thus need to avoid of reordering if user will mistakenly select a figure multiple times.
            this._selection.push(figure);
      }
      
      this.repaintOverlay();
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
      var ret=true;
      
      //Call tool listener
      if (this.activeTool&&this.activeTool.onKeyPress)
         ret=this.activeTool.onKeyPress(e_);
      
      if (ret===false)
         return cancelEvent(e_);
   }
   
   onKeyDown(e_)
   {
      var ret=true;
      
      switch (e_.key)
      {
         case ' '://Spacebar
         {
            var delta={x:-this.cursor.x,y:-this.cursor.y};
            this.moveFigures(this._figures,delta);
            delta.x=-delta.x;
            delta.y=delta.y;
            this.pan(delta);
            this.cursor={x:0,y:0};
            
            ret=false;
         }
      }
      
      //Call tool listener
      if (this.activeTool&&this.activeTool.onKeyDown)
         ret=(this.activeTool.onKeyDown(e_)!==false)&&ret;
      
      console.log('ret',ret);
      if (ret===false)
         return cancelEvent(e_);
   }
   
   onKeyUp(e_)
   {
      var ret=true;
      
      //Call tool listener
      if (this.activeTool&&this.activeTool.onKeyUp)
         ret=this.activeTool.onKeyUp(e_);
      
      if (ret===false)
         return cancelEvent(e_);
   }
   
   onMouseMove(e_)
   {      
      if (!((e_.buttons&0b100)||(this._panTool&&(e_.buttons&0b001))))
         this._panStart=null;
      
      if (this._panStart)
      {
         var delta={x:e_.layerX-this._panStart.x,y:e_.layerY-this._panStart.y};
         this._panStart={x:e_.layerX,y:e_.layerY};
         this.pan(delta,true);
      }
      else
         this.setCursor({x:e_.layerX,y:e_.layerY},true);
      
      //Call tool listener
      if (!this._panTool)
         if (this.activeTool&&this.activeTool.onMouseMove)
            this.activeTool.onMouseMove(e_);
      
      return cancelEvent(e_);
   }
   
   onClick(e_)
   {
      //Call tool listener
      if (this.activeTool&&this.activeTool.onClick)
         this.activeTool.onClick(e_);
      
      return cancelEvent(e_);
   }
   
   onMouseDown(e_)
   {
      if ((e_.buttons&0b100)||(this._panTool&&(e_.buttons&0b001)))
         this._panStart={x:e_.layerX,y:e_.layerY};
      
      //Call tool listener
      if (!this._panTool)
         if (this.activeTool&&this.activeTool.onMouseDown)
            this.activeTool.onMouseDown(e_);
      
      return cancelEvent(e_);
   }
   
   onMouseUp(e_)
   {
      if ((e_.button==1)||(this._panTool&&(e_.button==0)))
         this._panStart=null;
      
      //Call tool listener
      if (!this._panTool)
         if (this.activeTool&&this.activeTool.onMouseUp)
            this.activeTool.onMouseUp(e_);
         
      return cancelEvent(e_);
   }
   
   onWheel(e_)
   {
      var ort=mouseWheelOrt(e_);
      this.zoom=this.zoom*(ort<0 ? this.zoomStep : 1/this.zoomStep);
      
      //Call tool listener
      if (this.activeTool&&this.activeTool.onWheel)
         this.activeTool.onWheel(e_);
      
      return cancelEvent(e_);
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
