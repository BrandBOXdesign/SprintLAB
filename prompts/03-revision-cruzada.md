# Tarea: revisión adversarial de un módulo JavaScript (sin escribir uno nuevo)

Actúa como un revisor escéptico. Otra IA escribió el módulo que te pego abajo (con sus pruebas) para una app de análisis de sprint. Tu trabajo es **encontrar fallos reales**, no elogiar.

## Qué debes entregar

1. **Lista de fallos ordenada por gravedad.** Para cada uno:
   - Qué pasa y por qué (cita la línea o función).
   - **Un caso concreto de entrada que lo reproduce** (datos mínimos, en código JS que pueda pegar en una prueba de `node:test`).
   - Qué salida esperabas y cuál obtendrías.
2. **Pruebas que faltan** y que habrían detectado esos fallos (escribe el código de las pruebas).
3. **Supuestos peligrosos**: cosas que el módulo da por ciertas y que un video real de celular puede violar (cámara en movimiento, vista no lateral, atleta parcialmente fuera de cuadro, motion blur, ropa holgada).
4. **Veredicto** de una línea: ¿se puede integrar tal cual, con cambios menores, o hay que rehacer algo?

## Reglas

- No reescribas el módulo completo. Si propones un arreglo, que sea un parche pequeño.
- Si no puedes comprobar algo sin ejecutar el código, dilo y propón cómo comprobarlo, en vez de afirmarlo.
- Revisa especialmente: NaN/Infinity, división por cero, signos de ángulos, mutación de la entrada, comportamiento en los bordes de la secuencia, rendimiento, y que las pruebas no sean tautológicas (que no comprueben el código contra sí mismo).
- Contexto de datos: `frames = [{ t, pts: { [indiceMediaPipe]: { x, y, visibility, interpolated } } }]`, x e y normalizados 0-1 (y hacia abajo), ~50 cuadros/s, 16 puntos del esqueleto de MediaPipe, vista lateral.

## MÓDULO A REVISAR

(Pega aquí el archivo `.js` y su `.test.js` completos.)
