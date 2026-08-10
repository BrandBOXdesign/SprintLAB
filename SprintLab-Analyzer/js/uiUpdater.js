/*********************************************************************

 SprintLab Analyzer

 Archivo:
 uiUpdater.js

 Versión:
 0.0.4

*********************************************************************/

const ids={

score:"score",

level:"level",

phase:"phase",

speed:"speed",

cadence:"cadence",

posture:"postureScore",

balance:"balanceScore",

stability:"stabilityScore",

arms:"armsScore",

legs:"legsScore"

};

/********************************************************************/

export function update(result){

    if(!result){

        return;

    }

    set(

        ids.score,

        fixed(

            result.performance.score

        )

    );

    set(

        ids.level,

        result.performance.level

    );

    set(

        ids.phase,

        result.phase

    );

    set(

        ids.speed,

        fixed(

            result.velocity.velocity

        )+" m/s"

    );

    set(

        ids.cadence,

        fixed(

            result.timing.cadence

        )+" spm"

    );

    set(

        ids.posture,

        fixed(

            result.posture.score

        )

    );

    set(

        ids.balance,

        fixed(

            result.balance.score

        )

    );

    set(

        ids.stability,

        fixed(

            100-

            result.stability.stabilityIndex*100

        )

    );

    set(

        ids.arms,

        fixed(

            result.arms.score

        )

    );

    set(

        ids.legs,

        fixed(

            result.legs.score

        )

    );

}

/********************************************************************/

function set(

    id,

    value

){

    const element=

        document.getElementById(id);

    if(element){

        element.textContent=value;

    }

}

/********************************************************************/

function fixed(value){

    if(

        value===undefined||

        value===null||

        Number.isNaN(value)

    ){

        return "0.00";

    }

    return Number(value).toFixed(2);

}

/********************************************************************/

export function clear(){

    for(

        const key in ids

    ){

        set(

            ids[key],

            "--"

        );

    }

}
