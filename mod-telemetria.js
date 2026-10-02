/* ============================================================
   VIALIX KEY v1.8.0 - Prueba práctica híbrida
   ------------------------------------------------------------
   1. Menú de tarjetas: el conductor elige su tipo de vehículo.
   2. Según el perfil del vehículo (TELEMETRIA_CONFIG.VEHICULOS):
      - Perfil A (vehículo, pesado, maquinaria) → ModHeadsense:
        celular en la cabeza, posturas, espejos y cabeceos.
      - Perfil B (moto, no automotor) → este módulo: celular en el
        manubrio, dinámica del chasis con Chasis (tel-chasis.js).
   Las sesiones de los dos perfiles se guardan en el mismo almacén
   (Almacen) y van al backend de HEADSENSE.
   ============================================================ */

const ModTelemetria = (() => {
  const CLAVE_VEHICULO = "vialix_tel_vehiculo";
  const C = () => TELEMETRIA_CONFIG.PERFIL_B;
  const b = {
    vehiculo: null,
    calib: null,
    procesador: null,
    sesion: null,
    t0: 0,
    reloj: null,
    wakeLock: null,
    sesionMostrada: null
  };
  const esc = (t) => PruebasComun.esc(t);
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };

  /* ---------- 1. Menú de vehículos ---------- */

  function abrir() {
    const ultimo = lsGet(CLAVE_VEHICULO);
    $("#tel-vehiculos").innerHTML = TELEMETRIA_CONFIG.VEHICULOS.map((v) => `
      <button type="button" class="tarjeta-vehiculo${v.id === ultimo ? " ultima" : ""}" data-vehiculo="${esc(v.id)}">
        <span class="tarjeta-icono">${v.icono}</span>
        <span class="tarjeta-texto">
          <strong>${esc(v.nombre)}</strong>
          <small>${esc(v.detalle)}</small>
        </span>
        <span class="tarjeta-perfil">${v.perfil === "A" ? "Cabeza" : "Manubrio"}</span>
      </button>`).join("");
    showView("view-tel-vehiculo");
  }

  function elegir(id) {
    const v = TELEMETRIA_CONFIG.VEHICULOS.find((x) => x.id === id);
    if (!v) return;
    lsSet(CLAVE_VEHICULO, id);
    if (v.perfil === "A") ModHeadsense.abrir(v);
    else prepararB(v);
  }

  /* ---------- 2. Perfil B: preparar ---------- */

  function prepararB(v) {
    b.vehiculo = v;
    $("#telb-vehiculo").textContent = `${v.icono} ${v.nombre}`;
    $("#telb-instruccion-soporte").textContent = v.id === "motocicleta"
      ? "Fija el celular VERTICAL en el soporte del manubrio, con la pantalla hacia ti. Asegúrate de que el soporte esté firme y no vibre ni gire."
      : "Fija el celular VERTICAL en el soporte del manubrio de la bicicleta o patineta, con la pantalla hacia ti. Asegúrate de que no vibre ni gire.";
    if (!$("#telb-placa").value) $("#telb-placa").value = v.id === "motocicleta" ? (state.placa || "") : "";
    $("#telb-campo-placa").classList.toggle("hidden", v.id !== "motocicleta");
    $("#telb-error").classList.add("hidden");
    showView("view-telb-preparar");
  }

  async function activarB() {
    const boton = $("#btn-telb-activar");
    const error = $("#telb-error");
    const demo = $("#telb-demo").checked;
    error.classList.add("hidden");
    boton.disabled = true;
    boton.textContent = "Activando sensores…";
    try {
      if (!demo) {
        if (!window.isSecureContext) throw new Error("Los sensores solo funcionan si la app se abre con https:// (desde GitHub Pages).");
        if (!(await Chasis.pedirPermiso())) throw new Error("No se dio permiso para usar los sensores de movimiento. Actívalo en los ajustes del navegador e inténtalo de nuevo.");
      }
      calibrarB(demo);
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove("hidden");
    } finally {
      boton.disabled = false;
      boton.textContent = "Activar sensores y calibrar";
    }
  }

  /* ---------- Calibración: vehículo quieto y derecho ---------- */

  async function calibrarB(demo) {
    showView("view-telb-calibrar");
    PruebasComun.enCurso(true);
    const texto = $("#telb-calibrar-texto");
    const progreso = $("#telb-calibrar-progreso");
    const duracion = C().DURACION_CALIBRACION_SEG * 1000;
    let lecturas = [];
    let inicio = null;
    texto.textContent = "Deja el vehículo quieto y derecho, sin tocar el celular…";
    progreso.style.width = "0%";

    const alLeer = (l) => {
      if (b.procesador) return medirLectura(l);
      // Calibrando: si se mueve, se vuelve a empezar
      const giro = Math.max(Math.abs(l.rot[0]), Math.abs(l.rot[1]), Math.abs(l.rot[2]));
      if (giro > 15) {
        lecturas = [];
        inicio = null;
        texto.textContent = "Se movió. Deja el vehículo quieto y derecho…";
        return;
      }
      if (inicio == null) inicio = l.t;
      lecturas.push(l);
      const avance = Math.min(1, (l.t - inicio) / duracion);
      progreso.style.width = `${Math.round(avance * 100)}%`;
      if (avance >= 1) {
        try {
          b.calib = Chasis.calibrar(lecturas);
          lecturas = [];
          iniciarMedicionB(demo);
        } catch (err) {
          Chasis.detener();
          PruebasComun.enCurso(false);
          prepararB(b.vehiculo);
          $("#telb-error").textContent = err.message;
          $("#telb-error").classList.remove("hidden");
        }
      }
    };
    const ok = await Chasis.iniciar({ modoDemo: demo, alLeer });
    if (!ok) {
      PruebasComun.enCurso(false);
      prepararB(b.vehiculo);
      $("#telb-error").textContent = "Este celular no está enviando datos de movimiento. Usa un celular con acelerómetro y giroscopio, o marca “Modo demostración”.";
      $("#telb-error").classList.remove("hidden");
    }
  }

  function cancelarCalibracion() {
    Chasis.detener();
    b.procesador = null;
    PruebasComun.enCurso(false);
    prepararB(b.vehiculo);
  }

  /* ---------- Medición ---------- */

  async function pantallaEncendida() {
    try { if ("wakeLock" in navigator) b.wakeLock = await navigator.wakeLock.request("screen"); } catch (e) { /* sin bloqueo */ }
  }

  function iniciarMedicionB(demo) {
    b.sesion = {
      id: PruebasComun.nuevoId(),
      inicio: new Date().toISOString(),
      fin: null,
      usuario: state.conductor || "",
      identificacion: state.identificacion || "",
      etiqueta: $("#telb-etiqueta").value.trim() || "Tamizaje preventivo",
      placa: $("#telb-placa").value.trim().toUpperCase(),
      tipo_vehiculo: b.vehiculo.id,
      perfil: "B",
      modo_demo: demo,
      lat: "",
      lng: "",
      muestras: [],
      metricas: null,
      sincronizada: false
    };
    b.t0 = performance.now();
    b.procesador = Chasis.crearProcesador(C(), b.calib, { alAlerta: mostrarAlerta });
    $("#telb-demo-aviso").classList.toggle("hidden", !demo);
    $("#telb-contadores").innerHTML = "";
    showView("view-telb-medir");
    pantallaEncendida();
    getGeo().then((geo) => {
      if (geo && b.sesion) { b.sesion.lat = geo.lat; b.sesion.lng = geo.lng; }
    });
    clearInterval(b.reloj);
    b.reloj = setInterval(actualizarPantalla, 1000);
  }

  function medirLectura(l) {
    if (!b.sesion) return;
    // Tiempo relativo al inicio de la medición: así quedan los eventos y las muestras
    const rel = { ...l, t: l.t - b.t0 };
    b.procesador.procesar(rel);
    if (b.procesador.tocaMuestra(rel.t)) b.sesion.muestras.push(b.procesador.muestra(rel.t));
  }

  // Pantalla mínima: el conductor NO debe mirar el celular mientras conduce
  function actualizarPantalla() {
    if (!b.sesion) return;
    $("#telb-tiempo").textContent = Analisis.fmtDuracion((performance.now() - b.t0) / 1000);
    const ev = b.procesador.estado().eventos;
    const n = (tipo) => ev.filter((e) => e.tipo === tipo).length;
    $("#telb-contadores").innerHTML = [
      ["Frenadas", n("frenada_brusca")],
      ["Aceleraciones", n("aceleracion_brusca")],
      ["Inclinación", n("inclinacion_extrema")],
      ["Zigzag", n("zigzag")]
    ].map(([k, v]) => `<div><strong>${v}</strong><span>${k}</span></div>`).join("");
  }

  /* ---------- Alerta de caída o impacto ---------- */

  function mostrarAlerta(ev) {
    $("#telb-alerta-texto").textContent = ev.tipo === "caida"
      ? `Detectamos una posible caída (vehículo inclinado ${Math.round(ev.valor)}° hacia la ${ev.lado}).`
      : `Detectamos un golpe fuerte (${ev.valor} g).`;
    $("#telb-alerta").classList.remove("hidden");
    try { if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]); } catch (e) { /* sin vibración */ }
  }

  function cerrarAlerta() {
    $("#telb-alerta").classList.add("hidden");
  }

  function irAEmergencias() {
    cerrarAlerta();
    abrirEmergencias();   // pantalla EMERGENCIAS VIALES de VIALIX KEY (la medición sigue grabando)
  }

  async function detenerB() {
    if (!b.sesion) return;
    clearInterval(b.reloj);
    Chasis.detener();
    if (b.wakeLock) b.wakeLock.release().catch(() => {});
    b.wakeLock = null;
    cerrarAlerta();
    const sesion = b.sesion;
    const estado = b.procesador.estado();
    b.sesion = null;
    b.procesador = null;
    sesion.fin = new Date().toISOString();
    PruebasComun.enCurso(false);

    if (sesion.muestras.length < 2) {
      alert("La medición fue demasiado corta. No se guardó.");
      prepararB(b.vehiculo);
      return;
    }
    sesion.metricas = Chasis.metricas(sesion.muestras, estado, C());
    showView("view-hs-enviando");
    try { await Almacen.guardarSesion(sesion); } catch (err) { console.warn("No se pudo guardar en el celular:", err); }
    await Almacen.enviarSesion(sesion);
    ModHeadsense.registrarPractica(sesion);
    mostrarResultado(sesion);
  }

  /* ---------- Resultado ---------- */

  function mostrarResultado(sesion) {
    b.sesionMostrada = sesion;
    Chasis.renderResultado($("#telb-resultado-contenido"), sesion);
    const estado = $("#telb-resultado-estado");
    if (sesion.sincronizada) {
      estado.textContent = "✓ Medición guardada en Google Sheets";
      estado.className = "estado-sync ok";
    } else if (!Almacen.backendConfigurado()) {
      estado.textContent = "Guardada solo en este celular (backend sin configurar)";
      estado.className = "estado-sync pendiente";
    } else {
      estado.textContent = "Guardada en el celular · se enviará al recuperar conexión";
      estado.className = "estado-sync pendiente";
    }
    showView("view-telb-resultado");
  }

  function descargarCSV() {
    const s = b.sesionMostrada;
    if (!s) return;
    Analisis.descargar(Analisis.nombreArchivo(s).replace(/^headsense_/, "chasis_"), Chasis.aCSV(s.muestras, HEADSENSE_CONFIG.CSV_FORMATO));
  }

  async function borrar() {
    const s = b.sesionMostrada;
    if (!s) return;
    const aviso = s.sincronizada
      ? "¿Borrar esta medición del celular? Seguirá guardada en Google Sheets."
      : "Esta medición NO se ha enviado a Google Sheets. Si la borras se pierde. ¿Borrarla del celular?";
    if (!confirm(aviso)) return;
    await Almacen.borrarSesion(s.id);
    b.sesionMostrada = null;
    ModHeadsense.historial();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#tel-vehiculos").addEventListener("click", (e) => {
      const t = e.target.closest("[data-vehiculo]");
      if (t) elegir(t.dataset.vehiculo);
    });
    $("#btn-tel-historial").addEventListener("click", () => ModHeadsense.historial());
    $("#btn-tel-volver").addEventListener("click", irAPrueba);
    $("#btn-telb-activar").addEventListener("click", activarB);
    $("#btn-telb-volver").addEventListener("click", abrir);
    $("#btn-telb-cancelar-calib").addEventListener("click", cancelarCalibracion);
    $("#btn-telb-detener").addEventListener("click", detenerB);
    $("#btn-telb-alerta-ok").addEventListener("click", cerrarAlerta);
    $("#btn-telb-alerta-emergencia").addEventListener("click", irAEmergencias);
    $("#btn-telb-csv").addEventListener("click", descargarCSV);
    $("#btn-telb-borrar").addEventListener("click", borrar);
    $("#btn-telb-fin").addEventListener("click", irAPrueba);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && b.sesion) pantallaEncendida();
    });
  });

  return { abrir, mostrarResultado };
})();
