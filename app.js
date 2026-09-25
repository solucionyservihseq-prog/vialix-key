/* ============================================================
   VIALIX KEY - Lógica de la aplicación
   ============================================================ */

const STORAGE_KEYS = {
  CONDUCTOR: "vialix_conductor",
  IDENTIFICACION: "vialix_identificacion",
  PLACA: "vialix_placa",
  TIPO: "vialix_tipo", // "permanente" | "ocasional"
  QUEUE: "vialix_queue_pendiente"
};

const state = {
  conductor: null,
  identificacion: null,
  placa: null,
  tipo: null,
  ubicacion: "pendiente", // pendiente | ok | denegada | error
  ultimaGeo: null // ubicación más reciente, para registrar la alerta sin demorar la llamada
};

/* ---------- Utilidades ---------- */

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

function showView(id) {
  $all(".view").forEach(v => v.classList.remove("active"));
  $(`#${id}`).classList.add("active");
  window.scrollTo(0, 0);
}

function nowISO() {
  return new Date().toISOString();
}

function getGeo() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);

    let resuelto = false;
    const finalizar = (valor) => {
      if (resuelto) return;
      resuelto = true;
      resolve(valor);
    };

    // Red de seguridad: si el navegador nunca llama a los callbacks
    // (p. ej. un prompt de permiso que se queda sin responder), no
    // dejamos el flujo colgado esperando la ubicación.
    setTimeout(() => finalizar(null), 4500);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => finalizar({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => finalizar(null),
        { timeout: 4000 }
      );
    } catch (e) {
      finalizar(null);
    }
  });
}

/* ---------- Envío de datos (con cola offline) ---------- */

function queuePending(payload) {
  const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE) || "[]");
  queue.push(payload);
  localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
}

async function sendToBackend(payload) {
  if (!VIALIX_CONFIG.APPS_SCRIPT_URL || VIALIX_CONFIG.APPS_SCRIPT_URL.includes("PEGA_AQUI")) {
    console.warn("APPS_SCRIPT_URL no configurada. Guardando en cola local.");
    queuePending(payload);
    return { ok: false, offline: true };
  }
  try {
    const res = await fetch(VIALIX_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data && data.status === "ok") return { ok: true };
    throw new Error("Respuesta inválida del backend");
  } catch (err) {
    console.warn("No se pudo enviar, se guarda en cola local:", err);
    queuePending(payload);
    return { ok: false, offline: true };
  }
}

async function reintentarCola() {
  const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE) || "[]");
  if (queue.length === 0 || !navigator.onLine) return;
  if (!VIALIX_CONFIG.APPS_SCRIPT_URL || VIALIX_CONFIG.APPS_SCRIPT_URL.includes("PEGA_AQUI")) return;

  const restante = [];
  for (const item of queue) {
    try {
      const res = await fetch(VIALIX_CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(item)
      });
      const data = await res.json();
      if (!data || data.status !== "ok") restante.push(item);
    } catch (e) {
      restante.push(item);
    }
  }
  localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(restante));
  actualizarBadgeCola();
}

