/*********************************************************************

 SprintLab Analyzer

 Archivo:
 frameAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

import * as Bio from "./biomechanics.js";
import * as Draw from "./drawing.js";
import * as Metrics from "./metrics.js";
import * as Coach from "./coach.js";
import * as Report from "./report.js";
import * as Session from "./session.js";

/********************************************************************/

export function analyze(

ctx,

imageLandmarks,

worldLandmarks

){

if(

!imageLandmarks||

!worldLandmarks

){

return null;

}

const biomechanicalData=

Bio.analyzeFrame(

worldLandmarks

);

Draw.drawPose(

ctx,

imageLandmarks

);

Draw.drawCenter(

ctx,

biomechanicalData.center

);

Metrics.add(

biomechanicalData

);

Session.addFrame(

biomechanicalData

);

const observations=

Coach.analyze(

biomechanicalData

);

const report=

Report.createReport(

biomechanicalData

);

return{

metrics:biomechanicalData,

observations,

report

};

}

/********************************************************************/

export function lastMetrics(){

return Metrics.last();

}

/********************************************************************/

export function summary(){

return{

metrics:

Metrics.summary(),

coach:

Coach.summary(),

frames:

Metrics.count()

};

}

/********************************************************************/

export function reset(){

Metrics.clear();

Coach.clear();

Session.reset();

}