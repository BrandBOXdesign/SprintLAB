/*********************************************************************

 SprintLab Analyzer

 Archivo:
 systemHealth.js

 Versión:
 0.0.7

*********************************************************************/

const modules=new Map();

/********************************************************************/

export function register(

    name

){

    modules.set(

        name,

        {

            status:"OK",

            message:"",

            updated:new Date()

        }

    );

}

/********************************************************************/

export function update(

    name,

    status,

    message=""

){

    modules.set(

        name,

        {

            status,

            message,

            updated:new Date()

        }

    );

}

/********************************************************************/

export function status(

    name

){

    return modules.get(

        name

    )??null;

}

/********************************************************************/

export function healthy(){

    for(

        const module

        of

        modules.values()

    ){

        if(

            module.status!=="OK"

        ){

            return false;

        }

    }

    return true;

}

/********************************************************************/

export function report(){

    return{

        healthy:

            healthy(),

        modules:

            Object.fromEntries(

                modules

            )

    };

}

/********************************************************************/

export function reset(){

    modules.clear();

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(

            report()

        )

    );

}