/*********************************************************************

 SprintLab Analyzer

 Archivo:
 pluginManager.js

 Versión:
 0.0.7

*********************************************************************/

const plugins=[];

/********************************************************************/

export function register(

    plugin

){

    if(

        !plugin||

        !plugin.name

    ){

        return false;

    }

    if(

        plugins.find(

            p=>p.name===plugin.name

        )

    ){

        return false;

    }

    plugins.push(plugin);

    if(

        plugin.initialize

    ){

        plugin.initialize();

    }

    return true;

}

/********************************************************************/

export function unregister(

    name

){

    const index=

        plugins.findIndex(

            p=>p.name===name

        );

    if(

        index<0

    ){

        return false;

    }

    const plugin=

        plugins[index];

    if(

        plugin.destroy

    ){

        plugin.destroy();

    }

    plugins.splice(

        index,

        1

    );

    return true;

}

/********************************************************************/

export function execute(

    hook,

    data

){

    for(

        const plugin

        of

        plugins

    ){

        if(

            plugin[hook]

        ){

            plugin[hook](

                data

            );

        }

    }

}

/********************************************************************/

export function get(

    name

){

    return plugins.find(

        p=>p.name===name

    )??null;

}

/********************************************************************/

export function all(){

    return[

        ...plugins

    ];

}

/********************************************************************/

export function clear(){

    for(

        const plugin

        of

        plugins

    ){

            if(

                plugin.destroy

            ){

                plugin.destroy();

            }

    }

    plugins.length=0;

}

/********************************************************************/

export function summary(){

    return{

        plugins:

            plugins.length,

        names:

            plugins.map(

                p=>p.name

            )

    };

}