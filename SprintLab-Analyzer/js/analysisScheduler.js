/*********************************************************************

 SprintLab Analyzer

 Archivo:
 analysisScheduler.js

 Versión:
 0.0.7

*********************************************************************/

import * as FrameProcessor from "./frameProcessor.js";

/********************************************************************/

let video=null;

let canvas=null;

let running=false;

let animationId=null;

let callback=null;

/********************************************************************/

export function initialize(

    videoElement,

    canvasElement,

    frameCallback=null

){

    video=videoElement;

    canvas=canvasElement;

    callback=frameCallback;

}

/********************************************************************/

export function start(){

    if(

        running||

        !video||

        !canvas

    ){

        return;

    }

    running=true;

    loop();

}

/********************************************************************/

function loop(){

    if(

        !running

    ){

        return;

    }

    const result=

        FrameProcessor.process(

            video,

            canvas

        );

    if(

        callback&&

        result

    ){

        callback(

            result

        );

    }

    animationId=

        requestAnimationFrame(

            loop

        );

}

/********************************************************************/

export function pause(){

    running=false;

    if(

        animationId

    ){

        cancelAnimationFrame(

            animationId

        );

        animationId=null;

    }

}

/********************************************************************/

export function resume(){

    if(

        running

    ){

        return;

    }

    running=true;

    loop();

}

/********************************************************************/

export function stop(){

    pause();

}

/********************************************************************/

export function isRunning(){

    return running;

}

/********************************************************************/

export function summary(){

    return{

        running,

        videoReady:

            video!==null,

        canvasReady:

            canvas!==null

    };

}