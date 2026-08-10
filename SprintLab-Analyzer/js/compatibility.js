/*********************************************************************

 SprintLab Analyzer

 Archivo:
 compatibility.js

 Versión:
 0.0.7

*********************************************************************/

/********************************************************************/

export function check(){

    return{

        modules:

            supportsModules(),

        canvas:

            supportsCanvas(),

        webgl:

            supportsWebGL(),

        fileApi:

            supportsFileAPI(),

        mediaDevices:

            supportsMediaDevices(),

        overall:

            overall()

    };

}

/********************************************************************/

function supportsModules(){

    return "noModule"

        in HTMLScriptElement.prototype;

}

/********************************************************************/

function supportsCanvas(){

    const canvas=

        document.createElement(

            "canvas"

        );

    return !!canvas.getContext(

        "2d"

    );

}

/********************************************************************/

function supportsWebGL(){

    const canvas=

        document.createElement(

            "canvas"

        );

    return !!(

        canvas.getContext(

            "webgl"

        )||

        canvas.getContext(

            "experimental-webgl"

        )

    );

}

/********************************************************************/

function supportsFileAPI(){

    return(

        window.File&&

        window.FileReader&&

        window.Blob

    );

}

/********************************************************************/

function supportsMediaDevices(){

    return !!(

        navigator.mediaDevices

    );

}

/********************************************************************/

export function overall(){

    return(

        supportsModules()&&

        supportsCanvas()&&

        supportsWebGL()&&

        supportsFileAPI()

    );

}

/********************************************************************/

export function summary(){

    return check();

}