function actualizarBadgeCola() {
  const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE) || "[]");
  const badge = $("#cola-badge");
  if (!badge) return;
  if (queue.length > 0) {
    badge.textContent = queue.length;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

/* ---------- Emergencias (primera pantalla) ---------- */

// Actualiza en segundo plano la ubicación (así el toque en un botón de
// llamada no espera al GPS) y pide el permiso desde el primer momento.
async function refrescarUbicacion() {
  const geo = await getGeo();
  if (geo) state.ultimaGeo = geo;
}

// Cada toque en un botón de llamada deja registrado dónde y cuándo se pidió
// ayuda. Se guarda primero en la cola local y luego se sincroniza, para que
// no se pierda aunque el teléfono pase a la pantalla de llamada.
function registrarAlertaEmergencia(linea) {
  queuePending({
    tipo: "panico",
    timestamp: nowISO(),
    conductor: state.conductor || "SIN_IDENTIFICAR",
    identificacion: state.identificacion || "",
    placa: state.placa || "",
    linea: linea.nombre,
    lat: state.ultimaGeo ? state.ultimaGeo.lat : "",
    lng: state.ultimaGeo ? state.ultimaGeo.lng : ""
  });
  actualizarBadgeCola();
  reintentarCola();
}

function renderLlamadas(idContenedor) {
  const cont = $(idContenedor);
  cont.innerHTML = "";
  VIALIX_CONFIG.LINEAS_EMERGENCIA.forEach((linea) => {
    const a = document.createElement("a");
    a.className = `llamada llamada-${linea.estilo || "gris"}`;
    a.href = linea.enlace;
    if (linea.externo) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    a.addEventListener("click", () => registrarAlertaEmergencia(linea));
    a.innerHTML = `
      <span class="llamada-icono">${linea.icono || "📞"}</span>
      <span class="llamada-texto">
        <strong>${linea.nombre}</strong>
        <small>${linea.detalle || ""}</small>
      </span>
    `;
    cont.appendChild(a);
  });
}

function abrirEmergencias() {
  refrescarUbicacion();
  $("#modal-emergencia").classList.add("active");
  $("#modal-emergencia").scrollTop = 0;
}

function cerrarEmergencias() {
  $("#modal-emergencia").classList.remove("active");
}

function mostrarGuiaEmergencia(hayHeridos) {
  $("#guia-heridos").classList.toggle("hidden", !hayHeridos);
  $("#guia-sin-heridos").classList.toggle("hidden", hayHeridos);
  $("#btn-hay-heridos").classList.toggle("activo", hayHeridos);
  $("#btn-no-heridos").classList.toggle("activo", !hayHeridos);
}

/* ---------- Bienvenida: datos, ubicación y tipo de conductor ---------- */

// Pide el permiso de ubicación (el navegador muestra su propio aviso) y
// espera con calma a que la persona responda, a diferencia de getGeo().
function solicitarUbicacion() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve("error");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.ultimaGeo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve("ok");
      },
      (err) => resolve(err && err.code === 1 ? "denegada" : "error"),
      { timeout: 20000, enableHighAccuracy: true }
    );
  });
}

function mostrarEstadoUbicacion() {
  const el = $("#estado-ubicacion");
  const mensajes = {
    ok: "✅ Ubicación activada. ¡Gracias!",
    denegada: "⚠️ No diste permiso de ubicación. Sin ella no podremos registrar dónde ocurre una emergencia. Para activarla: Ajustes del celular → Privacidad → Localización → tu navegador → \"Al usar\". Luego toca el botón de nuevo.",
    error: "⚠️ No pudimos obtener tu ubicación (revisa que el GPS esté encendido). Puedes continuar e intentarlo más tarde."
  };
  el.textContent = mensajes[state.ubicacion] || "";
  el.className = "estado-ubicacion " + (state.ubicacion === "ok" ? "estado-ok" : "estado-alerta");
  el.classList.toggle("hidden", !mensajes[state.ubicacion]);
  $("#btn-activar-ubicacion").classList.toggle("hidden", state.ubicacion === "ok");
}

async function activarUbicacion() {
  const btn = $("#btn-activar-ubicacion");
  btn.disabled = true;
  btn.textContent = "Esperando tu respuesta…";
  state.ubicacion = await solicitarUbicacion();
  btn.disabled = false;
  btn.textContent = "📍 Activar ubicación ahora";
  mostrarEstadoUbicacion();
}

function mostrarBloqueInicio(cual) {
  ["datos", "tipo", "guardado"].forEach((b) => $("#bloque-" + b).classList.toggle("hidden", b !== cual));
}

function renderInicio() {
  const completo = !!(state.conductor && state.identificacion && state.placa && state.tipo);
  if (completo) {
    $("#inicio-nombre").textContent = state.conductor;
    $("#inicio-placa").textContent = state.placa;
    mostrarBloqueInicio("guardado");
  } else {
    // Datos parciales (p. ej. de una versión anterior): se precargan para completarlos
    if (state.conductor) $("#input-conductor").value = state.conductor;
    if (state.identificacion) $("#input-identificacion").value = state.identificacion;
    if (state.placa) $("#input-placa").value = state.placa;
    mostrarBloqueInicio("datos");
  }
  showView("view-inicio");
}

