/*********************************************************************

 SprintLab Analyzer

 Archivo:
 themeManager.js

 Versión:
 0.0.8

*********************************************************************/

let theme={

    name:"dark",

    background:"#111111",

    panel:"#1d1d1d",

    text:"#ffffff",

    accent:"#00d4ff",

    success:"#00c853",

    warning:"#ffb300",

    error:"#ff3b30",

    skeleton:"#00ff88",

    joints:"#ff3b30",

    trajectory:"#00ffff",

    vectors:"#66ff00"

};

/********************************************************************/

export function get(){

    return{

        ...theme

    };

}

/********************************************************************/

export function color(

    name

){

    return theme[name];

}

/********************************************************************/

export function set(

    name,

    value

){

    if(

        theme[name]!==undefined

    ){

        theme[name]=value;

    }

}

/********************************************************************/

export function load(

    newTheme

){

    theme={

        ...theme,

        ...newTheme

    };

}

/********************************************************************/

export function reset(){

    theme={

        name:"dark",

        background:"#111111",

        panel:"#1d1d1d",

        text:"#ffffff",

        accent:"#00d4ff",

        success:"#00c853",

        warning:"#ffb300",

        error:"#ff3b30",

        skeleton:"#00ff88",

        joints:"#ff3b30",

        trajectory:"#00ffff",

        vectors:"#66ff00"

    };

}

/********************************************************************/

export function summary(){

    return{

        name:

            theme.name,

        colors:

            Object.keys(

                theme

            ).length

    };

}