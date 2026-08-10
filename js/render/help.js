// Panel de ayuda dentro de la app. Se abre con el botón "❓ Ayuda" del
// header (ver render/layout.js) y se cierra volviendo a la pestaña donde
// estaba el entrenador (no usa una ruta/URL propia, solo un flag en el
// estado: state.showHelp).
//
// Las capturas de pantalla NO están incluidas en el código -- se referencian
// por nombre de archivo bajo assets/help/. Mientras un archivo no exista, se
// muestra un recuadro "Falta: assets/help/archivo.png" en su lugar (ver
// función shot() más abajo), así que agregar una captura después es tan
// simple como guardar el PNG con el nombre correcto en esa carpeta -- no
// hace falta tocar este archivo.
import { render } from './layout.js';
import { state } from '../state/state.js';
import { el, sectionLabel } from '../utils/helpers.js';

function p(text) { return el('p', { class: 'help-p' }, text); }
function h(text) { return el('div', { class: 'help-h' }, text); }
function list(items) { return el('ul', { class: 'help-list' }, items.map(i => el('li', {}, i))); }
function note(text) { return el('div', { class: 'help-note' }, [el('span', { class: 'help-note-icon' }, 'ℹ'), el('span', {}, text)]); }
function warn(text) { return el('div', { class: 'help-note help-note-warn' }, [el('span', { class: 'help-note-icon' }, '⚠'), el('span', {}, text)]); }

// Placeholder de captura de pantalla: si assets/help/<filename> no existe
// todavía, muestra un recuadro con el nombre esperado en vez de un ícono de
// imagen rota.
function shot(filename, caption) {
  const img = el('img', { src: `assets/help/${filename}`, alt: caption || filename, class: 'help-screenshot' });
  const placeholder = el('div', { class: 'help-screenshot-placeholder' }, [
    el('div', { style: { fontSize: '22px' } }, '📷'),
    el('div', {}, `Falta capturar: assets/help/${filename}`),
  ]);
  placeholder.style.display = 'none';
  img.addEventListener('error', () => { img.style.display = 'none'; placeholder.style.display = 'flex'; });
  return el('figure', { class: 'help-figure' }, [img, placeholder, caption ? el('figcaption', { class: 'help-caption' }, caption) : null]);
}

