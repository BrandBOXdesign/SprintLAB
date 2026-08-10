/*********************************************************************

 SprintLab Analyzer

 Archivo:
 velocityAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

let previousPosition=null;

let previousTime=null;

let previousVelocity=0;

const samples=[];

/********************************************************************/

export function reset(){

previousPosition=null;

previousTime=null;

previousVelocity=0;

samples.length=0;

}

/********************************************************************/

export function analyze(

world,

time

){

const center=pelvis(world);

let velocity=0;

let acceleration=0;

if(previousPosition&&previousTime!==null){

const dx=center.x-previousPosition.x;

const dy=center.y-previousPosition.y;

const dz=center.z-previousPosition.z;

const distance=Math.sqrt(

dx*dx+

dy*dy+

dz*dz

);

const dt=(time-previousTime)/1000;

if(dt>0){

velocity=distance/dt;

acceleration=(

velocity-

previousVelocity

)/dt;

}

}

samples.push({

time,

velocity,

acceleration

});

previousPosition=center;

previousTime=time;

previousVelocity=velocity;

return{

velocity,

acceleration

};

}

/********************************************************************/

function pelvis(world){

return{

x:(world[23].x+world[24].x)/2,

y:(world[23].y+world[24].y)/2,

z:(world[23].z+world[24].z)/2

};

}

/********************************************************************/

export function currentVelocity(){

return previousVelocity;

}

/********************************************************************/

export function maximumVelocity(){

if(samples.length===0){

return 0;

}

let max=0;

for(const s of samples){

if(s.velocity>max){

max=s.velocity;

}

}

return max;

}

/********************************************************************/

export function averageVelocity(){

if(samples.length===0){

return 0;

}

let total=0;

for(const s of samples){

total+=s.velocity;

}

return total/samples.length;

}

/********************************************************************/

export function maximumAcceleration(){

if(samples.length===0){

return 0;

}

let max=-Infinity;

for(const s of samples){

if(s.acceleration>max){

max=s.acceleration;

}

}

return max===-Infinity?0:max;

}

/********************************************************************/

export function history(){

return samples;

}

/********************************************************************/

export function summary(){

return{

current:currentVelocity(),

maximum:maximumVelocity(),

average:averageVelocity(),

peakAcceleration:maximumAcceleration(),

samples:samples.length

};

}