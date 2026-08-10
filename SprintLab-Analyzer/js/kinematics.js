/*********************************************************************

 SprintLab Analyzer

 Archivo:
 kinematics.js

 Versión:
 0.0.3

*********************************************************************/

const previous=[];

const history=[];

/********************************************************************/

export function reset(){

previous.length=0;

history.length=0;

}

/********************************************************************/

export function analyze(

world,

time

){

const frame=[];

for(let i=0;i<world.length;i++){

const point=world[i];

let vx=0;

let vy=0;

let vz=0;

let ax=0;

let ay=0;

let az=0;

if(previous[i]){

const dt=(time-previous[i].time)/1000;

if(dt>0){

vx=(point.x-previous[i].x)/dt;

vy=(point.y-previous[i].y)/dt;

vz=(point.z-previous[i].z)/dt;

ax=(vx-previous[i].vx)/dt;

ay=(vy-previous[i].vy)/dt;

az=(vz-previous[i].vz)/dt;

}

}

frame.push({

x:point.x,

y:point.y,

z:point.z,

vx,

vy,

vz,

ax,

ay,

az

});

previous[i]={

x:point.x,

y:point.y,

z:point.z,

vx,

vy,

vz,

time

};

}

history.push(frame);

return frame;

}

/********************************************************************/

export function joint(index){

if(history.length===0){

return null;

}

return history[history.length-1][index];

}

/********************************************************************/

export function velocity(index){

const j=joint(index);

if(!j){

return 0;

}

return Math.sqrt(

j.vx*j.vx+

j.vy*j.vy+

j.vz*j.vz

);

}

/********************************************************************/

export function acceleration(index){

const j=joint(index);

if(!j){

return 0;

}

return Math.sqrt(

j.ax*j.ax+

j.ay*j.ay+

j.az*j.az

);

}

/********************************************************************/

export function historyData(){

return history;

}

/********************************************************************/

export function totalFrames(){

return history.length;

}

/********************************************************************/

export function summary(){

return{

frames:history.length,

pelvisVelocity:velocity(23),

kneeVelocity:velocity(25),

ankleVelocity:velocity(27),

wristVelocity:velocity(15)

};

}