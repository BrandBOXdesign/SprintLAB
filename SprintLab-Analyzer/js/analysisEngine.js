/*********************************************************************

 SprintLab Analyzer

 Archivo:
 analysisEngine.js

 Versión:
 0.0.4

*********************************************************************/

import * as Posture from "./postureAnalyzer.js";
import * as Balance from "./balanceAnalyzer.js";
import * as Stability from "./stabilityAnalyzer.js";
import * as Arms from "./armAnalyzer.js";
import * as Legs from "./legAnalyzer.js";
import * as Head from "./headAnalyzer.js";
import * as Gait from "./gaitAnalyzer.js";
import * as Phase from "./phaseAnalyzer.js";
import * as Kinematics from "./kinematics.js";
import * as Velocity from "./velocityAnalyzer.js";
import * as Timing from "./timingAnalyzer.js";
import * as Performance from "./performanceAnalyzer.js";

/********************************************************************/

export function analyze(

    world,

    time

){

    const posture=

        Posture.analyze(world);

    const balance=

        Balance.analyze(world);

    const stability=

        Stability.analyze(world);

    const arms=

        Arms.analyze(world);

    const legs=

        Legs.analyze(world);

    const head=

        Head.analyze(world);

    const gait=

        Gait.analyze(world);

    const phase=

        Phase.analyze(world);

    const velocity=

        Velocity.analyze(

            world,

            time

        );

    const kinematics=

        Kinematics.analyze(

            world,

            time

        );

    const timing=

        Timing.analyze(

            phase,

            time

        );

    const performance=

        Performance.analyze({

            posture:posture.score,

            balance:balance.score,

            stability:100-

                stability.stabilityIndex*100,

            arms:arms.score,

            legs:legs.score,

            speed:

                velocity.velocity*20,

            cadence:

                timing.cadence

        });

    return{

        posture,

        balance,

        stability,

        arms,

        legs,

        head,

        gait,

        phase,

        velocity,

        kinematics,

        timing,

        performance

    };

}

/********************************************************************/

export function reset(){

    Posture.reset();

    Balance.reset();

    Stability.reset();

    Arms.reset();

    Legs.reset();

    Head.reset();

    Gait.reset();

    Phase.reset();

    Velocity.reset();

    Kinematics.reset();

    Timing.reset();

    Performance.reset();

}