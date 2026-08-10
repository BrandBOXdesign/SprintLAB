/*********************************************************************

 SprintLab Analyzer

 Archivo:
 stabilityAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

let previousCenter=null;

const history=[];

/********************************************************************/

export function reset(){

previousCenter=null;

history.length=0;

}

/********************************************************************/

export function analyze(world){

const center=centerOfMass(world);

const pelvis=pelvisCenter(world);

const shoulders=shoulderCenter(world);

const result={

center,

lateralMovement:lateral(center),

verticalMovement:vertical(center),

pelvisTilt:pelvisTilt(world),

shoulderTilt:shoulderTilt(world),

trunkDeviation:trunkDeviation(pelvis,shoulders),

stabilityIndex:0

};

result.stabilityIndex=

calculateIndex(result);

history.push(result);

previousCenter=center;

return result;

}

/********************************************************************/

function centerOfMass(world){

return{

x:(

world[11].x+

world[12].x+

world[23].x+

world[24].x

)/4,

y:(

world[11].y+

world[12].y+

world[23].y+

world[24].y

)/4,

z:(

world[11].z+

world[12].z+

world[23].z+

world[24].z

)/4

};

}

/********************************************************************/

function pelvisCenter(world){

return{

x:(world[23].x+world[24].x)/2,

y:(world[23].y+world[24].y)/2

};

}

/********************************************************************/

function shoulderCenter(world){

return{

x:(world[11].x+world[12].x)/2,

y:(world[11].y+world[12].y)/2

};

}

/********************************************************************/

function lateral(center){

if(!previousCenter){

return 0;

}

return Math.abs(

center.x-

previousCenter.x

);

}

/********************************************************************/

function vertical(center){

if(!previousCenter){

return 0;

}

return Math.abs(

center.y-

previousCenter.y

);

}

/********************************************************************/

function pelvisTilt(world){

return Math.abs(

world[23].y-

world[24].y

);

}

/********************************************************************/

function shoulderTilt(world){

return Math.abs(

world[11].y-

world[12].y

);

}

/********************************************************************/

function trunkDeviation(

pelvis,

shoulders

){

return Math.abs(

pelvis.x-

shoulders.x

);

}

/********************************************************************/

function calculateIndex(data){

return (

data.lateralMovement+

data.verticalMovement+

data.pelvisTilt+

data.shoulderTilt+

data.trunkDeviation

)/5;

}

/********************************************************************/

export function latest(){

if(history.length===0){

return null;

}

return history[history.length-1];

}

/********************************************************************/

export function summary(){

let total=0;

for(const item of history){

total+=item.stabilityIndex;

}

return{

frames:history.length,

average:

history.length?

total/history.length:0

};

}

/********************************************************************/

export function exportData(){

return JSON.parse(

JSON.stringify(history)

);

}