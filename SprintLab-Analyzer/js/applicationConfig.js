/*********************************************************************

 SprintLab Analyzer

 Archivo:
 applicationConfig.js

 Versión:
 0.0.7

*********************************************************************/

const config={

    video:{

        maxHeight:0.70,

        autoPlay:false,

        loop:false

    },

    analysis:{

        fps:60,

        confidence:0.50,

        autoAnalyze:false

    },

    render:{

        skeleton:true,

        joints:true,

        angles:true,

        trajectories:true,

        vectors:true,

        labels:true

    },

    overlay:{

        lineWidth:3,

        jointRadius:4,

        fontSize:16

    },

    export:{

        json:true,

        csv:true,

        pdf:true

    }

};

/********************************************************************/

export function get(){

    return structuredClone(

        config

    );

}

/********************************************************************/

export function section(name){

    return config[name];

}

/********************************************************************/

export function value(

    section,

    key

){

    return config

        [section]

        [key];

}

/********************************************************************/

export function set(

    section,

    key,

    value

){

    if(

        !config[section]

    ){

        return;

    }

    config[section][key]=

        value;

}

/********************************************************************/

export function reset(){

    config.video.maxHeight=0.70;

    config.video.autoPlay=false;

    config.video.loop=false;

    config.analysis.fps=60;

    config.analysis.confidence=0.50;

    config.analysis.autoAnalyze=false;

    config.render.skeleton=true;

    config.render.joints=true;

    config.render.angles=true;

    config.render.trajectories=true;

    config.render.vectors=true;

    config.render.labels=true;

    config.overlay.lineWidth=3;

    config.overlay.jointRadius=4;

    config.overlay.fontSize=16;

}

/********************************************************************/

export function summary(){

    return get();

}