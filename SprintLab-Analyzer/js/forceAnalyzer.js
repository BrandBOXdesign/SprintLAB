/*********************************************************************

 SprintLab Analyzer

 Archivo:
 forceAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

const history=[];

/********************************************************************/

export function reset(){

    history.length=0;

}

/********************************************************************/

export function analyze(

    world,

    velocity,

    acceleration,

    athleteWeight=75

){

    const result={

        bodyMass:athleteWeight,

        verticalForce:verticalForce(

            athleteWeight,

            acceleration

        ),

        horizontalForce:horizontalForce(

            athleteWeight,

            velocity

        ),

        impulse:impulse(

            athleteWeight,

            acceleration

        ),

        power:power(

            athleteWeight,

            velocity,

            acceleration

        ),

        efficiency:0

    };

    result.efficiency=

        efficiency(result);

    history.push(result);

    return result;

}

/********************************************************************/

function verticalForce(

    mass,

    acceleration

){

    return mass*(9.81+acceleration);

}

/********************************************************************/

function horizontalForce(

    mass,

    velocity

){

    return mass*velocity;

}

/********************************************************************/

function impulse(

    mass,

    acceleration

){

    return mass*acceleration;

}

/********************************************************************/

function power(

    mass,

    velocity,

    acceleration

){

    return(

        mass*

        acceleration*

        velocity

    );

}

/********************************************************************/

function efficiency(data){

    if(

        data.verticalForce===0

    ){

        return 0;

    }

    return(

        data.horizontalForce/

        data.verticalForce

    )*100;

}

/********************************************************************/

export function latest(){

    if(history.length===0){

        return null;

    }

    return history[history.length-1];

}

/********************************************************************/

export function averageEfficiency(){

    if(history.length===0){

        return 0;

    }

    let total=0;

    for(const item of history){

        total+=item.efficiency;

    }

    return total/history.length;

}

/********************************************************************/

export function maximumPower(){

    if(history.length===0){

        return 0;

    }

    let max=0;

    for(const item of history){

        if(item.power>max){

            max=item.power;

        }

    }

    return max;

}

/********************************************************************/

export function summary(){

    return{

        frames:history.length,

        averageEfficiency:

            averageEfficiency(),

        peakPower:

            maximumPower()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(history)

    );

}