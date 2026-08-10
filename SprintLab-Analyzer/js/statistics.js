/*********************************************************************

 SprintLab Analyzer

 Archivo:
 statistics.js

 Versión:
 0.0.5

*********************************************************************/

const values=[];

/********************************************************************/

export function reset(){

    values.length=0;

}

/********************************************************************/

export function add(sample){

    values.push(sample);

}

/********************************************************************/

export function count(){

    return values.length;

}

/********************************************************************/

export function average(field){

    if(values.length===0){

        return 0;

    }

    let total=0;

    let n=0;

    for(const item of values){

        if(item[field]!==undefined){

            total+=item[field];

            n++;

        }

    }

    return n?total/n:0;

}

/********************************************************************/

export function minimum(field){

    let min=Infinity;

    for(const item of values){

        if(item[field]!==undefined){

            min=Math.min(

                min,

                item[field]

            );

        }

    }

    return min===Infinity?0:min;

}

/********************************************************************/

export function maximum(field){

    let max=-Infinity;

    for(const item of values){

        if(item[field]!==undefined){

            max=Math.max(

                max,

                item[field]

            );

        }

    }

    return max===-Infinity?0:max;

}

/********************************************************************/

export function summary(){

    return{

        frames:count(),

        averageScore:

            average("score"),

        bestScore:

            maximum("score"),

        worstScore:

            minimum("score"),

        averageSpeed:

            average("speed"),

        maximumSpeed:

            maximum("speed"),

        averageCadence:

            average("cadence"),

        maximumCadence:

            maximum("cadence")

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(values)

    );

}