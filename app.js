/* ============================================================
   VIALIX KEY - Lógica de la aplicación
   ============================================================ */

const STORAGE_KEYS = {
  CONDUCTOR: "vialix_conductor",
  PLACA: "vialix_placa",
  QUEUE: "vialix_queue_pendiente"
};

const state = {
  placa: null,
  conductor: null,
  checklistRespuestas: {}, // { itemId: 'ok' | 'fallo' }
  novedadesChecklist: {},  // { itemId: { descripcion, foto } }
  inicioChequeo: null
};

/* ---------- Utilidades ---------- */

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

function showView(id) {
  $all(".view").forEach(v => v.classList.remove("active"));
  $(`#${id}`).classList.add("active");
  window.scrollTo(0, 0);
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
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

/* ---------- Identificación del vehículo ---------- */

function initIdentificacion() {
  const vParam = getUrlParam("v");
  const conductorGuardado = localStorage.getItem(STORAGE_KEYS.CONDUCTOR);

  if (vParam) {
    state.placa = vParam.toUpperCase();
    localStorage.setItem(STORAGE_KEYS.PLACA, state.placa);
  } else {
    state.placa = localStorage.getItem(STORAGE_KEYS.PLACA);
  }

  if (conductorGuardado) state.conductor = conductorGuardado;

  if (state.placa && state.conductor) {
    irAHome();
  } else if (state.placa && !state.conductor) {
    $("#placa-detectada").textContent = state.placa;
    showView("view-conductor");
  } else {
    showView("view-sin-placa");
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
  $("#placa-detectada").textContent = state.placa || "(sin identificar)";
  showView("view-conductor");
}

/* ---------- Home ---------- */

function irAHome() {
  $("#home-placa").textContent = state.placa;
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
      irAChecklist();
    }
  }, 1000);

  contador.textContent = segundosRestantes;
}

function saltarEnfoqueMental() {
  clearInterval(focoInterval);
  irAChecklist();
}

/* ---------- Checklist preoperacional ---------- */

function irAChecklist() {
  state.checklistRespuestas = {};
  state.novedadesChecklist = {};
  state.inicioChequeo = Date.now();
  renderChecklist();
  showView("view-checklist");
}

function renderChecklist() {
  const cont = $("#checklist-lista");
  cont.innerHTML = "";
  VIALIX_CONFIG.CHECKLIST.forEach((item) => {
    const row = document.createElement("div");
    row.className = "check-item";
    row.innerHTML = `
      <div class="check-item-texto">
        <span class="check-item-cat">${item.categoria}</span>
        <span>${item.texto}</span>
      </div>
      <div class="check-item-botones">
        <button type="button" class="btn-ok" data-id="${item.id}" data-val="ok" aria-label="Correcto">✓</button>
        <button type="button" class="btn-fallo" data-id="${item.id}" data-val="fallo" aria-label="Falla">✕</button>
      </div>
      <div class="check-item-nota hidden" id="nota-${item.id}">
        <textarea placeholder="Describe la falla encontrada…" id="nota-texto-${item.id}"></textarea>
        <label class="file-btn">
          📷 Adjuntar foto
          <input type="file" accept="image/*" capture="environment" id="nota-foto-${item.id}">
        </label>
      </div>
    `;
    cont.appendChild(row);
  });

  cont.addEventListener("click", onChecklistClick);
  actualizarProgresoChecklist();
}

function onChecklistClick(e) {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  const id = btn.dataset.id;
  const val = btn.dataset.val;
  state.checklistRespuestas[id] = val;

  const fila = btn.closest(".check-item");
  fila.querySelectorAll(".check-item-botones button").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");

  const nota = $(`#nota-${id}`);
  if (val === "fallo") {
    nota.classList.remove("hidden");
  } else {
    nota.classList.add("hidden");
    delete state.novedadesChecklist[id];
  }
  actualizarProgresoChecklist();
}

function actualizarProgresoChecklist() {
  const total = VIALIX_CONFIG.CHECKLIST.length;
  const respondidos = Object.keys(state.checklistRespuestas).length;
  $("#checklist-progreso").textContent = `${respondidos} / ${total}`;
  $("#btn-finalizar-checklist").disabled = respondidos < total;
}

