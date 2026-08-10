// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
export const MACRO_MODELS = {
  annual: {
    id: 'annual', name: 'Sistema anual largo',
    subtitle: '9 meses carga · 1 mes descarga · 1 mes descanso activo',
    description: 'Microciclo semanal constante sostenido durante 9 meses, sin semana de descarga intercalada. La recuperación ocurre dentro de cada semana (1.5 días fijos), no en bloques.',
    weeklyTemplate: [
      { day: 'Lunes', type: 'gym', label: 'Gimnasio — Fuerza' },
      { day: 'Martes', type: 'track', label: 'Pista — Técnica/Velocidad' },
      { day: 'Miércoles', type: 'gym', label: 'Gimnasio — Fuerza' },
      { day: 'Jueves', type: 'track', label: 'Pista — Series' },
      { day: 'Viernes', type: 'track', label: 'Pista — Velocidad/Salida' },
      { day: 'Sábado', type: 'field', label: 'Campo — Arena + Agua (medio día)' },
      { day: 'Domingo', type: 'rest', label: 'Descanso (1.5 días con sáb. PM)' },
    ],
    phases: [
      { name: 'Carga sostenida', months: 9, note: 'Microciclo fijo repetido, sin descarga en bloque' },
      { name: 'Descarga activa', months: 1, note: 'Preparación previa a evaluación, volumen reducido' },
      { name: 'Descanso activo', months: 1, note: 'No es descanso absoluto — actividad ligera' },
    ],
  },
  blocks: {
    id: 'blocks', name: 'Bloques clásicos',
    subtitle: '4 semanas carga + 1 semana descarga, repetido',
    description: 'Modelo de periodización en bloques (Bompa/Verkhoshansky). Semana de descarga completa cada 4 semanas. Recomendado para atletas sin estructura anual previa o sin entrenador presente que ajuste fatiga semana a semana.',
    weeklyTemplate: [
      { day: 'Lunes', type: 'gym', label: 'Gimnasio — Fuerza' },
      { day: 'Martes', type: 'track', label: 'Pista — Técnica' },
      { day: 'Miércoles', type: 'rest', label: 'Descanso' },
      { day: 'Jueves', type: 'gym', label: 'Gimnasio — Potencia' },
      { day: 'Viernes', type: 'track', label: 'Pista — Velocidad' },
      { day: 'Sábado', type: 'track', label: 'Pista — Series' },
      { day: 'Domingo', type: 'rest', label: 'Descanso' },
    ],
    phases: [
      { name: 'Base/Acumulación', weeks: 4, note: 'Volumen alto, intensidad baja-media' },
      { name: 'Descarga', weeks: 1, note: 'Volumen reducido ~40%' },
      { name: 'Transformación', weeks: 4, note: 'Fuerza-velocidad, volumen medio' },
      { name: 'Descarga', weeks: 1, note: 'Volumen reducido ~40%' },
      { name: 'Realización', weeks: 4, note: 'Velocidad máxima, volumen bajo, intensidad alta' },
      { name: 'Tapering', weeks: 2, note: 'Reducción progresiva' },
    ],
  },
};

