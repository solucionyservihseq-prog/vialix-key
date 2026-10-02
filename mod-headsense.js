/* ============================================================
   VIALIX KEY v1.7.0 - Prueba práctica VIALIX HEADSENSE dentro de la app
   ------------------------------------------------------------
   Mismo funcionamiento que la app HEADSENSE v2 (calibración de 3 s,
   20 Hz, corrección de deriva, giros y cabeceos), usando los datos del
   conductor de VIALIX KEY. Las sesiones van al backend de HEADSENSE
   (pestañas Sesiones y Eventos + CSV en Drive).
   Módulos usados: hs-sensor.js (Sensor), hs-analisis.js (Analisis),
   hs-almacen.js (Almacen).
   v1.8.0: es el PERFIL A de la prueba práctica híbrida (vehículo liviano,
   pesado y maquinaria amarilla). Se entra desde el menú de vehículos de
   mod-telemetria.js; el historial muestra también las mediciones del
   chasis (Perfil B) y se las pasa a ModTelemetria para mostrarlas.
   ============================================================ */

const ModHeadsense = (() => {
  const CLAVE_MONTAJE = "vialix_hs_montaje";
  const hs = {
    qBase: null,
    sesion: null,
    muestreo: null,
    animacion: null,
    wakeLock: null,
    deriva: null,
    ultimaRotCruda: 0,
    calibracion: null,
    sesionMostrada: null,
    vehiculo: null       // { id, nombre, icono, perfil } elegido en el menú de vehículos
  };

  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };

  /* ---------- Preparar ---------- */

  function abrir(vehiculo) {
    if (vehiculo) hs.vehiculo = vehiculo;
    const v = hs.vehiculo || TELEMETRIA_CONFIG.VEHICULOS.find((x) => x.id === "vehiculo");
    $("#hs-vehiculo").textContent = `${v.icono} ${v.nombre}`;
    const montaje = lsGet(CLAVE_MONTAJE) || HEADSENSE_CONFIG.MONTAJE;
    const radio = $(`input[name="hs-montaje"][value="${montaje}"]`);
    if (radio) radio.checked = true;
    if (!$("#hs-placa").value) $("#hs-placa").value = state.placa || "";
    $("#hs-error").classList.add("hidden");
    actualizarPendientes();
    showView("view-hs-preparar");
  }

  async function actualizarPendientes() {
    const n = await Almacen.contarPendientes();
    const el = $("#hs-pendientes");
    el.classList.toggle("hidden", n === 0);
    el.textContent = n === 1 ? "1 medición pendiente por enviar" : `${n} mediciones pendientes por enviar`;
  }

  async function activarSensores() {
    const boton = $("#btn-hs-activar");
    const error = $("#hs-error");
    const demo = $("#hs-demo").checked;
    error.classList.add("hidden");
    lsSet(CLAVE_MONTAJE, $('input[name="hs-montaje"]:checked').value);
    boton.disabled = true;
    boton.textContent = "Activando sensores…";
    try {
      if (!demo) {
        if (!window.isSecureContext) throw new Error("Los sensores solo funcionan si la app se abre con https:// (desde GitHub Pages).");
        const permiso = await Sensor.pedirPermiso();
        if (!permiso) throw new Error("No se dio permiso para usar los sensores de movimiento. Actívalo en los ajustes del navegador e inténtalo de nuevo.");
      }
      const ok = await Sensor.iniciar({ modoDemo: demo });
      if (!ok) throw new Error("Este celular no está enviando datos del giroscopio. Usa un celular con giroscopio o marca “Modo demostración”.");
      calibrar(demo);
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove("hidden");
    } finally {
      boton.disabled = false;
      boton.textContent = "Activar sensores y calibrar";
    }
  }

  /* ---------- Calibración (3 s mirando al frente) ---------- */

  function calibrar(demo) {
    showView("view-hs-calibrar");
    PruebasComun.enCurso(true);
    const duracion = HEADSENSE_CONFIG.DURACION_CALIBRACION_SEG * 1000;
    const texto = $("#hs-calibrar-texto");
    const progreso = $("#hs-calibrar-progreso");
    const lecturas = [];
    const inicio = performance.now();
    texto.textContent = "Mira al frente y quédate quieto…";
    progreso.style.width = "0%";
    clearInterval(hs.calibracion);
    hs.calibracion = setInterval(() => {
      const l = Sensor.lectura();
      if (!l) return;
      if (Math.max(Math.abs(l.v.x), Math.abs(l.v.y), Math.abs(l.v.z)) > 20) {
        lecturas.length = 0;   // se movió: volver a empezar
        texto.textContent = "Te moviste. Quédate quieto mirando al frente…";
      }
      lecturas.push(l.q);
      const avance = Math.min(1, (lecturas.length * 50) / duracion);
      progreso.style.width = `${Math.round(avance * 100)}%`;
      if (avance >= 1 && performance.now() - inicio >= duracion) {
        clearInterval(hs.calibracion);
        hs.qBase = Sensor.qPromedio(lecturas);
        medir(demo);
      }
    }, 50);
  }

  function cancelarCalibracion() {
    clearInterval(hs.calibracion);
    Sensor.detener();
    PruebasComun.enCurso(false);
    abrir();
  }

  /* ---------- Medición ---------- */

  async function pantallaEncendida() {
    try {
      if ("wakeLock" in navigator) hs.wakeLock = await navigator.wakeLock.request("screen");
    } catch (e) {
      console.warn("No se pudo mantener la pantalla encendida:", e);
    }
  }

  function liberarPantalla() {
    if (hs.wakeLock) hs.wakeLock.release().catch(() => {});
    hs.wakeLock = null;
  }

  async function medir(demo) {
    const cfg = HEADSENSE_CONFIG;
    const montaje = $('input[name="hs-montaje"]:checked').value;
    hs.sesion = {
      id: PruebasComun.nuevoId(),
      inicio: new Date().toISOString(),
      fin: null,
      usuario: state.conductor || "",
      identificacion: state.identificacion || "",
      etiqueta: $("#hs-etiqueta").value.trim() || "Prueba teórico-práctica",
      tipo_vehiculo: hs.vehiculo ? hs.vehiculo.id : "vehiculo",
      perfil: "A",
      placa: $("#hs-placa").value.trim().toUpperCase(),
      montaje,
      modo_demo: demo,
      lat: "",
      lng: "",
      muestras: [],
      metricas: null,
      sincronizada: false
    };
    $("#hs-medir-demo").classList.toggle("hidden", !demo);
    showView("view-hs-medir");
    await pantallaEncendida();

    const intervalo = 1000 / cfg.FRECUENCIA_MUESTREO_HZ;
    const t0 = performance.now();
    const r1 = (v) => Math.round(v * 10) / 10;
    // Reencuadre por cambio de rumbo: "auto" = solo si hay placa (conductor)
    const reencuadre = cfg.DERIVA.REENCUADRE_RUMBO === "auto" ? !!hs.sesion.placa : cfg.DERIVA.REENCUADRE_RUMBO === true;
    hs.deriva = Sensor.crearCorrectorDeriva(cfg.DERIVA, { reencuadre });

    clearInterval(hs.muestreo);
    hs.muestreo = setInterval(() => {
      const l = Sensor.lectura();
      if (!l) return;
      const a = Sensor.angulosCabeza(hs.qBase, l, montaje);
      const t = Math.round(performance.now() - t0);
      hs.ultimaRotCruda = a.rotacion;
      const rotacion = hs.deriva.aplicar(a.rotacion, a.velRotacion, t);
      hs.sesion.muestras.push([
        t, r1(a.flexion), r1(rotacion), r1(a.inclinacion),
        r1(a.velFlexion), r1(a.velRotacion), r1(a.velInclinacion)
      ]);
    }, intervalo);

    getGeo().then((geo) => {
      if (geo && hs.sesion) {
        hs.sesion.lat = geo.lat;
        hs.sesion.lng = geo.lng;
      }
    });

    cancelAnimationFrame(hs.animacion);
    let ultimoRefresco = 0;
    let ultimoConteo = 0;
    const canvas = $("#hs-grafica");
    const cuadro = (ahora) => {
      hs.animacion = requestAnimationFrame(cuadro);
      if (ahora - ultimoRefresco < 100 || !hs.sesion) return;
      ultimoRefresco = ahora;
      const m = hs.sesion.muestras;
      const ultima = m[m.length - 1];
      $("#hs-medir-tiempo").textContent = Analisis.fmtDuracion((performance.now() - t0) / 1000);
      if (ultima) {
        pintarAngulo("flexion", ultima[1]);
        pintarAngulo("rotacion", ultima[2]);
        pintarAngulo("inclinacion", ultima[3]);
        pintarCabeza(ultima[1], ultima[2], ultima[3]);
      }
      if (ahora - ultimoConteo > 2000 && m.length > 1) {
        ultimoConteo = ahora;
        const met = Analisis.calcularMetricas(m, cfg);
        $("#hs-giros").textContent = met.giros_izquierda + met.giros_derecha;
        $("#hs-cabeceos").textContent = met.cabeceos;
        $("#hs-riesgo").textContent = `${met.pct_riesgo}%`;
      }
      Analisis.dibujarSerie(canvas, m, { cfg, ventanaSeg: 30 });
    };
    hs.animacion = requestAnimationFrame(cuadro);
  }

  function pintarAngulo(eje, valor) {
    const U = HEADSENSE_CONFIG.UMBRALES;
    const el = $(`#vivo-${eje}`);
    el.querySelector(".vivo-valor").textContent = `${valor > 0 ? "+" : ""}${valor.toFixed(0)}°`;
    let alerta = false;
    if (eje === "flexion") alerta = valor > U.FLEXION_ALTA || valor < -U.EXTENSION;
    if (eje === "rotacion") alerta = Math.abs(valor) > U.ROTACION;
    if (eje === "inclinacion") alerta = Math.abs(valor) > U.INCLINACION;
    el.classList.toggle("alerta", alerta);
    const pct = Math.max(-1, Math.min(1, valor / 90));
    const barra = el.querySelector(".vivo-barra span");
    barra.style.left = pct >= 0 ? "50%" : `${50 + pct * 50}%`;
    barra.style.width = `${Math.abs(pct) * 50}%`;
  }

  // Vista frontal (rotación e inclinación) y de perfil (flexión). La frontal es la
  // de un observador enfrente, por eso la derecha de la persona va a la izquierda.
  function pintarCabeza(flexion, rotacion, inclinacion) {
    $("#hs-cabeza-frente").setAttribute("transform", `rotate(${(-inclinacion).toFixed(1)} 50 80)`);
    $("#hs-cabeza-nariz").setAttribute("transform", `translate(${(Math.sin(rotacion * Math.PI / 180) * 18).toFixed(1)} 0)`);
    $("#hs-cabeza-lado").setAttribute("transform", `rotate(${flexion.toFixed(1)} 150 72)`);
  }

  async function detener() {
    if (!hs.sesion) return;
    clearInterval(hs.muestreo);
    cancelAnimationFrame(hs.animacion);
    Sensor.detener();
    liberarPantalla();
    const sesion = hs.sesion;
    hs.sesion = null;
    sesion.fin = new Date().toISOString();
    sesion.deriva = hs.deriva ? hs.deriva.resumen() : null;
    PruebasComun.enCurso(false);

    if (sesion.muestras.length < 2) {
      alert("La medición fue demasiado corta. No se guardó.");
      abrir();
      return;
    }
    sesion.metricas = Analisis.calcularMetricas(sesion.muestras, HEADSENSE_CONFIG);
    showView("view-hs-enviando");
    try {
      await Almacen.guardarSesion(sesion);
    } catch (err) {
      console.warn("No se pudo guardar la sesión en el celular:", err);
    }
    await Almacen.enviarSesion(sesion);
    mostrarResultado(sesion);
  }

  /* ---------- Resultado e historial ---------- */

  function mostrarResultado(sesion) {
    if (sesion.perfil === "B") return ModTelemetria.mostrarResultado(sesion);
    hs.sesionMostrada = sesion;
    Analisis.renderResultado($("#hs-resultado-contenido"), sesion, HEADSENSE_CONFIG);
    const estado = $("#hs-resultado-estado");
    if (sesion.sincronizada) {
      estado.textContent = "✓ Sesión guardada en Google Sheets";
      estado.className = "estado-sync ok";
    } else if (!Almacen.backendConfigurado()) {
      estado.textContent = "Guardada solo en este celular (backend de HEADSENSE sin configurar)";
      estado.className = "estado-sync pendiente";
    } else {
      estado.textContent = "Guardada en el celular · se enviará al recuperar conexión";
      estado.className = "estado-sync pendiente";
    }
    showView("view-hs-resultado");
  }

  function descargarCSV() {
    const s = hs.sesionMostrada;
    if (!s) return;
    Analisis.descargar(Analisis.nombreArchivo(s), Analisis.aCSV(s.muestras, HEADSENSE_CONFIG.CSV_FORMATO));
  }

  async function borrar() {
    const s = hs.sesionMostrada;
    if (!s) return;
    const aviso = s.sincronizada
      ? "¿Borrar esta medición del celular? Seguirá guardada en Google Sheets."
      : "Esta medición NO se ha enviado a Google Sheets. Si la borras se pierde. ¿Borrarla del celular?";
    if (!confirm(aviso)) return;
    await Almacen.borrarSesion(s.id);
    hs.sesionMostrada = null;
    historial();
  }

  async function historial() {
    const cont = $("#hs-historial-lista");
    cont.innerHTML = `<div class="spinner"></div>`;
    showView("view-hs-historial");
    const esc = PruebasComun.esc;
    const sesiones = (await Almacen.listarSesiones()).filter((s) => !state.identificacion || s.identificacion === state.identificacion);
    if (!sesiones.length) {
      cont.innerHTML = `<div class="card centrado"><p>Todavía no hay mediciones de este conductor en el celular.</p></div>`;
      return;
    }
    const NIVEL = { bajo: "Bajo", medio: "Medio", alto: "Alto" };
    cont.innerHTML = sesiones.map((s) => {
      const met = s.metricas || {};
      const veh = TELEMETRIA_CONFIG.VEHICULOS.find((v) => v.id === s.tipo_vehiculo);
      // Perfil A muestra % en postura de riesgo; Perfil B, el nivel de riesgo de la conducción
      const indicador = s.perfil === "B"
        ? NIVEL[met.nivel_riesgo] || "--"
        : met.pct_riesgo != null ? met.pct_riesgo + "%" : "--";
      return `
        <button type="button" class="historial-item" data-id="${esc(s.id)}">
          <span class="historial-principal">
            <strong>${veh ? veh.icono + " " : ""}${esc(s.etiqueta || "Medición")}</strong>
            <small>${new Date(s.inicio).toLocaleString()} · ${Analisis.fmtDuracion(met.duracion_seg || 0)}${s.perfil === "B" ? " · chasis" : " · cabeza"}${s.modo_demo ? " · demo" : ""}</small>
          </span>
          <span class="historial-lado">
            <span class="pildora nivel-${esc(met.nivel_riesgo || "bajo")}">${indicador}</span>
            <small>${s.sincronizada ? "✓ enviada" : "pendiente"}</small>
          </span>
        </button>`;
    }).join("");
  }

  async function abrirDelHistorial(id) {
    const s = await Almacen.obtenerSesion(id);
    if (s) mostrarResultado(s);
  }

  // Último resultado de HEADSENSE del conductor, para el menú de la prueba
  async function ultimo() {
    const sesiones = (await Almacen.listarSesiones()).filter((s) => s.identificacion === state.identificacion);
    return sesiones[0] || null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#btn-hs-activar").addEventListener("click", activarSensores);
    $("#btn-hs-volver").addEventListener("click", () => ModTelemetria.abrir());
    $("#btn-hs-cancelar-calib").addEventListener("click", cancelarCalibracion);
    $("#btn-hs-recentrar").addEventListener("click", () => { if (hs.deriva) hs.deriva.recentrar(hs.ultimaRotCruda); });
    $("#btn-hs-detener").addEventListener("click", detener);
    $("#btn-hs-csv").addEventListener("click", descargarCSV);
    $("#btn-hs-borrar").addEventListener("click", borrar);
    $("#btn-hs-fin").addEventListener("click", irAPrueba);
    $("#btn-hs-historial-volver").addEventListener("click", () => ModTelemetria.abrir());
    $("#hs-historial-lista").addEventListener("click", (e) => {
      const item = e.target.closest(".historial-item");
      if (item) abrirDelHistorial(item.dataset.id);
    });
    // Si la pantalla se apaga y vuelve, pedir de nuevo que se mantenga encendida
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && hs.sesion) pantallaEncendida();
    });
    window.addEventListener("online", () => Almacen.sincronizarPendientes());
    Almacen.sincronizarPendientes();
  });

  return { abrir, ultimo, historial, mostrarResultado };
})();
