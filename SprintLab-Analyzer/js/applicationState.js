/*********************************************************************

 SprintLab Analyzer

 Archivo:
 applicationState.js

 Versión:
 0.0.7

*********************************************************************/

const state={

    initialized:false,

    videoLoaded:false,

    modelLoaded:false,

    analyzing:false,

    analysisFinished:false,

    currentFrame:0,

    totalFrames:0,

    progress:0

};

/********************************************************************/

export function initialize(){

    state.initialized=true;

}

/********************************************************************/

export function setVideoLoaded(

    value=true

){

    state.videoLoaded=value;

}

/********************************************************************/

export function setModelLoaded(

    value=true

){

    state.modelLoaded=value;

}

/********************************************************************/

export function setAnalyzing(

    value

){

    state.analyzing=value;

}

/********************************************************************/

export function setFinished(

    value

){

    state.analysisFinished=value;

}

/********************************************************************/

export function updateProgress(

    current,

    total

){

    state.currentFrame=current;

    state.totalFrames=total;

    state.progress=

        total===0

        ?0

        :(current/total)*100;

}

/********************************************************************/

export function get(){

    return{

        ...state

    };

}

/********************************************************************/

export function reset(){

    state.videoLoaded=false;

    state.modelLoaded=false;

    state.analyzing=false;

    state.analysisFinished=false;

    state.currentFrame=0;

    state.totalFrames=0;

    state.progress=0;

}

/********************************************************************/

export function ready(){

    return(

        state.initialized&&

        state.videoLoaded&&

        state.modelLoaded

    );

}