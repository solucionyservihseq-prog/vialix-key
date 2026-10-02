/* ============================================================
   VIALIX KEY v1.9.0 - Vigencia anual del Tamizaje preventivo
   ------------------------------------------------------------
   Decide si el conductor debe presentar el tamizaje:
   1. Consulta en la hoja de PSICOTEST la última fecha de cada parte
      para su identificación (solo fechas, nunca resultados). Va por
      POST: la identificación no queda en la URL.
   2. La combina con lo guardado en este celular (por si el resultado
      todavía no se ha enviado).
   3. Si todas las partes están dentro de VIGENCIA_DIAS → vigente:
      el botón se oculta y se muestra hasta cuándo es válido.
   Sin conexión decide solo con el celular, sin bloquear al conductor.
   ============================================================ */

const Tamizaje = (() => {
  const T = () => TAMIZAJE_CONFIG;
  const DIA = 24 * 60 * 60 * 1000;
  let consultaActual = 0;   // descarta respuestas viejas si el conductor cambia sus datos

  async function consultarServidor(identificacion) {
    const url = PSICOTEST_CONFIG.APPS_SCRIPT_URL;
    if (!url || url.includes("PEGA_AQUI") || !navigator.onLine) return null;
    const ctrl = new AbortController();
    const reloj = setTimeout(() => ctrl.abort(), T().TIEMPO_MAX_CONSULTA_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ tipo: "consulta", identificacion }),
        signal: ctrl.signal
      });
      const data = await res.json();
      return data && data.status === "ok" ? data.partes : null;
    } catch (err) {
      console.warn("No se pudo consultar la prueba en la hoja:", err);
      return null;
    } finally {
      clearTimeout(reloj);
    }
  }

  async function estado(identificacion) {
    const fechas = {};
    const local = PruebasComun.ultimos(identificacion);
    Object.keys(local).forEach((p) => { fechas[p] = local[p].fecha; });
    const servidor = await consultarServidor(identificacion);
    if (servidor) {
      Object.keys(servidor).forEach((p) => {
        if (servidor[p] && (!fechas[p] || servidor[p] > fechas[p])) fechas[p] = servidor[p];
      });
    }
    const limite = Date.now() - T().VIGENCIA_DIAS * DIA;
    const vigentes = T().PARTES.filter((p) => fechas[p] && Date.parse(fechas[p]) >= limite);
    const pendientes = T().PARTES.filter((p) => !vigentes.includes(p));
    // El tamizaje vence cuando vence su parte más antigua
    const masAntigua = vigentes.length ? Math.min(...vigentes.map((p) => Date.parse(fechas[p]))) : null;
    return {
      vigente: pendientes.length === 0,
      pendientes,
      ninguna: vigentes.length === 0,
      vence: pendientes.length === 0 ? new Date(masAntigua + T().VIGENCIA_DIAS * DIA) : null,
      verificado: servidor !== null
    };
  }

  const nombres = (lista) => lista.map((p) => T().NOMBRES_PARTES[p] || p).join(", ");
  const fecha = (d) => d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  function textoEstado(e) {
    const nota = e.verificado ? "" : " (Sin conexión: se revisó solo con este celular.)";
    if (e.vigente) {
      return { clase: "ok", texto: `✓ Tu ${T().NOMBRE.toLowerCase()} está al día. Vigente hasta el ${fecha(e.vence)}.${nota}`, boton: null };
    }
    if (e.ninguna) {
      return { clase: "alerta", texto: `⚠️ No has presentado tu ${T().NOMBRE.toLowerCase()} de este año. Por favor iníciala.${nota}`, boton: "Prueba de Biotelemetría en Conducción" };
    }
    return { clase: "pendiente", texto: `Tu prueba está incompleta. Te falta: ${nombres(e.pendientes)}.${nota}`, boton: "Prueba de Biotelemetría en Conducción" };
  }

  // Bloque de la pantalla de bienvenida
  async function pintarInicio() {
    const id = state.identificacion;
    const caja = $("#tamizaje-estado");
    const boton = $("#btn-iniciar-prueba");
    if (!id) return;
    const n = ++consultaActual;
    caja.className = "tamizaje-estado";
    caja.textContent = "Verificando tu prueba preventiva…";
    boton.classList.add("hidden");
    $("#tamizaje-aviso-guia").classList.add("hidden");
    const e = await estado(id);
    if (n !== consultaActual) return;   // el conductor cambió de datos mientras tanto
    const t = textoEstado(e);
    caja.className = `tamizaje-estado ${t.clase}`;
    caja.textContent = t.texto;
    const mostrarBoton = !e.vigente || !T().OCULTAR_BOTON_SI_VIGENTE;
    boton.classList.toggle("hidden", !mostrarBoton);
    $("#tamizaje-aviso-guia").classList.toggle("hidden", !mostrarBoton);   // aviso de la guía, siempre bajo el botón
    $("#tamizaje-boton-texto").textContent = t.boton || "Prueba de Biotelemetría en Conducción";
  }

  // Línea de vigencia en la pantalla del tamizaje
  async function pintarPrueba() {
    const el = $("#prueba-vigencia");
    if (!state.identificacion) return;
    el.className = "tamizaje-estado";
    el.textContent = "Verificando vigencia…";
    const e = await estado(state.identificacion);
    const t = textoEstado(e);
    el.className = `tamizaje-estado ${t.clase}`;
    el.textContent = e.vigente ? t.texto : `Te falta: ${nombres(e.pendientes)}.`;
  }

  return { estado, pintarInicio, pintarPrueba };
})();
