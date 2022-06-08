var precision=12;
var roundFactor=0.000000000001;

function roundVal(val_)
{
   return parseFloat(val_.toFixed(precision));
}

function roundPoint(pt_)
{
   pt_.x=parseFloat(pt_.x.toFixed(precision));
   pt_.y=parseFloat(pt_.y.toFixed(precision));
   return pt_;
}

function valCmp(val1_,val2_)
{
   return (Math.abs(val1_-val2_)<roundFactor)
}

function ptCmp(p1_,p2_)
{
   return (Math.abs(p1_.x-p2_.x)<roundFactor)&&(Math.abs(p1_.y-p2_.y)<roundFactor);
}

function rectType(rect_)
{
   //Determines how to rect or vector defined:
   // 0 - isn't rect/vector, 1 - by one point and components, 2 - by two points.
   
   var res=0;
   
   if (!(isNaN(rect_.x)||isNaN(rect_.y)||isNaN(rect_.w)||isNaN(rect_.h)))
      res=1;
   else if (rect_.lb&&rect_.rt)
      res=2;
   
   return res;
}

function rectNormalize(rect_,isCanvasCoords_)
{
   //Recalc rect position to make its width and height positive

   var res=null;
   
   var type=rectType(rect_)
   if (type==1)
   {
      //Rect by X Y W H
      var res=rect_;
      
      if (res.w<0)
      {
         res.w=-res.w;
         res.x=res.x-res.w;
      }
      if (res.h<0)
      {
         res.h=-res.h;
         res.y=res.y-res.h;
      }
   }
   else if (type==2)
   {
      //Rect by corners
      var res=rect_;
         
      if (res.lb.x>res.rt.x) //If left is righter than right
      {
         var swp=res.rt.x; //Swap left and right
         res.rt.x=res.lb.x;
         res.lb.x=swp;
      }
      if ((!isCanvasCoords_&&(res.rt.y<res.lb.y))||  //If world space and top Y is lesser than bottom Y
          (isCanvasCoords_&&(res.rt.y>res.lb.y)))    // or if screen space and top Y is greater than bottom Y
      {
         var swp=res.rt.y; //Swap top and bottom
         res.rt.y=res.lb.y;
         res.lb.y=swp;
      }
   }
   
   return res;
}

function rectVect(rect_,isCanvasCoords_)
{
   //Converts rect corners to x,y,w,h
   
   var res=null;
   
   var type=rectType(rect_);
   if (type==1)
      res=rect_;
   else if (type==2)
      res={x:rect_.lb.x,y:(isCanvasCoords_ ? rect_.rt.y : rect_.lb.y),w:rect_.rt.x-rect_.lb.x,h:rect_.rt.y-rect_.lb.y};

   return res;
}

function rectSize(rect_,isCanvasCoords_)
{
   var res=rectVect(rect_,isCanvasCoords_);
   
   if (res)
   {
      res.w=Math.abs(res.w);
      res.h=Math.abs(res.h);
   }
   
   return res;
}

function rectCorners(rect_,isCanvasCoords_)
{
   //Calc coords of 4 rect corners
   
   var res=null;
   
   var type=rectType(rect_);
   if (type==1)
      res={
            lb:{x:rect_.x,y:(isCanvasCoords_ ? rect_.y+rect_.h : rect_.y)},
            rt:{x:rect_.x+rect_.w,y:(isCanvasCoords_ ? rect_.y : rect_.y+rect_.h)}
          };
   else if (type==2)
      res=rect_;
   
   return res;
}

function midPoint(pt1_,pt2_)
{
   return {x:(pt1_.x+pt2_.x)/2,y:(pt1_.y+pt2_.y)/2};
}

function vectorNormal(vect_,factor_)
{
   //Get normal to outside of a clockwise figure
   
   var type=rectType(vect_);
   vect_=(type==1 ? vect_ : rectVect(vect_)); //Convert LB,RT to X,Y,W,H
   
   //Rotate by 90deg, matrix is:
   // 0 -1
   // 1  0
   var l=Math.sqrt(vect_.w*vect_.w+vect_.h*vect_.h)||1; //prevent dividebyzero
   var swp=vect_.w;
   vect_.w=-vect_.h/l*factor_;
   vect_.h=swp/l*factor_;
   
   return (type==1 ? vect_ : rectCorners(vect_));
}

