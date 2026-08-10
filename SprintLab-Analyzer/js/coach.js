/*********************************************************************

 SprintLab Analyzer

 Archivo:
 coach.js

 Versión:
 0.0.3

*********************************************************************/

const observations=[];

/********************************************************************/

export function clear(){

observations.length=0;

}

/********************************************************************/

export function analyze(metrics){

clear();

if(metrics.trunkAngle>12){

observations.push({

type:"warning",

title:"Inclinación excesiva",

message:"El tronco presenta una inclinación superior a la recomendada."

});

}

if(metrics.leftKnee<150){

observations.push({

type:"warning",

title:"Rodilla izquierda",

message:"La extensión de la rodilla izquierda es reducida."

});

}

if(metrics.rightKnee<150){

observations.push({

type:"warning",

title:"Rodilla derecha",

message:"La extensión de la rodilla derecha es reducida."

});

}

if(metrics.strideLength<1){

observations.push({

type:"info",

title:"Zancada",

message:"La longitud de zancada puede mejorarse."

});

}

if(

metrics.symmetry.knee>10||

metrics.symmetry.hip>10||

metrics.symmetry.ankle>10

){

observations.push({

type:"warning",

title:"Asimetría",

message:"Se detectan diferencias importantes entre ambos lados del cuerpo."

});

}

if(observations.length===0){

observations.push({

type:"success",

title:"Buen resultado",

message:"No se detectan desviaciones importantes en este fotograma."

});

}

return observations;

}

/********************************************************************/

export function all(){

return observations;

}

/********************************************************************/

export function count(){

return observations.length;

}

/********************************************************************/

export function hasWarnings(){

return observations.some(

o=>o.type==="warning"

);

}

/********************************************************************/

export function summary(){

return{

total:count(),

warnings:

observations.filter(

o=>o.type==="warning"

).length,

information:

observations.filter(

o=>o.type==="info"

).length,

success:

observations.filter(

o=>o.type==="success"

).length

};

}

/********************************************************************/

export function exportData(){

return JSON.parse(

JSON.stringify(

observations

)

);

}