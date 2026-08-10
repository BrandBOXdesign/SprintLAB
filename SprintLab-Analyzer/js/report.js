/*********************************************************************

 SprintLab Analyzer

 Archivo:
 report.js

 Versión:
 0.0.3

*********************************************************************/

export function createReport(metrics){

return{

date:new Date().toLocaleString(),

metrics:metrics

};

}

/********************************************************************/

export function printConsole(report){

console.clear();

console.group("SprintLab Report");

console.table(report.metrics);

console.groupEnd();

}

/********************************************************************/

export function exportJSON(report){

const json=

JSON.stringify(

report,

null,

4

);

const blob=

new Blob(

[json],

{

type:"application/json"

}

);

const url=

URL.createObjectURL(blob);

const a=

document.createElement("a");

a.href=url;

a.download=

"sprintlab-report.json";

a.click();

URL.revokeObjectURL(url);

}

/********************************************************************/

export function summary(metrics){

return{

trunk:metrics.trunkAngle,

leftKnee:metrics.leftKnee,

rightKnee:metrics.rightKnee,

stride:metrics.strideLength,

symmetry:metrics.symmetry

};

}