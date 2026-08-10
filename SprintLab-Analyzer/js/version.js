/*********************************************************************

 SprintLab Analyzer

 Archivo:
 version.js

 Versión:
 0.0.7

*********************************************************************/

const VERSION={

    application:

        "SprintLab Analyzer",

    version:

        "0.0.7",

    build:

        "2026.07",

    author:

        "SprintLab",

    mediapipe:

        "Pose Landmarker",

    compatibility:[

        "Chrome",

        "Edge"

    ]

};

/********************************************************************/

export function application(){

    return VERSION.application;

}

/********************************************************************/

export function version(){

    return VERSION.version;

}

/********************************************************************/

export function build(){

    return VERSION.build;

}

/********************************************************************/

export function author(){

    return VERSION.author;

}

/********************************************************************/

export function mediapipe(){

    return VERSION.mediapipe;

}

/********************************************************************/

export function compatibility(){

    return[

        ...VERSION.compatibility

    ];

}

/********************************************************************/

export function info(){

    return{

        ...VERSION

    };

}