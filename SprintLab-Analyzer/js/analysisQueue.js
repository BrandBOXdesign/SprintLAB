/*********************************************************************

 SprintLab Analyzer

 Archivo:
 analysisQueue.js

 Versión:
 0.0.5

*********************************************************************/

const queue=[];

let processing=false;

/********************************************************************/

export function clear(){

    queue.length=0;

    processing=false;

}

/********************************************************************/

export function enqueue(frame){

    queue.push(frame);

}

/********************************************************************/

export function dequeue(){

    if(queue.length===0){

        return null;

    }

    return queue.shift();

}

/********************************************************************/

export function peek(){

    if(queue.length===0){

        return null;

    }

    return queue[0];

}

/********************************************************************/

export function size(){

    return queue.length;

}

/********************************************************************/

export function empty(){

    return queue.length===0;

}

/********************************************************************/

export async function process(callback){

    if(

        processing||

        !callback

    ){

        return;

    }

    processing=true;

    while(

        queue.length>0

    ){

        const frame=

            dequeue();

        await callback(

            frame

        );

    }

    processing=false;

}

/********************************************************************/

export function stop(){

    processing=false;

}

/********************************************************************/

export function running(){

    return processing;

}

/********************************************************************/

export function summary(){

    return{

        processing,

        pending:

            queue.length

    };

}