async function finalizarChecklist() {
  const total = VIALIX_CONFIG.CHECKLIST.length;
  const respondidos = Object.keys(state.checklistRespuestas).length;
  if (respondidos < total) {
    alert("Debes revisar todos los ítems antes de finalizar.");
    return;
  }

  // Recolectar notas de fallas
  VIALIX_CONFIG.CHECKLIST.forEach((item) => {
    if (state.checklistRespuestas[item.id] === "fallo") {
      const textoEl = $(`#nota-texto-${item.id}`);
      state.novedadesChecklist[item.id] = {
        descripcion: textoEl ? textoEl.value.trim() : ""
      };
    }
  });

  const fallos = Object.entries(state.checklistRespuestas).filter(([, v]) => v === "fallo").map(([k]) => k);
  const apto = fallos.length === 0;

  showView("view-enviando");

  const geo = await getGeo();
  const duracion = Math.round((Date.now() - state.inicioChequeo) / 1000);

  const payload = {
    tipo: "inspeccion",
    timestamp: nowISO(),
    placa: state.placa,
    conductor: state.conductor,
    resultado: apto ? "APTO" : "NO APTO",
    items_fallidos: fallos,
    detalle: state.checklistRespuestas,
    notas_fallas: state.novedadesChecklist,
    duracion_seg: duracion,
    lat: geo ? geo.lat : "",
    lng: geo ? geo.lng : ""
  };

  await sendToBackend(payload);

  mostrarResultadoChecklist(apto, fallos);
}

function mostrarResultadoChecklist(apto, fallos) {
  const cont = $("#resultado-contenido");
  if (apto) {
    cont.innerHTML = `
      <div class="resultado-icono ok">✓</div>
      <h2>Vehículo APTO para operar</h2>
      <p>Chequeo preoperacional completo. Conduce con precaución.</p>
    `;
  } else {
    const items = fallos.map(id => {
      const item = VIALIX_CONFIG.CHECKLIST.find(i => i.id === id);
      return `<li>${item ? item.texto : id}</li>`;
    }).join("");
    cont.innerHTML = `
      <div class="resultado-icono fallo">⚠</div>
      <h2>Vehículo NO APTO</h2>
      <p>Se detectaron las siguientes fallas. Reporta esto a tu líder SST antes de operar:</p>
      <ul class="resultado-lista">${items}</ul>
    `;
  }
  actualizarBadgeCola();
  showView("view-resultado");
}

/* ---------- Reporte de novedad independiente ---------- */

async function enviarNovedadLibre() {
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
    placa: state.placa,
    conductor: state.conductor,
    item: "reporte_libre",
    descripcion,
    severidad,
    foto_base64: fotoBase64,
    lat: geo ? geo.lat : "",
    lng: geo ? geo.lng : ""
  };

  await sendToBackend(payload);
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
    placa: state.placa || "SIN_IDENTIFICAR",
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
    placa: state.placa,
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

  $("#btn-guardar-conductor").addEventListener("click", guardarConductor);
  $("#btn-cambiar-conductor").addEventListener("click", cambiarConductor);

  $("#btn-iniciar-chequeo").addEventListener("click", iniciarEnfoqueMental);
  $("#btn-saltar-enfoque").addEventListener("click", saltarEnfoqueMental);

  $("#btn-finalizar-checklist").addEventListener("click", finalizarChecklist);
  $("#btn-volver-home-resultado").addEventListener("click", irAHome);

  $("#btn-reportar-novedad").addEventListener("click", () => showView("view-novedad"));
  $("#btn-enviar-novedad").addEventListener("click", enviarNovedadLibre);
  $("#btn-cancelar-novedad").addEventListener("click", irAHome);
  $("#btn-volver-home-novedad").addEventListener("click", irAHome);

  $("#btn-formacion").addEventListener("click", abrirFormacion);
  $("#btn-confirmar-formacion").addEventListener("click", confirmarFormacion);

  $all(".btn-panico").forEach(b => b.addEventListener("click", abrirPanico));
  $("#btn-cerrar-panico").addEventListener("click", cerrarPanico);
  $("#btn-alerta-panico").addEventListener("click", enviarAlertaPanico);

  window.addEventListener("online", reintentarCola);
  reintentarCola();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(console.warn);
  }
});
