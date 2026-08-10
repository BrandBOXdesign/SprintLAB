/*********************************************************************

 SprintLab Analyzer

 Archivo:
 postureAnalyzer.js

 Versión:
 0.0.3

*********************************************************************/

const history=[];

/********************************************************************/

export function reset(){

    history.length=0;

}

/********************************************************************/

export function analyze(world){

    const result={

        trunk:trunk(world),

        pelvis:pelvis(world),

        shoulders:shoulders(world),

        head:head(world),

        legs:legs(world),

        alignment:0,

        score:0

    };

    result.alignment=alignment(result);

    result.score=score(result);

    history.push(result);

    return result;

}

/********************************************************************/

function trunk(world){

    const shoulder={

        x:(world[11].x+world[12].x)/2,

        y:(world[11].y+world[12].y)/2

    };

    const hip={

        x:(world[23].x+world[24].x)/2,

        y:(world[23].y+world[24].y)/2

    };

    return Math.atan2(

        shoulder.x-hip.x,

        hip.y-shoulder.y

    )*180/Math.PI;

}

/********************************************************************/

function pelvis(world){

    return Math.abs(

        world[23].y-

        world[24].y

    );

}

/********************************************************************/

function shoulders(world){

    return Math.abs(

        world[11].y-

        world[12].y

    );

}

/********************************************************************/

function head(world){

    const center=(

        world[11].x+

        world[12].x

    )/2;

    return Math.abs(

        world[0].x-

        center

    );

}

/********************************************************************/

function legs(world){

    return Math.abs(

        (world[25].y-world[27].y)-

        (world[26].y-world[28].y)

    );

}

/********************************************************************/

function alignment(data){

    return(

        Math.abs(data.trunk)+

        data.pelvis+

        data.shoulders+

        data.head+

        data.legs

    )/5;

}

/********************************************************************/

function score(data){

    let s=100;

    s-=Math.abs(data.trunk);

    s-=data.pelvis*100;

    s-=data.shoulders*100;

    s-=data.head*120;

    s-=data.legs*80;

    return Math.max(

        0,

        Math.min(

            100,

            s

        )

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

export function summary(){

    return{

        frames:history.length,

        averageScore:averageScore(),

        latest:latest()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(history)

    );

}