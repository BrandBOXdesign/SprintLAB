/*********************************************************************

 SprintLab Analyzer

 Archivo:
 video.js

 Versión:
 0.0.3

*********************************************************************/

let video=null;

let canvas=null;

let ctx=null;

/********************************************************************/

export function initialize(videoElement,canvasElement){

video=videoElement;

canvas=canvasElement;

ctx=canvas.getContext("2d");

window.addEventListener(

"resize",

resize

);

}

/********************************************************************/

export function load(file){

return new Promise((resolve,reject)=>{

if(!file){

reject("Archivo inválido.");

return;

}

video.src=URL.createObjectURL(file);

video.onloadedmetadata=()=>{

resize();

resolve();

};

});

}

/********************************************************************/

export function resize(){

if(!video||!canvas){

return;

}

const rect=

video.getBoundingClientRect();

canvas.width=rect.width;

canvas.height=rect.height;

canvas.style.width=

rect.width+"px";

canvas.style.height=

rect.height+"px";

canvas.style.left=

video.offsetLeft+"px";

canvas.style.top=

video.offsetTop+"px";

}

/********************************************************************/

export function context(){

return ctx;

}

/********************************************************************/

export function element(){

return video;

}

/********************************************************************/

export function width(){

return canvas.width;

}

/********************************************************************/

export function height(){

return canvas.height;

}

/********************************************************************/

export function currentTime(){

return video.currentTime;

}

/********************************************************************/

export function duration(){

return video.duration;

}

/********************************************************************/

export function play(){

video.play();

}

/********************************************************************/

export function pause(){

video.pause();

}

/********************************************************************/

export function seek(seconds){

video.currentTime=seconds;

}

/********************************************************************/

export function nextFrame(){

pause();

video.currentTime+=1/60;

}

/********************************************************************/

export function previousFrame(){

pause();

video.currentTime=Math.max(

0,

video.currentTime-1/60

);

}

/********************************************************************/

export function isLoaded(){

return(

video.readyState>=2

);

}