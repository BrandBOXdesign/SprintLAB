/*********************************************************************

 SprintLab Analyzer

 Archivo:
 settingsManager.js

 Versión:
 0.0.8

*********************************************************************/

const STORAGE_KEY="SprintLab.Settings";

/********************************************************************/

const defaults={

    fps:60,

    model:"heavy",

    confidence:0.5,

    showSkeleton:true,

    showAngles:true,

    showVectors:true,

    showTrajectory:true,

    autoAnalyze:false,

    darkMode:true

};

let settings={

    ...defaults

};

/********************************************************************/

export function load(){

    const saved=

        localStorage.getItem(

            STORAGE_KEY

        );

    if(

        saved

    ){

        settings={

            ...defaults,

            ...JSON.parse(saved)

        };

    }

    return settings;

}

/********************************************************************/

export function save(){

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(

            settings

        )

    );

}

/********************************************************************/

export function get(

    key

){

    return settings[key];

}

/********************************************************************/

export function set(

    key,

    value

){

    settings[key]=value;

    save();

}

/********************************************************************/

export function reset(){

    settings={

        ...defaults

    };

    save();

}

/********************************************************************/

export function all(){

    return{

        ...settings

    };

}

/********************************************************************/

export function summary(){

    return all();

}