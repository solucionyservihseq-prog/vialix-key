/* ============================================================
   VIALIX KEY v1.7.0 - Configuración de la prueba teórico-práctica
   ------------------------------------------------------------
   Las tres partes viven dentro de VIALIX KEY:
   1. Evaluación teórica   → TEORICA_CONFIG (+ teorica-banco.js)
   2. Pruebas psicomotrices → PSICOTEST_CONFIG
   3. Prueba práctica HEADSENSE → HEADSENSE_CONFIG
   Los resultados NO van al backend de VIALIX KEY: van a los
   backends de PSICOTEST y de HEADSENSE que ya están publicados.
   ============================================================ */

const TEORICA_CONFIG = {
  // Porcentaje mínimo de respuestas correctas para aprobar
  APROBACION_PCT: 80,
  // Cambiar el orden de las opciones A–D en cada intento (evita copiar el patrón)
  MEZCLAR_OPCIONES: true,
  // Cambiar el orden de las preguntas en cada intento
  MEZCLAR_PREGUNTAS: false
};

const PSICOTEST_CONFIG = {
  // Backend de PSICOTEST (hoja "VIALIX PSICOTEST - Base de Datos"). También
  // recibe la evaluación teórica (pestañas Teorica y Teorica_Respuestas).
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwEJsBKhAFFlfLl5PxTvtScCFmusY5K_A4x6fLmsitWE4EV1kMsWo3MuVJxt-WEwliBqQ/exec",


  // ------------------------------------------------------------
  // Los valores de referencia (REF_*) son ORIENTATIVOS para tamizaje y
  // entrenamiento. No equivalen a los del examen de un CRC. Ajústalos con
  // tu profesional SST después de medir a un grupo piloto: la latencia de
  // la pantalla táctil cambia según el celular (≈ 30–100 ms).
  // ------------------------------------------------------------

  // 1. Tiempos de reacción múltiple
  //    Luz VERDE → ACELERAR (lado derecho). Luz ROJA → FRENAR (lado izquierdo).
  //    Luz AMARILLA → NO tocar (mide control de impulsos).
  REACCION: {
    ESTIMULOS: 24,
    PROPORCION_NO_PRESIONAR: 0.2,   // 20 % de luces amarillas
    ESPERA_MIN_MS: 900,             // pausa aleatoria antes de cada luz
    ESPERA_MAX_MS: 2600,
    LIMITE_RESPUESTA_MS: 1500,      // si no responde en este tiempo = omisión
    DURACION_NO_PRESIONAR_MS: 1100, // cuánto dura encendida la luz amarilla
    REF_TIEMPO_MEDIO_MS: 700,
    REF_ERRORES_MAX: 3
  },

  // 2. Coordinación bimanual
  //    Un pulgar guía cada bolita por su camino; los caminos se mueven
  //    de forma independiente.
  BIMANUAL: {
    DURACION_SEG: 45,
    VELOCIDAD_INICIAL: 0.30,  // pantallas por segundo al empezar
    VELOCIDAD_FINAL: 0.45,    // y al terminar (sube de forma gradual)
    ANCHO_CAMINO: 0.30,       // fracción del ancho de cada carril
    AMPLITUD_CURVAS: 0.30,    // cuánto se desplaza el camino a los lados
    REF_PCT_DENTRO: 85,
    REF_SALIDAS_MAX: 12
  },

  // 3. Anticipación de la velocidad
  //    La bolita entra a un túnel; se toca la pantalla en el instante en
  //    que debería salir.
  ANTICIPACION: {
    ENSAYOS: 10,
    VELOCIDADES: [0.22, 0.32, 0.45],  // fracción del ancho de pantalla por segundo
    LARGOS_TUNEL: [0.30, 0.45],       // fracción del ancho de pantalla
    LIMITE_TARDE_MS: 1500,            // si no toca en este tiempo = omisión
    REF_ERROR_MEDIO_MS: 200,
    REF_OMISIONES_MAX: 1
  }
};

