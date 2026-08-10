/*********************************************************************

 SprintLab Analyzer

 Archivo:
 frameProcessor.js

 Versión:
 0.0.7

*********************************************************************/

import * as MP from "./mediapipe.js";
import * as Pipeline from "./analysisPipeline.js";
import * as Overlay from "./overlayRenderer.js";
import * as Dashboard from "./dashboard.js";

/********************************************************************/

export function process(

    video,

    canvas

){

    const pose=

        MP.analyze(video);

    if(

        !pose||

        !pose.worldLandmarks||

        !pose.landmarks

    ){

        return null;

    }

    const result={

        landmarks:

            pose.landmarks,

        worldLandmarks:

            pose.worldLandmarks

    };

    const processed=

        Pipeline.process(

            result

        );

    Overlay.render(

        canvas,

        processed

    );

    Dashboard.analyzeFrame(

        processed.worldLandmarks

    );

    return processed;

}

/********************************************************************/

export function processSequence(

    video,

    canvas,

    callback

){

    const result=

        process(

            video,

            canvas

        );

    if(

        result&&

        callback

    ){

        callback(

            result

        );

    }

    return result;

}

/********************************************************************/

export function processList(

    frames,

    callback

){

    const output=[];

    for(

        const frame

        of

        frames

    ){

        const result=

            Pipeline.process(

                frame

            );

        output.push(

            result

        );

        if(

            callback

        ){

            callback(

                result

            );

        }

    }

    return output;

}