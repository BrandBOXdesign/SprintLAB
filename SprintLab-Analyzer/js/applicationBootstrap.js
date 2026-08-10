/*********************************************************************

 SprintLab Analyzer

 Archivo:
 applicationBootstrap.js

 Versión:
 0.0.7

*********************************************************************/

import * as Config from "./applicationConfig.js";
import * as State from "./applicationState.js";
import * as Events from "./applicationEvents.js";
import * as Manager from "./analysisManager.js";

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

    State.initialize();

    Config.reset();

    Manager.initialize(

        video,

        canvas

    );

    registerEvents();

}

/********************************************************************/

function registerEvents(){

    Events.on(

        "videoLoaded",

        ()=>{

            State.setVideoLoaded(

                true

            );

        }

    );

    Events.on(

        "modelLoaded",

        ()=>{

            State.setModelLoaded(

                true

            );

        }

    );

}

/********************************************************************/

export function start(){

    if(

        !State.ready()

    ){

        return;

    }

    State.setAnalyzing(

        true

    );

    Manager.start();

}

/********************************************************************/

export function stop(){

    Manager.stop();

    State.setAnalyzing(

        false

    );

    State.setFinished(

        true

    );

}

/********************************************************************/

export function reset(){

    Manager.reset();

    State.reset();

}

/********************************************************************/

export function summary(){

    return{

        state:

            State.get(),

        manager:

            Manager.summary(),

        config:

            Config.summary()

    };

}