/*********************************************************************

 SprintLab Analyzer

 Archivo:
 reportGenerator.js

 Versión:
 0.0.7

*********************************************************************/

import * as Statistics from "./statistics.js";
import * as Quality from "./qualityAnalyzer.js";
import * as Performance from "./performanceTimeline.js";
import * as Events from "./eventDetector.js";
import * as Contact from "./contactAnalyzer.js";
import * as Stride from "./strideAnalyzer.js";
import * as Video from "./videoMetrics.js";
import * as Coach from "./aiCoach.js";

/********************************************************************/

export function generate(){

    const statistics=

        Statistics.summary();

    const quality=

        Quality.summary();

    const performance=

        Performance.summary();

    const stride=

        Stride.summary();

    const contact=

        Contact.summary();

    const video=

        Video.summary();

    const events=

        Events.all();

    const advice=

        Coach.latest();

    return{

        created:

            new Date().toISOString(),

        video,

        statistics,

        performance,

        quality,

        stride,

        contact,

        events,

        advice

    };

}

/********************************************************************/

export function athleteScore(){

    const report=

        generate();

    return(

        report.performance

        .averageScore

    );

}

/********************************************************************/

export function print(){

    console.table(

        generate()

    );

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(

            generate()

        )

    );

}