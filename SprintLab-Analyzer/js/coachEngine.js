/*********************************************************************

 SprintLab Analyzer

 Archivo:
 coachEngine.js

 Versión:
 0.0.3

*********************************************************************/

const advice=[];

/********************************************************************/

export function reset(){

    advice.length=0;

}

/********************************************************************/

export function analyze(report){

    const messages=[];

    if(report.posture<70){

        messages.push(

            "Inclina ligeramente el tronco hacia delante."

        );

    }

    if(report.balance<70){

        messages.push(

            "Reduce el movimiento lateral del cuerpo."

        );

    }

    if(report.arms<70){

        messages.push(

            "Mejora la coordinación del braceo."

        );

    }

    if(report.legs<70){

        messages.push(

            "Eleva más las rodillas durante la fase aérea."

        );

    }

    if(report.speed<70){

        messages.push(

            "Incrementa la frecuencia de zancada."

        );

    }

    if(report.cadence<70){

        messages.push(

            "Busca un ritmo de carrera más constante."

        );

    }

    if(messages.length===0){

        messages.push(

            "Excelente ejecución técnica."

        );

    }

    advice.push({

        time:new Date(),

        messages

    });

    return messages;

}

/********************************************************************/

export function latest(){

    if(advice.length===0){

        return [];

    }

    return advice[advice.length-1].messages;

}

/********************************************************************/

export function history(){

    return advice;

}

/********************************************************************/

export function summary(){

    return{

        analyses:advice.length,

        latest:latest()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(advice)

    );

}