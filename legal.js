/* ============================================================
   VIALIX KEY v1.12.1 - Términos y condiciones, Política de
   tratamiento de datos personales y autorizaciones
   ------------------------------------------------------------
   VERSIÓN FINAL para EFICACIA S.A.: textos aprobados por su área de
   protección de datos (noviembre de 2026).
   Cada vez que cambien los textos, sube VERSION: la app pedirá
   aceptarlos de nuevo a todos los conductores.

   Marco de referencia: Constitución Política art. 15 (habeas data),
   Ley 1581 de 2012 y Decreto 1377 de 2013 (compilado en el Decreto
   1074 de 2015), Ley 527 de 1999 (mensajes de datos), Ley 769 de 2002
   (Código Nacional de Tránsito), Resolución 40595 de 2022 (PESV),
   Ley 2300 de 2023 (horarios y canales de contacto), Ley 23 de 1982 y
   Decisión Andina 351 de 1993 (derechos de autor).
   ============================================================ */

/* Datos legales POR EMPRESA CLIENTE.
   La empresa se elige con el enlace de la app: ...?empresa=eficacia
   (queda guardada en el celular; si se instala como app, la recuerda).
   v1.12.1: sin enlace de empresa se usa EMPRESA_POR_DEFECTO (eficacia,
   único cliente aprobado), así nadie ve textos de borrador.
   Para un cliente nuevo: agrega su bloque a LEGAL_EMPRESAS con los datos
   de SU política, con APROBADO: false hasta que su área de protección de
   datos lo apruebe, y entrega el enlace con su clave. */
const LEGAL_EMPRESAS = {
  eficacia: {
    EMPRESA: "EFICACIA S.A.",
    VERSION: "EFICACIA-1.0",
    FECHA_VIGENCIA: "25 de noviembre de 2026",
    APROBADO: true,   // aprobado por protección de datos de EFICACIA S.A. (nov. 2026)
    RESPONSABLE_NOMBRE: "EFICACIA S.A.",
    RESPONSABLE_NIT: "800.137.960-7",
    RESPONSABLE_DIRECCION: "Av. 5N # 23AN-35, barrio San Vicente, Cali, Colombia",
    CORREO_DATOS: "protecciondedatos@eficacia.com.co",
    TELEFONO_DATOS: "PBX (602) 485 4242",
    URL_POLITICA_RESPONSABLE: "https://www.eficacia.com.co",
    POLITICA_RESPONSABLE_NOMBRE: "Política de Tratamiento de la Información de EFICACIA S.A. (versión 4, vigente desde el 1 de febrero de 2017)",
    // Procedimiento propio del cliente (art. 19 de su política)
    NOTA_DERECHOS: "También puede radicar una carta firmada en la oficina principal de EFICACIA S.A. (Av. 5N # 23AN-35, Cali) o en cualquiera de sus sedes, adjuntando copia de su documento de identidad. Si actúa mediante apoderado, debe anexar el poder con reconocimiento de firma ante notario.",
    SOLO_MAYORES: true,
    DESTINATARIOS: "el área de Seguridad y Salud en el Trabajo y el equipo del Plan Estratégico de Seguridad Vial de EFICACIA S.A., y la Administradora de Riesgos Laborales a la que usted está afiliado (Seguros Bolívar ARL), que suministra la herramienta y actúa como Encargada del tratamiento, para la gestión de la seguridad vial y la prevención de riesgos laborales"
  }
};

const EMPRESA_POR_DEFECTO = "eficacia";

const LEGAL_EMPRESA = (() => {
  let clave = "";
  try { clave = (new URLSearchParams(location.search).get("empresa") || "").trim().toLowerCase(); } catch (e) { /* sin URL */ }
  try {
    if (LEGAL_EMPRESAS[clave]) localStorage.setItem("vialix_empresa", clave);
    else clave = localStorage.getItem("vialix_empresa") || "";
  } catch (e) { /* sin almacenamiento */ }
  return LEGAL_EMPRESAS[clave] ? clave : EMPRESA_POR_DEFECTO;
})();

