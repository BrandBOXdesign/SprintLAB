/*********************************************************************

 SprintLab Analyzer

 Archivo:
 aiCoach.js

 Versión:
 0.0.6

*********************************************************************/

const history=[];

/********************************************************************/

export function evaluate(report){

    const advice=[];

    analyzePosture(

        report,

        advice

    );

    analyzeLegs(

        report,

        advice

    );

    analyzeArms(

        report,

        advice

    );

    analyzeCadence(

        report,

        advice

    );

    analyzeSpeed(

        report,

        advice

    );

    analyzeBalance(

        report,

        advice

    );

    if(

        advice.length===0

    ){

        advice.push({

            priority:1,

            title:"Excelente",

            message:

            "La técnica observada es muy eficiente."

        });

    }

    history.push(advice);

    return advice;

}

/********************************************************************/

function analyzePosture(

report,

list

){

if(report.posture<75){

list.push({

priority:5,

title:"Postura",

message:

"Mantén el tronco ligeramente inclinado hacia delante."

});

}

}

/********************************************************************/

function analyzeLegs(

report,

list

){

if(report.legs<75){

list.push({

priority:5,

title:"Piernas",

message:

"Incrementa la elevación de rodillas."

});

}

}

/********************************************************************/

function analyzeArms(

report,

list

){

if(report.arms<75){

list.push({

priority:4,

title:"Braceo",

message:

"El braceo debe ser más rápido y simétrico."

});

}

}

/********************************************************************/

function analyzeCadence(

report,

list

){

if(report.cadence<75){

list.push({

priority:3,

title:"Cadencia",

message:

"Aumenta ligeramente la frecuencia de zancada."

});

}

}

/********************************************************************/

function analyzeSpeed(

report,

list

){

if(report.speed<75){

list.push({

priority:4,

title:"Velocidad",

message:

"Mejora la aplicación de fuerza horizontal."

});

}

}

/********************************************************************/

function analyzeBalance(

report,

list

){

if(report.balance<75){

list.push({

priority:4,

title:"Equilibrio",

message:

"Reduce las oscilaciones laterales."

});

}

}

/********************************************************************/

export function latest(){

if(history.length===0){

return[];

}

return history[history.length-1];

}

/********************************************************************/

export function reset(){

history.length=0;

}

/********************************************************************/

export function exportData(){

return JSON.parse(

JSON.stringify(history)

);

}