function isNormalsOutside(polyline_)
{
   var mid=midPoint(polyline_[0],polyline_[1]);
   var normal=vectorNormal({lb:mid,rt:polyline_[1]},0.01);
   return !isPointInPolyline(normal.rt,polyline_);
}

function moveRect(rect_,delta_)
{
   var res={};
   
   for (var key in rect_)
      switch (key)
      {
         case 'x':
         case 'y':  {res[key]=roundVal(rect_[key]+delta_[key]); break;}
         case 'rt':
         case 'lb': {res[key]=roundPoint({x:rect_[key].x+delta_.x,y:rect_[key].y+delta_.y}); break;}
      }
   
   return res;
}

function polyLineSquare(points_)
{
   //Find square of polyline figure using Shoelace formula
   
   points_=[].concat(points_);
   
   points_.unshift(points_[points_.length-1]);
   points_.push(points_[1]);
   
   var sum=0;
   for (var i=1;i<points_.length-1;i++)
      sum+=(points_[i].x*(points_[i+1].y-points_[i-1].y));
   
   return Math.abs(sum)/2;
}

function crossProduct2d(a_,b_,isCanvasCoords_) //a.k.a vector product
{
   a_=rectVect(a_,isCanvasCoords_);
   b_=rectVect(b_,isCanvasCoords_);

   return a_.w*b_.h-a_.h*b_.w;
   //var treshold=0.000000001;
   //return Math.round((a_.w*b_.h-a_.h*b_.w)/treshold)*treshold;
}

function hitVect(shootingVect_,targetVect_,isCanvasCoords_)
{
   //Thanks to @vladvic from habr.com for the theory of subject
   
   var res={hits:false,prod:{}}; //Doesn't hits
   
   //Get vectors end-points
   shootingVect_=rectCorners(shootingVect_);
   targetVect_=rectCorners(targetVect_);
   
   //Get two vectors from the shootingVect_ start to the both ends of targetVect_
   var toLB={lb:shootingVect_.lb,rt:targetVect_.lb};
   var toRT={lb:shootingVect_.lb,rt:targetVect_.rt};
   
   //Calc products for the target lb and rt points
   res.prod.lb=crossProduct2d(shootingVect_,toLB,isCanvasCoords_);
   res.prod.rt=crossProduct2d(shootingVect_,toRT,isCanvasCoords_);
   
   //Compare products:
   //If products are different, then target is on shooting line.
   //Additional info may be obtained from res.prod: if certain product is 0, then corresponding point belongs to shooting line.
   res.hits=(Math.sign(res.prod.lb)!=Math.sign(res.prod.rt));
   return res;
}

function xPoints(a_,b_,isCanvasCoords_)
{
   //Finds out point of crosssection of two vectors
   //Thanks to @vladvic from habr.com for the theory of subject: https://habr.com/post/267037/
   
   var res=[];
   
   a_=clone(a_);
   b_=clone(b_);
   
   //Firts, test vectors for mutual hiting
   var shootAB=hitVect(a_,b_,isCanvasCoords_);
   var shootBA=hitVect(b_,a_,isCanvasCoords_);
   
   if (shootAB.hits&&shootBA.hits)  //If both hits each together, then they're crossing
   {
      //THen lets test obtained products: m.b. any of the end-points is a subject:
      //Point is end of vector a_:
      if (shootBA.prod.lb==0) //a_.lb belongs to b_
         res.push(a_.lb);
      
      else if (shootBA.prod.rt==0) //a_.rt belongs to b_
         res.push(a_.rt);
      
      //Point is end of vector b_:
      else if (shootAB.prod.lb==0) //b_.lb belongs to a_
         res.push(b_.lb);
      
      else if (shootAB.prod.rt==0) //b_.rt belongs to a_
         res.push(b_.rt);
      
      //Point somewhere in the middle of both vectors
      else //if (res.a.length==0&&res.b.length==0)
      {
         //Formulae:
         // Px = Cx + (Dx-Cx)*|Z1|/|Z2-Z1|;
         // Py = Cy + (Dy-Cy)*|Z1|/|Z2-Z1|;
         //Where
         // Z1=shootAB.prod.lb
         // Z2=shootAB.prod.rt
         // A=a_.lb
         // C=b_.lb
         // D=b_.rt
         
         var p={
                 x:b_.lb.x+(b_.rt.x-b_.lb.x)*Math.abs(shootAB.prod.lb)/Math.abs(shootAB.prod.rt-shootAB.prod.lb),
                 y:b_.lb.y+(b_.rt.y-b_.lb.y)*Math.abs(shootAB.prod.lb)/Math.abs(shootAB.prod.rt-shootAB.prod.lb)
               };
         //console.log('p',p);
         res.push(roundPoint(p)); //Cross point belongs to middle of both vectors
      }
   }
   else if (shootAB.prod.lb==0&&shootAB.prod.rt==0&&shootBA.prod.lb==0&&shootBA.prod.rt==0)   //Vectors belongs to the same line
   {
      if (isPointInRect(a_.lb,b_)!==false)
         res.push(a_.lb);
      if (isPointInRect(a_.rt,b_)!==false)
         res.push(a_.rt);
      if (isPointInRect(b_.lb,a_)!==false&&!(ptCmp(a_.lb,b_.lb)||ptCmp(a_.rt,b_.lb)))
         res.push(b_.lb);
      if (isPointInRect(b_.rt,a_)!==false&&!(ptCmp(a_.lb,b_.rt)||ptCmp(a_.rt,b_.rt)))
         res.push(b_.rt);
   }
   
   return res;
}

