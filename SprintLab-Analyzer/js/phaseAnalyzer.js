/*********************************************************************

 SprintLab Analyzer

 Archivo:
 phaseAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

const PHASE={

UNKNOWN:"UNKNOWN",

STANCE:"STANCE",

TOE_OFF:"TOE_OFF",

FLIGHT:"FLIGHT",

LANDING:"LANDING"

};

let currentPhase=PHASE.UNKNOWN;

let previousPhase=PHASE.UNKNOWN;

const history=[];

/********************************************************************/

export function reset(){

currentPhase=PHASE.UNKNOWN;

previousPhase=PHASE.UNKNOWN;

history.length=0;

}

/********************************************************************/

export function analyze(world){

previousPhase=currentPhase;

const leftHeel=world[29].y;
const rightHeel=world[30].y;

const leftToe=world[31].y;
const rightToe=world[32].y;

const footHeight=Math.min(

leftHeel,
rightHeel,
leftToe,
rightToe

);

if(footHeight>0.92){

currentPhase=PHASE.STANCE;

}
else if(footHeight>0.88){

currentPhase=PHASE.TOE_OFF;

}
else{

currentPhase=PHASE.FLIGHT;

}

if(

previousPhase===PHASE.FLIGHT&&

currentPhase===PHASE.STANCE

){

currentPhase=PHASE.LANDING;

}

history.push({

phase:currentPhase,

time:performance.now()

});

return currentPhase;

}

/********************************************************************/

export function current(){

return currentPhase;

}

/********************************************************************/

export function previous(){

return previousPhase;

}

/********************************************************************/

export function isFlight(){

return currentPhase===PHASE.FLIGHT;

}

/********************************************************************/

export function isSupport(){

return currentPhase===PHASE.STANCE;

}

/********************************************************************/

export function isLanding(){

return currentPhase===PHASE.LANDING;

}

/********************************************************************/

export function totalFrames(){

return history.length;

}

/********************************************************************/

export function historyData(){

return history;

}

/********************************************************************/

export function summary(){

let stance=0;
let flight=0;
let landing=0;
let toeOff=0;

for(const frame of history){

switch(frame.phase){

case PHASE.STANCE:

stance++;

break;

case PHASE.FLIGHT:

flight++;

break;

case PHASE.LANDING:

landing++;

break;

case PHASE.TOE_OFF:

toeOff++;

break;

}

}

return{

stance,

toeOff,

flight,

landing,

frames:history.length

};

}