/*********************************************************************

 SprintLab Analyzer

 Archivo:
 gaitAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

const history=[];

/********************************************************************/

export function reset(){

history.length=0;

}

/********************************************************************/

export function analyze(world){

const leftFoot=world[31];

const rightFoot=world[32];

const pelvis=centerPelvis(world);

const leftSupport=leftFoot.y>rightFoot.y;

const rightSupport=rightFoot.y>leftFoot.y;

const supportLeg=

leftSupport?

"LEFT":

rightSupport?

"RIGHT":

"NONE";

const result={

supportLeg,

balance:balance(world),

pelvisTilt:pelvisTilt(world),

shoulderTilt:shoulderTilt(world),

hipRotation:hipRotation(world),

stanceWidth:stanceWidth(world),

pelvis

};

history.push(result);

return result;

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

export function balance(world){

const left=

Math.abs(

world[23].y-

world[25].y

);

const right=

Math.abs(

world[24].y-

world[26].y

);

return Math.abs(

left-right

);

}

/********************************************************************/

export function pelvisTilt(world){

return(

world[24].y-

world[23].y

);

}

/********************************************************************/

export function shoulderTilt(world){

return(

world[12].y-

world[11].y

);

}

/********************************************************************/

export function hipRotation(world){

return(

world[24].z-

world[23].z

);

}

/********************************************************************/

export function stanceWidth(world){

return Math.abs(

world[31].x-

world[32].x

);

}

/********************************************************************/

export function latest(){

if(history.length===0){

return null;

}

return history[history.length-1];

}

/********************************************************************/

export function totalFrames(){

return history.length;

}

/********************************************************************/

export function summary(){

let left=0;

let right=0;

let none=0;

for(const frame of history){

switch(frame.supportLeg){

case"LEFT":

left++;

break;

case"RIGHT":

right++;

break;

default:

none++;

}

}

return{

frames:history.length,

leftSupport:left,

rightSupport:right,

flightFrames:none

};

}

/********************************************************************/

export function exportData(){

return JSON.parse(

JSON.stringify(

history

)

);

}