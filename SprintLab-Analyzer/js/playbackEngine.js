/*********************************************************************

 SprintLab Analyzer

 Archivo:
 playbackEngine.js

 Versión:
 0.0.3

*********************************************************************/

import * as Timeline from "./timeline.js";
import * as Video from "./videoController.js";

let animationId=null;

let callback=null;

/********************************************************************/

export function initialize(

    video,

    frameCallback

){

    Video.attach(video);

    callback=frameCallback;

}

/********************************************************************/

export function play(){

    Video.play();

    update();

}

/********************************************************************/

export function pause(){

    Video.pause();

    stopLoop();

}

/********************************************************************/

export function stop(){

    Video.stop();

    stopLoop();

    Timeline.goTo(0);

}

/********************************************************************/

export function nextFrame(){

    Video.nextFrame();

    Timeline.next();

    notify();

}

/********************************************************************/

export function previousFrame(){

    Video.previousFrame();

    Timeline.previous();

    notify();

}

/********************************************************************/

function update(){

    if(

        !Video.isPlaying()

    ){

        stopLoop();

        return;

    }

    notify();

    animationId=

        requestAnimationFrame(

            update

        );

}

/********************************************************************/

function notify(){

    if(callback){

        callback(

            Timeline.current(),

            Video.summary()

        );

    }

}

/********************************************************************/

function stopLoop(){

    if(animationId){

        cancelAnimationFrame(

            animationId

        );

        animationId=null;

    }

}

/********************************************************************/

export function speed(rate){

    Video.speed(rate);

}

/********************************************************************/

export function status(){

    return{

        video:Video.summary(),

        frame:Timeline.position(),

        totalFrames:Timeline.count()

    };

}