const LEGAL_BASE = {
  EMPRESA: "",
  APROBADO: false,
  POLITICA_RESPONSABLE_NOMBRE: "",
  NOTA_DERECHOS: "",
  SOLO_MAYORES: false,
  VERSION: "1.0",
  FECHA_VIGENCIA: "POR COMPLETAR (ej. 15 de octubre de 2026)",

  // Responsable del tratamiento de los datos (definir con el área jurídica)
  RESPONSABLE_NOMBRE: "POR COMPLETAR: razón social del Responsable",
  RESPONSABLE_NIT: "POR COMPLETAR",
  RESPONSABLE_DIRECCION: "POR COMPLETAR: dirección y ciudad",
  CORREO_DATOS: "POR COMPLETAR: correo para consultas y reclamos de datos personales",
  TELEFONO_DATOS: "POR COMPLETAR: línea de atención",
  // Política general del Responsable, si existe (se enlaza como complemento). "" para omitir.
  URL_POLITICA_RESPONSABLE: "",

  // Con quién se comparten los datos para cumplir las finalidades
  DESTINATARIOS: "la empresa contratante donde laboras y su equipo de Seguridad y Salud en el Trabajo, y la Administradora de Riesgos Laborales (ARL) a la que está afiliada, para la gestión de la seguridad vial y la prevención de riesgos laborales"
};

const LEGAL_CONFIG = Object.assign({}, LEGAL_BASE, LEGAL_EMPRESAS[LEGAL_EMPRESA] || {});

