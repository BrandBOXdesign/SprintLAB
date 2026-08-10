/*********************************************************************

 SprintLab Analyzer

 Archivo:
 moduleRegistry.js

 Versión:
 0.0.7

*********************************************************************/

const registry=new Map();

/********************************************************************/

export function register(

    name,

    module

){

    registry.set(

        name,

        module

    );

}

/********************************************************************/

export function unregister(

    name

){

    registry.delete(

        name

    );

}

/********************************************************************/

export function get(

    name

){

    return registry.get(

        name

    )??null;

}

/********************************************************************/

export function exists(

    name

){

    return registry.has(

        name

    );

}

/********************************************************************/

export function names(){

    return[

        ...registry.keys()

    ];

}

/********************************************************************/

export function modules(){

    return[

        ...registry.values()

    ];

}

/********************************************************************/

export function count(){

    return registry.size;

}

/********************************************************************/

export function clear(){

    registry.clear();

}

/********************************************************************/

export function summary(){

    return{

        modules:

            count(),

        names:

            names()

    };

}