/*********************************************************************

 SprintLab Analyzer

 Archivo:
 startup.js

 Versión:
 0.0.8

*********************************************************************/

import * as Compatibility from "./compatibility.js";
import * as Bootstrap from "./applicationBootstrap.js";
import * as Registry from "./moduleRegistry.js";
import * as Diagnostics from "./diagnostics.js";
import * as Version from "./version.js";

/********************************************************************/

export function start(

    video,

    canvas

){

    if(

        !Compatibility.overall()

    ){

        console.error(

            "Navegador incompatible."

        );

        return false;

    }

    Bootstrap.initialize(

        video,

        canvas

    );

    registerModules();

    console.info(

        Version.info()

    );

    console.info(

        Diagnostics.generate()

    );

    return true;

}

/********************************************************************/

function registerModules(){

    Registry.register(

        "Compatibility",

        Compatibility

    );

    Registry.register(

        "Bootstrap",

        Bootstrap

    );

    Registry.register(

        "Diagnostics",

        Diagnostics

    );

    Registry.register(

        "Version",

        Version

    );

}

/********************************************************************/

export function reset(){

    Registry.clear();

}

/********************************************************************/

export function summary(){

    return{

        started:

            Registry.count()>0,

        modules:

            Registry.count()

    };

}