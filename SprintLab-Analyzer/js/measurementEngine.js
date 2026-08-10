/*********************************************************************

 SprintLab Analyzer

 Archivo:
 measurementEngine.js

 Versión:
 0.0.6

*********************************************************************/

import * as Calibration from "./cameraCalibration.js";

/********************************************************************/

export function distance(

a,

b

){

if(

!a||

!b

){

return 0;

}

const dx=

b.x-a.x;

const dy=

b.y-a.y;

const dz=

(b.z??0)-(a.z??0);

const pixels=

Math.sqrt(

dx*dx+

dy*dy+

dz*dz

);

return Calibration

.pixelsToMeters(

pixels

);

}

/********************************************************************/

export function horizontal(

a,

b

){

if(

!a||

!b

){

return 0;

}

return Calibration

.pixelsToMeters(

Math.abs(

b.x-a.x

)

);

}

/********************************************************************/

export function vertical(

a,

b

){

if(

!a||

!b

){

return 0;

}

return Calibration

.pixelsToMeters(

Math.abs(

b.y-a.y

)

);

}

/********************************************************************/

export function bodyHeight(

landmarks

){

if(

!landmarks||

landmarks.length<33

){

return 0;

}

const head=

landmarks[0];

const feet={

x:(

landmarks[31].x+

landmarks[32].x

)/2,

y:(

landmarks[31].y+

landmarks[32].y

)/2,

z:(

landmarks[31].z+

landmarks[32].z

)/2

};

return distance(

head,

feet

);

}

/********************************************************************/

export function strideLength(

left,

right

){

return horizontal(

left,

right

);

}

/********************************************************************/

export function stepWidth(

left,

right

){

return distance(

left,

right

);

}

/********************************************************************/

export function summary(

landmarks

){

return{

height:

bodyHeight(

landmarks

),

ready:

Calibration

.ready()

};

}