const HELP_SECTIONS = [
  {
    id: 'atletas',
    label: 'Atletas',
    blocksFn: () => [
      h('Pantalla de inicio'),
      p('Al abrir Sprint Lab siempre entras primero a la lista de atletas. Desde ahí eliges con cuál vas a trabajar, o creas uno nuevo.'),
      shot('atletas-lista.png', 'Lista de atletas al abrir la app.'),
      p('Cada tarjeta de atleta muestra su nombre, nivel, edad, su tiempo base de 100m (si lo cargaste), cuántas sesiones tiene registradas, y un punto de color que indica su ratio de carga aguda:crónica actual (verde = zona segura, amarillo/rojo = revisar volumen).'),
      p('Toca una tarjeta para entrar al perfil de ese atleta y empezar a trabajar con él (pestañas Estado, Perfil, Semana, Registro, Progreso).'),
      h('Crear un atleta nuevo'),
      p('Botón "+ Nuevo atleta" al final de la lista. Pide nombre, edad, peso, tiempos base de 100m/200m (si los conoces) y nivel (principiante / intermedio / avanzado). Todo excepto el nombre es opcional al crear — puedes completarlo después desde Perfil.'),
      note('El nombre es el único dato obligatorio para crear el atleta. Los demás campos alimentan cálculos (proyecciones, sugerencias de carga) que mejoran mientras más datos tengas cargados, pero no bloquean nada si están vacíos.'),
      h('Borrar un atleta'),
      p('No se borra desde esta lista. Se hace entrando al atleta → pestaña Perfil → "Zona de riesgo", al final. Esto es intencional: es una acción irreversible (borra también todas sus sesiones y videos), así que está apartada para no tocarla por accidente.'),
    ],
  },
  {
    id: 'estado',
    label: 'Estado',
    blocksFn: () => [
      h('Qué es esta pestaña'),
      p('Es el panel general del atleta: un resumen rápido de cómo está, qué se le viene, y accesos directos para importar/exportar datos. Es lo primero que deberías revisar cada vez que abres a un atleta.'),
      shot('estado-general.png', 'Vista general de la pestaña Estado.'),
      h('Las tarjetas (widgets)'),
      list([
        'Atleta: nombre, nivel, edad, peso, y qué modelo de macrociclo tiene asignado.',
        'Últimas marcas: mejor tiempo y último tiempo de 100m/200m, y el objetivo que le pusiste en Perfil.',
        'Ratio AC: relación entre carga aguda (reciente) y crónica (últimas ~4 semanas), calculada con promedio móvil de decaimiento exponencial (EWMA) en vez de ventanas fijas — el mismo método que usan plataformas profesionales como Catapult o Kinexon, más estable que comparar simplemente "última semana vs. últimas 4". Por debajo de 0.8 sugiere desentrenamiento; por encima de 1.5, riesgo de lesión.',
        'Volumen semanal: minutos realizados contra minutos planificados en Semana, en porcentaje.',
        'Próxima sesión: lo que toca según el plan semanal.',
        'Última sesión: fecha, tipo, RPE y duración de la más reciente.',
        'Sugerencia próx. semana: volumen y RPE sugeridos automáticamente según el ratio de carga actual (con un botón directo a Semana para aplicarla o ajustarla).',
        'Carga interna (TRIMP): estimación de carga interna por sesión (método Foster), monotonía semanal y strain — útiles para detectar semanas repetitivas que aumentan riesgo de lesión aunque el volumen se vea normal.',
        'Alertas: avisos automáticos (ratio alto, muchos días sin registrar, etc.).',
      ]),
      note('Todas estas tarjetas se pueden reordenar: mantén presionado el ⠿ de la esquina y arrastra. El orden que dejes se guarda para la próxima vez.'),
      h('Importar y exportar'),
      p('Al final de Estado hay tres botones para exportar: "Sesiones CSV" (todas las sesiones en una hoja de cálculo), "Backup JSON" (una copia completa del atleta, para restaurar si algo sale mal o para pasarlo a otra instalación de la app), e "Informe PDF" (un reporte imprimible).'),
      p('El botón dorado "Restaurar desde Backup JSON" hace lo contrario: carga un archivo de Backup JSON de vuelta a la app. Si el atleta del archivo ya existe, te avisa antes de sobrescribir sus datos — nada se reemplaza sin que confirmes.'),
      note('El respaldo automático (ver más abajo) guarda a TODOS los atletas juntos en un solo archivo, así que para restaurar uno en particular desde ahí, el archivo trae igualmente los datos completos de ese atleta.'),
      h('Respaldo automático'),
      p('Si usas la app empacada (el .exe de Electron, no el navegador), Sprint Lab guarda un respaldo completo de todos tus atletas una vez al día, sin que tengas que acordarte de nada. Se guarda en una carpeta fuera de la app, para que sobreviva a una desinstalación o actualización, y se conservan los últimos 14 respaldos (los más viejos se borran solos).'),
      p('En el panel de exportar/importar puedes ver cuándo corrió el último y abrir esa carpeta directamente con "Abrir carpeta de respaldos".'),
      shot('estado-backup-auto.png', 'Estado del respaldo automático y botón para abrir la carpeta.'),
      warn('La app guarda todo localmente en esta PC (localStorage + IndexedDB para los videos). El respaldo automático cubre el caso de "se me olvidó" — pero si quieres estar tranquilo del todo (por ejemplo antes de una actualización grande de Windows), sigue siendo buena idea bajar un Backup JSON manual de vez en cuando, sobre todo si no configuraste la sincronización en Perfil → Nube.'),
      p('También puedes importar: sesiones desde un CSV (con el mismo formato que exportas), una salida GPX (reloj GPS, Strava exportado, etc.) o un archivo FIT (Garmin y similares) para cargar distancia/velocidad de una sesión de campo directamente, sin escribirla a mano.'),
      shot('estado-exportar.png', 'Botones de exportar/importar al final de Estado.'),
    ],
  },
  {
    id: 'perfil',
    label: 'Perfil',
    blocksFn: () => [
      h('01 · Atleta'),
      p('Datos base del atleta: nombre, edad, peso, tiempos base de 100m/200m, nivel, fecha de inicio de temporada, y los objetivos de tiempo (100m/200m) que usa la app para las proyecciones en Progreso.'),
      shot('perfil-atleta.png', 'Sección 01 · Atleta, en Perfil.'),
      note('La fecha de inicio de temporada es la que usa la app para calcular en qué semana/fase del macrociclo está el atleta ahora mismo (se ve reflejado en la pestaña Semana). Sin esa fecha, Semana no puede ubicar al atleta en el calendario.'),
      h('02 · Notas clínicas'),
      p('Un cuaderno de texto libre para lesiones previas, limitaciones físicas, medicación, o cualquier cosa que quieras tener a la mano sobre este atleta. No se usa en ningún cálculo — es solo para tu referencia.'),
      h('03 · Modelo de macrociclo'),
      p('Elige cómo se estructura el año de entrenamiento de este atleta. Hay dos modelos predefinidos (Carril 1 y Carril 2) más un tercero, "Personalizado", donde tú defines tus propias fases.'),
      shot('perfil-macrociclo.png', 'Selector de modelo de macrociclo (los 3 carriles).'),
      p('Si eliges "Personalizado" aparece un editor de fases: agregas cada fase con su nombre, duración (en semanas o meses), intensidad y objetivo, y puedes arrastrarlas (⠿) para reordenarlas. Cada fase puede además tener su propia plantilla semanal (qué se entrena cada día de esa fase en particular) — útil si, por ejemplo, la fase de competencia entrena distinto a la fase general.'),
      note('Cambiar el modelo de macrociclo no borra sesiones ni datos del atleta — solo cambia cómo se calcula "en qué semana/fase estás" en la pestaña Semana.'),
      h('04 · Competencias'),
      p('El calendario de competencias de la temporada. Cada una tiene fecha, sede, prueba (100m/200m/ambas), marca objetivo y una prioridad: A (el objetivo real de la temporada), B (importante pero no determinante) o C (competencia de preparación/rodaje).'),
      shot('perfil-competencias.png', 'Editor de competencias, con prioridad y marca objetivo.'),
      p('Después de correr, usa "Registrar resultado" para guardar tiempo, viento y posición. Si el viento a favor supera +2.0 m/s, la app lo marca como no válido para récord (regla de World Athletics) — el viento en contra siempre es legal, sin importar la magnitud.'),
      note('Cuando faltan 21 días o menos para una competencia prioridad A, la app te avisa en el Estado y en la pestaña Semana para que consideres el taper (reducir volumen antes de competir). Es solo un recordatorio de fecha, no verifica si tu plan real ya está en descarga.'),
      h('05 · Nube'),
      p('Sincronización opcional entre dispositivos (por ejemplo, PC del gimnasio + celular). Si todavía no está configurada para esta instalación, la tarjeta te lo dice y tus datos siguen guardándose solo en este equipo — no es obligatoria para usar la app.'),
      h('Zona de riesgo'),
      warn('Botón para eliminar permanentemente a este atleta junto con todas sus sesiones y videos. No se puede deshacer. Asegúrate de tener un Backup JSON reciente (desde Estado) antes de usarlo si hay alguna duda.'),
    ],
  },
  {
    id: 'semana',
    label: 'Semana',
    blocksFn: () => [
      h('Qué es esta pestaña'),
      p('Es el plan de la semana actual: en qué punto del macrociclo está el atleta, cuánto volumen lleva contra lo planificado, y el contenido día por día (Lunes a Domingo).'),
      shot('semana-general.png', 'Vista general de la pestaña Semana.'),
      note('Esta pestaña necesita que el atleta tenga un modelo de macrociclo elegido en Perfil (paso 03). Si es el modelo "Personalizado", además necesita al menos una fase definida.'),
      h('Próxima competencia'),
      p('Si hay competencias cargadas en Perfil, aquí arriba aparece la más próxima con la cuenta regresiva. Si es prioridad A y quedan 21 días o menos, se suma un aviso para que consideres el taper.'),
      h('Posición en temporada'),
      p('Muestra en qué semana del macrociclo está el atleta (calculado desde la fecha de inicio de temporada que pusiste en Perfil), la fase actual, cuánto falta para que termine esa fase, y una barra de progreso de la temporada completa.'),
      h('Carga semanal'),
      p('Compara minutos planificados contra minutos realmente registrados esta semana, con el ratio AC y una alerta de color si está fuera de rango (bajo = posible desentrenamiento, alto = riesgo de lesión).'),
      h('Sugerencia de carga'),
      p('Aparece cuando la app tiene suficientes datos: propone un volumen total y un RPE objetivo para la semana, con un botón "Aplicar sugerencia" que reparte ese volumen en el plan, o "Descartar" si prefieres planificar manualmente.'),
      h('Microciclo (día por día)'),
      p('Una fila por cada día de la semana. Por cada uno puedes elegir el tipo de sesión (Gimnasio / Pista / Campo / Descanso), escribir una etiqueta libre de qué se hará, y la duración planificada en minutos. Todo se guarda automáticamente al escribir.'),
      shot('semana-microciclo.png', 'Editor del microciclo, fila por día.'),
      p('El botón "Ajustar semana automáticamente" reparte el volumen sugerido entre los días según el tipo de sesión que ya tenga cada uno, sin que tengas que calcularlo a mano.'),
      h('Fases del macrociclo'),
      p('Al final, una lista de todas las fases del modelo elegido, con la fase actual resaltada — un vistazo rápido de todo el año, no solo la semana en curso.'),
    ],
  },
  {
    id: 'registro',
    label: 'Registro',
    blocksFn: () => [
      h('Qué es esta pestaña'),
      p('Aquí se registran las sesiones de entrenamiento — es la pantalla que más vas a usar día a día. Arriba está el formulario para cargar una sesión nueva; abajo, la lista de sesiones ya guardadas.'),
      shot('registro-formulario.png', 'Formulario de registro de sesión.'),
      h('Registro rápido'),
      p('El botón "⚡ Registro rápido (100m, RPE 5)" precarga el formulario con los valores más comunes en pista, para que solo tengas que teclear el tiempo y guardar — pensado para cuando estás con el cronómetro en la mano y no quieres perder tiempo tocando menús.'),
      h('Datos generales de la sesión'),
      list([
        'Fecha de la sesión (por defecto, hoy).',
        'Tipo de sesión: Pista, Gimnasio, o Campo (arena/agua).',
        'Duración total en minutos.',
        'RPE (esfuerzo percibido) del 1 al 10, con una descripción de cada nivel (de "Muy fácil" a "Esfuerzo absoluto").',
      ]),
      h('Si el tipo es "Pista": series'),
      p('Con "+ Agregar serie" cargas cada repetición: distancia (60/100/150/200/300m), tiempo, y opcionalmente reacción, salida y viento. La app calcula la velocidad de cada serie automáticamente.'),
      shot('registro-serie.png', 'Formulario para agregar una serie de pista.'),
      h('Si el tipo es "Gimnasio": ejercicios'),
      p('Eliges primero el tipo de sesión de gimnasio (Fuerza máx. / Potencia / Pliometría / Metabólico), y luego agregas cada ejercicio con nombre, peso y repeticiones. La app estima automáticamente el 1RM (fórmulas Epley/Brzycki), la velocidad y la potencia de cada serie.'),
      h('GPX'),
      p('Las sesiones de campo importadas desde un archivo GPX (ver Estado → Importar) muestran, al expandir la sesión en la lista, un mapa del recorrido y —si el GPX trae marcas de tiempo por punto— una gráfica de velocidad instantánea.'),
      h('Video (grabar, subir, marcar, medir zancada)'),
      p('Cualquier sesión ya guardada se puede expandir tocándola en la lista, y ahí aparece la tarjeta "Video". No hace falta que sea una sesión de pista ni que tenga GPX.'),
      shot('registro-video-vacio.png', 'Tarjeta de Video antes de tener uno cargado, con los dos botones.'),
      list([
        '🎥 Grabar video: usa la cámara de este equipo (si tiene una). Pide permiso de cámara/micrófono la primera vez.',
        '📁 Subir video: para cuando grabaste con el celular u otro dispositivo. Abre el explorador de archivos de Windows y aceptas cualquier archivo de video.',
      ]),
      note('Los dos guardan el video de la misma forma — una vez cargado, el reproductor, los marcadores y el cálculo de zancada funcionan igual sin importar si lo grabaste ahí mismo o lo subiste.'),
      shot('registro-video-reproductor.png', 'Reproductor de video con marcadores.'),
      p('Con el video cargado: "📍 Marcar" guarda el momento exacto donde va el video (con una etiqueta que tú escribes, por ejemplo "contacto de pie"), y cada marca queda como un botón que te regresa a ese instante exacto al tocarlo. "🗑 Eliminar video" lo borra por completo (esto sí libera espacio real, no solo lo oculta).'),
      h('Longitud de zancada (estimada)'),
      p('Debajo del video, con un video ya cargado: eliges de qué serie de pista sacar la velocidad (o metes distancia/tiempo a mano si no hay una serie formal), le sumas la frecuencia de zancada que cuentes tú mismo viendo el video (zancadas por segundo), y calcula longitud de zancada = velocidad ÷ frecuencia.'),
      note('La frecuencia de zancada no se detecta sola — la cuentas tú viendo el video (por ejemplo, contando apoyos en 1 segundo de repetición a velocidad máxima) y la escribes en el campo.'),
      h('Últimas sesiones'),
      p('Lista de todas las sesiones registradas, más recientes primero, con paginación si hay muchas. Deslizar una fila hacia la izquierda muestra el botón de eliminarla. Tocarla la expande para ver GPX/video/detalle.'),
    ],
  },
  {
    id: 'progreso',
    label: 'Progreso',
    blocksFn: () => [
      h('Qué es esta pestaña'),
      p('Gráficas de evolución del atleta a lo largo del tiempo, divididas en 4 sub-pestañas.'),
      shot('progreso-general.png', 'Vista general de Progreso con las 4 sub-pestañas.'),
      h('Tiempos'),
      p('Mejores marcas de 100m/200m, proyección de en cuántas semanas se alcanzaría el objetivo (si pusiste uno en Perfil, y hay al menos 2 marcas registradas para calcular la tendencia), y una gráfica de evolución de tiempos.'),
      h('Series'),
      p('Selecciona 100 o 200 metros y ve la velocidad de la mejor serie de cada sesión a lo largo del tiempo, más un indicador de caída de rendimiento entre la primera y la última repetición de la sesión más reciente (indicador de fatiga).'),
      h('Reacción/Salida'),
      p('Evolución de los tiempos de reacción y de salida que hayas cargado en las series de pista.'),
      h('Fuerza'),
      p('Por ejercicio de gimnasio (los que hayas registrado con ese nombre exacto): evolución del 1RM estimado y la potencia, más el tonelaje semanal total considerando todos los ejercicios juntos.'),
      shot('progreso-fuerza.png', 'Sub-pestaña Fuerza, con selector de ejercicio.'),
      note('Estas proyecciones y estimaciones (1RM, velocidad, potencia, semanas al objetivo) usan fórmulas públicas de uso común en el medio (Epley, Brzycki, regresión lineal simple) — son una guía, no un reemplazo del criterio del entrenador ni de una evaluación médico-deportiva.'),
    ],
  },
];

export function renderHelpScreen() {
  if (!state.helpSectionId || !HELP_SECTIONS.find(s => s.id === state.helpSectionId)) state.helpSectionId = HELP_SECTIONS[0].id;
  const active = HELP_SECTIONS.find(s => s.id === state.helpSectionId);

  const tabs = el('div', { class: 'chart-tabs help-tabs' }, HELP_SECTIONS.map(s => el('button', {
    class: 'chart-tab' + (state.helpSectionId === s.id ? ' active' : ''),
    onClick: () => { state.helpSectionId = s.id; render(); },
  }, s.label)));

  const closeBtn = el('button', { class: 'secondary-button', style: { marginBottom: '14px', textAlign: 'left', width: 'auto', padding: '8px 14px' }, onClick: () => { state.showHelp = false; render(); } }, '← Volver a la app');

  return el('div', { class: 'screen help-screen' }, [
    closeBtn,
    sectionLabel('❓', 'Ayuda'),
    p('Guía de uso de Sprint Lab, sección por sección. Elige un tema abajo.'),
    tabs,
    el('div', { class: 'help-content' }, active.blocksFn()),
  ]);
}