const HEADSENSE_CONFIG = {
  // Backend de HEADSENSE v2 (hoja "VIALIX HEADSENSE v2 - Base de Datos").
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxCqIUzW66uyowTMRGzNHwDS2Qpi34B567as1mZb3oTRuFrTIr-5p5HmqoCCGvTyM7DNg/exec",


  // Frecuencia con la que se guardan muestras (por segundo).
  // 20 Hz es suficiente para movimientos de cabeza y mantiene los archivos livianos
  // (1 hora ≈ 72.000 filas ≈ 4 MB de CSV).
  FRECUENCIA_MUESTREO_HZ: 20,

  // Formato del CSV descargable y del que se guarda en Drive.
  // "excel_es": separador ; y decimal con coma (abre directo en Excel en español).
  // "estandar": separador , y decimal con punto (Python, R, Power BI en inglés).
  CSV_FORMATO: "excel_es",

  // Segundos que la persona debe quedarse quieta mirando al frente para calibrar
  // la posición neutra (0°) de la cabeza.
  DURACION_CALIBRACION_SEG: 3,

  // Umbrales de referencia (grados) para clasificar la postura del cuello.
  // Basados en criterios ergonómicos tipo RULA / ISO 11226. Son orientativos,
  // no diagnósticos: ajústalos según el criterio de tu profesional SST.
  UMBRALES: {
    FLEXION_MODERADA: 10,   // cabeza hacia abajo: 10°–20° = moderado
    FLEXION_ALTA: 20,       // > 20° = alto
    EXTENSION: 5,           // cabeza hacia atrás más de 5° = riesgo
    INCLINACION: 10,        // inclinación lateral (oreja al hombro) más de 10°
    ROTACION: 45            // giro a un lado más de 45°
  },

  // Detección de eventos
  EVENTOS: {
    // Giro de cabeza (p. ej. revisar espejos / punto ciego): la rotación supera
    // este ángulo y luego vuelve cerca del centro.
    GIRO_GRADOS: 30,
    // Cabeceo brusco (posible señal de somnolencia o impacto): la cabeza cae
    // hacia adelante más rápido que esta velocidad (°/s) y supera el ángulo indicado.
    CABECEO_VELOCIDAD: 60,
    CABECEO_GRADOS: 15,
    // Tiempo mínimo entre dos eventos del mismo tipo (ms), para no contar doble.
    ANTIRREBOTE_MS: 800
  },

  // Corrección de deriva del eje de ROTACIÓN (ver docs/GUIA_MEDICION_Y_ANALISIS.md).
  // Flexión e inclinación no derivan: el navegador las referencia a la gravedad.
  // La rotación sí, por el giroscopio y porque el vehículo cambia de rumbo.
  DERIVA: {
    ACTIVA: true,
    // 1) Corrección lenta: cuando la cabeza está quieta y cerca del centro,
    //    el 0° de rotación se acerca poco a poco a la postura actual.
    VENTANA_CENTRO_GRADOS: 15,   // solo corrige si |rotación| < este valor
    VEL_QUIETUD_GPS: 8,          // y si la cabeza gira a menos de esta velocidad
    QUIETUD_MIN_MS: 2000,        // durante al menos este tiempo
    CONSTANTE_TIEMPO_SEG: 20,    // qué tan rápido se acerca (más alto = más lento)
    MAX_CORRECCION_GPS: 0.5,     // tope de corrección (°/s) para no borrar movimientos reales

    // 2) Reencuadre por cambio de rumbo (curvas, giros en esquinas): si la
    //    rotación se queda fija lejos del centro más tiempo del que dura una
    //    revisión de espejos, se asume que giró el vehículo, no la cabeza.
    //    "auto" = activo solo si la sesión tiene placa (conductor).
    //    true / false para forzarlo. En puestos fijos debe quedar apagado,
    //    porque borraría las rotaciones sostenidas (riesgo biomecánico).
    REENCUADRE_RUMBO: "auto",
    REENCUADRE_GRADOS: 20,
    REENCUADRE_ESTABLE_MS: 6000,  // un espejo dura 1–2 s; 6 s fijo = curva
    REENCUADRE_TOLERANCIA_GRADOS: 6 // variación máxima para considerarlo "fijo"
  },


  // Cómo va puesto el celular. "frente": vertical, en la frente o en el casco,
  // con la pantalla hacia afuera. "nuca": vertical, detrás de la cabeza, con la
  // pantalla hacia afuera (invierte el signo de flexión y de inclinación).
  MONTAJE: "frente"
};

