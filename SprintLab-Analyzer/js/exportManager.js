/*********************************************************************

 SprintLab Analyzer

 Archivo:
 exportManager.js

 Versión:
 0.0.5

*********************************************************************/

/********************************************************************/

export function exportJSON(

data,

filename="analysis.json"

){

const json=

JSON.stringify(

data,

null,

2

);

download(

json,

filename,

"application/json"

);

}

/********************************************************************/

export function exportCSV(

rows,

filename="analysis.csv"

){

if(

!rows||

rows.length===0

){

return;

}

const headers=

Object.keys(

rows[0]

);

const csv=[

headers.join(",")

];

for(

const row

of

rows

){

csv.push(

headers.map(

h=>row[h]

).join(",")

);

}

download(

csv.join("\n"),

filename,

"text/csv"

);

}

/********************************************************************/

function download(

content,

filename,

type

){

const blob=

new Blob(

[content],

{type}

);

const url=

URL.createObjectURL(

blob

);

const a=

document.createElement(

"a"

);

a.href=url;

a.download=filename;

document.body.appendChild(

a

);

a.click();

a.remove();

URL.revokeObjectURL(

url

);

}

/********************************************************************/

export function exportSession(

session

){

exportJSON(

session,

"session.json"

);

}

/********************************************************************/

export function exportReports(

reports

){

exportCSV(

reports,

"reports.csv"

);

}