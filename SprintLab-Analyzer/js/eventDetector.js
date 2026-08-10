/*********************************************************************

 SprintLab Analyzer

 Archivo:
 eventDetector.js

 Versión:
 0.0.6

*********************************************************************/

const events=[];

/********************************************************************/

export function reset(){

    events.length=0;

}

/********************************************************************/

export function analyze(frame){

    if(!frame){

        return;

    }

    detectStart(frame);

    detectTopSpeed(frame);

    detectFlight(frame);

    detectFinish(frame);

}

/********************************************************************/

function detectStart(frame){

    if(

        frame.velocity&&

        frame.velocity.velocity>0.30

    ){

        add(

            "START",

            frame

        );

    }

}

/********************************************************************/

function detectTopSpeed(frame){

    if(

        frame.velocity&&

        frame.velocity.velocity>9

    ){

        add(

            "TOP_SPEED",

            frame

        );

    }

}

/********************************************************************/

function detectFlight(frame){

    if(

        frame.contact&&

        frame.contact.flight

    ){

        add(

            "FLIGHT",

            frame

        );

    }

}

/********************************************************************/

function detectFinish(frame){

    if(

        frame.progress>=100

    ){

        add(

            "FINISH",

            frame

        );

    }

}

/********************************************************************/

function add(

    type,

    frame

){

    const last=

        events[

            events.length-1

        ];

    if(

        last&&

        last.type===type

    ){

        return;

    }

    events.push({

        type,

        time:

            frame.time??0,

        frame:

            frame.index??0

    });

}

/********************************************************************/

export function latest(){

    if(events.length===0){

        return null;

    }

    return events[

        events.length-1

    ];

}

/********************************************************************/

export function all(){

    return [...events];

}

/********************************************************************/

export function summary(){

    return{

        total:

            events.length,

        latest:

            latest()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(events)

    );

}