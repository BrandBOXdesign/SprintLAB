/*********************************************************************

 SprintLab Analyzer

 Archivo:
 dashboard.js

 Versión:
 0.0.4

*********************************************************************/

import * as Analysis from "./analysisEngine.js";
import * as UI from "./uiUpdater.js";
import * as Timeline from "./timeline.js";

/********************************************************************/

let frameCounter=0;

/********************************************************************/

export function reset(){

    frameCounter=0;

    Analysis.reset();

    Timeline.reset();

    UI.clear();

}

/********************************************************************/

export function analyzeFrame(world){

    const result=

        Analysis.analyze(

            world,

            performance.now()

        );

    Timeline.add(result);

    frameCounter++;

    UI.update(result);

    return result;

}

/********************************************************************/

export function currentFrame(){

    return frameCounter;

}

/********************************************************************/

export function totalFrames(){

    return Timeline.count();

}

/********************************************************************/

export function currentAnalysis(){

    return Timeline.current();

}

/********************************************************************/

export function next(){

    const frame=

        Timeline.next();

    if(frame){

        UI.update(frame);

    }

    return frame;

}

/********************************************************************/

export function previous(){

    const frame=

        Timeline.previous();

    if(frame){

        UI.update(frame);

    }

    return frame;

}

/********************************************************************/

export function first(){

    const frame=

        Timeline.first();

    if(frame){

        UI.update(frame);

    }

    return frame;

}

/********************************************************************/

export function last(){

    const frame=

        Timeline.last();

    if(frame){

        UI.update(frame);

    }

    return frame;

}

/********************************************************************/

export function summary(){

    return{

        analyzedFrames:

            frameCounter,

        storedFrames:

            Timeline.count(),

        currentFrame:

            Timeline.position(),

        progress:

            Timeline.percent()

    };

}