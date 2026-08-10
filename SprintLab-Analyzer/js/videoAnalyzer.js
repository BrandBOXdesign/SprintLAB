/*********************************************************************

 SprintLab Analyzer

 Archivo:
 videoAnalyzer.js

 Versión:
 0.0.5

*********************************************************************/

import * as MP from "./mediapipe.js";
import * as Dashboard from "./dashboard.js";
import * as Timeline from "./timeline.js";

/********************************************************************/

let video=null;

let processing=false;

let frameRate=60;

/********************************************************************/

export function attach(videoElement){

    video=videoElement;

}

/********************************************************************/

export async function analyze(){

    if(

        !video||

        processing

    ){

        return;

    }

    processing=true;

    Dashboard.reset();

    Timeline.reset();

    video.pause();

    video.currentTime=0;

    while(

        processing&&

        video.currentTime<video.duration

    ){

        await nextFrame();

    }

    processing=false;

}

/********************************************************************/

async function nextFrame(){

    await waitFrame();

    const pose=

        MP.analyze(video);

    if(

        pose&&

        pose.worldLandmarks

    ){

        const result=

            Dashboard.analyzeFrame(

                pose.worldLandmarks

            );

        Timeline.add(result);

    }

    video.currentTime+=

        1/frameRate;

}

/********************************************************************/

function waitFrame(){

    return new Promise(

        resolve=>

        requestAnimationFrame(

            resolve

        )

    );

}

/********************************************************************/

export function stop(){

    processing=false;

}

/********************************************************************/

export function isRunning(){

    return processing;

}

/********************************************************************/

export function fps(value){

    if(

        value>0

    ){

        frameRate=value;

    }

    return frameRate;

}

/********************************************************************/

export function progress(){

    if(

        !video||

        video.duration===0

    ){

        return 0;

    }

    return(

        video.currentTime/

        video.duration

    )*100;

}

/********************************************************************/

export function summary(){

    return{

        running:processing,

        fps:frameRate,

        progress:progress(),

        frames:Timeline.count()

    };

}