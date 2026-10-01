/* ============================================================
   VIALIX KEY v1.7.0 - Banco de la evaluación teórica
   ------------------------------------------------------------
   Mismas 20 preguntas y misma clave de respuestas que el documento
   "Clave_Respuestas_y_Configuracion_USO_INTERNO.docx".
   Para editar: cambia el texto, las opciones (A, B, C, D) o la letra
   correcta. "tema" agrupa las recomendaciones del resultado.
   Validar con el profesional SST / líder PESV antes de aplicar.
   ============================================================ */

const TEORICA_TEMAS = {
  "velocidad": {
    "nombre": "Límites de velocidad",
    "rec": "Repasa los límites: 50 km/h en vía urbana y 30 km/h en zonas escolares y residenciales (Ley 2251 de 2022). Adapta la velocidad a la vía, el clima y la visibilidad, aunque la señal permita más."
  },
  "alcohol": {
    "nombre": "Alcohol y sustancias",
    "rec": "Cero alcohol antes y durante la conducción. La ley sanciona desde el grado cero de alcoholemia (Ley 1696 de 2013) y el alcohol afecta los reflejos aunque no lo sientas. Tampoco conduzcas con medicamentos que den sueño."
  },
  "distracciones": {
    "nombre": "Distracciones y celular",
    "rec": "No uses el celular mientras conduces, ni siquiera en un trancón o en un semáforo. Si necesitas llamar o escribir, detente en un lugar seguro. El manos libres también distrae."
  },
  "distancia_clima": {
    "nombre": "Distancia de seguridad y lluvia",
    "rec": "Deja al menos 2 a 3 segundos con el vehículo de adelante en seco, y el doble con lluvia. Si el vehículo pierde agarre sobre el agua, suelta el acelerador y sostén el volante derecho, sin frenar bruscamente."
  },
  "senales": {
    "nombre": "Señales y semáforos",
    "rec": "Repasa el Manual de Señalización Vial: PARE es el octágono rojo, las preventivas son rombos amarillos y las reglamentarias son círculos con borde rojo. La línea continua prohíbe adelantar y el semáforo amarillo indica prepararse para detenerse."
  },
  "vulnerables": {
    "nombre": "Peatones, ciclistas y motociclistas",
    "rec": "El peatón tiene prelación en el paso peatonal: detente y dale paso. Extrema la precaución con ciclistas y motociclistas, y si conduces moto, usa casco certificado, de tu talla y siempre abrochado, tú y tu acompañante."
  },
  "documentos": {
    "nombre": "Documentos e inspección preoperacional",
    "rec": "Porta siempre licencia de conducción, licencia de tránsito, SOAT y revisión técnico-mecánica vigentes. Haz la inspección preoperacional en VIALIX KEY antes de cada salida y no salgas si hay una falla en frenos, dirección, llantas o luces."
  },
  "fatiga": {
    "nombre": "Fatiga y sueño",
    "rec": "Aprende a reconocer la fatiga: bostezos seguidos, parpadeo lento, cabeceos o no recordar los últimos kilómetros. El café, la ventana o la música no la quitan: detente en un lugar seguro y descansa. Planea pausas en los recorridos largos."
  },
  "espejos_postura": {
    "nombre": "Espejos, punto ciego y postura",
    "rec": "Antes de cambiar de carril revisa los espejos, gira la cabeza para ver el punto ciego y pon la direccional con anticipación. Conduce con la espalda apoyada, la cabeza recta y el apoyacabezas a la altura de tu cabeza."
  },
  "emergencias": {
    "nombre": "Actuación en emergencias",
    "rec": "Ante un accidente: protégete y señaliza la zona, llama al 123 y no muevas a los heridos salvo peligro inminente (fuego, otro choque). Usa el botón EMERGENCIAS VIALES de VIALIX KEY."
  }
};

