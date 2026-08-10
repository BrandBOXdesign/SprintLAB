/*********************************************************************

 SprintLab Analyzer

 Archivo:
 cacheManager.js

 Versión:
 0.0.8

*********************************************************************/

const cache=new Map();

/********************************************************************/

export function set(

    key,

    value

){

    cache.set(

        key,

        value

    );

}

/********************************************************************/

export function get(

    key

){

    return cache.get(

        key

    )??null;

}

/********************************************************************/

export function has(

    key

){

    return cache.has(

        key

    );

}

/********************************************************************/

export function remove(

    key

){

    cache.delete(

        key

    );

}

/********************************************************************/

export function clear(){

    cache.clear();

}

/********************************************************************/

export function keys(){

    return[

        ...cache.keys()

    ];

}

/********************************************************************/

export function size(){

    return cache.size;

}

/********************************************************************/

export function summary(){

    return{

        entries:

            size(),

        keys:

            keys()

    };

}

/********************************************************************/

export function exportData(){

    return Object.fromEntries(

        cache

    );

}