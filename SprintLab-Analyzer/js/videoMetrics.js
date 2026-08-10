/*********************************************************************

 SprintLab Analyzer

 Archivo:
 videoMetrics.js

 Versión:
 0.0.6

*********************************************************************/

let metrics={

    width:0,

    height:0,

    fps:0,

    duration:0,

    frames:0,

    analyzedFrames:0

};

/********************************************************************/

export function reset(){

    metrics={

        width:0,

        height:0,

        fps:0,

        duration:0,

        frames:0,

        analyzedFrames:0

    };

}

/********************************************************************/

export function initialize(

    video,

    fps=60

){

    metrics.width=

        video.videoWidth;

    metrics.height=

        video.videoHeight;

    metrics.duration=

        video.duration;

    metrics.fps=fps;

    metrics.frames=

        Math.round(

            fps*

            video.duration

        );

}

/********************************************************************/

export function frameProcessed(){

    metrics.analyzedFrames++;

}

/********************************************************************/

export function progress(){

    if(

        metrics.frames===0

    ){

        return 0;

    }

    return(

        metrics.analyzedFrames/

        metrics.frames

    )*100;

}

/********************************************************************/

export function remainingFrames(){

    return Math.max(

        0,

        metrics.frames-

        metrics.analyzedFrames

    );

}

/********************************************************************/

export function analyzedTime(){

    return(

        metrics.analyzedFrames/

        metrics.fps

    );

}

/********************************************************************/

export function remainingTime(){

    return Math.max(

        0,

        metrics.duration-

        analyzedTime()

    );

}

/********************************************************************/

export function summary(){

    return{

        ...metrics,

        progress:

            progress(),

        analyzedTime:

            analyzedTime(),

        remainingTime:

            remainingTime()

    };

}

/********************************************************************/

export function exportData(){

    return{

        ...summary()

    };

}