/*********************************************************************

 SprintLab Analyzer

 Archivo:
 diagnostics.js

 Versión:
 0.0.7

*********************************************************************/

import * as Compatibility from "./compatibility.js";
import * as Version from "./version.js";
import * as Health from "./systemHealth.js";
import * as State from "./applicationState.js";
import * as Registry from "./moduleRegistry.js";

/********************************************************************/

export function generate(){

    return{

        timestamp:

            new Date()

            .toISOString(),

        version:

            Version.info(),

        compatibility:

            Compatibility.check(),

        application:

            State.get(),

        modules:

            Registry.summary(),

        health:

            Health.report()

    };

}

/********************************************************************/

export function print(){

    console.group(

        "SprintLab Diagnostics"

    );

    console.table(

        generate()

    );

    console.groupEnd();

}

/********************************************************************/

export function healthy(){

    return(

        Compatibility.overall()&&

        Health.healthy()

    );

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(

            generate()

        )

    );

}

/********************************************************************/

export function reset(){

    Health.reset();

}

/********************************************************************/

export function summary(){

    return{

        healthy:

            healthy(),

        generated:

            new Date()

            .toISOString()

    };

}