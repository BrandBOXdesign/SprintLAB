/*********************************************************************

 SprintLab Analyzer

 Archivo:
 applicationEvents.js

 Versión:
 0.0.7

*********************************************************************/

const listeners=new Map();

/********************************************************************/

export function on(

    event,

    callback

){

    if(

        !listeners.has(event)

    ){

        listeners.set(

            event,

            []

        );

    }

    listeners

        .get(event)

        .push(callback);

}

/********************************************************************/

export function off(

    event,

    callback

){

    if(

        !listeners.has(event)

    ){

        return;

    }

    const list=

        listeners.get(event);

    const index=

        list.indexOf(

            callback

        );

    if(

        index>=0

    ){

        list.splice(

            index,

            1

        );

    }

}

/********************************************************************/

export function emit(

    event,

    data

){

    if(

        !listeners.has(event)

    ){

        return;

    }

    for(

        const callback

        of

        listeners.get(event)

    ){

        callback(

            data

        );

    }

}

/********************************************************************/

export function clear(

    event=null

){

    if(

        event===null

    ){

        listeners.clear();

        return;

    }

    listeners.delete(

        event

    );

}

/********************************************************************/

export function events(){

    return[

        ...listeners.keys()

    ];

}

/********************************************************************/

export function listenerCount(

    event

){

    if(

        !listeners.has(event)

    ){

        return 0;

    }

    return listeners

        .get(event)

        .length;

}

/********************************************************************/

export function summary(){

    return{

        events:

            listeners.size

    };

}