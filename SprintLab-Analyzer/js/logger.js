/*********************************************************************

 SprintLab Analyzer

 Archivo:
 logger.js

 Versión:
 0.0.8

*********************************************************************/

const logs=[];

let output=null;

/********************************************************************/

export function initialize(

    element

){

    output=element;

}

/********************************************************************/

export function info(

    message

){

    add(

        "INFO",

        message

    );

}

/********************************************************************/

export function warning(

    message

){

    add(

        "WARNING",

        message

    );

}

/********************************************************************/

export function error(

    message

){

    add(

        "ERROR",

        message

    );

}

/********************************************************************/

function add(

    level,

    message

){

    const entry={

        time:

            new Date()

            .toLocaleTimeString(),

        level,

        message

    };

    logs.push(entry);

    console.log(

        `[${level}]`,

        message

    );

    if(output){

        output.textContent+=

            `[${entry.time}] `+

            `[${level}] `+

            message+

            "\n";

        output.scrollTop=

            output.scrollHeight;

    }

}

/********************************************************************/

export function clear(){

    logs.length=0;

    if(output){

        output.textContent="";

    }

}

/********************************************************************/

export function history(){

    return[

        ...logs

    ];

}

/********************************************************************/

export function summary(){

    return{

        entries:

            logs.length

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(

            logs

        )

    );

}