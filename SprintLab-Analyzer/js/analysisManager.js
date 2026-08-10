/*********************************************************************

 SprintLab Analyzer

 Archivo:
 analysisManager.js

 Versión:
 0.0.7

*********************************************************************/

import * as Scheduler from "./analysisScheduler.js";
import * as Controller from "./applicationController.js";
import * as FrameProcessor from "./frameProcessor.js";

/********************************************************************/

let video=null;

let canvas=null;

/********************************************************************/

export function initialize(

    videoElement,

    canvasElement

){

    video=videoElement;

    canvas=canvasElement;

    Controller.initialize(

        video,

        canvas

    );

    Scheduler.initialize(

        video,

        canvas,

        frameReady

    );

}

/********************************************************************/

function frameReady(

    result

){

    Controller.analyzeFrame(

        result

    );

}

/********************************************************************/

export function analyzeCurrentFrame(){

    return FrameProcessor.process(

        video,

        canvas

    );

}

/********************************************************************/

export function start(){

    Scheduler.start();

}

/********************************************************************/

export function pause(){

    Scheduler.pause();

}

/********************************************************************/

export function resume(){

    Scheduler.resume();

}

/********************************************************************/

export function stop(){

    Scheduler.stop();

}

/********************************************************************/

export function reset(){

    Scheduler.stop();

    Controller.reset();

}

/********************************************************************/

export function running(){

    return Scheduler.isRunning();

}

/********************************************************************/

export function summary(){

    return{

        scheduler:

            Scheduler.summary(),

        controller:

            Controller.status()

    };

}