/*********************************************************************

 SprintLab Analyzer

 Archivo:
 performanceTimeline.js

 Versión:
 0.0.6

*********************************************************************/

const frames=[];

/********************************************************************/

export function reset(){

    frames.length=0;

}

/********************************************************************/

export function add(result){

    if(!result){

        return;

    }

    frames.push({

        frame:frames.length,

        score:

            result.performance?.score??0,

        posture:

            result.posture?.score??0,

        balance:

            result.balance?.score??0,

        stability:

            100-

            (

                result.stability?.stabilityIndex??

                1

            )*100,

        speed:

            result.velocity?.velocity??0,

        cadence:

            result.timing?.cadence??0,

        phase:

            result.phase??"UNKNOWN"

    });

}

/********************************************************************/

export function frame(index){

    if(

        index<0||

        index>=frames.length

    ){

        return null;

    }

    return frames[index];

}

/********************************************************************/

export function latest(){

    if(frames.length===0){

        return null;

    }

    return frames[frames.length-1];

}

/********************************************************************/

export function average(field){

    if(frames.length===0){

        return 0;

    }

    let total=0;

    let count=0;

    for(

        const frame of frames

    ){

        if(

            frame[field]!==undefined

        ){

            total+=frame[field];

            count++;

        }

    }

    return count?

        total/count:0;

}

/********************************************************************/

export function summary(){

    return{

        frames:

            frames.length,

        averageScore:

            average("score"),

        averageSpeed:

            average("speed"),

        averageCadence:

            average("cadence"),

        averageStability:

            average("stability")

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(frames)

    );

}