/* ============================================================
   v1.8.0 - Prueba práctica híbrida: telemetría según el vehículo
   ------------------------------------------------------------
   Perfil A (cabina): el celular va en la cabeza → HEADSENSE
     (usa HEADSENSE_CONFIG: posturas, giros de espejos y cabeceos).
   Perfil B (dos ruedas): el celular va en el manubrio → dinámica
     del chasis (usa TELEMETRIA_CONFIG.PERFIL_B).
   Los umbrales del perfil B son ORIENTATIVOS: ajústalos con un grupo
   piloto. El manubrio vibra y cada soporte transmite distinto.
   ============================================================ */

const TELEMETRIA_CONFIG = {
  // Orden y textos de las tarjetas del menú. "perfil": "A" cabeza | "B" chasis
  VEHICULOS: [
    { id: "motocicleta", nombre: "Motocicleta", icono: "🏍️", perfil: "B", detalle: "Celular en el soporte del manubrio" },
    { id: "vehiculo", nombre: "Vehículo (liviano)", icono: "🚗", perfil: "A", detalle: "Celular en la cabeza o la gorra" },
    { id: "vehiculo_pesado", nombre: "Vehículo pesado", icono: "🚚", perfil: "A", detalle: "Más de 3,8 toneladas · celular en la cabeza" },
    { id: "maquinaria_amarilla", nombre: "Maquinaria amarilla", icono: "🚜", perfil: "A", detalle: "Operador en cabina · celular en el casco" },
    { id: "no_automotor", nombre: "No automotor / VELMPU", icono: "🚲", perfil: "B", detalle: "Bicicletas y patinetas · celular en el manubrio" }
  ],

  PERFIL_B: {
    FRECUENCIA_MUESTREO_HZ: 25,       // muestras guardadas por segundo (la detección usa todos los datos del sensor, ~60 Hz)
    DURACION_CALIBRACION_SEG: 3,      // vehículo quieto y derecho

    // Frenadas y aceleraciones bruscas (fuerza G longitudinal)
    FRENADA_G: 0.40,                  // desaceleración mayor a 0,40 g
    ACELERACION_G: 0.35,              // aceleración mayor a 0,35 g
    DURACION_MIN_MS: 300,             // sostenida al menos este tiempo (filtra baches)

    // Inclinación lateral (roll) en curvas
    INCLINACION_MAX_GRADOS: 35,
    INCLINACION_MIN_MS: 500,

    // Zigzag / culebreo: giros rápidos alternados con fuerza lateral
    ZIGZAG_VEL_GIRO_GPS: 30,          // velocidad de giro del manubrio/chasis (°/s)
    ZIGZAG_ACEL_LATERAL_G: 0.20,
    ZIGZAG_CAMBIOS: 3,                // cambios de lado dentro de la ventana
    ZIGZAG_VENTANA_MS: 4000,

    // Impactos y caídas
    IMPACTO_G: 4.0,                   // pico de fuerza G (los baches fuertes llegan a 2–3 g en el manubrio)
    CAIDA_INCLINACION_GRADOS: 70,     // el vehículo queda acostado de lado
    CAIDA_MIN_MS: 1000,

    // Tiempo mínimo entre dos eventos del mismo tipo
    ANTIRREBOTE_MS: 2000,

    // Nivel de riesgo según eventos por hora (frenadas + aceleraciones +
    // inclinaciones extremas + 2 × zigzag). Una caída o impacto = alto.
    NIVEL_MEDIO_EVENTOS_HORA: 4,
    NIVEL_ALTO_EVENTOS_HORA: 10
  }
};
