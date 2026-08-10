/*********************************************************************

 SprintLab Analyzer

 Archivo:
 qualityAnalyzer.js

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

    frames.push({

        visible:visibility(result),

        complete:completeness(result),

        confidence:confidence(result)

    });

}

/********************************************************************/

function visibility(result){

    if(

        !result||

        !result.landmarks

    ){

        return 0;

    }

    let total=0;

    for(

        const p of result.landmarks

    ){

        total+=

            p.visibility??

            1;

    }

    return total/

        result.landmarks.length;

}

/********************************************************************/

function completeness(result){

    if(

        !result||

        !result.landmarks

    ){

        return 0;

    }

    let ok=0;

    for(

        const p of result.landmarks

    ){

        if(

            Number.isFinite(p.x)&&

            Number.isFinite(p.y)

        ){

            ok++;

        }

    }

    return ok/

        result.landmarks.length;

}

/********************************************************************/

function confidence(result){

    return(

        visibility(result)+

        completeness(result)

    )/2;

}

/********************************************************************/

export function averageConfidence(){

    if(frames.length===0){

        return 0;

    }

    let total=0;

    for(

        const frame of frames

    ){

        total+=

            frame.confidence;

    }

    return total/

        frames.length;

}

/********************************************************************/

export function discardedFrames(){

    let total=0;

    for(

        const frame of frames

    ){

        if(

            frame.confidence<0.5

        ){

            total++;

        }

    }

    return total;

}

/********************************************************************/

export function summary(){

    return{

        frames:frames.length,

        confidence:

            averageConfidence(),

        discarded:

            discardedFrames()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(frames)

    );

}