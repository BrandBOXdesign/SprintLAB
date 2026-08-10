/*********************************************************************

 SprintLab Analyzer

 Archivo:
 js/drawing.js

 Versión:
 0.0.3

*********************************************************************/

const CONNECTIONS=[

[11,13],[13,15],
[12,14],[14,16],

[11,12],

[11,23],
[12,24],

[23,24],

[23,25],
[25,27],
[27,29],
[29,31],

[24,26],
[26,28],
[28,30],
[30,32]

];

/********************************************************************/

export function clear(ctx){

ctx.clearRect(

0,
0,
ctx.canvas.width,
ctx.canvas.height

);

}

/********************************************************************/

export function drawPose(ctx,points){

clear(ctx);

drawConnections(ctx,points);

drawLandmarks(ctx,points);

}

/********************************************************************/

export function drawLandmarks(ctx,points){

ctx.fillStyle="#ff3b30";

for(const p of points){

const x=p.x*ctx.canvas.width;

const y=p.y*ctx.canvas.height;

ctx.beginPath();

ctx.arc(

x,
y,
5,
0,
Math.PI*2

);

ctx.fill();

}

}

/********************************************************************/

export function drawConnections(ctx,points){

ctx.strokeStyle="#00d2ff";

ctx.lineWidth=2;

for(const c of CONNECTIONS){

const a=points[c[0]];

const b=points[c[1]];

if(!a||!b){

continue;

}

ctx.beginPath();

ctx.moveTo(

a.x*ctx.canvas.width,

a.y*ctx.canvas.height

);

ctx.lineTo(

b.x*ctx.canvas.width,

b.y*ctx.canvas.height

);

ctx.stroke();

}

}

/********************************************************************/

export function drawCenter(ctx,center){

ctx.fillStyle="#00ff66";

ctx.beginPath();

ctx.arc(

center.x*ctx.canvas.width,

center.y*ctx.canvas.height,

8,

0,

Math.PI*2

);

ctx.fill();

}

/********************************************************************/

export function drawJointAngle(

ctx,

joint,

text

){

ctx.fillStyle="white";

ctx.font="16px Arial";

ctx.fillText(

text,

joint.x*ctx.canvas.width+10,

joint.y*ctx.canvas.height-10

);

}

/********************************************************************/

export function drawLine(

ctx,

a,

b,

color="#ffff00"

){

ctx.strokeStyle=color;

ctx.lineWidth=2;

ctx.beginPath();

ctx.moveTo(

a.x*ctx.canvas.width,

a.y*ctx.canvas.height

);

ctx.lineTo(

b.x*ctx.canvas.width,

b.y*ctx.canvas.height

);

ctx.stroke();

}

/********************************************************************/

export function drawPelvisAxis(

ctx,

leftHip,

rightHip

){

drawLine(

ctx,

leftHip,

rightHip,

"#00ff00"

);

}

/********************************************************************/

export function drawShoulderAxis(

ctx,

left,

right

){

drawLine(

ctx,

left,

right,

"#00ffff"

);

}

/********************************************************************/

export function drawTrunk(

ctx,

pelvis,

shoulders

){

drawLine(

ctx,

pelvis,

shoulders,

"#ff00ff"

);

}