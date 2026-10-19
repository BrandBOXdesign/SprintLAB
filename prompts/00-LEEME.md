# Paquete de prompts para el tracking de Sprint Lab

Objetivo: que otras IAs hagan el cálculo pesado (algoritmos + pruebas) y Claude Code solo integre y verifique.

## Cómo usarlo

| Paso | Prompt | IA sugerida | Qué devuelve |
|---|---|---|---|
| 1 | `01-identidad-izquierda-derecha.md` | DeepSeek (modo razonamiento / DeepThink) | `trackingIdentity.js` + `trackingIdentity.test.js` |
| 2 | `02-angulos-y-metricas.md` | Claude plan gratis (o DeepSeek) | `trackingMetrics.js` + `trackingMetrics.test.js` |
| 3 | `03-revision-cruzada.md` | La IA que NO escribió cada módulo | Lista de fallos con casos que los reproducen |

Los pasos 1 y 2 son independientes: se pueden hacer en paralelo en chats distintos.

## Reglas para todos los chats

1. Pega el prompt COMPLETO (ya trae el código adjunto al final; no hace falta pegar nada más).
2. Pide que respondan con **un bloque de código por archivo**, sin recortar con "...".
3. Si la IA dice "no estoy seguro", es una buena señal: anótalo, no se lo borres.
4. Guarda cada archivo tal cual en `js/services/` y `test/`, y avisa a Claude Code. Solo hará: `npm test`, integrar en `poseDetection.js` y verificar con `sprint.mp4`.

## Qué hace Claude Code después (poco costoso)

- Copiar los archivos, correr `npm test` y corregir imports.
- Conectar `applyIdentityTracking` y `computeMetrics` al final de `analyzeFullSkeleton`.
- Verificar visualmente cuadros reales de `sprint.mp4` (y de otros videos que aportes).

## Límite que conviene recordar

Con una sola cámara 2D hay un techo de precisión. Ninguna IA lo elimina; el objetivo es reducir los errores y marcar con claridad lo que no es confiable.