async function guardarDatos() {
  const nombre = $("#input-conductor").value.trim();
  const identificacion = $("#input-identificacion").value.trim();
  const placa = $("#input-placa").value.trim().toUpperCase();
  if (!nombre || !identificacion || !placa) {
    alert("Por favor escribe tu nombre, tu número de identificación y la placa del vehículo para continuar.");
    return;
  }
  state.conductor = nombre;
  state.identificacion = identificacion;
  state.placa = placa;
  localStorage.setItem(STORAGE_KEYS.CONDUCTOR, nombre);
  localStorage.setItem(STORAGE_KEYS.IDENTIFICACION, identificacion);
  localStorage.setItem(STORAGE_KEYS.PLACA, placa);

  // Si todavía no se pidió el permiso, se pide ahora; si lo negó, se le
  // avisa una vez y en el siguiente toque puede continuar sin ubicación.
  if (state.ubicacion === "pendiente") {
    const btn = $("#btn-guardar-datos");
    btn.disabled = true;
    btn.textContent = "Solicitando ubicación…";
    state.ubicacion = await solicitarUbicacion();
    btn.disabled = false;
    mostrarEstadoUbicacion();
    if (state.ubicacion !== "ok") {
      btn.textContent = "Continuar sin ubicación";
      return;
    }
  }
  $("#btn-guardar-datos").textContent = "Continuar";
  mostrarBloqueInicio("tipo");
}

function elegirTipo(tipo) {
  state.tipo = tipo;
  localStorage.setItem(STORAGE_KEYS.TIPO, tipo);
  entrarSegunTipo();
}

function entrarSegunTipo() {
  if (state.tipo === "ocasional") showView("view-ocasional");
  else irAHome();
}

function cambiarConductor() {
  Object.values(STORAGE_KEYS).forEach((k) => { if (k !== STORAGE_KEYS.QUEUE) localStorage.removeItem(k); });
  state.conductor = state.identificacion = state.placa = state.tipo = null;
  renderInicio();
}

/* ---------- Home ---------- */

function irAHome() {
  $("#home-conductor").textContent = state.conductor;
  $("#home-identificacion").textContent = state.identificacion;
  $("#home-placa").textContent = state.placa;
  $("#home-cliente").textContent = VIALIX_CONFIG.NOMBRE_CLIENTE;
  actualizarBadgeCola();
  showView("view-home");
}

/* ---------- Enfoque mental ---------- */

let focoInterval = null;

function iniciarEnfoqueMental() {
  showView("view-enfoque");
  let segundosTotal = VIALIX_CONFIG.DURACION_ENFOQUE_MENTAL;
  let segundosRestantes = segundosTotal;
  const circulo = $("#respiracion-circulo");
  const texto = $("#respiracion-texto");
  const contador = $("#respiracion-contador");

  const ciclo = ["Inhala…", "Sostén…", "Exhala…"];
  let fase = 0;
  let faseContador = 0;

  clearInterval(focoInterval);
  circulo.classList.remove("inhala", "exhala");
  texto.textContent = ciclo[0];
  circulo.classList.add("inhala");

  focoInterval = setInterval(() => {
    segundosRestantes--;
    contador.textContent = segundosRestantes;

    faseContador++;
    if (faseContador >= 4) {
      faseContador = 0;
      fase = (fase + 1) % ciclo.length;
      texto.textContent = ciclo[fase];
      circulo.classList.toggle("inhala", fase === 0);
      circulo.classList.toggle("exhala", fase === 2);
    }

    if (segundosRestantes <= 0) {
      clearInterval(focoInterval);
      irACategorias();
    }
  }, 1000);

  contador.textContent = segundosRestantes;
}

function saltarEnfoqueMental() {
  clearInterval(focoInterval);
  irACategorias();
}

/* ---------- Panel de categorías de chequeo ---------- */

function irACategorias() {
  renderCategorias();
  showView("view-categorias");
}

