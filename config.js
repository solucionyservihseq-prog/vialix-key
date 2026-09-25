/* ============================================================
   VIALIX KEY - Configuración
   Edita estos valores sin tocar el resto del código.
   ============================================================ */

const VIALIX_CONFIG = {
  // Pega aquí la URL de tu Google Apps Script Web App (termina en /exec)
  // La obtienes siguiendo docs/GUIA_DESPLIEGUE.md
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxor_-nkxTJTrkvsADjAKWYE6Axrdmb5_JebaFlhOY2s9fHp71lPzY43-7aYYE4Jf60qQ/exec",

  // Nombre del cliente/empresa piloto (aparece en el encabezado de la app)
  NOMBRE_CLIENTE: "Eficacia - Extras",

  // Botones de llamada rápida de la pantalla de EMERGENCIAS.
  // "enlace" es lo que se abre al tocar (tel: para llamar, https://wa.me/... para WhatsApp).
  // "estilo": rojo | azul | verde | gris (define el color del botón).
  LINEAS_EMERGENCIA: [
    { nombre: "Emergencias 123", detalle: "Ambulancia y Policía", enlace: "tel:123", estilo: "rojo", icono: "🚑" },
    // EJEMPLO: actualiza con la línea real de ARL Bolívar (en "enlace", el # se escribe %23).
    { nombre: "Línea ARL Bolívar #322", detalle: "Contacto directo con la ARL", enlace: "tel:%23322", estilo: "azul", icono: "🛡️" },
    { nombre: "Línea Eficacia", detalle: "(333) 033 47 07", enlace: "tel:+573330334707", estilo: "gris", icono: "📞" },
    { nombre: "WhatsApp Eficacia", detalle: "315 500 0035", enlace: "https://wa.me/573155000035", estilo: "verde", icono: "💬", externo: true }
  ],

  // Formulario que debe diligenciar el conductor OCASIONAL (no ve el menú de la app).
  URL_FORMULARIO_OCASIONAL: "https://forms.cloud.microsoft/r/tfXVmkXqfx",

  // Duración sugerida del ejercicio de respiración (segundos)
  DURACION_ENFOQUE_MENTAL: 45,

  // Enlace al formulario de Reporte de Siniestro Vial para Colaboradores.
  // Aparece como botón en el inicio; cámbialo si la empresa usa otro formulario.
  URL_SINIESTRO_VIAL: "https://forms.cloud.microsoft/r/yd3MhvZ38j",

  // Categorías de chequeo preoperacional. Al tocar "Iniciar chequeo",
  // el conductor ve este panel y elige su tipo de vehículo; cada opción
  // lo lleva al formulario que la empresa ya usa para esa categoría.
  // Agrega, quita o edita categorías libremente — así se adapta a
  // cualquier empresa sin tocar el resto del código.
  CATEGORIAS_CHEQUEO: [
    {
      id: "motocicleta",
      nombre: "Motocicleta",
      icono: "🏍️",
      url: "https://forms.office.com/r/bX7FB1MBLV"
    },
    {
      id: "vehiculo",
      nombre: "Vehículo",
      icono: "🚗",
      url: "https://forms.office.com/r/hdbmkQfkh9"
    },
    {
      id: "vehiculo_pesado",
      nombre: "Vehículo pesado",
      icono: "🚛",
      url: "https://forms.cloud.microsoft/r/YEN6JbFYhm"
    },
    {
      id: "no_automotor",
      nombre: "No automotor / VELMPU",
      icono: "🚲",
      url: "https://forms.office.com/r/BwuVTi0VW8"
    }
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