function pointsToChainedVectors(points_,close_)
{
   //Makes array of vectors, where each one's end is a next one's start
   
   var res=[];
   
   for (var i=0;i<points_.length-1;i++)
      res.push({lb:points_[i],rt:points_[i+1]});
   if (close_)
      res.push({lb:points_[points_.length-1],rt:points_[0]});   //close chain
   
   return res;
}

function chainedVectorsToPoints(vectors_)
{
   var res=[];
   
   for (var i=0;i<vectors_.length;i++)
      res.push(vectors_[i].lb);
   
   return res;
}

function reverseChainedVectors(vectors_)
{
   var res=[];
   
   for (var i=vectors_.length-1;i>=0;i--)
      res.push({lb:vectors_[i].rt,rt:vectors_[i].lb});
   
   return res;
   
}

function selfXSections(points_,closed_,isCanvasCoords_)
{
   //Find points of self croxxsections in polyline
   var res=[];
   
   var segments=pointsToChainedVectors(points_,closed_);
   for (var i=0;i<segments.length-1;i++)
      for (var k=1;k<segments.length;k++)
         if (i!=k)
         {
            var xPts=xPoints(segments[i],segments[k]);
               for (var pt of xPts)
                  if  (!((ptCmp(pt,segments[i].rt)&&(k==i+1))||(ptCmp(pt,segments[i].lb)&&(k==i-1))))  //The only allowed common point - is a connection between neighboring vectors
                     res.push(pt);
         }
   if (res.length>0&&ptCmp(res[res.length-1],points_[0]))
      res.pop();
   
   return res;
}

function outlineRect(rect_,isCanvasCoords_)
{
   var res=[];
   
   var corners=rectCorners(rect_,isCanvasCoords_);
   res.push(clone(corners.lb));
   res.push({x:corners.lb.x,y:corners.rt.y});
   res.push(clone(corners.rt));
   res.push({x:corners.rt.x,y:corners.lb.y});
   
   return res;
}

function cleanupPolyline(figure_)
{
   var res=figure_;
   
   if (res.points.length>1)
   {
      var resPts=[res.points[0]];
      for (var i=1;i<res.points.length;i++)
         if (!ptCmp(resPts[resPts.length-1],res.points[i]))
            resPts.push(res.points[i]);
         //else
         //   console.log('Rejected point ',i,' from ',figure_)
      
      res.points=resPts;
   }
   
   return res;
}

function appendBoundingBox(resBox_,box_,isCanvasCoords_)
{
   if (box_.lb.x<resBox_.lb.x)
      resBox_.lb.x=box_.lb.x;
   if (box_.rt.x>resBox_.rt.x)
      resBox_.rt.x=box_.rt.x;
   
   if ((isCanvasCoords_&&(box_.lb.y>resBox_.lb.y))||(!isCanvasCoords_&&(box_.lb.y<resBox_.lb.y)))
      resBox_.lb.y=box_.lb.y;
   if ((isCanvasCoords_&&(box_.rt.y<resBox_.rt.y))||(!isCanvasCoords_&&(box_.rt.y>resBox_.rt.y)))
      resBox_.rt.y=box_.rt.y;
   
   return resBox_;
}

