/*********************************************************************

 SprintLab Analyzer

 Archivo:
 metrics.js

 Versión:
 0.0.3

*********************************************************************/

const history=[];

/********************************************************************/

export function clear(){

history.length=0;

}

/********************************************************************/

export function add(frame){

history.push(frame);

}

/********************************************************************/

export function all(){

return history;

}

/********************************************************************/

export function last(){

if(history.length===0){

return null;

}

return history[history.length-1];

}

/********************************************************************/

export function count(){

return history.length;

}

/********************************************************************/

export function average(metric){

if(history.length===0){

return 0;

}

let total=0;

let valid=0;

for(const frame of history){

if(frame[metric]!==undefined){

total+=frame[metric];

valid++;

}

}

if(valid===0){

return 0;

}

return total/valid;

}

/********************************************************************/

export function minimum(metric){

if(history.length===0){

return 0;

}

let value=Infinity;

for(const frame of history){

if(frame[metric]===undefined){

continue;

}

if(frame[metric]<value){

value=frame[metric];

}

}

return value===Infinity?0:value;

}

/********************************************************************/

export function maximum(metric){

if(history.length===0){

return 0;

}

let value=-Infinity;

for(const frame of history){

if(frame[metric]===undefined){

continue;

}

if(frame[metric]>value){

value=frame[metric];

}

}

return value===-Infinity?0:value;

}

/********************************************************************/

export function summary(){

return{

frames:count(),

trunkAverage:average("trunkAngle"),

leftKneeAverage:average("leftKnee"),

rightKneeAverage:average("rightKnee"),

leftHipAverage:average("leftHip"),

rightHipAverage:average("rightHip"),

leftAnkleAverage:average("leftAnkle"),

rightAnkleAverage:average("rightAnkle"),

strideAverage:average("strideLength"),

trunkMin:minimum("trunkAngle"),

trunkMax:maximum("trunkAngle"),

strideMin:minimum("strideLength"),

strideMax:maximum("strideLength")

};

}

/********************************************************************/

export function exportData(){

return JSON.parse(

JSON.stringify(history)

);

}