const ModLegal = (() => {
  const CLAVE = "vialix_consentimiento";
  const C = LEGAL_CONFIG;
  const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const incompleto = () => Object.values(C).some((v) => typeof v === "string" && v.includes("POR COMPLETAR"));
  const borrador = () => incompleto() || !C.APROBADO;
  let vistaAnterior = "view-inicio";

  /* ---------- Textos ---------- */

  function encabezado(titulo) {
    return `
      ${incompleto() ? `<p class="legal-borrador">BORRADOR · Documento pendiente de revisión y aprobación jurídica. Los campos "POR COMPLETAR" deben diligenciarse antes de su publicación.</p>`
        : borrador() ? `<p class="legal-borrador">BORRADOR · El área de protección de datos de ${esc(C.EMPRESA || C.RESPONSABLE_NOMBRE)} debe aprobar este documento antes de su uso definitivo.</p>` : ""}
      <h1>${titulo}</h1>
      <p class="legal-meta">VIALIX KEY · Versión ${esc(C.VERSION)} · Vigente desde: ${esc(C.FECHA_VIGENCIA)}</p>`;
  }

  function terminos() {
    return encabezado("Términos y condiciones de uso") + `
      <h2>1. Quiénes somos y aceptación</h2>
      <p>VIALIX KEY es una aplicación web de gestión de la seguridad vial puesta a disposición por <strong>${esc(C.RESPONSABLE_NOMBRE)}</strong>, NIT ${esc(C.RESPONSABLE_NIT)}, con domicilio en ${esc(C.RESPONSABLE_DIRECCION)} (en adelante, "el Responsable"). Al marcar la casilla de aceptación usted declara que leyó, entendió y acepta estos Términos y la Política de tratamiento de datos personales. Esta aceptación electrónica tiene plena validez conforme a la Ley 527 de 1999. Si no está de acuerdo, no use la aplicación; el botón EMERGENCIAS VIALES permanece disponible en todo caso.</p>

      <h2>2. Para qué sirve VIALIX KEY</h2>
      <p>La aplicación apoya el Plan Estratégico de Seguridad Vial (PESV) de su empresa (Resolución 40595 de 2022) con: inspección preoperacional, reporte de novedades, registro de recorridos y riesgos en la ruta, guía y contacto en emergencias viales, micro-formación y la <strong>Prueba preventiva de seguridad vial</strong> (evaluación de conocimiento, pruebas psicomotrices en pantalla y biotelemetría en conducción).</p>

      <h2>3. Alcance de los resultados</h2>
      <p><strong>Esta herramienta genera indicadores orientativos para gestión en seguridad vial. No reemplaza la valoración de un profesional de la salud, ni prueba de conducción.</strong> Los resultados no constituyen un examen de aptitud psicofísica, no sustituyen las evaluaciones médicas ocupacionales ni el examen de un Centro de Reconocimiento de Conductores, no certifican la idoneidad para conducir y no deben usarse como único criterio para decisiones laborales. Su finalidad es preventiva: identificar oportunidades de mejora y orientar la formación.</p>

      <h2>4. Uso seguro: nunca manipule el celular mientras conduce</h2>
      <p>El Código Nacional de Tránsito (Ley 769 de 2002) prohíbe el uso de dispositivos móviles al conducir, salvo con manos libres. Configure la aplicación y las mediciones con el vehículo detenido en un lugar seguro. Durante la biotelemetría el celular registra los datos solo; no mire ni toque la pantalla mientras conduce. Fije el celular con un soporte firme que no obstruya la visibilidad ni los controles. La aplicación no reemplaza su atención en la vía, las normas de tránsito ni el criterio de su empresa. Las pruebas psicomotrices se realizan sentado y sin conducir.</p>

      <h2>5. Emergencias</h2>
      <p>VIALIX KEY facilita el acceso a líneas de emergencia, pero no es un servicio de atención de emergencias ni garantiza la respuesta de terceros. En caso de accidente llame directamente al 123. Las alertas de posible caída o impacto son estimaciones y pueden fallar u ocurrir sin un evento real.</p>

      <h2>6. Sus compromisos</h2>
      <ul>
        <li>Registrar información veraz, completa y propia; no usar la identificación de otra persona.</li>
        <li>Presentar la Prueba preventiva de forma personal, sin ayuda de terceros ni consulta de fuentes externas durante la evaluación de conocimiento.</li>
        <li>No alterar, copiar, descompilar ni intentar acceder de forma no autorizada a la aplicación o a sus bases de datos.</li>
        <li>Mantener actualizados sus datos y avisar al Responsable si detecta un uso indebido de su información.</li>
      </ul>

      <h2>7. Ubicación y sensores del celular</h2>
      <p>El permiso de ubicación es necesario para usar la aplicación, porque permite registrar dónde ocurre una emergencia, un recorrido o una medición. La aplicación usa el GPS, el acelerómetro y el giroscopio del celular solo mientras usted ejecuta esas funciones; no hace seguimiento permanente de su ubicación en segundo plano.</p>

      <h2>8. Disponibilidad y responsabilidad</h2>
      <p>La aplicación se ofrece en el estado en que se encuentra y puede presentar interrupciones por mantenimiento, fallas de conectividad o del dispositivo. Cuando no hay conexión, los registros se guardan en el celular y se envían después. En la medida permitida por la ley, el Responsable no responde por daños derivados del uso indebido de la aplicación, de la información falsa suministrada por el usuario o de fallas de terceros (operadores de telefonía, proveedores de internet o del dispositivo).</p>

      <h2>9. Propiedad intelectual</h2>
      <p>El software, diseños, textos, preguntas, logotipos y demás contenidos de VIALIX KEY están protegidos por la Ley 23 de 1982 y la Decisión Andina 351 de 1993, y pertenecen a sus titulares. Se concede una licencia personal, gratuita, no exclusiva e intransferible para usar la aplicación con los fines aquí descritos. No está permitido reproducir, distribuir ni modificar sus contenidos sin autorización previa y escrita.</p>

      <h2>10. Datos personales</h2>
      <p>El tratamiento de sus datos se rige por la Política de tratamiento de datos personales de VIALIX KEY, que hace parte integral de estos Términos.</p>

      <h2>11. Cambios a estos Términos</h2>
      <p>El Responsable puede actualizar estos Términos. Cada versión se identifica con un número y una fecha; cuando haya cambios, la aplicación le pedirá aceptarlos de nuevo antes de continuar. Ningún cambio en las finalidades del tratamiento de datos se aplicará sin su autorización.</p>

      <h2>12. Suspensión</h2>
      <p>El Responsable podrá suspender el acceso de quien incumpla estos Términos, sin perjuicio de las acciones legales que correspondan.</p>

      <h2>13. Ley aplicable y contacto</h2>
      <p>Estos Términos se rigen por las leyes de la República de Colombia. Para inquietudes escriba a ${esc(C.CORREO_DATOS)} o comuníquese al ${esc(C.TELEFONO_DATOS)}.</p>`;
  }

  function politica() {
    return encabezado("Política de tratamiento de datos personales") + `
      <p>En cumplimiento del artículo 15 de la Constitución Política, la Ley 1581 de 2012 y el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015), se informa cómo se tratan los datos personales recolectados por VIALIX KEY.</p>

      <h2>1. Responsable del tratamiento</h2>
      <p><strong>${esc(C.RESPONSABLE_NOMBRE)}</strong> · NIT ${esc(C.RESPONSABLE_NIT)} · ${esc(C.RESPONSABLE_DIRECCION)} · Correo: ${esc(C.CORREO_DATOS)} · Teléfono: ${esc(C.TELEFONO_DATOS)}.</p>
      ${C.URL_POLITICA_RESPONSABLE ? `<p>Esta política complementa ${C.POLITICA_RESPONSABLE_NOMBRE ? `la <strong>${esc(C.POLITICA_RESPONSABLE_NOMBRE)}</strong>` : "la política general del Responsable"}, disponible en <a href="${esc(C.URL_POLITICA_RESPONSABLE)}" target="_blank" rel="noopener">${esc(C.URL_POLITICA_RESPONSABLE)}</a>. En lo no previsto aquí se aplica esa política.</p>` : ""}
      ${C.SOLO_MAYORES ? `<p>Esta política no aplica a menores de edad. Si usted es menor de 18 años, no continúe con el registro.</p>` : ""}

      <h2>2. Qué datos recolectamos</h2>
      <ul>
        <li><strong>Identificación y contacto:</strong> nombre, número de identificación, placa del vehículo, correo electrónico y número de celular.</li>
        <li><strong>Ubicación:</strong> coordenadas GPS al usar los botones de emergencia, al registrar recorridos o riesgos en la ruta, y al iniciar una medición de biotelemetría.</li>
        <li><strong>Operación vial:</strong> inspecciones preoperacionales, novedades reportadas (incluidas las fotos que usted adjunte), recorridos y actividades de formación.</li>
        <li><strong>Prueba preventiva de seguridad vial:</strong> respuestas y puntaje de la evaluación de conocimiento, tiempos de reacción y precisión en las pruebas psicomotrices, movimientos de la cabeza (postura, giros, cabeceos) o dinámica del vehículo (frenadas, inclinación, maniobras, posibles caídas o impactos), y las recomendaciones generadas.</li>
        <li><strong>Datos técnicos:</strong> modelo de navegador y tamaño de pantalla del celular, para interpretar correctamente las mediciones.</li>
      </ul>

      <h2>3. Datos sensibles</h2>
      <p>Algunos resultados de la Prueba preventiva (por ejemplo, señales de fatiga, microsueño o desempeño psicomotor) pueden relacionarse con su estado de salud y por eso se tratan como <strong>datos sensibles</strong> (artículo 5 de la Ley 1581 de 2012). Le informamos que <strong>usted no está obligado a autorizar su tratamiento</strong> (artículo 6). Esta autorización se pide por separado, de forma expresa, antes de la Prueba; si no la otorga, puede seguir usando las demás funciones de la aplicación.</p>

      <h2>4. Para qué usamos sus datos</h2>
      <p><strong>Finalidades necesarias para el servicio</strong> (incluidas en la aceptación obligatoria):</p>
      <ul>
        <li>Prestar las funciones de la aplicación y gestionar el PESV de su empresa.</li>
        <li>Comunicarle información del servicio: confirmaciones, resultados y vencimiento de su Prueba preventiva.</li>
        <li>Atender y documentar emergencias, novedades y recorridos.</li>
        <li>Generar indicadores orientativos y recomendaciones de prevención, y controlar la vigencia anual de la Prueba preventiva.</li>
        <li>Elaborar estadísticas e informes de seguridad vial, preferiblemente agregados o anonimizados.</li>
        <li>Cumplir obligaciones legales y atender requerimientos de autoridades competentes.</li>
      </ul>
      <p><strong>Finalidades opcionales</strong> (solo si marca la casilla de contacto):</p>
      <ul>
        <li>Enviarle campañas, contenidos y alertas de seguridad vial y prevención.</li>
        <li>Hacer seguimiento a sus resultados e invitarle a capacitaciones o refuerzos.</li>
        <li>Contactarle por correo electrónico, mensaje de texto, WhatsApp o llamada para encuestas y comunicaciones relacionadas con su seguridad.</li>
      </ul>
      <p>Los contactos se harán en los horarios y por los canales que permite la ley (Ley 2300 de 2023, en lo que resulte aplicable): días hábiles de lunes a viernes entre 7:00 a.m. y 7:00 p.m. y sábados entre 8:00 a.m. y 3:00 p.m.</p>

      <h2>5. Con quién compartimos sus datos</h2>
      <p>Con ${esc(C.DESTINATARIOS)}. También con proveedores tecnológicos que actúan como Encargados del tratamiento (almacenamiento y hojas de cálculo en la nube y publicación de la aplicación), algunos con servidores fuera de Colombia, lo que implica una transmisión internacional de datos realizada conforme al artículo 26 de la Ley 1581 de 2012 y a las instrucciones de la Superintendencia de Industria y Comercio. No vendemos sus datos.</p>

      <h2>6. Sus derechos (artículo 8 de la Ley 1581 de 2012)</h2>
      <ul>
        <li>Conocer, actualizar y rectificar sus datos.</li>
        <li>Solicitar prueba de la autorización otorgada.</li>
        <li>Ser informado sobre el uso que se ha dado a sus datos.</li>
        <li>Revocar la autorización o pedir la supresión de sus datos cuando no exista un deber legal o contractual de conservarlos.</li>
        <li>Acceder gratuitamente a sus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio, una vez agotado el trámite ante el Responsable.</li>
      </ul>

      <h2>7. Cómo ejercer sus derechos</h2>
      <p>Escriba a ${esc(C.CORREO_DATOS)} o llame al ${esc(C.TELEFONO_DATOS)}, indicando su nombre, identificación, la solicitud y un medio de respuesta. Las <strong>consultas</strong> se responden en máximo 10 días hábiles, prorrogables 5 días hábiles más; los <strong>reclamos</strong>, en máximo 15 días hábiles, prorrogables 8 días hábiles más (artículos 14 y 15 de la Ley 1581 de 2012). Puede retirar la autorización de contacto en cualquier momento desde "Editar mis datos" en la aplicación o por estos canales.</p>
      ${C.NOTA_DERECHOS ? `<p>${esc(C.NOTA_DERECHOS)}</p>` : ""}

      <h2>8. Seguridad y conservación</h2>
      <p>Aplicamos medidas técnicas y administrativas razonables para proteger sus datos contra pérdida, consulta o uso no autorizado. Los datos se conservan mientras dure su vinculación con la empresa y por el tiempo que exijan las normas aplicables a la gestión de la seguridad vial y a la seguridad y salud en el trabajo; después se suprimen o anonimizan.</p>

      <h2>9. Vigencia y cambios</h2>
      <p>Esta política rige desde la fecha indicada. Los cambios sustanciales se le informarán en la aplicación antes de aplicarse y, si cambian las finalidades, se le pedirá una nueva autorización.</p>`;
  }

  /* ---------- Pantalla de lectura ---------- */

  function abrir(doc) {
    const activa = document.querySelector(".view.active");
    if (activa && activa.id !== "view-legal") vistaAnterior = activa.id;
    $("#legal-contenido").innerHTML = doc === "politica" ? politica() : terminos();
    $all(".legal-pestana").forEach((b) => b.classList.toggle("activa", b.dataset.doc === doc));
    showView("view-legal");
  }

  function cerrar() {
    showView(vistaAnterior);
  }

  /* ---------- Autorizaciones ---------- */

  function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) { return null; }
  }

  // Autorización vigente de esta identificación (aceptó la versión actual de los Términos)
  function vigente(identificacion = state.identificacion) {
    const a = leer();
    return a && a.identificacion === identificacion && a.version === C.VERSION && a.terminos ? a : null;
  }

  // Guarda en el celular y deja evidencia en la hoja (pestaña Autorizaciones)
  function registrar(cambios, evento) {
    const previa = leer();
    const misma = previa && previa.identificacion === state.identificacion && previa.version === C.VERSION;
    const a = {
      identificacion: state.identificacion,
      version: C.VERSION,
      terminos: false,
      contacto: false,
      sensibles: false,
      ...(misma ? previa : {}),
      ...cambios,
      fecha: new Date().toISOString()
    };
    try { localStorage.setItem(CLAVE, JSON.stringify(a)); } catch (e) { /* sin almacenamiento */ }
    PruebasComun.encolar({
      tipo: "consentimiento",
      id: PruebasComun.nuevoId(),
      fecha: a.fecha,
      nombre: state.conductor || "",
      identificacion: state.identificacion || "",
      placa: state.placa || "",
      correo: state.correo || "",
      celular: state.celular || "",
      version_terminos: C.VERSION,
      acepta_terminos: a.terminos,
      autoriza_contacto: a.contacto,
      autoriza_sensibles: a.sensibles,
      evento,
      dispositivo: `${navigator.userAgent.slice(0, 180)} | ${screen.width}x${screen.height}`
    });
    return a;
  }

  // Casillas de la bienvenida: reflejan lo autorizado por esta identificación
  function precargarCasillas() {
    const a = vigente($("#input-identificacion").value.trim() || state.identificacion);
    $("#chk-terminos").checked = !!a;
    $("#chk-contacto").checked = !!(a && a.contacto);
  }

  // Al tocar "Continuar": la casilla de Términos es obligatoria
  function validarBienvenida() {
    const ok = $("#chk-terminos").checked;
    $("#legal-error").classList.toggle("hidden", ok);
    if (!ok) $("#legal-error").scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  }

  function guardarBienvenida() {
    const previa = vigente();
    const contacto = $("#chk-contacto").checked;
    const datos = `${state.correo}|${state.celular}`;
    // Sin cambios (ni en autorizaciones ni en correo/celular): no se duplica el registro
    if (previa && previa.contacto === contacto && previa.datos === datos) return;
    const evento = !previa ? "otorgada"
      : previa.contacto !== contacto ? (contacto ? "autoriza_contacto" : "revoca_contacto")
      : "actualiza_datos";
    registrar({ terminos: true, contacto, datos }, evento);
  }

  // Casilla de datos sensibles en la pantalla de la Prueba
  function pintarPrueba() {
    const a = vigente();
    const ok = !!(a && a.sensibles);
    $("#chk-sensibles").checked = ok;
    habilitarPrueba(ok);
  }

  function habilitarPrueba(ok) {
    ["#btn-ir-teorica", "#btn-ir-headsense", "#btn-ir-psicotest"].forEach((s) => { $(s).disabled = !ok; });
    $("#prueba-bloqueada").classList.toggle("hidden", ok);
  }

  function cambiarSensibles() {
    const ok = $("#chk-sensibles").checked;
    registrar({ terminos: true, sensibles: ok }, ok ? "autoriza_sensibles" : "revoca_sensibles");
    habilitarPrueba(ok);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("click", (e) => {
      const enlace = e.target.closest("[data-legal]");
      if (enlace) {
        e.preventDefault();
        abrir(enlace.dataset.legal);
      }
    });
    $all(".legal-pestana").forEach((b) => b.addEventListener("click", () => abrir(b.dataset.doc)));
    $("#btn-legal-cerrar").addEventListener("click", cerrar);
    $("#chk-terminos").addEventListener("change", () => { if ($("#chk-terminos").checked) $("#legal-error").classList.add("hidden"); });
    $("#chk-sensibles").addEventListener("change", cambiarSensibles);
    // Si escriben otra cédula, las casillas muestran lo que autorizó esa persona
    $("#input-identificacion").addEventListener("change", precargarCasillas);
  });

  return { abrir, vigente, precargarCasillas, validarBienvenida, guardarBienvenida, pintarPrueba };
})();