function pointsBoundingBox(points_,isCanvasCoords_)
{
   //Calc boundung box of single or multiple figures
   
   var res=null;
   
   if (points_.length)
   {
      var figureBox={lb:clone(points_[0]),rt:clone(points_[0])};
      for (var i=1;i<points_.length;i++)
      {
         if (points_[i].x<figureBox.lb.x)
            figureBox.lb.x=points_[i].x;
         if (points_[i].x>figureBox.rt.x)
            figureBox.rt.x=points_[i].x;
         
         if ((isCanvasCoords_&&(points_[i].y>figureBox.lb.y))||(!isCanvasCoords_&&(points_[i].y<figureBox.lb.y)))
            figureBox.lb.y=points_[i].y;
         if ((isCanvasCoords_&&(points_[i].y<figureBox.rt.y))||(!isCanvasCoords_&&(points_[i].y>figureBox.rt.y)))
            figureBox.rt.y=points_[i].y;
      }
      
      if (!res)
         res=clone(figureBox);
      else
         res=appendBoundingBox(res,figureBox);
   }
   
   return res;
}

function sortPoints(points_,vect_)
{
   var axis=(!valCmp(vect_.lb.x,vect_.rt.x) ? 'x' : 'y');
   var order=(vect_.lb[axis]<vect_.rt[axis] ? 'Asc' : 'Desc');
   var cb;
   switch (axis+order)
   {
      case 'xAsc': {cb=function (p1_,p2_){return Math.sign(p1_.x-p2_.x);};  break;}
      case 'yAsc': {cb=function (p1_,p2_){return Math.sign(p1_.y-p2_.y);};  break;}
      case 'xDesc':{cb=function (p1_,p2_){return Math.sign(p2_.x-p1_.x);}; break;}
      case 'yDesc':{cb=function (p1_,p2_){return Math.sign(p2_.y-p1_.y);}; break;}
   }
   
   return points_.sort(cb);
}

function isPointInRect(pt_,rect_)
{
   var res=false;
   
   if (rectType(rect_))
      res=isPointInNormalRect(pt_,rectNormalize(rectCorners(clone(rect_))));
   
   return res;
}

function isPointInNormalRect(pt_,rect_)
{
   var res=false;
   
   if ((rect_.lb.x<pt_.x)&&(pt_.x<rect_.rt.x)&&(rect_.lb.y<pt_.y)&&(pt_.y<rect_.rt.y))  //Inside
      res=true;
   else if ((rect_.lb.x<=pt_.x)&&(pt_.x<=rect_.rt.x)&&(rect_.lb.y<=pt_.y)&&(pt_.y<=rect_.rt.y)) //Not inside, but on the border
      res=0;
   
   return res;
}

function isPointInVect(pt_,vect_)
{
   return (crossProduct2d(vect_,{lb:vect_.lb,rt:pt_})==0)&&((isPointInRect(pt_,vect_)!==false));
}

function isPointInPolyline(pt_,points_)
{
   //Test the point using method of ray intersections count
   
   var res=false;
   
   var box=pointsBoundingBox(points_);
   if (isPointInRect(pt_,box)!==false) //If pt_ is outside of the figure bounding box then it definitely outside the figure.
   {
      //Enlarge bounding box to avoid indeterminations for trialgles like [lb,lt,rt] and some others.
      box.lb.x-=1;
      box.lb.y-=1;
      box.rt.x+=1;
      box.rt.y+=1;
      var corners=[box.lb,{x:box.lb.x,y:box.rt.y},box.rt,{x:box.rt.x,y:box.lb.y}];
      var maxSubdiv=10;
      
      //Trace ray to bbox corners
      var sides=pointsToChainedVectors(points_,true);  //TODO: the check for collapsed figure must be undertaken
      var ray={lb:pt_};
      var determinated=false;
      
      for (var i=0;i<corners.length;i++) //In most lucky case this cycle will has only one iteration
      {
         for (var subdiv=0;subdiv<maxSubdiv;subdiv++)  //If ray to the corner gives indeterminated result then try to subdivide corresponding box side until a determinated result will be obtained
         {
            //Find segments that intersects with the ray
            if (subdiv==0)
               ray.rt=corners[i];
            else
            {
               var mid=midPoint(corners[i],(mid ? mid : (i<corners.length-1 ? corners[i+1] : corners[0])));
               ray.rt=mid;
            }
            
            //console.log('ray:',ray);
            var hitsCount=0;  //Number of determinated intersections
            var indetCount=0; //Number of indeterminated intersections
            for (var side of sides)
            {
               if (isPointInVect(pt_,side))
               {
                  res=0;
                  break;
               }
               else
               {
                  var xPts=xPoints(ray,side);
                  //console.log('X with side:',side,xPts);
                  if (xPts.length)
                  {
                     //console.log('indet test>',xPts.length>1,ptCmp(xPts[0],side.lb),ptCmp(xPts[0],side.rt));
                     if (xPts.length>1||ptCmp(xPts[0],side.lb)||ptCmp(xPts[0],side.rt)) //If there are two intersections then segment belongs to ray and state is indeterminate. If the ray intersects with the segment verticle then state is also indeterminate.
                        indetCount++;
                     else
                        hitsCount++;
                  }
               }
            }
            //console.log('hits:',hitsCount,' indet:',indetCount,' res',res);
            if (res===0)
            {
               determinated=true;
               break;
            }
            else if (indetCount==0)    //If there was determinated intersections or there was no intersections at all, then polyline and pt_ superposition is determinate. If there was indeterminated intersections  but was no determinated ones, then try with the next ray.
            {
               res=(hitsCount%2==1);   //If number of intersections is odd then point is inside, else - is outside.
               determinated=true;
               break;
            }
         }
         
         if (determinated)
            break;
      }
      
      if (!determinated)
      {
         console.warn('isPointInPolyline: disposition of point was not determinated: ',pt_,points_);
      }
   }
   
   return res;
}

