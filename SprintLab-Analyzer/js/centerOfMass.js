/*********************************************************************

 SprintLab Analyzer

 Archivo:
 centerOfMass.js

 Versión:
 0.0.6

*********************************************************************/

const history=[];

/********************************************************************/

export function reset(){

    history.length=0;

}

/********************************************************************/

export function analyze(world){

    if(

        !world||

        world.length===0

    ){

        return null;

    }

    let x=0;

    let y=0;

    let z=0;

    for(

        const p of world

    ){

        x+=p.x;

        y+=p.y;

        z+=p.z;

    }

    const center={

        x:x/world.length,

        y:y/world.length,

        z:z/world.length

    };

    history.push(center);

    return center;

}

/********************************************************************/

export function velocity(){

    if(history.length<2){

        return{

            x:0,

            y:0,

            z:0

        };

    }

    const a=

        history[history.length-2];

    const b=

        history[history.length-1];

    return{

        x:b.x-a.x,

        y:b.y-a.y,

        z:b.z-a.z

    };

}

/********************************************************************/

export function displacement(){

    if(history.length<2){

        return 0;

    }

    const first=

        history[0];

    const last=

        history[history.length-1];

    return Math.sqrt(

        (last.x-first.x)**2+

        (last.y-first.y)**2+

        (last.z-first.z)**2

    );

}

/********************************************************************/

export function latest(){

    if(history.length===0){

        return null;

    }

    return history[history.length-1];

}

/********************************************************************/

export function summary(){

    return{

        frames:history.length,

        displacement:

            displacement(),

        latest:

            latest()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(history)

    );

}