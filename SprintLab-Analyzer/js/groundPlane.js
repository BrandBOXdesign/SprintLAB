/*********************************************************************

 SprintLab Analyzer

 Archivo:
 groundPlane.js

 Versión:
 0.0.6

*********************************************************************/

let samples=[];

let ground=0;

/********************************************************************/

export function reset(){

    samples=[];

    ground=0;

}

/********************************************************************/

export function update(world){

    if(

        !world||

        world.length<33

    ){

        return ground;

    }

    const left=

        world[31].y;

    const right=

        world[32].y;

    samples.push(

        Math.max(

            left,

            right

        )

    );

    if(

        samples.length>

        120

    ){

        samples.shift();

    }

    ground=

        average(samples);

    return ground;

}

/********************************************************************/

function average(values){

    if(values.length===0){

        return 0;

    }

    let total=0;

    for(

        const v of values

    ){

        total+=v;

    }

    return total/

        values.length;

}

/********************************************************************/

export function level(){

    return ground;

}

/********************************************************************/

export function distance(point){

    if(!point){

        return 0;

    }

    return ground-point.y;

}

/********************************************************************/

export function isTouching(

    point,

    tolerance=0.02

){

    if(!point){

        return false;

    }

    return Math.abs(

        point.y-ground

    )<=tolerance;

}

/********************************************************************/

export function summary(){

    return{

        ground,

        samples:

            samples.length

    };

}