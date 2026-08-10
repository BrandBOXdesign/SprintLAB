/*********************************************************************

 SprintLab Analyzer

 Archivo:
 pdfReport.js

 Versión:
 0.0.5

*********************************************************************/

/********************************************************************/

export function generate(report){

return `

<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<title>SprintLab Report</title>

<style>

body{

font-family:Arial,sans-serif;

margin:40px;

background:#ffffff;

color:#222;

}

h1{

margin-bottom:0;

}

h2{

margin-top:35px;

}

table{

width:100%;

border-collapse:collapse;

margin-top:15px;

}

th,

td{

border:1px solid #cccccc;

padding:8px;

text-align:left;

}

th{

background:#eeeeee;

}

.score{

font-size:48px;

font-weight:bold;

color:#0a84ff;

}

.good{

color:#2ecc71;

}

.bad{

color:#e74c3c;

}

</style>

</head>

<body>

<h1>SprintLab Analyzer</h1>

<p>

${new Date().toLocaleString()}

</p>

<div class="score">

${report.score.toFixed(1)}

</div>

<h2>Nivel</h2>

<p>

${report.level}

</p>

<h2>Métricas</h2>

<table>

<tr>

<th>Variable</th>

<th>Valor</th>

</tr>

<tr>

<td>Postura</td>

<td>${report.posture}</td>

</tr>

<tr>

<td>Equilibrio</td>

<td>${report.balance}</td>

</tr>

<tr>

<td>Estabilidad</td>

<td>${report.stability}</td>

</tr>

<tr>

<td>Brazos</td>

<td>${report.arms}</td>

</tr>

<tr>

<td>Piernas</td>

<td>${report.legs}</td>

</tr>

<tr>

<td>Velocidad</td>

<td>${report.speed}</td>

</tr>

<tr>

<td>Cadencia</td>

<td>${report.cadence}</td>

</tr>

</table>

<h2>Fortalezas</h2>

<ul>

${report.strengths

.map(

item=>`<li class="good">${item}</li>`

)

.join("")}

</ul>

<h2>Aspectos a mejorar</h2>

<ul>

${report.improvements

.map(

item=>`<li class="bad">${item}</li>`

)

.join("")}

</ul>

</body>

</html>

`;

}

/********************************************************************/

export function open(report){

const html=

generate(report);

const win=

window.open(

"",

"_blank"

);

win.document.open();

win.document.write(html);

win.document.close();

}