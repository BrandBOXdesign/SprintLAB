/*********************************************************************

 SprintLab Analyzer

 Archivo:
 mediapipe.js

 Versión:
 0.0.1

*********************************************************************/

import {
    FilesetResolver,
    PoseLandmarker
}
from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs";

const WASM_URL =
"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const MODEL_URLS={

    lite:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",

    full:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",

    heavy:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"

};

let vision=null;

let detector=null;

let loadedModel="";

export async function loadModel(model){

    if(detector){

        detector.close();

        detector=null;

    }

    if(!vision){

        vision=await FilesetResolver.forVisionTasks(WASM_URL);

    }

    detector=
    await PoseLandmarker.createFromOptions(

        vision,

        {

            baseOptions:{

                modelAssetPath:MODEL_URLS[model],

                delegate:"GPU"

            },

            runningMode:"VIDEO",

            numPoses:1

        }

    );

    loadedModel=model;

    return true;

}

export function currentModel(){

    return loadedModel;

}

export function analyze(video){

    if(!detector){

        throw new Error("Modelo no cargado.");

    }

    const result=

        detector.detectForVideo(

            video,

            performance.now()

        );

    return{

        landmarks:

            result.landmarks?.[0]??null,

        worldLandmarks:

            result.worldLandmarks?.[0]??null

    };

}