function findIntersections(aSides_,bSides_)
{
   //Find points of two polylines intersections and insert'em into proper position amongst these polylines points.
   
   var count=0;
   
   var aMidXPts=[];                    //Buffers for intersection points that may be founD in the middle of segments
   var bMidXPts=[];                    //
   for (var i=0;i<aSides_.length;i++)  //Each segment has it's own buffer
      aMidXPts.push([]);               //
   for (var k=0;k<bSides_.length;k++)  //
      bMidXPts.push([]);               //
   
   //Find intersections:
   for (var i=0;i<aSides_.length;i++)
   {
      for (var k=0;k<bSides_.length;k++)
      {
         //Find points for current segments pair
         var xPts=xPoints(aSides_[i],bSides_[k]);
         count+=xPts.length; //It's a rather debug than useful counter
         
         for (var pt of xPts)
         {
            //Add mid point to aSides_
            if (!ptCmp(pt,aSides_[i].lb)&&!ptCmp(pt,aSides_[i].rt))
            {
               if (arraySearch(pt,aMidXPts[i],ptCmp)===false)
                  aMidXPts[i].push(clone(pt)); 
            }
            
            //Add mid point to bSides_
            if (!ptCmp(pt,bSides_[k].lb)&&!ptCmp(pt,bSides_[k].rt))
            {
               if (arraySearch(pt,bMidXPts[k],ptCmp)===false)
                  bMidXPts[k].push(clone(pt));
            }
         }
      }
   }
   
   //Now insert points that was in the middle of segments:
   var offset=0;
   for (var i=0;i<aMidXPts.length;i++)
      if (aMidXPts[i].length>0)
      {
         aMidXPts[i]=sortPoints(aMidXPts[i],aSides_[i+offset]);  //Sort points to match segment vector direction
         aMidXPts[i].unshift(aSides_[i+offset].lb);
         aMidXPts[i].push(aSides_[i+offset].rt);
         var insertion=pointsToChainedVectors(aMidXPts[i]);
         //console.log('aMidXPts',clone(aMidXPts),'ins',clone(insertion),'to',i,offset);
         aSides_.splice(i+offset,1,insertion[0]);                	//Substitute original vector with fragment
         for (var n=1;n<insertion.length;n++)
         {
            aSides_.splice(i+1+offset,0,insertion[n]);
            offset++;                                             // increase offset on number of extra vectors
         }
      }
   var offset=0;
   for (var i=0;i<bMidXPts.length;i++)
      if (bMidXPts[i].length>0)
      {
         bMidXPts[i]=sortPoints(bMidXPts[i],bSides_[i+offset]);  //Sort points to match segment vector direction
         bMidXPts[i].unshift(bSides_[i+offset].lb);
         bMidXPts[i].push(bSides_[i+offset].rt);
         var insertion=pointsToChainedVectors(bMidXPts[i]);
         //bSides_.splice(i+offset,1,insertion);                   //Substitute original vector with fragment
         bSides_.splice(i+offset,1,insertion[0]);                	//Substitute original vector with fragment
         for (var n=1;n<insertion.length;n++)
         {
            bSides_.splice(i+1+offset,0,insertion[n]);
            offset++;                                             // increase offset on number of extra vectors
         }
      }
   
   return count;
}


