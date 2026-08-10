/*********************************************************************

 SprintLab Analyzer

 Archivo:
 analysisPipeline.js

 Versión:
 0.0.7

*********************************************************************/

import * as Ground from "./groundPlane.js";
import * as Contact from "./contactAnalyzer.js";
import * as COM from "./centerOfMass.js";
import * as Stride from "./strideAnalyzer.js";
import * as Quality from "./qualityAnalyzer.js";
import * as Timeline from "./performanceTimeline.js";
import * as Statistics from "./statistics.js";
import * as Events from "./eventDetector.js";
import * as Coach from "./aiCoach.js";

/********************************************************************/

export function process(result){

    if(!result){

        return null;

    }

    const ground=

        Ground.update(

            result.worldLandmarks

        );

    const contact=

        Contact.analyze(

            result.worldLandmarks,

            ground

        );

    const center=

        COM.analyze(

            result.worldLandmarks

        );

    const stride=

        Stride.analyze({

            length:

                result.strideLength??0,

            frequency:

                result.timing?.cadence??0,

            contact:

                contact.left||

                contact.right

                ?0.10:0,

            flight:

                contact.flight

                ?0.12:0,

            speed:

                result.velocity?.velocity??0

        });

    Quality.add(result);

    Timeline.add(result);

    Statistics.add({

        score:

            result.performance?.score??0,

        speed:

            result.velocity?.velocity??0,

        cadence:

            result.timing?.cadence??0

    });

    Events.analyze({

        ...result,

        contact

    });

    const advice=

        Coach.evaluate({

            posture:

                result.posture?.score??0,

            balance:

                result.balance?.score??0,

            arms:

                result.arms?.score??0,

            legs:

                result.legs?.score??0,

            speed:

                result.velocity?.velocity??0,

            cadence:

                result.timing?.cadence??0

        });

    return{

        ...result,

        ground,

        contact,

        center,

        stride,

        advice

    };

}

/********************************************************************/

export function reset(){

    Ground.reset();

    Contact.reset();

    COM.reset();

    Stride.reset();

    Quality.reset();

    Timeline.reset();

    Statistics.reset();

    Events.reset();

    Coach.reset();

}