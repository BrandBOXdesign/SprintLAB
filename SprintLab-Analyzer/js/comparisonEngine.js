/*********************************************************************

 SprintLab Analyzer

 Archivo:
 comparisonEngine.js

 Versión:
 0.0.3

*********************************************************************/

const comparisons=[];

/********************************************************************/

export function compare(

    sessionA,

    sessionB

){

    if(

        !sessionA||

        !sessionB

    ){

        return null;

    }

    const result={

        first:sessionA.name,

        second:sessionB.name,

        posture:delta(

            average(sessionA,"posture"),

            average(sessionB,"posture")

        ),

        balance:delta(

            average(sessionA,"balance"),

            average(sessionB,"balance")

        ),

        stability:delta(

            average(sessionA,"stability"),

            average(sessionB,"stability")

        ),

        arms:delta(

            average(sessionA,"arms"),

            average(sessionB,"arms")

        ),

        legs:delta(

            average(sessionA,"legs"),

            average(sessionB,"legs")

        ),

        speed:delta(

            average(sessionA,"speed"),

            average(sessionB,"speed")

        ),

        cadence:delta(

            average(sessionA,"cadence"),

            average(sessionB,"cadence")

        )

    };

    result.global=

        globalScore(result);

    comparisons.push(result);

    return result;

}

/********************************************************************/

function average(

    session,

    field

){

    if(

        !session.reports||

        session.reports.length===0

    ){

        return 0;

    }

    let total=0;

    let count=0;

    for(const report of session.reports){

        if(report[field]!==undefined){

            total+=report[field];

            count++;

        }

    }

    return count?

        total/count:0;

}

/********************************************************************/

function delta(

    before,

    after

){

    return after-before;

}

/********************************************************************/

function globalScore(data){

    return(

        data.posture+

        data.balance+

        data.stability+

        data.arms+

        data.legs+

        data.speed+

        data.cadence

    )/7;

}

/********************************************************************/

export function latest(){

    if(comparisons.length===0){

        return null;

    }

    return comparisons[comparisons.length-1];

}

/********************************************************************/

export function history(){

    return comparisons;

}

/********************************************************************/

export function summary(){

    return{

        comparisons:comparisons.length,

        latest:latest()

    };

}

/********************************************************************/

export function reset(){

    comparisons.length=0;

}