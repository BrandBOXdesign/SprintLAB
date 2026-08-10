/*********************************************************************

 SprintLab Analyzer

 Archivo:
 sessionManager.js

 Versión:
 0.0.8

*********************************************************************/

let session=null;

/********************************************************************/

export function create(

    videoName

){

    session={

        id:

            crypto.randomUUID(),

        created:

            new Date()

            .toISOString(),

        video:

            videoName,

        analyzed:false,

        report:null,

        notes:[]

    };

    return session;

}

/********************************************************************/

export function current(){

    return session;

}

/********************************************************************/

export function analyzed(

    value=true

){

    if(session){

        session.analyzed=value;

    }

}

/********************************************************************/

export function setReport(

    report

){

    if(session){

        session.report=

            report;

    }

}

/********************************************************************/

export function addNote(

    text

){

    if(

        session

    ){

        session.notes.push({

            date:

                new Date()

                .toISOString(),

            text

        });

    }

}

/********************************************************************/

export function clear(){

    session=null;

}

/********************************************************************/

export function summary(){

    return{

        active:

            session!==null,

        analyzed:

            session?.analyzed??

            false,

        notes:

            session?.notes.length??

            0

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(

            session

        )

    );

}