const TEORICA_PREGUNTAS = [
  {
    "n": 1,
    "tema": "velocidad",
    "enunciado": "¿Cuál es la velocidad máxima permitida en las vías urbanas de Colombia, salvo que una señal indique otra cosa?",
    "opciones": [
      "60 km/h",
      "50 km/h",
      "80 km/h",
      "40 km/h"
    ],
    "correcta": "B",
    "retro": "Desde la Ley 2251 de 2022, el límite general en vías urbanas es 50 km/h, salvo señalización distinta.",
    "ref": "Ley 2251 de 2022"
  },
  {
    "n": 2,
    "tema": "velocidad",
    "enunciado": "¿Cuál es la velocidad máxima en zonas escolares y residenciales?",
    "opciones": [
      "30 km/h",
      "40 km/h",
      "50 km/h",
      "20 km/h"
    ],
    "correcta": "A",
    "retro": "En zonas escolares y residenciales el máximo es 30 km/h. A esa velocidad un peatón tiene muchas más probabilidades de sobrevivir a un atropello.",
    "ref": "Ley 2251 de 2022"
  },
  {
    "n": 3,
    "tema": "alcohol",
    "enunciado": "¿Cuánto alcohol puede consumir un trabajador antes de conducir un vehículo de la empresa?",
    "opciones": [
      "Hasta dos cervezas, si espera una hora",
      "Lo que quiera, si se siente bien",
      "Solo vino o licores suaves",
      "Nada: la política es cero alcohol y la ley sanciona desde el grado cero de alcoholemia"
    ],
    "correcta": "D",
    "retro": "La Ley 1696 de 2013 sanciona desde el grado cero de alcoholemia. La política de seguridad vial de la empresa es cero alcohol antes y durante la conducción.",
    "ref": "Ley 1696 de 2013 · Política PESV"
  },
  {
    "n": 4,
    "tema": "distracciones",
    "enunciado": "Según el Código Nacional de Tránsito, ¿cuándo puede el conductor usar el celular mientras conduce?",
    "opciones": [
      "Cuando va despacio o en un trancón",
      "Cuando está detenido en un semáforo en rojo",
      "Solo con un sistema de manos libres; aun así, lo más seguro es no usarlo",
      "Para leer mensajes cortos"
    ],
    "correcta": "C",
    "retro": "El Código solo permite el celular con manos libres. Incluso así, la conversación distrae: lo más seguro es detenerse en un lugar seguro para llamar o escribir.",
    "ref": "Ley 769 de 2002, art. 131 (infracción C.38)"
  },
  {
    "n": 5,
    "tema": "distancia_clima",
    "enunciado": "Con el pavimento mojado o lluvia, la distancia de seguridad con el vehículo de adelante debe:",
    "opciones": [
      "Mantenerse igual que en seco",
      "Reducirse para no perder espacio",
      "Al menos duplicarse",
      "Depender del tamaño del vehículo de adelante"
    ],
    "correcta": "C",
    "retro": "En seco se recomiendan al menos 2 a 3 segundos de distancia. Con lluvia la distancia de frenado aumenta, así que la distancia de seguridad debe al menos duplicarse.",
    "ref": "Buena práctica de conducción preventiva"
  },
  {
    "n": 6,
    "tema": "senales",
    "enunciado": "¿Qué forma y color tiene la señal de PARE?",
    "opciones": [
      "Octágono rojo",
      "Triángulo amarillo",
      "Círculo azul",
      "Rombo amarillo"
    ],
    "correcta": "A",
    "retro": "La señal de PARE es la única con forma de octágono, de color rojo. Obliga a detenerse por completo antes de continuar.",
    "ref": "Manual de Señalización Vial de Colombia"
  },
  {
    "n": 7,
    "tema": "senales",
    "enunciado": "Las señales preventivas, que advierten un peligro adelante (curva, resalto, zona escolar), son:",
    "opciones": [
      "Círculos con borde rojo",
      "Rectángulos azules",
      "Octágonos rojos",
      "Rombos (cuadrados apoyados en una punta) de fondo amarillo"
    ],
    "correcta": "D",
    "retro": "Las preventivas son rombos amarillos con símbolo negro. Las reglamentarias son circulares con borde rojo y las informativas son rectangulares.",
    "ref": "Manual de Señalización Vial de Colombia"
  },
  {
    "n": 8,
    "tema": "senales",
    "enunciado": "Una línea continua en el centro de la vía significa que:",
    "opciones": [
      "Se puede adelantar si no viene nadie",
      "Está prohibido adelantar o pasarse al otro carril",
      "Solo las motos pueden adelantar",
      "Se puede adelantar de noche"
    ],
    "correcta": "B",
    "retro": "La línea continua prohíbe adelantar. Suele estar en curvas, pendientes, puentes y lugares con poca visibilidad.",
    "ref": "Manual de Señalización Vial de Colombia"
  },
  {
    "n": 9,
    "tema": "vulnerables",
    "enunciado": "Al llegar a un paso peatonal (cebra) donde hay un peatón esperando para cruzar, el conductor debe:",
    "opciones": [
      "Pitar para que el peatón espere",
      "Acelerar para pasar antes que él",
      "Detenerse y darle paso, porque el peatón tiene prelación",
      "Pasar despacio sin detenerse"
    ],
    "correcta": "C",
    "retro": "En el paso peatonal el peatón tiene prelación. Es el actor vial más vulnerable.",
    "ref": "Ley 769 de 2002 · Política PESV"
  },
  {
    "n": 10,
    "tema": "senales",
    "enunciado": "Cuando el semáforo cambia a amarillo, el conductor debe:",
    "opciones": [
      "Acelerar para alcanzar a pasar",
      "Prepararse para detenerse, si puede hacerlo de forma segura",
      "Seguir igual, porque todavía no está en rojo",
      "Pitar para avisar que va a pasar"
    ],
    "correcta": "B",
    "retro": "El amarillo anuncia que viene el rojo. Hay que detenerse si se puede hacer de forma segura; acelerar es una causa frecuente de choques en intersecciones.",
    "ref": "Ley 769 de 2002"
  },
  {
    "n": 11,
    "tema": "documentos",
    "enunciado": "¿Qué documentos debe portar el conductor de un vehículo automotor?",
    "opciones": [
      "Licencia de conducción, licencia de tránsito, SOAT vigente y revisión técnico-mecánica cuando aplique",
      "Solo la cédula",
      "Solo el SOAT",
      "Solo la licencia de conducción"
    ],
    "correcta": "A",
    "retro": "Son los documentos básicos para circular. El SOAT y la revisión técnico-mecánica deben estar vigentes.",
    "ref": "Ley 769 de 2002"
  },
  {
    "n": 12,
    "tema": "documentos",
    "enunciado": "¿Cuándo se debe hacer la inspección preoperacional del vehículo?",
    "opciones": [
      "Una vez al mes",
      "Solo cuando el vehículo hace un ruido raro",
      "Cuando lo pide el supervisor",
      "Antes de iniciar la jornada o el recorrido, reportando cualquier novedad"
    ],
    "correcta": "D",
    "retro": "La inspección se hace antes de salir. Si hay una falla crítica (frenos, dirección, llantas, luces), el vehículo no debe salir hasta que se repare.",
    "ref": "Resolución 40595 de 2022 (PESV) · VIALIX KEY"
  },
  {
    "n": 13,
    "tema": "fatiga",
    "enunciado": "¿Cuál de estas es una señal de fatiga o de microsueño al conducir?",
    "opciones": [
      "Bostezar seguido, parpadear lento, cabecear o no recordar los últimos kilómetros",
      "Tener hambre",
      "Sentir frío",
      "Escuchar música"
    ],
    "correcta": "A",
    "retro": "Son señales de alerta: un microsueño de pocos segundos a 60 km/h equivale a recorrer decenas de metros sin control. VIALIX HEADSENSE detecta los cabeceos bruscos.",
    "ref": "Buena práctica · VIALIX HEADSENSE"
  },
  {
    "n": 14,
    "tema": "fatiga",
    "enunciado": "Si siente sueño mientras conduce, lo correcto es:",
    "opciones": [
      "Abrir la ventana y subir el volumen de la música",
      "Tomar café y seguir",
      "Detenerse en un lugar seguro y descansar antes de continuar",
      "Manejar más rápido para llegar pronto"
    ],
    "correcta": "C",
    "retro": "La ventana, la música o el café no quitan la fatiga. Lo único efectivo es detenerse y descansar. Planee pausas en recorridos largos.",
    "ref": "Política PESV"
  },
  {
    "n": 15,
    "tema": "espejos_postura",
    "enunciado": "Antes de cambiar de carril, el conductor debe:",
    "opciones": [
      "Poner la direccional al mismo tiempo que hace el cambio",
      "Mirar solo el espejo retrovisor central",
      "Cambiar rápido para no estorbar",
      "Revisar los espejos, girar la cabeza para mirar el punto ciego y poner la direccional con anticipación"
    ],
    "correcta": "D",
    "retro": "Los espejos no muestran todo: el punto ciego solo se ve girando la cabeza. VIALIX HEADSENSE registra estos giros como revisión de espejos.",
    "ref": "Buena práctica · VIALIX HEADSENSE"
  },
  {
    "n": 16,
    "tema": "espejos_postura",
    "enunciado": "¿Cuál es la postura correcta para conducir y cuidar el cuello y la espalda?",
    "opciones": [
      "Espalda apoyada en la silla, cabeza recta mirando al frente y apoyacabezas ajustado a la altura de la cabeza",
      "Inclinado hacia adelante, cerca del volante",
      "Recostado lo más atrás posible, con los brazos estirados",
      "Con la cabeza inclinada hacia abajo para ver el tablero"
    ],
    "correcta": "A",
    "retro": "Mantener la cabeza agachada más de 20° o inclinada de lado por mucho tiempo aumenta el riesgo de lesiones en cuello y espalda. El apoyacabezas también protege en un choque por detrás.",
    "ref": "Riesgo biomecánico · VIALIX HEADSENSE"
  },
  {
    "n": 17,
    "tema": "emergencias",
    "enunciado": "Si presencia o sufre un accidente con heridos, lo primero que debe hacer es:",
    "opciones": [
      "Mover a los heridos a un lado de la vía",
      "Darles agua a los heridos",
      "Retirar los vehículos antes de que llegue la autoridad",
      "Protegerse y señalizar la zona, llamar al 123 y no mover a los heridos salvo peligro inminente"
    ],
    "correcta": "D",
    "retro": "Proteger, avisar y socorrer: señalizar para evitar otro choque, llamar al 123 y no mover a los heridos, porque se pueden agravar sus lesiones. Use el botón EMERGENCIAS VIALES de VIALIX KEY.",
    "ref": "Protocolo de emergencias · VIALIX KEY"
  },
  {
    "n": 18,
    "tema": "distancia_clima",
    "enunciado": "Si el vehículo pierde agarre por agua en la vía (hidroplaneo), debe:",
    "opciones": [
      "Frenar con fuerza",
      "Soltar el acelerador suavemente y sostener el volante firme y derecho, sin frenar bruscamente",
      "Girar el volante con fuerza hacia un lado",
      "Acelerar para salir del agua"
    ],
    "correcta": "B",
    "retro": "Frenar o girar bruscamente sobre el agua hace perder el control. Se suelta el acelerador hasta que las llantas recuperen agarre.",
    "ref": "Buena práctica de conducción preventiva"
  },
  {
    "n": 19,
    "tema": "vulnerables",
    "enunciado": "¿Quiénes son los actores viales más vulnerables?",
    "opciones": [
      "Los conductores de buses",
      "Los conductores de camiones",
      "Peatones, ciclistas y motociclistas",
      "Los pasajeros de carros particulares"
    ],
    "correcta": "C",
    "retro": "No tienen una carrocería que los proteja. Por eso el conductor debe extremar la precaución con ellos.",
    "ref": "Resolución 40595 de 2022 (PESV)"
  },
  {
    "n": 20,
    "tema": "vulnerables",
    "enunciado": "El casco del motociclista y de su acompañante debe estar:",
    "opciones": [
      "Puesto, aunque esté desabrochado",
      "Certificado, de la talla correcta y bien abrochado",
      "Colgado del brazo en trayectos cortos",
      "Puesto solo en carretera"
    ],
    "correcta": "B",
    "retro": "Un casco desabrochado sale volando en el impacto y no protege. Debe ser certificado, de la talla correcta y estar abrochado siempre.",
    "ref": "Ley 769 de 2002 · Política PESV"
  }
];
