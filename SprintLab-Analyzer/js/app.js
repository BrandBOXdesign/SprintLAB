/*********************************************************************

 SprintLab Analyzer

 Archivo:
 app.js

 Versión:
 0.0.3

*********************************************************************/

import * as Bio from "./biomechanics.js";
import * as MP from "./mediapipe.js";

const videoInput=document.getElementById("videoInput");
const video=document.getElementById("video");
const overlay=document.getElementById("overlay");

const loadModelButton=document.getElementById("loadModel");
const analyzeButton=document.getElementById("analyzeFrame");

const modelSelect=document.getElementById("modelSelect");

const log=document.getElementById("log");

window.addEventListener("load",init);

/****************************************************/

function init(){

    writeLog("SprintLab Analyzer");
    writeLog("------------------------------");
    writeLog("Esperando video...");

    analyzeButton.disabled=true;

}

/****************************************************/

videoInput.addEventListener("change",loadVideo);

function loadVideo(e){

    const file=e.target.files[0];

    if(!file){

        return;

    }

    video.src=URL.createObjectURL(file);

    video.onloadedmetadata=()=>{

        resizeOverlay();

        writeLog("");

        writeLog("✓ Video cargado");

        writeLog(

            video.videoWidth+

            " x "+

            video.videoHeight

        );

    };

}

/****************************************************/

function resizeOverlay(){

    overlay.width=video.videoWidth;

    overlay.height=video.videoHeight;

}

/****************************************************/

loadModelButton.addEventListener(

    "click",

    async()=>{

        try{

            analyzeButton.disabled=true;

            loadModelButton.disabled=true;

            writeLog("");

            writeLog(

                "Cargando modelo "+

                modelSelect.value+

                "..."

            );

            await MP.loadModel(

                modelSelect.value

            );

            writeLog("✓ Modelo cargado");

            analyzeButton.disabled=false;

        }

        catch(err){

            writeLog("");

            writeLog("ERROR");

            writeLog(err.message);

        }

        finally{

            loadModelButton.disabled=false;

        }

    }

);

/****************************************************/

analyzeButton.addEventListener(

    "click",

    analyzeCurrentFrame

);

/****************************************************/

function analyzeCurrentFrame(){

    try{

        const result=

            MP.analyze(video);

        if(

            !result||

            !result.worldLandmarks||

            !result.landmarks

        ){

            writeLog("");

            writeLog("No se detectó atleta.");

            return;

        }

        drawLandmarks(

            result.landmarks

        );

        updateMetrics(

            result.worldLandmarks

        );

        writeLog("");

        writeLog("✓ Frame analizado");

    }

    catch(err){

        writeLog("");

        writeLog(err.message);

    }

}

/****************************************************/

function updateMetrics(world){

    setValue(

        "trunkAngle",

        Bio.trunkAngle(world).toFixed(2)+"°"

    );

    setValue(

        "leftKnee",

        Bio.kneeAngleLeft(world).toFixed(2)+"°"

    );

    setValue(

        "rightKnee",

        Bio.kneeAngleRight(world).toFixed(2)+"°"

    );

    setValue(

        "leftHip",

        Bio.hipAngleLeft(world).toFixed(2)+"°"

    );

    setValue(

        "rightHip",

        Bio.hipAngleRight(world).toFixed(2)+"°"

    );

    setValue(

        "leftAnkle",

        Bio.ankleAngleLeft(world).toFixed(2)+"°"

    );

    setValue(

        "rightAnkle",

        Bio.ankleAngleRight(world).toFixed(2)+"°"

    );

    setValue(

        "leftElbow",

        Bio.elbowAngleLeft(world).toFixed(2)+"°"

    );

    setValue(

        "rightElbow",

        Bio.elbowAngleRight(world).toFixed(2)+"°"

    );

    setValue(

        "leftKneeHeight",

        Bio.kneeHeightLeft(world).toFixed(4)

    );

    setValue(

        "rightKneeHeight",

        Bio.kneeHeightRight(world).toFixed(4)

    );

    setValue(

        "strideLength",

        Bio.strideLength(world).toFixed(4)

    );

    setValue(

        "symmetry",

        JSON.stringify(

            Bio.symmetry(world)

        )

    );

}

/****************************************************/

function drawLandmarks(points){

    const ctx=

        overlay.getContext("2d");

    ctx.clearRect(

        0,

        0,

        overlay.width,

        overlay.height

    );

    ctx.fillStyle="#ff3b30";

    for(const p of points){

        const x=p.x*overlay.width;

        const y=p.y*overlay.height;

        ctx.beginPath();

        ctx.arc(

            x,

            y,

            5,

            0,

            Math.PI*2

        );

        ctx.fill();

    }

}

/****************************************************/

function setValue(id,value){

    const element=document.getElementById(id);

    if(element){

        element.textContent=value;

    }

}

/****************************************************/

function writeLog(text){

    log.textContent+=text+"\n";

    log.scrollTop=log.scrollHeight;

}