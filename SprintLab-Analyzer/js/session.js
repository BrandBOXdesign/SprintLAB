/*********************************************************************

 SprintLab Analyzer

 Archivo:
 session.js

 Versión:
 0.0.3

*********************************************************************/

let session=null;

/********************************************************************/

export function create(){

session={

id:crypto.randomUUID(),

created:new Date(),

athlete:{},

video:{},

metrics:[],

events:[],

notes:""

};

return session;

}

/********************************************************************/

export function current(){

return session;

}

/********************************************************************/

export function setAthlete(data){

if(!session){

create();

}

session.athlete={

...session.athlete,

...data

};

}

/********************************************************************/

export function setVideo(data){

if(!session){

create();

}

session.video={

...session.video,

...data

};

}

/********************************************************************/

export function addFrame(frame){

if(!session){

create();

}

session.metrics.push(frame);

}

/********************************************************************/

export function addEvent(

frame,

name,

details={}

){

if(!session){

create();

}

session.events.push({

frame,

name,

details,

time:new Date()

});

}

/********************************************************************/

export function notes(text){

if(!session){

create();

}

session.notes=text;

}

/********************************************************************/

export function totalFrames(){

if(!session){

return 0;

}

return session.metrics.length;

}

/********************************************************************/

export function duration(){

if(!session){

return 0;

}

return session.video.duration??0;

}

/********************************************************************/

export function exportSession(){

if(!session){

return null;

}

return JSON.parse(

JSON.stringify(session)

);

}

/********************************************************************/

export function reset(){

session=null;

}