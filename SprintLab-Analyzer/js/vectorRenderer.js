/*********************************************************************

 SprintLab Analyzer

 Archivo:
 vectorRenderer.js

 Versión:
 0.0.5

*********************************************************************/

/********************************************************************/

export function drawVector(

canvas,

point,

vx,

vy,

color="#00ff00",

scale=120

){

if(

!canvas||

!point

){

return;

}

const ctx=

canvas.getContext("2d");

const x=

point.x*

canvas.width;

const y=

point.y*

canvas.height;

const ex=

x+

vx*

scale;

const ey=

y+

vy*

scale;

ctx.strokeStyle=color;

ctx.lineWidth=3;

ctx.beginPath();

ctx.moveTo(

x,

y

);

ctx.lineTo(

ex,

ey

);

ctx.stroke();

drawArrow(

ctx,

ex,

ey,

Math.atan2(

ey-y,

ex-x

),

color

);

}

/********************************************************************/

function drawArrow(

ctx,

x,

y,

angle,

color

){

const size=10;

ctx.fillStyle=color;

ctx.beginPath();

ctx.moveTo(

x,

y

);

ctx.lineTo(

x-size*Math.cos(

angle-Math.PI/6

),

y-size*Math.sin(

angle-Math.PI/6

)

);

ctx.lineTo(

x-size*Math.cos(

angle+Math.PI/6

),

y-size*Math.sin(

angle+Math.PI/6

)

);

ctx.closePath();

ctx.fill();

}

/********************************************************************/

export function drawVelocity(

canvas,

landmarks,

velocity

){

if(

!landmarks||

landmarks.length===0

){

return;

}

drawVector(

canvas,

landmarks[0],

velocity.x,

velocity.y,

"#00ff00"

);

}

/********************************************************************/

export function drawAcceleration(

canvas,

landmarks,

acceleration

){

if(

!landmarks||

landmarks.length===0

){

return;

}

drawVector(

canvas,

landmarks[0],

acceleration.x,

acceleration.y,

"#ff9500"

);

}

/********************************************************************/

export function drawDirection(

canvas,

start,

end

){

if(

!start||

!end

){

return;

}

drawVector(

canvas,

start,

end.x-start.x,

end.y-start.y,

"#00ffff",

250

);

}