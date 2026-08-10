/*********************************************************************

 SprintLab Analyzer

 Archivo:
 strideAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

let previousPelvis=null;

let previousTime=null;

let totalDistance=0;

let strides=[];

/********************************************************************/

export function reset(){

previousPelvis=null;

previousTime=null;

totalDistance=0;

strides=[];

}

/********************************************************************/

export function analyze(

world,

time

){

const pelvis=centerPelvis(world);

let speed=0;

if(

previousPelvis&&

previousTime!==null

){

const dx=

pelvis.x-

previousPelvis.x;

const dy=

pelvis.y-

previousPelvis.y;

const dz=

pelvis.z-

previousPelvis.z;

const distance=

Math.sqrt(

dx*dx+

dy*dy+

dz*dz

);

const dt=

(time-previousTime)/1000;

if(dt>0){

speed=

distance/dt;

totalDistance+=distance;

}

}

previousPelvis=pelvis;

previousTime=time;

return{

speed,

distance:totalDistance,

strideWidth(world),

strideLength(world),

cadence(),

stepFrequency()

};

}

/********************************************************************/

function centerPelvis(world){

return{

x:(world[23].x+world[24].x)/2,

y:(world[23].y+world[24].y)/2,

z:(world[23].z+world[24].z)/2

};

}

/********************************************************************/

export function strideLength(world){

const left=

world[31];

const right=

world[32];

return Math.sqrt(

(left.x-right.x)*(left.x-right.x)+

(left.y-right.y)*(left.y-right.y)+

(left.z-right.z)*(left.z-right.z)

);

}

/********************************************************************/

export function strideWidth(world){

return Math.abs(

world[31].x-

world[32].x

);

}

/********************************************************************/

export function registerStride(length){

strides.push(length);

}

/********************************************************************/

export function averageStride(){

if(strides.length===0){

return 0;

}

let total=0;

for(const s of strides){

total+=s;

}

return total/strides.length;

}

/********************************************************************/

export function cadence(){

return strides.length;

}

/********************************************************************/

export function stepFrequency(){

return strides.length*2;

}

/********************************************************************/

export function totalStrides(){

return strides.length;

}

/********************************************************************/

export function summary(){

return{

distance:totalDistance,

averageStride:averageStride(),

cadence:cadence(),

frequency:stepFrequency(),

strides:totalStrides()

};

}