function renderCategorias() {
  const cont = $("#categorias-lista");
  cont.innerHTML = "";
  VIALIX_CONFIG.CATEGORIAS_CHEQUEO.forEach((cat) => {
    const link = document.createElement("a");
    link.className = "categoria-item";
    link.href = cat.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.innerHTML = `
      <span class="categoria-icono">${cat.icono || "🚙"}</span>
      <span>${cat.nombre}</span>
    `;
    cont.appendChild(link);
  });
}

/* ---------- Reporte de novedad independiente ---------- */

async function enviarNovedadLibre() {
  const placa = $("#novedad-placa").value.trim().toUpperCase();
  const descripcion = $("#novedad-descripcion").value.trim();
  const severidad = $("#novedad-severidad").value;
  const fotoInput = $("#novedad-foto");

  if (!descripcion) {
    alert("Describe brevemente la novedad.");
    return;
  }

  showView("view-enviando");
  const geo = await getGeo();
  let fotoBase64 = "";

  if (fotoInput.files && fotoInput.files[0]) {
    fotoBase64 = await fileToBase64(fotoInput.files[0]);
  }

  const payload = {
    tipo: "novedad",
    timestamp: nowISO(),
    placa: placa,
    conductor: state.conductor,
    identificacion: state.identificacion,
    item: "reporte_libre",
    descripcion,
    severidad,
    foto_base64: fotoBase64,
    lat: geo ? geo.lat : "",
    lng: geo ? geo.lng : ""
  };

  await sendToBackend(payload);
  $("#novedad-placa").value = state.placa || "";
  $("#novedad-descripcion").value = "";
  fotoInput.value = "";
  actualizarBadgeCola();
  showView("view-novedad-enviada");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- Registro de recorrido ---------- */

const RECORRIDO_LABELS = {
  inicio: "Inicio de Recorrido",
  gestion: "Registro de Gestión",
  fin: "Fin de Recorrido"
};

function irARecorrido() {
  $("#recorrido-placa").value = state.placa || "";
  $("#recorrido-estado").classList.add("hidden");
  showView("view-recorrido");
}

async function registrarRecorrido(tipo, boton) {
  const textoOriginal = boton.querySelector("span:last-child").textContent;
  boton.disabled = true;
  boton.querySelector("span:last-child").textContent = "Guardando…";

  const placa = $("#recorrido-placa").value.trim().toUpperCase();
  const geo = await getGeo();
  const payload = {
    tipo: "recorrido",
    subtipo: tipo,
    timestamp: nowISO(),
    placa: placa,
    conductor: state.conductor,
    identificacion: state.identificacion,
    lat: geo ? geo.lat : "",
    lng: geo ? geo.lng : ""
  };

  const resultado = await sendToBackend(payload);
  actualizarBadgeCola();

  const estado = $("#recorrido-estado");
  estado.textContent = `${RECORRIDO_LABELS[tipo]} registrado a las ${new Date().toLocaleTimeString()}${resultado.offline ? " (pendiente por sincronizar)" : ""}`;
  estado.classList.remove("hidden");

  boton.querySelector("span:last-child").textContent = textoOriginal;
  boton.disabled = false;
}

/* ---------- Micro-formación ---------- */

function abrirFormacion() {
  const tips = VIALIX_CONFIG.MICRO_FORMACION;
  const idx = Math.floor(Math.random() * tips.length);
  $("#formacion-texto").textContent = tips[idx];
  $("#formacion-idx").value = idx;
  showView("view-formacion");
}

async function confirmarFormacion() {
  const idx = $("#formacion-idx").value;
  const payload = {
    tipo: "formacion",
    timestamp: nowISO(),
    conductor: state.conductor,
    identificacion: state.identificacion,
    placa: state.placa || "",
    tip_id: idx,
    tip_texto: VIALIX_CONFIG.MICRO_FORMACION[idx]
  };
  await sendToBackend(payload);
  actualizarBadgeCola();
  irAHome();
}

/* ---------- Inicialización ---------- */

document.addEventListener("DOMContentLoaded", () => {
  // Lo primero que se ve al escanear el sticker es la pantalla de EMERGENCIAS.
  state.conductor = localStorage.getItem(STORAGE_KEYS.CONDUCTOR);
  state.identificacion = localStorage.getItem(STORAGE_KEYS.IDENTIFICACION);
  state.placa = localStorage.getItem(STORAGE_KEYS.PLACA);
  state.tipo = localStorage.getItem(STORAGE_KEYS.TIPO);
  // Quien ya se registró vio antes la explicación: se actualiza la ubicación en silencio.
  // A quien es nuevo no se le pide nada hasta explicarle por qué.
  if (state.conductor) refrescarUbicacion();
  renderLlamadas("#emergencia-llamadas");
  $("#btn-siniestro-form").href = VIALIX_CONFIG.URL_SINIESTRO_VIAL;
  renderInicio();
  actualizarBadgeCola();

  // Emergencias viales: superposición oculta hasta que se toque el botón rojo
  $("#btn-emergencias-viales").addEventListener("click", abrirEmergencias);
  $("#btn-cerrar-emergencia-x").addEventListener("click", cerrarEmergencias);
  $("#btn-volver-emergencia").addEventListener("click", cerrarEmergencias);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarEmergencias(); });
  $("#btn-hay-heridos").addEventListener("click", () => mostrarGuiaEmergencia(true));
  $("#btn-no-heridos").addEventListener("click", () => mostrarGuiaEmergencia(false));

  // Validación del conductor: ocasional -> formulario, permanente -> menú
  $("#btn-guardar-datos").addEventListener("click", guardarDatos);
  $("#btn-activar-ubicacion").addEventListener("click", activarUbicacion);
  $("#btn-editar-datos").addEventListener("click", () => mostrarBloqueInicio("datos"));
  $("#btn-tipo-recurrente").addEventListener("click", () => elegirTipo("permanente"));
  $("#btn-tipo-ocasional").addEventListener("click", () => elegirTipo("ocasional"));
  $("#btn-volver-tipo").addEventListener("click", renderInicio);
  $("#btn-formulario-ocasional").href = VIALIX_CONFIG.URL_FORMULARIO_OCASIONAL;
  $("#btn-entrar-guardado").addEventListener("click", entrarSegunTipo);
  $("#btn-cambiar-guardado").addEventListener("click", cambiarConductor);

  $("#btn-cambiar-conductor").addEventListener("click", cambiarConductor);

  $("#btn-iniciar-chequeo").addEventListener("click", iniciarEnfoqueMental);
  $("#btn-saltar-enfoque").addEventListener("click", saltarEnfoqueMental);

  $("#btn-volver-home-categorias").addEventListener("click", irAHome);

  $("#btn-reportar-novedad").addEventListener("click", () => {
    $("#novedad-placa").value = state.placa || "";
    showView("view-novedad");
  });
  $("#btn-enviar-novedad").addEventListener("click", enviarNovedadLibre);
  $("#btn-cancelar-novedad").addEventListener("click", irAHome);
  $("#btn-volver-home-novedad").addEventListener("click", irAHome);

  $("#btn-formacion").addEventListener("click", abrirFormacion);
  $("#btn-confirmar-formacion").addEventListener("click", confirmarFormacion);

  $("#btn-recorrido").addEventListener("click", irARecorrido);
  $("#btn-volver-home-recorrido").addEventListener("click", irAHome);
  $("#btn-recorrido-inicio").addEventListener("click", (e) => registrarRecorrido("inicio", e.currentTarget));
  $("#btn-recorrido-gestion").addEventListener("click", (e) => registrarRecorrido("gestion", e.currentTarget));
  $("#btn-recorrido-fin").addEventListener("click", (e) => registrarRecorrido("fin", e.currentTarget));

  window.addEventListener("online", reintentarCola);
  reintentarCola();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      // Cada vez que se abre la app, obliga a revisar si hay una versión
      // nueva en el servidor (por defecto los navegadores pueden tardar
      // horas en revisar por su cuenta, y eso dejaría a los conductores
      // usando una versión vieja sin darse cuenta).
      reg.update();
    }).catch(console.warn);

    let recargando = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargando) return;
      recargando = true;
      window.location.reload();
    });
  }
});
