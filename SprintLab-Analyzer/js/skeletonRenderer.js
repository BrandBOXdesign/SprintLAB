/*********************************************************************

 SprintLab Analyzer

 Archivo:
 skeletonRenderer.js

 Versión:
 0.0.5

*********************************************************************/

const CONNECTIONS=[

[0,1],[1,2],[2,3],[3,7],

[0,4],[4,5],[5,6],[6,8],

[9,10],

[11,12],

[11,13],[13,15],

[12,14],[14,16],

[11,23],[12,24],

[23,24],

[23,25],[25,27],[27,31],

[24,26],[26,28],[28,32],

[27,29],[29,31],

[28,30],[30,32]

];

/********************************************************************/

export function draw(

canvas,

landmarks

){

if(

!canvas||

!landmarks

){

return;

}

const ctx=

canvas.getContext("2d");

ctx.clearRect(

0,

0,

canvas.width,

canvas.height

);

drawBones(

ctx,

canvas,

landmarks

);

drawJoints(

ctx,

canvas,

landmarks

);

}

/********************************************************************/

function drawBones(

ctx,

canvas,

points

){

ctx.strokeStyle="#00ff88";

ctx.lineWidth=3;

for(

const pair

of

CONNECTIONS

){

const a=

points[pair[0]];

const b=

points[pair[1]];

if(

!a||

!b

){

continue;

}

ctx.beginPath();

ctx.moveTo(

a.x*

canvas.width,

a.y*

canvas.height

);

ctx.lineTo(

b.x*

canvas.width,

b.y*

canvas.height

);

ctx.stroke();

}

}

/********************************************************************/

function drawJoints(

ctx,

canvas,

points

){

ctx.fillStyle="#ff3b30";

for(

const p

of

points

){

ctx.beginPath();

ctx.arc(

p.x*

canvas.width,

p.y*

canvas.height,

4,

0,

Math.PI*2

);

ctx.fill();

}

}