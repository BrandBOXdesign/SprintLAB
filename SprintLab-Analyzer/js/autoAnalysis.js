/*********************************************************************

 SprintLab Analyzer

 Archivo:
 autoAnalysis.js

 Versión:
 0.0.4

*********************************************************************/

import * as MP from "./mediapipe.js";
import * as Dashboard from "./dashboard.js";

/********************************************************************/

let running=false;

/********************************************************************/

export async function analyzeVideo(video){

    running=true;

    Dashboard.reset();

    video.pause();

    video.currentTime=0;

    while(

        running&&

        video.currentTime<video.duration

    ){

        await analyzeFrame(video);

        video.currentTime+=1/60;

    }

    running=false;

    return Dashboard.summary();

}

/********************************************************************/

async function analyzeFrame(video){

    await waitFrame();

    const pose=

        MP.analyze(video);

    if(

        pose&&

        pose.worldLandmarks

    ){

        Dashboard.analyzeFrame(

            pose.worldLandmarks

        );

    }

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

    running=false;

}

/********************************************************************/

export function isRunning(){

    return running;

}