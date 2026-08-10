/*********************************************************************

 SprintLab Analyzer

 Archivo:
 reportGenerator.js

 Versión:
 0.0.3

*********************************************************************/

const reports=[];

/********************************************************************/

export function reset(){

    reports.length=0;

}

/********************************************************************/

export function generate(data){

    const report={

        date:new Date(),

        score:data.score,

        level:data.level,

        posture:data.posture,

        balance:data.balance,

        stability:data.stability,

        arms:data.arms,

        legs:data.legs,

        speed:data.speed,

        cadence:data.cadence,

        strengths:strengths(data),

        improvements:improvements(data)

    };

    reports.push(report);

    return report;

}

/********************************************************************/

function strengths(data){

    const list=[];

    if(data.posture>=85) list.push("Postura");

    if(data.balance>=85) list.push("Equilibrio");

    if(data.stability>=85) list.push("Estabilidad");

    if(data.arms>=85) list.push("Braceo");

    if(data.legs>=85) list.push("Piernas");

    if(data.speed>=85) list.push("Velocidad");

    if(data.cadence>=85) list.push("Cadencia");

    return list;

}

/********************************************************************/

function improvements(data){

    const list=[];

    if(data.posture<75) list.push("Postura");

    if(data.balance<75) list.push("Equilibrio");

    if(data.stability<75) list.push("Estabilidad");

    if(data.arms<75) list.push("Braceo");

    if(data.legs<75) list.push("Piernas");

    if(data.speed<75) list.push("Velocidad");

    if(data.cadence<75) list.push("Cadencia");

    return list;

}

/********************************************************************/

export function latest(){

    if(reports.length===0){

        return null;

    }

    return reports[reports.length-1];

}

/********************************************************************/

export function totalReports(){

    return reports.length;

}

/********************************************************************/

export function averageScore(){

    if(reports.length===0){

        return 0;

    }

    let total=0;

    for(const report of reports){

        total+=report.score;

    }

    return total/reports.length;

}

/********************************************************************/

export function summary(){

    return{

        reports:totalReports(),

        averageScore:averageScore(),

        latest:latest()

    };

}

/********************************************************************/

export function exportData(){

    return JSON.parse(

        JSON.stringify(reports)

    );

}