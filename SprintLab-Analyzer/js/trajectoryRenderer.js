/*********************************************************************

 SprintLab Analyzer

 Archivo:
 trajectoryRenderer.js

 Versión:
 0.0.5

*********************************************************************/

const history=new Map();

/********************************************************************/

export function reset(){

    history.clear();

}

/********************************************************************/

export function addFrame(

    landmarks

){

    if(!landmarks){

        return;

    }

    for(

        let i=0;

        i<landmarks.length;

        i++

    ){

        if(

            !history.has(i)

        ){

            history.set(

                i,

                []

            );

        }

        const list=

            history.get(i);

        list.push({

            x:landmarks[i].x,

            y:landmarks[i].y

        });

        if(

            list.length>

            500

        ){

            list.shift();

        }

    }

}

/********************************************************************/

export function draw(

    canvas,

    index,

    color="#00ffff"

){

    const points=

        history.get(index);

    if(

        !points||

        points.length<2

    ){

        return;

    }

    const ctx=

        canvas.getContext("2d");

    ctx.beginPath();

    ctx.strokeStyle=color;

    ctx.lineWidth=2;

    for(

        let i=0;

        i<points.length;

        i++

    ){

        const x=

            points[i].x*

            canvas.width;

        const y=

            points[i].y*

            canvas.height;

        if(i===0){

            ctx.moveTo(

                x,

                y

            );

        }

        else{

            ctx.lineTo(

                x,

                y

            );

        }

    }

    ctx.stroke();

}

/********************************************************************/

export function drawAll(

    canvas

){

    for(

        const index

        of

        history.keys()

    ){

        draw(

            canvas,

            index

        );

    }

}

/********************************************************************/

export function size(

    index

){

    if(

        !history.has(index)

    ){

        return 0;

    }

    return history

        .get(index)

        .length;

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(

            Object.fromEntries(

                history

            )

        )

    );

}