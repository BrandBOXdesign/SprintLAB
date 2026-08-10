/*********************************************************************

 SprintLab Analyzer

 Archivo:
 realtimeAnalyzer.js

 Versión:
 0.0.4

*********************************************************************/

import * as MP from "./mediapipe.js";
import * as Dashboard from "./dashboard.js";

/********************************************************************/

let video=null;

let running=false;

let animationId=null;

/********************************************************************/

export function attach(videoElement){

    video=videoElement;

}

/********************************************************************/

export function start(){

    if(

        !video||

        running

    ){

        return;

    }

    running=true;

    loop();

}

/********************************************************************/

export function stop(){

    running=false;

    if(animationId){

        cancelAnimationFrame(

            animationId

        );

        animationId=null;

    }

}

/********************************************************************/

function loop(){

    if(

        !running||

        !video

    ){

        return;

    }

    try{

        const result=

            MP.analyze(video);

        if(

            result&&

            result.worldLandmarks

        ){

            Dashboard.analyzeFrame(

                result.worldLandmarks

            );

        }

    }

    catch(err){

        console.error(err);

    }

    animationId=

        requestAnimationFrame(

            loop

        );

}

/********************************************************************/

export function isRunning(){

    return running;

}

/********************************************************************/

export function toggle(){

    if(running){

        stop();

    }

    else{

        start();

    }

}

/********************************************************************/

export function summary(){

    return{

        running,

        analyzedFrames:

            Dashboard.totalFrames()

    };

}