/*********************************************************************

 SprintLab Analyzer

 Archivo:
 graphRenderer.js

 Versión:
 0.0.3

*********************************************************************/

import * as GraphData from "./graphData.js";

/********************************************************************/

export function draw(

    canvas,

    seriesName,

    color="#2ecc71"

){

    const ctx=

        canvas.getContext("2d");

    ctx.clearRect(

        0,

        0,

        canvas.width,

        canvas.height

    );

    const data=

        GraphData.get(

            seriesName

        );

    if(data.length<2){

        return;

    }

    const max=

        Math.max(...data);

    const min=

        Math.min(...data);

    const range=

        (max-min)||1;

    ctx.beginPath();

    ctx.lineWidth=2;

    ctx.strokeStyle=color;

    for(

        let i=0;

        i<data.length;

        i++

    ){

        const x=

            (i/(data.length-1))

            *canvas.width;

        const y=

            canvas.height-

            (

                (data[i]-min)

                /range

            )*canvas.height;

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

export function drawGrid(

    canvas,

    divisions=5

){

    const ctx=

        canvas.getContext("2d");

    ctx.strokeStyle="#333";

    ctx.lineWidth=1;

    for(

        let i=1;

        i<divisions;

        i++

    ){

        const y=

            canvas.height*

            i/divisions;

        ctx.beginPath();

        ctx.moveTo(

            0,

            y

        );

        ctx.lineTo(

            canvas.width,

            y

        );

        ctx.stroke();

    }

}

/********************************************************************/

export function clear(

    canvas

){

    canvas

    .getContext("2d")

    .clearRect(

        0,

        0,

        canvas.width,

        canvas.height

    );

}

/********************************************************************/

export function redraw(

    canvas,

    series,

    color

){

    clear(canvas);

    drawGrid(canvas);

    draw(

        canvas,

        series,

        color

    );

}