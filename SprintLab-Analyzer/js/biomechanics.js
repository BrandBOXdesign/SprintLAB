/*********************************************************************

 SprintLab Analyzer

 Archivo:
 js/biomechanics.js

 Versión:
 0.0.3

*********************************************************************/

export const LANDMARK={

NOSE:0,

LEFT_EYE_INNER:1,
LEFT_EYE:2,
LEFT_EYE_OUTER:3,

RIGHT_EYE_INNER:4,
RIGHT_EYE:5,
RIGHT_EYE_OUTER:6,

LEFT_EAR:7,
RIGHT_EAR:8,

MOUTH_LEFT:9,
MOUTH_RIGHT:10,

LEFT_SHOULDER:11,
RIGHT_SHOULDER:12,

LEFT_ELBOW:13,
RIGHT_ELBOW:14,

LEFT_WRIST:15,
RIGHT_WRIST:16,

LEFT_PINKY:17,
RIGHT_PINKY:18,

LEFT_INDEX:19,
RIGHT_INDEX:20,

LEFT_THUMB:21,
RIGHT_THUMB:22,

LEFT_HIP:23,
RIGHT_HIP:24,

LEFT_KNEE:25,
RIGHT_KNEE:26,

LEFT_ANKLE:27,
RIGHT_ANKLE:28,

LEFT_HEEL:29,
RIGHT_HEEL:30,

LEFT_FOOT_INDEX:31,
RIGHT_FOOT_INDEX:32

};

/********************************************************************/

function v(a,b){

return{

x:b.x-a.x,
y:b.y-a.y,
z:b.z-a.z

};

}

/********************************************************************/

function mag(v){

return Math.sqrt(

v.x*v.x+

v.y*v.y+

v.z*v.z

);

}

/********************************************************************/

function dot(a,b){

return(

a.x*b.x+

a.y*b.y+

a.z*b.z

);

}

/********************************************************************/

export function distance(a,b){

return Math.sqrt(

(a.x-b.x)*(a.x-b.x)+

(a.y-b.y)*(a.y-b.y)+

(a.z-b.z)*(a.z-b.z)

);

}

/********************************************************************/

export function angleBetween(a,b,c){

const ba=v(b,a);

const bc=v(b,c);

const m1=mag(ba);

const m2=mag(bc);

if(m1===0||m2===0){

return 0;

}

let cos=dot(ba,bc)/(m1*m2);

cos=Math.max(-1,Math.min(1,cos));

return Math.acos(cos)*180/Math.PI;

}

/********************************************************************/

export function pelvisCenter(world){

return{

x:(world[23].x+world[24].x)/2,

y:(world[23].y+world[24].y)/2,

z:(world[23].z+world[24].z)/2

};

}

/********************************************************************/

export function shoulderCenter(world){

return{

x:(world[11].x+world[12].x)/2,

y:(world[11].y+world[12].y)/2,

z:(world[11].z+world[12].z)/2

};

}

/********************************************************************/

export function trunkAngle(world){

const pelvis=pelvisCenter(world);

const shoulder=shoulderCenter(world);

const dx=shoulder.x-pelvis.x;

const dy=shoulder.y-pelvis.y;

return Math.atan2(dx,-dy)*180/Math.PI;

}

/********************************************************************/

export function kneeAngleLeft(world){

return angleBetween(

world[23],

world[25],

world[27]

);

}

export function kneeAngleRight(world){

return angleBetween(

world[24],

world[26],

world[28]

);

}

/********************************************************************/

export function hipAngleLeft(world){

return angleBetween(

world[11],

world[23],

world[25]

);

}

export function hipAngleRight(world){

return angleBetween(

world[12],

world[24],

world[26]

);

}

/********************************************************************/

export function ankleAngleLeft(world){

return angleBetween(

world[25],

world[27],

world[31]

);

}

export function ankleAngleRight(world){

return angleBetween(

world[26],

world[28],

world[32]

);

}

/********************************************************************/

export function elbowAngleLeft(world){

return angleBetween(

world[11],

world[13],

world[15]

);

}

export function elbowAngleRight(world){

return angleBetween(

world[12],

world[14],

world[16]

);

}

/********************************************************************/

export function kneeHeightLeft(world){

return world[23].y-world[25].y;

}

export function kneeHeightRight(world){

return world[24].y-world[26].y;

}

/********************************************************************/

export function strideLength(world){

return distance(

world[27],

world[28]

);

}

/********************************************************************/

export function shoulderWidth(world){

return distance(

world[11],

world[12]

);

}

/********************************************************************/

export function hipWidth(world){

return distance(

world[23],

world[24]

);

}

/********************************************************************/

export function leftLegLength(world){

return(

distance(

world[23],

world[25]

)+

distance(

world[25],

world[27]

)

);

}

/********************************************************************/

export function rightLegLength(world){

return(

distance(

world[24],

world[26]

)+

distance(

world[26],

world[28]

)

);

}

/********************************************************************/

export function verticalOscillation(previous,current){

if(!previous){

return 0;

}

const p=pelvisCenter(previous);

const c=pelvisCenter(current);

return c.y-p.y;

}

/********************************************************************/

export function centerOfMass(world){

const pelvis=pelvisCenter(world);

const shoulder=shoulderCenter(world);

return{

x:(pelvis.x+shoulder.x)/2,

y:(pelvis.y+shoulder.y)/2,

z:(pelvis.z+shoulder.z)/2

};

}

/********************************************************************/

export function symmetry(world){

const lk=kneeAngleLeft(world);

const rk=kneeAngleRight(world);

const lh=hipAngleLeft(world);

const rh=hipAngleRight(world);

const la=ankleAngleLeft(world);

const ra=ankleAngleRight(world);

const le=elbowAngleLeft(world);

const re=elbowAngleRight(world);

return{

knee:Math.abs(lk-rk),

hip:Math.abs(lh-rh),

ankle:Math.abs(la-ra),

elbow:Math.abs(le-re)

};

}

/********************************************************************/

export function analyzeFrame(world){

return{

trunkAngle:trunkAngle(world),

leftKnee:kneeAngleLeft(world),

rightKnee:kneeAngleRight(world),

leftHip:hipAngleLeft(world),

rightHip:hipAngleRight(world),

leftAnkle:ankleAngleLeft(world),

rightAnkle:ankleAngleRight(world),

leftElbow:elbowAngleLeft(world),

rightElbow:elbowAngleRight(world),

leftKneeHeight:kneeHeightLeft(world),

rightKneeHeight:kneeHeightRight(world),

strideLength:strideLength(world),

shoulderWidth:shoulderWidth(world),

hipWidth:hipWidth(world),

leftLeg:leftLegLength(world),

rightLeg:rightLegLength(world),

center:centerOfMass(world),

symmetry:symmetry(world)

};

}