/*********************************************************************

 SprintLab Analyzer

 Archivo:
 angleRenderer.js

 Versión:
 0.0.5

*********************************************************************/

import * as Bio from "./biomechanics.js";

/********************************************************************/

export function draw(

canvas,

landmarks,

world

){

if(

!canvas||

!landmarks||

!world

){

return;

}

const ctx=

canvas.getContext("2d");

ctx.font="16px Arial";

ctx.fillStyle="#ffd60a";

drawAngle(

ctx,

canvas,

landmarks[25],

Bio.kneeAngleLeft(world)

);

drawAngle(

ctx,

canvas,

landmarks[26],

Bio.kneeAngleRight(world)

);

drawAngle(

ctx,

canvas,

landmarks[23],

Bio.hipAngleLeft(world)

);

drawAngle(

ctx,

canvas,

landmarks[24],

Bio.hipAngleRight(world)

);

drawAngle(

ctx,

canvas,

landmarks[27],

Bio.ankleAngleLeft(world)

);

drawAngle(

ctx,

canvas,

landmarks[28],

Bio.ankleAngleRight(world)

);

drawAngle(

ctx,

canvas,

landmarks[13],

Bio.elbowAngleLeft(world)

);

drawAngle(

ctx,

canvas,

landmarks[14],

Bio.elbowAngleRight(world)

);

}

/********************************************************************/

function drawAngle(

ctx,

canvas,

point,

angle

){

if(

!point||

angle===undefined||

Number.isNaN(angle)

){

return;

}

const x=

point.x*

canvas.width;

const y=

point.y*

canvas.height;

ctx.beginPath();

ctx.arc(

x,

y,

18,

0,

Math.PI*2

);

ctx.strokeStyle="#ffd60a";

ctx.lineWidth=2;

ctx.stroke();

ctx.fillText(

angle.toFixed(0)+"°",

x+22,

y+5

);

}