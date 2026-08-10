/*********************************************************************

 SprintLab Analyzer

 Archivo:
 athlete.js

 Versión:
 0.0.3

*********************************************************************/

let athlete={

name:"",

gender:"",

age:0,

height:0,

weight:0,

sport:"Sprint",

category:"",

dominantLeg:"Right",

notes:""

};

/********************************************************************/

export function create(data={}){

athlete={

...athlete,

...data

};

return athlete;

}

/********************************************************************/

export function current(){

return athlete;

}

/********************************************************************/

export function update(data){

athlete={

...athlete,

...data

};

return athlete;

}

/********************************************************************/

export function setName(name){

athlete.name=name;

}

/********************************************************************/

export function setGender(gender){

athlete.gender=gender;

}

/********************************************************************/

export function setAge(age){

athlete.age=Number(age);

}

/********************************************************************/

export function setHeight(height){

athlete.height=Number(height);

}

/********************************************************************/

export function setWeight(weight){

athlete.weight=Number(weight);

}

/********************************************************************/

export function setDominantLeg(leg){

athlete.dominantLeg=leg;

}

/********************************************************************/

export function setCategory(category){

athlete.category=category;

}

/********************************************************************/

export function bmi(){

if(

athlete.height<=0||

athlete.weight<=0

){

return 0;

}

const h=

athlete.height/100;

return athlete.weight/(h*h);

}

/********************************************************************/

export function idealStride(){

if(athlete.height<=0){

return 0;

}

return athlete.height*1.14;

}

/********************************************************************/

export function summary(){

return{

name:athlete.name,

age:athlete.age,

height:athlete.height,

weight:athlete.weight,

bmi:bmi(),

idealStride:idealStride(),

dominantLeg:athlete.dominantLeg,

category:athlete.category

};

}

/********************************************************************/

export function exportData(){

return JSON.parse(

JSON.stringify(

athlete

)

);

}

/********************************************************************/

export function reset(){

athlete={

name:"",

gender:"",

age:0,

height:0,

weight:0,

sport:"Sprint",

category:"",

dominantLeg:"Right",

notes:""

};

}