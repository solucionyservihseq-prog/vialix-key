/* ============================================================
   VIALIX KEY - Configuración
   Edita estos valores sin tocar el resto del código.
   ============================================================ */

const VIALIX_CONFIG = {
  // Pega aquí la URL de tu Google Apps Script Web App (termina en /exec)
  // La obtienes siguiendo docs/GUIA_DESPLIEGUE.md
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxor_-nkxTJTrkvsADjAKWYE6Axrdmb5_JebaFlhOY2s9fHp71lPzY43-7aYYE4Jf60qQ/exec",

  // Nombre del cliente/empresa piloto (aparece en el encabezado de la app)
  NOMBRE_CLIENTE: "Piloto VIALIX KEY",

  // Números de emergencia para el botón de pánico.
  // Reemplázalos por los reales del cliente y de la ARL cuando los tengas.
  NUMEROS_EMERGENCIA: [
    { nombre: "Línea de emergencias nacional", numero: "123" },
    { nombre: "Contacto de emergencia", numero: "+573054395567" }
  ],

  // Duración sugerida del ejercicio de respiración (segundos)
  DURACION_ENFOQUE_MENTAL: 45,

  // Checklist de chequeo preoperacional (Resolución 40595 de 2022 / PESV)
  // Puedes agregar, quitar o renombrar ítems libremente.
  CHECKLIST: [
    { id: "llantas", categoria: "Llantas y rines", texto: "Llantas (incluida la de repuesto), rines y presión en buen estado" },
    { id: "frenos", categoria: "Frenos", texto: "Freno de pedal y freno de mano responden correctamente" },
    { id: "luces", categoria: "Luces", texto: "Altas, bajas, direccionales, freno, reversa y parqueo funcionan" },
    { id: "espejos", categoria: "Visibilidad", texto: "Espejos retrovisores completos y bien ajustados" },
    { id: "cinturones", categoria: "Seguridad", texto: "Cinturones de seguridad en buen estado y funcionales" },
    { id: "pito", categoria: "Seguridad", texto: "Pito / bocina funciona" },
    { id: "limpiaparabrisas", categoria: "Visibilidad", texto: "Limpiaparabrisas y nivel de agua del limpiabrisas correctos" },
    { id: "aceite", categoria: "Niveles", texto: "Nivel de aceite de motor correcto" },
    { id: "liquido_frenos", categoria: "Niveles", texto: "Nivel de líquido de frenos correcto" },
    { id: "refrigerante", categoria: "Niveles", texto: "Nivel de refrigerante correcto" },
    { id: "bateria", categoria: "Mecánico", texto: "Batería con bornes limpios y bien sujeta" },
    { id: "extintor", categoria: "Elementos de emergencia", texto: "Extintor presente y con carga vigente" },
    { id: "botiquin", categoria: "Elementos de emergencia", texto: "Botiquín de primeros auxilios completo" },
    { id: "kit_carretera", categoria: "Elementos de emergencia", texto: "Kit de carretera: tacos, señales/reflectivos y llave de pernos" },
    { id: "documentos", categoria: "Documentos", texto: "SOAT, tecnomecánica, licencia de tránsito y de conducción vigentes" },
    { id: "carroceria", categoria: "Estado general", texto: "Carrocería, puertas y vidrios sin daños que afecten la operación" },
    { id: "fugas", categoria: "Mecánico", texto: "Sin fugas visibles de líquidos debajo del vehículo" }
  ],

  // Tips cortos de micro-formación en seguridad vial (rotan aleatoriamente)
  MICRO_FORMACION: [
    "La distancia de seguridad recomendada en vía urbana es de al menos 2 segundos respecto al vehículo de adelante.",
    "El 90% de los accidentes de tránsito tienen como factor asociado el error humano: revisa tu vehículo y tu estado antes de arrancar.",
    "Usar el celular al conducir multiplica hasta por 4 el riesgo de accidente, incluso en manos libres.",
    "Antes de retroceder, verifica siempre tus espejos y el punto ciego. Si tienes ayuda en tierra, úsala.",
    "La fatiga reduce tus reflejos de forma similar al alcohol. Si sientes sueño, detente y descansa.",
    "Revisa la presión de tus llantas en frío: una llanta desinflada aumenta la distancia de frenado.",
    "Ajusta tu espejo retrovisor y los laterales antes de arrancar, no en movimiento.",
    "El cinturón de seguridad reduce hasta en un 50% el riesgo de lesión grave en un choque.",
    "Planifica tu ruta antes de salir: evita distraerte con el GPS mientras conduces.",
    "Si transportas carga, verifica que esté bien asegurada antes de iniciar la marcha."
  ]
};