function filterSides(sides_,p_,cond_)
{
   var res=[];
   
   for (var side of sides_)
   {
      var mid=midPoint(side.lb,side.rt);
      var sideInP=isPointInPolyline(mid,p_);
      if (sideInP===0)
      {
         var normal=vectorNormal({lb:mid,rt:side.rt},-0.01);
         sideInP=isPointInPolyline(normal.rt,p_);
      }
      
      if (sideInP===cond_)
         res.push(side);
   }
   
   return res;
}

function intersectPolyLines(aP_,bP_,mode_)
{
   var res=[];
   
   if (mode_===undefined)
      mode_='intersect';
   
   //Convert figures to polylines
   //console.log('intersectPolyLines:',mode_);
   var aSides=pointsToChainedVectors(clone(aP_),true);
   var bSides=pointsToChainedVectors(clone(bP_),true);
   //console.log('before',clone(aSides),clone(bSides));
   //Find and intersections
   var intCount=findIntersections(aSides,bSides);
   //console.log('intersections',clone(aSides),clone(bSides));
   
   if (intCount>0)
   {
      //Filter vectors
      switch (mode_)
      {
         case 'union':
         {
            aSides=filterSides(aSides,bP_,false);
            bSides=filterSides(bSides,aP_,false);
            break;
         }
         case 'cut':
         case 'diff':
         {
            aSides=filterSides(aSides,bP_,false);
            bSides=filterSides(reverseChainedVectors(bSides),aP_,true);
            break;
         }
         case 'intersect':
         default:
         {
            aSides=filterSides(aSides,bP_,true);
            bSides=filterSides(bSides,aP_,true);
         }
      }
      //console.log('filtered',clone(aSides),clone(bSides));
      
      //Concat vectors
      var sides=aSides.concat(bSides);
      
      //1st pass: remove duplicates
      for (var i=0;i<sides.length-1;i++)
         for (var k=i+1;k<sides.length;k++)
            if (ptCmp(sides[i].lb,sides[k].lb)&&ptCmp(sides[i].rt,sides[k].rt)) //remove duplicate
            {
               //console.log('rm dup',i,clone(sides[i]));
               sides.splice(k,1);
               k--;
            }
      
      var fuse=sides.length;
      var buff=[];
      while (sides.length>0&&fuse)
      {
         if (buff.length==0)
            buff.push(sides.shift());
         //console.log('it',fuse,clone(sides),clone(buff));
         
         //2nd pass: concatenate
         for (var i=0;i<sides.length;i++)
         {
            if (ptCmp(buff[buff.length-1].rt,sides[i].lb))
            {
               buff.push(sides.splice(i,1)[0]);
               i--;
               if (ptCmp(buff[buff.length-1].rt,buff[0].lb))
               {
                  //console.log('push',fuse,clone(sides),clone(buff),clone(res));
                  res.push(chainedVectorsToPoints(buff));
                  buff=[];
                  break;
               }
            }
         }
         
         fuse--;
      }
      
      if (sides.length>0)
      {
         console.warn('Some sides was not concatenated:',clone(sides),clone(buff));
      }
   }
   else
   {
      switch (mode_)
      {
         case 'union':
         {
            var aInB=isPointInPolyline(aP_[0],bP_)!==false;
            var bInA=isPointInPolyline(bP_[0],aP_)!==false;
            if (aInB&&!bInA) //If there are no intersections then a_ fully belongs to b_ if its any point does.
               res.push(bP_);
            else if (bInA)
               res.push(aP_);
            else
            {
               res.push(aP_);
               res.push(bP_);
            }
            
            break;
         }
         case 'cut':
         case 'diff':
         {
            var aInB=isPointInPolyline(aP_[0],bP_)!==false;
            var bInA=isPointInPolyline(bP_[0],aP_)!==false;
            if (!aInB&&!bInA) //If there are no intersections then a_ fully belongs to b_ if its any point does.
               res.push(aP_);
            else if (bInA)
            {
               res.push(aP_);
               res.push(bP_.reverse());
            }
            
            break;
         }
         case 'intersect':
         default:
         {
            if (isPointInPolyline(aP_[0],bP_)!==false) //If there are no intersections then a_ fully belongs to b_ if its any point does.
               res.push(aP_);
         }
      }
   }
   
   //console.log('Res',res);
   return res;
}