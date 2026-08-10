/*********************************************************************

 SprintLab Analyzer

 Archivo:
 utils.js

 Versión:
 0.0.3

*********************************************************************/

/********************************************************************/

export function radians(degrees){

return degrees*Math.PI/180;

}

/********************************************************************/

export function degrees(radians){

return radians*180/Math.PI;

}

/********************************************************************/

export function clamp(value,min,max){

return Math.max(

min,

Math.min(max,value)

);

}

/********************************************************************/

export function lerp(a,b,t){

return a+(b-a)*t;

}

/********************************************************************/

export function distance2D(a,b){

const dx=b.x-a.x;

const dy=b.y-a.y;

return Math.sqrt(

dx*dx+

dy*dy

);

}

/********************************************************************/

export function distance3D(a,b){

const dx=b.x-a.x;

const dy=b.y-a.y;

const dz=b.z-a.z;

return Math.sqrt(

dx*dx+

dy*dy+

dz*dz

);

}

/********************************************************************/

export function midpoint(a,b){

return{

x:(a.x+b.x)/2,

y:(a.y+b.y)/2,

z:((a.z??0)+(b.z??0))/2

};

}

/********************************************************************/

export function average(values){

if(values.length===0){

return 0;

}

let total=0;

for(const value of values){

total+=value;

}

return total/values.length;

}

/********************************************************************/

export function round(value,decimals=2){

const factor=Math.pow(

10,

decimals

);

return Math.round(

value*factor

)/factor;

}

/********************************************************************/

export function normalize(value,min,max){

if(max===min){

return 0;

}

return(

value-min

)/(max-min);

}

/********************************************************************/

export function vector(a,b){

return{

x:b.x-a.x,

y:b.y-a.y,

z:(b.z??0)-(a.z??0)

};

}

/********************************************************************/

export function dot(a,b){

return(

a.x*b.x+

a.y*b.y+

(a.z??0)*(b.z??0)

);

}

/********************************************************************/

export function magnitude(v){

return Math.sqrt(

v.x*v.x+

v.y*v.y+

(v.z??0)*(v.z??0)

);

}

/********************************************************************/

export function angle(a,b,c){

const ba=vector(b,a);

const bc=vector(b,c);

const m1=magnitude(ba);

const m2=magnitude(bc);

if(m1===0||m2===0){

return 0;

}

let cos=dot(ba,bc)/(m1*m2);

cos=clamp(

cos,

-1,

1

);

return degrees(

Math.acos(cos)

);

}