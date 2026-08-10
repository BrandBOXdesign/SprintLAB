/*********************************************************************

 SprintLab Analyzer

 Archivo:
 applicationController.js

 Versión:
 0.0.7

*********************************************************************/

import * as VideoAnalyzer from "./videoAnalyzer.js";
import * as Pipeline from "./analysisPipeline.js";
import * as Overlay from "./overlayRenderer.js";
import * as Dashboard from "./dashboard.js";

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

    VideoAnalyzer.attach(

        video

    );

    Pipeline.reset();

    Dashboard.reset();

}

/********************************************************************/

export async function analyzeVideo(){

    await VideoAnalyzer.analyze();

}

/********************************************************************/

export function analyzeFrame(result){

    if(

        !result

    ){

        return null;

    }

    const processed=

        Pipeline.process(

            result

        );

    Dashboard.analyzeFrame(

        processed.worldLandmarks

    );

    Overlay.render(

        canvas,

        processed

    );

    return processed;

}

/********************************************************************/

export function reset(){

    Pipeline.reset();

    Dashboard.reset();

    Overlay.clear(

        canvas

    );

}

/********************************************************************/

export function status(){

    return{

        dashboard:

            Dashboard.summary(),

        analyzer:

            VideoAnalyzer.summary()

    };

}