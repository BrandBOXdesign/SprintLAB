/*********************************************************************

 SprintLab Analyzer

 Archivo:
 graphData.js

 Versión:
 0.0.3

*********************************************************************/

const series={

speed:[],

acceleration:[],

cadence:[],

stride:[],

posture:[],

balance:[],

stability:[],

arms:[],

legs:[]

};

/********************************************************************/

export function reset(){

    for(const key in series){

        series[key].length=0;

    }

}

/********************************************************************/

export function addFrame(data){

    push("speed",data.speed);

    push("acceleration",data.acceleration);

    push("cadence",data.cadence);

    push("stride",data.strideLength);

    push("posture",data.posture);

    push("balance",data.balance);

    push("stability",data.stability);

    push("arms",data.arms);

    push("legs",data.legs);

}

/********************************************************************/

function push(name,value){

    if(value===undefined){

        return;

    }

    series[name].push(value);

}

/********************************************************************/

export function get(name){

    if(!(name in series)){

        return [];

    }

    return [...series[name]];

}

/********************************************************************/

export function labels(){

    const total=

        Math.max(

            ...Object.values(series)

            .map(

                s=>s.length

            )

        );

    const list=[];

    for(let i=0;i<total;i++){

        list.push(i+1);

    }

    return list;

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(series)

    );

}

/********************************************************************/

export function summary(){

    return{

        speed:series.speed.length,

        acceleration:series.acceleration.length,

        cadence:series.cadence.length,

        stride:series.stride.length,

        posture:series.posture.length,

        balance:series.balance.length,

        stability:series.stability.length,

        arms:series.arms.length,

        legs:series.legs.length

    };

}