/*********************************************************************

 SprintLab Analyzer

 Archivo:
 legAnalyzer.js

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

leftKneeHeight:kneeHeight(

world[23],

world[25]

),

rightKneeHeight:kneeHeight(

world[24],

world[26]

),

leftRecovery:footRecovery(

world[27],

world[31]

),

rightRecovery:footRecovery(

world[28],

world[32]

),

leftExtension:extension(

world[23],

world[25],

world[27]

),

rightExtension:extension(

world[24],

world[26],

world[28]

),

symmetry:0,

score:0

};

result.symmetry=

Math.abs(

result.leftKneeHeight-

result.rightKneeHeight

);

result.score=

calculateScore(result);

history.push(result);

return result;

}

/********************************************************************/

function kneeHeight(

hip,

knee

){

return hip.y-knee.y;

}

/********************************************************************/

function footRecovery(

ankle,

foot

){

return Math.abs(

ankle.y-

foot.y

);

}

/********************************************************************/

function extension(

hip,

knee,

ankle

){

const a={

x:hip.x-knee.x,

y:hip.y-knee.y,

z:hip.z-knee.z

};

const b={

x:ankle.x-knee.x,

y:ankle.y-knee.y,

z:ankle.z-knee.z

};

const dot=

a.x*b.x+

a.y*b.y+

a.z*b.z;

const ma=Math.sqrt(

a.x*a.x+

a.y*a.y+

a.z*a.z

);

const mb=Math.sqrt(

b.x*b.x+

b.y*b.y+

b.z*b.z

);

if(

ma===0||

mb===0

){

return 0;

}

let cos=dot/(ma*mb);

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

function calculateScore(data){

let score=100;

score-=data.symmetry*40;

score-=Math.abs(

data.leftExtension-

data.rightExtension

)*0.2;

return Math.max(

0,

Math.min(

100,

score

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