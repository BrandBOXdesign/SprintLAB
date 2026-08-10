/*********************************************************************

 SprintLab Analyzer

 Archivo:
 strideAnalyzer.js

 Versión:
 0.0.6

*********************************************************************/

const strides=[];

/********************************************************************/

export function reset(){

    strides.length=0;

}

/********************************************************************/

export function analyze(data){

    const stride={

        length:data.length??0,

        frequency:data.frequency??0,

        contact:data.contact??0,

        flight:data.flight??0,

        speed:data.speed??0,

        efficiency:0

    };

    stride.efficiency=

        efficiency(stride);

    strides.push(stride);

    return stride;

}

/********************************************************************/

function efficiency(stride){

    let score=100;

    score-=Math.abs(

        stride.contact-

        0.10

    )*300;

    score-=Math.abs(

        stride.flight-

        0.12

    )*250;

    score-=Math.abs(

        stride.frequency-

        4.5

    )*8;

    return Math.max(

        0,

        Math.min(

            100,

            score

        )

    );

}

/********************************************************************/

export function averageLength(){

    return average(

        "length"

    );

}

/********************************************************************/

export function averageFrequency(){

    return average(

        "frequency"

    );

}

/********************************************************************/

export function averageSpeed(){

    return average(

        "speed"

    );

}

/********************************************************************/

function average(field){

    if(strides.length===0){

        return 0;

    }

    let total=0;

    for(

        const stride of strides

    ){

        total+=stride[field];

    }

    return total/

        strides.length;

}

/********************************************************************/

export function bestStride(){

    if(strides.length===0){

        return null;

    }

    let best=strides[0];

    for(

        const stride of strides

    ){

        if(

            stride.efficiency>

            best.efficiency

        ){

            best=stride;

        }

    }

    return best;

}

/********************************************************************/

export function summary(){

    return{

        strides:strides.length,

        averageLength:

            averageLength(),

        averageFrequency:

            averageFrequency(),

        averageSpeed:

            averageSpeed(),

        best:

            bestStride()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(strides)

    );

}