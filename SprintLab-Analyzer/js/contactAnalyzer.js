/*********************************************************************

 SprintLab Analyzer

 Archivo:
 contactAnalyzer.js

 Versión:
 0.0.6

*********************************************************************/

const contacts=[];

/********************************************************************/

export function reset(){

    contacts.length=0;

}

/********************************************************************/

export function analyze(

    world,

    groundLevel=0

){

    const left=

        footContact(

            world[31],

            groundLevel

        );

    const right=

        footContact(

            world[32],

            groundLevel

        );

    const result={

        left,

        right,

        doubleSupport:

            left&&right,

        flight:

            !left&&!right,

        supportFoot:

            support(

                left,

                right

            )

    };

    contacts.push(result);

    return result;

}

/********************************************************************/

function footContact(

    foot,

    ground

){

    if(!foot){

        return false;

    }

    return Math.abs(

        foot.y-ground

    )<0.03;

}

/********************************************************************/

function support(

    left,

    right

){

    if(

        left&&

        !right

    ){

        return "LEFT";

    }

    if(

        right&&

        !left

    ){

        return "RIGHT";

    }

    if(

        left&&

        right

    ){

        return "DOUBLE";

    }

    return "FLIGHT";

}

/********************************************************************/

export function latest(){

    if(contacts.length===0){

        return null;

    }

    return contacts[contacts.length-1];

}

/********************************************************************/

export function contactRatio(){

    if(contacts.length===0){

        return 0;

    }

    let total=0;

    for(

        const c of contacts

    ){

        if(

            c.left||

            c.right

        ){

            total++;

        }

    }

    return total/

        contacts.length;

}

/********************************************************************/

export function summary(){

    return{

        frames:

            contacts.length,

        contactRatio:

            contactRatio(),

        latest:

            latest()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(

            contacts

        )

    );

}