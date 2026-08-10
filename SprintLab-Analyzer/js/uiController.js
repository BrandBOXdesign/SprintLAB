/*********************************************************************

 SprintLab Analyzer

 Archivo:
 uiController.js

 Versión:
 0.0.8

*********************************************************************/

const controls={

    video:null,

    overlay:null,

    log:null,

    buttons:{},

    labels:{}

};

/********************************************************************/

export function initialize(elements){

    controls.video=

        elements.video;

    controls.overlay=

        elements.overlay;

    controls.log=

        elements.log;

    controls.buttons=

        elements.buttons??

        {};

    controls.labels=

        elements.labels??

        {};

}

/********************************************************************/

export function enableButton(

    id,

    enabled=true

){

    const button=

        controls.buttons[id];

    if(button){

        button.disabled=

            !enabled;

    }

}

/********************************************************************/

export function setLabel(

    id,

    value

){

    const label=

        controls.labels[id];

    if(label){

        label.textContent=

            value;

    }

}

/********************************************************************/

export function log(

    message

){

    if(

        !controls.log

    ){

        return;

    }

    controls.log.textContent+=

        message+

        "\n";

    controls.log.scrollTop=

        controls.log.scrollHeight;

}

/********************************************************************/

export function clearLog(){

    if(

        controls.log

    ){

        controls.log.textContent="";

    }

}

/********************************************************************/

export function resizeOverlay(){

    if(

        !controls.video||

        !controls.overlay

    ){

        return;

    }

    controls.overlay.width=

        controls.video.videoWidth;

    controls.overlay.height=

        controls.video.videoHeight;

}

/********************************************************************/

export function summary(){

    return{

        initialized:

            controls.video!==null

    };

}