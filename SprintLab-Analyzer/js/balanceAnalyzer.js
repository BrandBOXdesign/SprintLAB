/*********************************************************************

 SprintLab Analyzer

 Archivo:
 balanceAnalyzer.js

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

pelvis:pelvisBalance(world),

shoulders:shoulderBalance(world),

feet:footBalance(world),

knees:kneeBalance(world),

hips:hipBalance(world),

score:0

};

result.score=

calculateScore(result);

history.push(result);

return result;

}

/********************************************************************/

function pelvisBalance(world){

return Math.abs(

world[23].y-

world[24].y

);

}

/********************************************************************/

function shoulderBalance(world){

return Math.abs(

world[11].y-

world[12].y

);

}

/********************************************************************/

function footBalance(world){

return Math.abs(

world[31].y-

world[32].y

);

}

/********************************************************************/

function kneeBalance(world){

return Math.abs(

world[25].y-

world[26].y

);

}

/********************************************************************/

function hipBalance(world){

return Math.abs(

world[23].x-

world[24].x

);

}

/********************************************************************/

function calculateScore(data){

const error=

data.pelvis+

data.shoulders+

data.feet+

data.knees+

data.hips;

const score=

100-(error*100);

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

export function minimumScore(){

if(history.length===0){

return 0;

}

let value=100;

for(const item of history){

if(item.score<value){

value=item.score;

}

}

return value;

}

/********************************************************************/

export function maximumScore(){

if(history.length===0){

return 0;

}

let value=0;

for(const item of history){

if(item.score>value){

value=item.score;

}

}

return value;

}

/********************************************************************/

export function summary(){

return{

frames:history.length,

average:averageScore(),

minimum:minimumScore(),

maximum:maximumScore()

};

}

/********************************************************************/

export function exportData(){

return JSON.parse(

JSON.stringify(history)

);

}