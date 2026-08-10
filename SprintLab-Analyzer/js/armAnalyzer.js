/*********************************************************************

 SprintLab Analyzer

 Archivo:
 armAnalyzer.js

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

const leftElbow=elbowAngle(

world[11],

world[13],

world[15]

);

const rightElbow=elbowAngle(

world[12],

world[14],

world[16]

);

const leftSwing=armSwing(

world[11],

world[15]

);

const rightSwing=armSwing(

world[12],

world[16]

);

const result={

leftElbow,

rightElbow,

leftSwing,

rightSwing,

symmetry:Math.abs(

leftSwing-rightSwing

),

crossing:crossing(world),

score:0

};

result.score=score(result);

history.push(result);

return result;

}

/********************************************************************/

function elbowAngle(a,b,c){

const ba={

x:a.x-b.x,

y:a.y-b.y,

z:a.z-b.z

};

const bc={

x:c.x-b.x,

y:c.y-b.y,

z:c.z-b.z

};

const dot=

ba.x*bc.x+

ba.y*bc.y+

ba.z*bc.z;

const mag1=Math.sqrt(

ba.x*ba.x+

ba.y*ba.y+

ba.z*ba.z

);

const mag2=Math.sqrt(

bc.x*bc.x+

bc.y*bc.y+

bc.z*bc.z

);

if(

mag1===0||

mag2===0

){

return 0;

}

let cos=dot/(mag1*mag2);

cos=Math.max(

-1,

Math.min(

1,

cos

)

);

return Math.acos(cos)*180/Math.PI;

}

/********************************************************************/

function armSwing(

shoulder,

wrist

){

return Math.abs(

shoulder.y-

wrist.y

);

}

/********************************************************************/

function crossing(world){

const left=world[15];

const right=world[16];

const center=(

world[11].x+

world[12].x

)/2;

let value=0;

if(left.x>center){

value++;

}

if(right.x<center){

value++;

}

return value;

}

/********************************************************************/

function score(data){

let s=100;

s-=data.symmetry*40;

s-=data.crossing*20;

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

for(const frame of history){

total+=frame.score;

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