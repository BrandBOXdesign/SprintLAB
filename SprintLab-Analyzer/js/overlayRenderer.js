/*********************************************************************

 SprintLab Analyzer

 Archivo:
 overlayRenderer.js

 Versión:
 0.0.5

*********************************************************************/

import * as Skeleton from "./skeletonRenderer.js";
import * as Angles from "./angleRenderer.js";
import * as Trajectory from "./trajectoryRenderer.js";
import * as Vectors from "./vectorRenderer.js";

/********************************************************************/

export function render(

canvas,

result

){

if(

!canvas||

!result

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

Skeleton.draw(

canvas,

result.landmarks

);

Angles.draw(

canvas,

result.landmarks,

result.worldLandmarks

);

Trajectory.addFrame(

result.landmarks

);

Trajectory.drawAll(

canvas

);

if(

result.velocity&&

result.velocity.vector

){

Vectors.drawVelocity(

canvas,

result.landmarks,

result.velocity.vector

);

}

if(

result.acceleration&&

result.acceleration.vector

){

Vectors.drawAcceleration(

canvas,

result.landmarks,

result.acceleration.vector

);

}

drawInfo(

ctx,

result

);

}

/********************************************************************/

function drawInfo(

ctx,

result

){

ctx.font="16px Arial";

ctx.fillStyle="#ffffff";

let y=25;

write(

ctx,

"Fase: "+(

result.phase||

"-"

),

10,

y

);

y+=22;

if(

result.performance

){

write(

ctx,

"Score: "+

result.performance.score

.toFixed(1),

10,

y

);

y+=22;

write(

ctx,

"Nivel: "+

result.performance.level,

10,

y

);

}

}

/********************************************************************/

function write(

ctx,

text,

x,

y

){

ctx.fillText(

text,

x,

y

);

}

/********************************************************************/

export function clear(

canvas

){

canvas

.getContext("2d")

.clearRect(

0,

0,

canvas.width,

canvas.height

);

}