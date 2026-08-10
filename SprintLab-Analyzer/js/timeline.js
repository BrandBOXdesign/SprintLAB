/*********************************************************************

 SprintLab Analyzer

 Archivo:
 timeline.js

 Versión:
 0.0.3

*********************************************************************/

let fps=60;

let currentFrame=0;

let totalFrames=0;

const markers=[];

/********************************************************************/

export function initialize(

video,

framesPerSecond=60

){

fps=framesPerSecond;

totalFrames=Math.floor(

video.duration*fps

);

currentFrame=0;

markers.length=0;

}

/********************************************************************/

export function frame(){

return currentFrame;

}

/********************************************************************/

export function total(){

return totalFrames;

}

/********************************************************************/

export function seconds(){

return currentFrame/fps;

}

/********************************************************************/

export function setFrame(value){

currentFrame=Math.max(

0,

Math.min(

value,

totalFrames

)

);

}

/********************************************************************/

export function next(){

if(currentFrame<totalFrames){

currentFrame++;

}

}

/********************************************************************/

export function previous(){

if(currentFrame>0){

currentFrame--;

}

}

/********************************************************************/

export function percentage(){

if(totalFrames===0){

return 0;

}

return(

currentFrame/

totalFrames

)*100;

}

/********************************************************************/

export function addMarker(

frame,

name,

color="#ff3b30"

){

markers.push({

frame,

name,

color

});

}

/********************************************************************/

export function removeMarker(frame){

const index=

markers.findIndex(

m=>m.frame===frame

);

if(index>=0){

markers.splice(

index,

1

);

}

}

/********************************************************************/

export function getMarkers(){

return markers;

}

/********************************************************************/

export function clearMarkers(){

markers.length=0;

}

/********************************************************************/

export function frameToTime(frame){

return frame/fps;

}

/********************************************************************/

export function timeToFrame(seconds){

return Math.round(

seconds*fps

);

}

/********************************************************************/

export function formatTime(frame){

const totalSeconds=

frameToTime(frame);

const minutes=

Math.floor(

totalSeconds/60

);

const seconds=

Math.floor(

totalSeconds%60

);

const milliseconds=

Math.floor(

(totalSeconds-

Math.floor(totalSeconds))

*1000

);

return(

String(minutes)

.padStart(2,"0")+

":"+

String(seconds)

.padStart(2,"0")+

"."+

String(milliseconds)

.padStart(3,"0")

);

}