/*********************************************************************

 SprintLab Analyzer

 Archivo:
 cameraCalibration.js

 Versión:
 0.0.6

*********************************************************************/

let calibration={

pixelsPerMeter:0,

cameraAngle:0,

referenceHeight:1.80,

ready:false

};

/********************************************************************/

export function reset(){

calibration={

pixelsPerMeter:0,

cameraAngle:0,

referenceHeight:1.80,

ready:false

};

}

/********************************************************************/

export function calibrate(

landmarks,

athleteHeight=1.80

){

if(

!landmarks||

landmarks.length<33

){

return calibration;

}

const nose=landmarks[0];

const leftFoot=landmarks[31];

const rightFoot=landmarks[32];

const foot={

x:(leftFoot.x+rightFoot.x)/2,

y:(leftFoot.y+rightFoot.y)/2

};

const pixels=

Math.abs(

foot.y-

nose.y

);

calibration.pixelsPerMeter=

pixels/

athleteHeight;

calibration.cameraAngle=

estimateAngle(

landmarks

);

calibration.referenceHeight=

athleteHeight;

calibration.ready=true;

return calibration;

}

/********************************************************************/

function estimateAngle(

landmarks

){

const left=

landmarks[11];

const right=

landmarks[12];

return Math.atan2(

right.y-left.y,

right.x-left.x

)*180/Math.PI;

}

/********************************************************************/

export function pixelsToMeters(

pixels

){

if(

!calibration.ready||

calibration.pixelsPerMeter===0

){

return 0;

}

return pixels/

calibration.pixelsPerMeter;

}

/********************************************************************/

export function metersToPixels(

meters

){

return meters*

calibration.pixelsPerMeter;

}

/********************************************************************/

export function ready(){

return calibration.ready;

}

/********************************************************************/

export function data(){

return{

...calibration

};

}