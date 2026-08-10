/*********************************************************************

 SprintLab Analyzer

 Archivo:
 resourceManager.js

 Versión:
 0.0.8

*********************************************************************/

const resources=new Map();

/********************************************************************/

export function register(

    name,

    resource

){

    resources.set(

        name,

        resource

    );

}

/********************************************************************/

export function get(

    name

){

    return resources.get(

        name

    )??null;

}

/********************************************************************/

export function exists(

    name

){

    return resources.has(

        name

    );

}

/********************************************************************/

export function remove(

    name

){

    if(

        !resources.has(name)

    ){

        return;

    }

    resources.delete(

        name

    );

}

/********************************************************************/

export function clear(){

    resources.clear();

}

/********************************************************************/

export function names(){

    return[

        ...resources.keys()

    ];

}

/********************************************************************/

export function count(){

    return resources.size;

}

/********************************************************************/

export function summary(){

    return{

        resources:

            count(),

        names:

            names()

    };

}

/********************************************************************/

export function exportData(){

    return{

        resources:

            names()

    };

}