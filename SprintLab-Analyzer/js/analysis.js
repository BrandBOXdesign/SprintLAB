/*********************************************************************

 SprintLab Analyzer

 Archivo:
 analysis.js

 Versión:
 0.0.3

*********************************************************************/

import * as Bio from "./biomechanics.js";
import * as Draw from "./drawing.js";

let previousFrame=null;

/********************************************************************/

export function analyze(

ctx,

imageLandmarks,

worldLandmarks

){

if(

!imageLandmarks ||

!worldLandmarks

){

return null;

}

Draw.drawPose(

ctx,

imageLandmarks

);

const metrics=

Bio.analyzeFrame(

worldLandmarks

);

metrics.verticalOscillation=

Bio.verticalOscillation(

previousFrame,

worldLandmarks

);

previousFrame=

worldLandmarks;

const center=

Bio.centerOfMass(

worldLandmarks

);

Draw.drawCenter(

ctx,

center

);

Draw.drawPelvisAxis(

ctx,

imageLandmarks[23],

imageLandmarks[24]

);

Draw.drawShoulderAxis(

ctx,

imageLandmarks[11],

imageLandmarks[12]

);

Draw.drawTrunk(

ctx,

{

x:(imageLandmarks[23].x+imageLandmarks[24].x)/2,

y:(imageLandmarks[23].y+imageLandmarks[24].y)/2

},

{

x:(imageLandmarks[11].x+imageLandmarks[12].x)/2,

y:(imageLandmarks[11].y+imageLandmarks[12].y)/2

}

);

Draw.drawJointAngle(

ctx,

imageLandmarks[25],

metrics.leftKnee.toFixed(1)+"°"

);

Draw.drawJointAngle(

ctx,

imageLandmarks[26],

metrics.rightKnee.toFixed(1)+"°"

);

return metrics;

}