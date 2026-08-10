/*********************************************************************

 SprintLab Analyzer

 Archivo:
 headAnalyzer.js

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

const result={

headTilt:headTilt(world),

neckTilt:neckTilt(world),

rotation:rotation(world),

stability:0,

score:0

};

result.stability=

stability(result);

result.score=

score(result);

history.push(result);

return result;

}

/********************************************************************/

function headTilt(world){

const nose=world[0];

const shoulder={

x:(world[11].x+world[12].x)/2,

y:(world[11].y+world[12].y)/2

};

return Math.atan2(

nose.x-shoulder.x,

shoulder.y-nose.y

)*180/Math.PI;

}

/********************************************************************/

function neckTilt(world){

return Math.abs(

world[0].x-

(

world[11].x+

world[12].x

)/2

);

}

/********************************************************************/

function rotation(world){

return Math.abs(

world[7].z-

world[8].z

);

}

/********************************************************************/

function stability(result){

return(

Math.abs(result.headTilt)+

result.neckTilt+

result.rotation

)/3;

}

/********************************************************************/

function score(result){

let s=100;

s-=Math.abs(result.headTilt);

s-=result.neckTilt*100;

s-=result.rotation*50;

return Math.max(

0,

Math.min(

100,

s

)

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

export function averageScore(){

if(history.length===0){

return 0;

}

let total=0;

for(const item of history){

total+=item.score;

}

return total/history.length;

}

/********************************************************************/

export function summary(){

return{

frames:history.length,

averageScore:averageScore()

};

}

/********************************************************************/

export function exportData(){

return JSON.parse(

JSON.stringify(history)

);

}