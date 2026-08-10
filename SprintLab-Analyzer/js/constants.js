/*********************************************************************

 SprintLab Analyzer

 Archivo:
 constants.js

 Versión:
 0.0.3

*********************************************************************/

export const VERSION="0.0.3";

export const APP_NAME="SprintLab Analyzer";

export const TARGET_FPS=60;

export const MAX_VIDEO_HEIGHT=0.70;

export const LANDMARK_RADIUS=5;

export const LINE_WIDTH=2;

export const COLORS={

BACKGROUND:"#111111",

LANDMARK:"#ff3b30",

SKELETON:"#00d2ff",

PELVIS:"#00ff66",

SHOULDERS:"#00ffff",

TRUNK:"#ff00ff",

TEXT:"#ffffff",

WARNING:"#ffcc00",

ERROR:"#ff3b30",

SUCCESS:"#35c759"

};

export const POSE_CONNECTIONS=[

[11,13],
[13,15],

[12,14],
[14,16],

[11,12],

[11,23],
[12,24],

[23,24],

[23,25],
[25,27],
[27,29],
[29,31],

[24,26],
[26,28],
[28,30],
[30,32]

];

export const METRIC_NAMES={

trunkAngle:"Ángulo del tronco",

leftKnee:"Rodilla izquierda",

rightKnee:"Rodilla derecha",

leftHip:"Cadera izquierda",

rightHip:"Cadera derecha",

leftAnkle:"Tobillo izquierdo",

rightAnkle:"Tobillo derecho",

leftElbow:"Codo izquierdo",

rightElbow:"Codo derecho",

leftKneeHeight:"Altura rodilla izquierda",

rightKneeHeight:"Altura rodilla derecha",

strideLength:"Longitud de zancada",

shoulderWidth:"Anchura de hombros",

hipWidth:"Anchura de cadera",

leftLeg:"Longitud pierna izquierda",

rightLeg:"Longitud pierna derecha",

verticalOscillation:"Oscilación vertical",

symmetry:"Simetría corporal"

};

export const DEFAULT_THRESHOLDS={

kneeAngle:170,

hipAngle:170,

ankleAngle:90,

symmetry:5,

verticalOscillation:0.05

};