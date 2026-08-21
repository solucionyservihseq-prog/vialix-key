/* ============================================================
   VIALIX KEY - Lógica de la aplicación
   ============================================================ */

const STORAGE_KEYS = {
  CONDUCTOR: "vialix_conductor",
  QUEUE: "vialix_queue_pendiente"
};

const state = {
  conductor: null
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

/* ---------- Identificación del conductor ---------- */

function initIdentificacion() {
  const conductorGuardado = localStorage.getItem(STORAGE_KEYS.CONDUCTOR);
  if (conductorGuardado) {
    state.conductor = conductorGuardado;
    irAHome();
  } else {
    showView("view-conductor");
  }
}

function guardarConductor() {
  const nombre = $("#input-conductor").value.trim();
  if (!nombre) {
    alert("Por favor escribe tu nombre para continuar.");
    return;
  }
  state.conductor = nombre;
  localStorage.setItem(STORAGE_KEYS.CONDUCTOR, nombre);
  irAHome();
}

function cambiarConductor() {
  localStorage.removeItem(STORAGE_KEYS.CONDUCTOR);
  state.conductor = null;
  showView("view-conductor");
}

/* ---------- Home ---------- */

function irAHome() {
  $("#home-conductor").textContent = state.conductor;
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
    item: "reporte_libre",
    descripcion,
    severidad,
    foto_base64: fotoBase64,
    lat: geo ? geo.lat : "",
    lng: geo ? geo.lng : ""
  };

  await sendToBackend(payload);
  $("#novedad-placa").value = "";
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

/* ---------- Botón de pánico ---------- */

function abrirPanico() {
  const cont = $("#panico-numeros");
  cont.innerHTML = VIALIX_CONFIG.NUMEROS_EMERGENCIA.map(n => `
    <a class="panico-boton" href="tel:${n.numero}">
      <span>${n.nombre}</span>
      <strong>${n.numero}</strong>
    </a>
  `).join("");
  $("#modal-panico").classList.add("active");
}

function cerrarPanico() {
  $("#modal-panico").classList.remove("active");
}

async function enviarAlertaPanico() {
  const boton = $("#btn-alerta-panico");
  boton.disabled = true;
  boton.textContent = "Enviando alerta…";
  const geo = await getGeo();
  const payload = {
    tipo: "panico",
    timestamp: nowISO(),
    conductor: state.conductor || "SIN_IDENTIFICAR",
    lat: geo ? geo.lat : "",
    lng: geo ? geo.lng : ""
  };
  await sendToBackend(payload);
  boton.textContent = "Alerta enviada ✓";
  actualizarBadgeCola();
  setTimeout(() => {
    boton.disabled = false;
    boton.textContent = "Enviar alerta de pánico";
  }, 4000);
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
    tip_id: idx,
    tip_texto: VIALIX_CONFIG.MICRO_FORMACION[idx]
  };
  await sendToBackend(payload);
  actualizarBadgeCola();
  irAHome();
}

/* ---------- Inicialización ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initIdentificacion();
  actualizarBadgeCola();
  $("#btn-siniestro").href = VIALIX_CONFIG.URL_SINIESTRO_VIAL;

  $("#btn-guardar-conductor").addEventListener("click", guardarConductor);
  $("#btn-cambiar-conductor").addEventListener("click", cambiarConductor);

  $("#btn-iniciar-chequeo").addEventListener("click", iniciarEnfoqueMental);
  $("#btn-saltar-enfoque").addEventListener("click", saltarEnfoqueMental);

  $("#btn-volver-home-categorias").addEventListener("click", irAHome);

  $("#btn-reportar-novedad").addEventListener("click", () => showView("view-novedad"));
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

  $all(".btn-panico").forEach(b => b.addEventListener("click", abrirPanico));
  $("#btn-cerrar-panico").addEventListener("click", cerrarPanico);
  $("#btn-alerta-panico").addEventListener("click", enviarAlertaPanico);

  window.addEventListener("online", reintentarCola);
  reintentarCola();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(console.warn);
  }
});
