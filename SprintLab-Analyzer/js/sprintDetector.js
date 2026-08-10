/*********************************************************************

 SprintLab Analyzer

 Archivo:
 sprintDetector.js

 Versión:
 0.0.3

*********************************************************************/

const STATE={

UNKNOWN:0,

GROUND:1,

FLIGHT:2

};

let currentState=STATE.UNKNOWN;

let previousState=STATE.UNKNOWN;

let events=[];

/********************************************************************/

export function reset(){

currentState=STATE.UNKNOWN;

previousState=STATE.UNKNOWN;

events=[];

}

/********************************************************************/

export function analyze(world){

previousState=currentState;

const leftFoot=

world[31].y;

const rightFoot=

world[32].y;

const threshold=0.92;

if(

leftFoot>threshold||

rightFoot>threshold

){

currentState=STATE.GROUND;

}else{

currentState=STATE.FLIGHT;

}

detectEvents();

return{

state:currentState,

events:[...events]

};

}

/********************************************************************/

function detectEvents(){

if(previousState===currentState){

return;

}

if(

previousState===STATE.FLIGHT&&

currentState===STATE.GROUND

){

events.push({

type:"Foot Contact",

time:performance.now()

});

}

if(

previousState===STATE.GROUND&&

currentState===STATE.FLIGHT

){

events.push({

type:"Toe Off",

time:performance.now()

});

}

}

/********************************************************************/

export function current(){

return currentState;

}

/********************************************************************/

export function isGround(){

return currentState===STATE.GROUND;

}

/********************************************************************/

export function isFlight(){

return currentState===STATE.FLIGHT;

}

/********************************************************************/

export function history(){

return events;

}

/********************************************************************/

export function lastEvent(){

if(events.length===0){

return null;

}

return events[events.length-1];

}

/********************************************************************/

export function contacts(){

return events.filter(

e=>e.type==="Foot Contact"

).length;

}

/********************************************************************/

export function toeOffs(){

return events.filter(

e=>e.type==="Toe Off"

).length;

}

/********************************************************************/

export function summary(){

return{

contacts:contacts(),

toeOffs:toeOffs(),

totalEvents:events.length,

state:currentState

};

}