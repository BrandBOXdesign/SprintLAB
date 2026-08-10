/*********************************************************************

 SprintLab Analyzer

 Archivo:
 performanceAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

const history=[];

/********************************************************************/

export function reset(){

    history.length=0;

}

/********************************************************************/

export function analyze(data){

    const result={

        posture:data.posture??0,

        balance:data.balance??0,

        stability:data.stability??0,

        arms:data.arms??0,

        legs:data.legs??0,

        speed:data.speed??0,

        cadence:data.cadence??0,

        score:0,

        level:""

    };

    result.score=calculateScore(result);

    result.level=calculateLevel(result.score);

    history.push(result);

    return result;

}

/********************************************************************/

function calculateScore(data){

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

function calculateLevel(score){

    if(score>=95){

        return "Elite";

    }

    if(score>=85){

        return "Excelente";

    }

    if(score>=75){

        return "Muy Bueno";

    }

    if(score>=65){

        return "Bueno";

    }

    if(score>=50){

        return "Aceptable";

    }

    return "Necesita Mejorar";

}

/********************************************************************/

export function latest(){

    if(history.length===0){

        return null;

    }

    return history[history.length-1];

}

/********************************************************************/

export function averageScore(){

    if(history.length===0){

        return 0;

    }

    let total=0;

    for(const frame of history){

        total+=frame.score;

    }

    return total/history.length;

}

/********************************************************************/

export function bestScore(){

    let best=0;

    for(const frame of history){

        if(frame.score>best){

            best=frame.score;

        }

    }

    return best;

}

/********************************************************************/

export function summary(){

    return{

        frames:history.length,

        average:averageScore(),

        best:bestScore(),

        latest:latest()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(history)

    );

}