/* ============================================================
   VIALIX KEY v1.7.0 - Pruebas psicomotrices dentro de la app
   ------------------------------------------------------------
   Usa el motor de pt-pruebas.js (reacción, bimanual, anticipación),
   muestra el resultado con recomendaciones y lo envía a la hoja de
   PSICOTEST (pestañas Reaccion, Bimanual, Anticipacion y Ensayos).
   ============================================================ */

const ModPsicotest = (() => {
  const ORDEN = ["reaccion", "bimanual", "anticipacion"];
  let actual = null;     // id de la prueba
  let ejecucion = null;  // { detener }
  let ultimo = null;     // último resultado mostrado
  const esc = (t) => PruebasComun.esc(t);

  const ETIQUETAS = {
    reaccion: [
      ["tiempo_medio_ms", "Tiempo medio de reacción", "ms"],
      ["tiempo_mediana_ms", "Mediana", "ms"],
      ["desviacion_ms", "Variabilidad (desviación)", "ms"],
      ["correctas", "Respuestas correctas", ""],
      ["boton_equivocado", "Botón equivocado", ""],
      ["omisiones", "Omisiones (no respondió)", ""],
      ["no_inhibio", "Tocó con luz amarilla", ""],
      ["anticipadas", "Tocó antes de la luz", ""],
      ["errores_totales", "Errores totales", ""]
    ],
    bimanual: [
      ["pct_dentro_total", "Tiempo dentro del camino", "%"],
      ["pct_dentro_izq", "Mano izquierda", "%"],
      ["pct_dentro_der", "Mano derecha", "%"],
      ["salidas_totales", "Salidas del camino", ""],
      ["salidas_izq", "Salidas mano izquierda", ""],
      ["salidas_der", "Salidas mano derecha", ""],
      ["desviacion_media_pct", "Desviación media", "%"]
    ],
    anticipacion: [
      ["error_medio_abs_ms", "Error medio", "ms"],
      ["error_medio_ms", "Error con signo (− antes / + tarde)", "ms"],
      ["tendencia", "Tendencia", ""],
      ["error_max_abs_ms", "Error máximo", "ms"],
      ["anticipados", "Se adelantó", ""],
      ["tardios", "Llegó tarde", ""],
      ["omisiones", "No tocó", ""]
    ]
  };

  function referencia(id) {
    const C = PSICOTEST_CONFIG;
    if (id === "reaccion") return `Referencia: tiempo medio ≤ ${C.REACCION.REF_TIEMPO_MEDIO_MS} ms y máximo ${C.REACCION.REF_ERRORES_MAX} errores.`;
    if (id === "bimanual") return `Referencia: ≥ ${C.BIMANUAL.REF_PCT_DENTRO}% dentro y máximo ${C.BIMANUAL.REF_SALIDAS_MAX} salidas.`;
    return `Referencia: error medio ≤ ${C.ANTICIPACION.REF_ERROR_MEDIO_MS} ms y máximo ${C.ANTICIPACION.REF_OMISIONES_MAX} omisión.`;
  }

  function tabla(id, r) {
    return ETIQUETAS[id].map(([k, etiqueta, unidad]) => {
      const v = r[k];
      const valor = v == null || v === "" ? "--" : `${v}${unidad ? " " + unidad : ""}`;
      return `<div class="res-fila"><span>${esc(etiqueta)}</span><strong>${esc(valor)}</strong></div>`;
    }).join("");
  }

  function pildora(r) {
    if (!r) return `<span class="pildora">Pendiente</span>`;
    return r.resumen.dentro_referencia
      ? `<span class="pildora ok">Dentro de referencia</span>`
      : `<span class="pildora alerta">Por reforzar</span>`;
  }

  /* ---------- Menú ---------- */

  function abrir() {
    const ultimos = PruebasComun.ultimos();
    $("#pt-lista").innerHTML = ORDEN.map((id, i) => {
      const p = Pruebas.CATALOGO[id];
      return `
        <button type="button" class="prueba-item" data-prueba="${id}">
          <span class="prueba-icono">${p.icono}</span>
          <span class="prueba-texto"><strong>${i + 1}. ${esc(p.nombre)}</strong>${pildora(ultimos[id])}</span>
          <span class="prueba-flecha">›</span>
        </button>`;
    }).join("");
    showView("view-pt-home");
  }

  /* ---------- Instrucciones y ejecución ---------- */

  function instrucciones(id) {
    actual = id;
    const p = Pruebas.CATALOGO[id];
    $("#pt-instr-titulo").textContent = `${p.icono} ${p.nombre}`;
    $("#pt-instr-lista").innerHTML = p.instrucciones.map((t) => `<li>${esc(t)}</li>`).join("");
    $("#pt-instr-horizontal").classList.toggle("hidden", !p.horizontal);
    showView("view-pt-instr");
  }

  async function pantallaCompleta(horizontal) {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      }
      if (horizontal && screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
    } catch (err) {
      // iPhone y algunos navegadores no permiten bloquear la orientación: se gira a mano
    }
  }

  function salirPantallaCompleta() {
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* nada */ }
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }

  function cuentaRegresiva() {
    return new Promise((resolve) => {
      const el = $("#pt-cuenta");
      let n = 3;
      el.textContent = n;
      el.classList.remove("hidden");
      const tick = setInterval(() => {
        n--;
        if (n <= 0) {
          clearInterval(tick);
          el.classList.add("hidden");
          resolve();
        } else {
          el.textContent = n;
        }
      }, 1000);
    });
  }

  async function comenzar() {
    const id = actual;
    const p = Pruebas.CATALOGO[id];
    PruebasComun.enCurso(true);
    $("#pt-arena").classList.remove("hidden");
    document.body.classList.add("en-prueba");
    await pantallaCompleta(p.horizontal);
    await new Promise((r) => setTimeout(r, 400)); // esperar a que la pantalla gire
    if (!p.cuentaPropia) await cuentaRegresiva();
    if ($("#pt-arena").classList.contains("hidden")) return; // salió durante la cuenta
    const inicio = new Date();
    ejecucion = p.ejecutar($("#pt-lienzo"), (datos) => terminar(id, inicio, datos));
  }

  function cerrarArena() {
    $("#pt-arena").classList.add("hidden");
    $("#pt-cuenta").classList.add("hidden");
    document.body.classList.remove("en-prueba");
    salirPantallaCompleta();
    PruebasComun.enCurso(false);
  }

  function salir() {
    if (ejecucion) ejecucion.detener();
    ejecucion = null;
    cerrarArena();
    instrucciones(actual);
  }

  /* ---------- Resultado ---------- */

  async function terminar(id, inicio, datos) {
    ejecucion = null;
    cerrarArena();
    const recs = Pruebas.recomendaciones(id, datos.resumen);
    const resumen = { ...datos.resumen, recomendaciones: recs.join(" | ") };
    const r = PruebasComun.crearResultado(id, inicio, resumen, datos.ensayos);
    mostrar(r, "Guardando…");
    await PruebasComun.registrar(r);
    mostrar(r);
  }

  function mostrar(r, estado) {
    ultimo = r;
    const p = Pruebas.CATALOGO[r.prueba];
    $("#pt-res-titulo").textContent = `${p.icono} ${p.nombre}`;
    const ok = r.resumen.dentro_referencia;
    const nivel = $("#pt-res-nivel");
    nivel.textContent = ok ? "✓ Dentro de la referencia" : "Por reforzar";
    nivel.className = `nivel ${ok ? "ok" : "alerta"}`;
    $("#pt-res-recomendaciones").innerHTML = PruebasComun.listaRecomendaciones(Pruebas.recomendaciones(r.prueba, r.resumen));
    $("#pt-res-tabla").innerHTML = tabla(r.prueba, r.resumen) + `<p class="texto-ayuda">${esc(referencia(r.prueba))}</p>`;
    const envio = estado ? { texto: estado, ok: false } : PruebasComun.textoEnvio(r.id);
    $("#pt-res-envio").textContent = envio.texto;
    $("#pt-res-envio").className = `estado-envio ${envio.ok ? "ok" : ""}`;
    const idx = ORDEN.indexOf(r.prueba);
    $("#btn-pt-siguiente").textContent = idx < ORDEN.length - 1
      ? `Siguiente: ${Pruebas.CATALOGO[ORDEN[idx + 1]].nombre}`
      : "Ver resumen";
    showView("view-pt-resultado");
  }

  function siguiente() {
    const idx = ORDEN.indexOf(ultimo.prueba);
    if (idx < ORDEN.length - 1) instrucciones(ORDEN[idx + 1]);
    else resumen();
  }

  function resumen() {
    const ultimos = PruebasComun.ultimos();
    $("#pt-resumen-contenido").innerHTML = ORDEN.map((id) => {
      const p = Pruebas.CATALOGO[id];
      const r = ultimos[id];
      if (!r) return `<div class="resumen-bloque"><h2>${p.icono} ${esc(p.nombre)}</h2><p class="texto-ayuda">Aún no se ha realizado.</p></div>`;
      const ok = r.resumen.dentro_referencia;
      return `
        <div class="resumen-bloque">
          <h2>${p.icono} ${esc(p.nombre)}</h2>
          <div class="nivel ${ok ? "ok" : "alerta"}">${ok ? "✓ Dentro de la referencia" : "Por reforzar"}</div>
          <p class="texto-ayuda">${new Date(r.fecha).toLocaleString()}</p>
          ${PruebasComun.listaRecomendaciones(Pruebas.recomendaciones(id, r.resumen))}
          <div class="res-tabla">${tabla(id, r.resumen)}</div>
        </div>`;
    }).join("");
    showView("view-pt-resumen");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#pt-lista").addEventListener("click", (e) => {
      const b = e.target.closest("[data-prueba]");
      if (b) instrucciones(b.dataset.prueba);
    });
    $("#btn-pt-resumen").addEventListener("click", resumen);
    $("#btn-pt-volver").addEventListener("click", irAPrueba);
    $("#btn-pt-comenzar").addEventListener("click", comenzar);
    $("#btn-pt-volver-instr").addEventListener("click", abrir);
    $("#btn-pt-salir").addEventListener("click", salir);
    $("#btn-pt-repetir").addEventListener("click", () => instrucciones(ultimo.prueba));
    $("#btn-pt-siguiente").addEventListener("click", siguiente);
    $("#btn-pt-res-menu").addEventListener("click", abrir);
    $("#btn-pt-resumen-volver").addEventListener("click", abrir);
  });

  return { abrir };
})();
