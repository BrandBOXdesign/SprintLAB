/*********************************************************************

 SprintLab Analyzer

 Archivo:
 videoController.js

 Versión:
 0.0.3

*********************************************************************/

let video=null;

/********************************************************************/

export function attach(videoElement){

    video=videoElement;

}

/********************************************************************/

export function play(){

    if(video){

        video.play();

    }

}

/********************************************************************/

export function pause(){

    if(video){

        video.pause();

    }

}

/********************************************************************/

export function toggle(){

    if(!video){

        return;

    }

    if(video.paused){

        play();

    }

    else{

        pause();

    }

}

/********************************************************************/

export function stop(){

    if(!video){

        return;

    }

    video.pause();

    video.currentTime=0;

}

/********************************************************************/

export function seek(seconds){

    if(video){

        video.currentTime=seconds;

    }

}

/********************************************************************/

export function nextFrame(){

    if(!video){

        return;

    }

    video.pause();

    video.currentTime+=1/60;

}

/********************************************************************/

export function previousFrame(){

    if(!video){

        return;

    }

    video.pause();

    video.currentTime=Math.max(

        0,

        video.currentTime-1/60

    );

}

/********************************************************************/

export function speed(rate){

    if(video){

        video.playbackRate=rate;

    }

}

/********************************************************************/

export function currentTime(){

    return video?

        video.currentTime:0;

}

/********************************************************************/

export function duration(){

    return video?

        video.duration:0;

}

/********************************************************************/

export function progress(){

    if(

        !video||

        video.duration===0

    ){

        return 0;

    }

    return(

        video.currentTime/

        video.duration

    )*100;

}

/********************************************************************/

export function isPlaying(){

    if(!video){

        return false;

    }

    return !video.paused;

}

/********************************************************************/

export function summary(){

    return{

        playing:isPlaying(),

        current:currentTime(),

        duration:duration(),

        progress:progress()

    };

}