/*********************************************************************

 SprintLab Analyzer

 Archivo:
 timingAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

const history=[];

let previousPhase=null;

let previousTime=0;

/********************************************************************/

export function reset(){

    history.length=0;

    previousPhase=null;

    previousTime=0;

}

/********************************************************************/

export function analyze(

    phase,

    time

){

    const result={

        phase,

        duration:0,

        contactTime:0,

        flightTime:0,

        strideTime:0

    };

    if(previousPhase!==null){

        result.duration=

            time-

            previousTime;

        switch(previousPhase){

            case"STANCE":

            case"LANDING":

                result.contactTime=

                    result.duration;

            break;

            case"FLIGHT":

                result.flightTime=

                    result.duration;

            break;

        }

    }

    previousPhase=phase;

    previousTime=time;

    history.push(result);

    return result;

}

/********************************************************************/

export function averageContactTime(){

    let total=0;

    let count=0;

    for(const item of history){

        if(item.contactTime>0){

            total+=item.contactTime;

            count++;

        }

    }

    return count?

        total/count:0;

}

/********************************************************************/

export function averageFlightTime(){

    let total=0;

    let count=0;

    for(const item of history){

        if(item.flightTime>0){

            total+=item.flightTime;

            count++;

        }

    }

    return count?

        total/count:0;

}

/********************************************************************/

export function cadence(){

    const strides=

        history.filter(

            h=>h.phase==="LANDING"

        ).length;

    if(history.length===0){

        return 0;

    }

    return(

        strides/

        history.length

    )*60;

}

/********************************************************************/

export function latest(){

    if(history.length===0){

        return null;

    }

    return history[history.length-1];

}

/********************************************************************/

export function summary(){

    return{

        frames:history.length,

        averageContact:

            averageContactTime(),

        averageFlight:

            averageFlightTime(),

        cadence:

            cadence()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(history)

    );

}