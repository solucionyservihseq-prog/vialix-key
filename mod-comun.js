/* ============================================================
   VIALIX KEY v1.7.0 - Utilidades comunes de la prueba teórico-práctica
   ------------------------------------------------------------
   - Datos del conductor (los de VIALIX KEY: state.conductor, etc.).
   - Historial local de resultados (para mostrar el estado de cada parte).
   - Cola de envío al backend de PSICOTEST, con reintento sin conexión.
   - Bandera "prueba en curso" para que VIALIX KEY no se recargue sola
     en medio de una prueba cuando llega una versión nueva.
   ============================================================ */

const PruebasComun = (() => {
  const CLAVES = {
    COLA: "vialix_pruebas_cola",
    HISTORIAL: "vialix_pruebas_historial"
  };
  const MAX_HISTORIAL = 80;
  const sesionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };

  function nuevoId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function persona() {
    return { nombre: state.conductor || "", identificacion: state.identificacion || "", placa: state.placa || "" };
  }

  // Mientras haya una prueba o medición en curso, VIALIX KEY no se recarga sola
  function enCurso(valor) {
    window.VIALIX_PRUEBA_EN_CURSO = !!valor;
  }

  /* ---------- Resultados ---------- */

  function crearResultado(prueba, inicio, resumen, ensayos) {
    const p = persona();
    return {
      tipo: "resultado",
      id: nuevoId(),
      sesion_id: sesionId,
      fecha: inicio.toISOString(),
      fin: new Date().toISOString(),
      nombre: p.nombre,
      identificacion: p.identificacion,
      placa: p.placa,
      prueba,
      resumen,
      ensayos,
      dispositivo: `${navigator.userAgent.slice(0, 180)} | ${screen.width}x${screen.height}`
    };
  }

  function guardarHistorial(r) {
    const { ensayos, ...liviano } = r; // sin el detalle, para no llenar el almacenamiento
    const h = leer(CLAVES.HISTORIAL);
    h.push(liviano);
    escribir(CLAVES.HISTORIAL, h.slice(-MAX_HISTORIAL));
  }

  // Último resultado de cada prueba para una identificación (por defecto, el conductor actual)
  function ultimos(id = state.identificacion) {
    const res = {};
    leer(CLAVES.HISTORIAL)
      .filter((r) => r.identificacion === id)
      .forEach((r) => { if (!res[r.prueba] || r.fecha > res[r.prueba].fecha) res[r.prueba] = r; });
    return res;
  }

  /* ---------- Envío ---------- */

  function backendConfigurado() {
    const url = PSICOTEST_CONFIG.APPS_SCRIPT_URL;
    return !!url && !url.includes("PEGA_AQUI");
  }

  function pendiente(id) {
    return leer(CLAVES.COLA).some((r) => r.id === id);
  }

  function contarPendientes() {
    return leer(CLAVES.COLA).length;
  }

  let enviando = false;
  async function sincronizar() {
    if (enviando || !backendConfigurado() || !navigator.onLine) return;
    enviando = true;
    try {
      const enviados = new Set();
      for (const r of leer(CLAVES.COLA)) {
        try {
          const res = await fetch(PSICOTEST_CONFIG.APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS
            body: JSON.stringify(r)
          });
          const data = await res.json();
          if (data && data.status === "ok") enviados.add(r.id);
          else console.warn("El backend rechazó el resultado:", data);
        } catch (err) {
          console.warn("Sin conexión con el backend, queda pendiente:", err);
          break;
        }
      }
      // Releer por si llegó otro resultado mientras se enviaba
      escribir(CLAVES.COLA, leer(CLAVES.COLA).filter((r) => !enviados.has(r.id)));
    } finally {
      enviando = false;
    }
  }

  // Guarda en el celular, encola y trata de enviar de una vez
  async function registrar(r) {
    guardarHistorial(r);
    const cola = leer(CLAVES.COLA);
    cola.push(r);
    escribir(CLAVES.COLA, cola);
    await sincronizar();
  }

  function textoEnvio(id) {
    if (!backendConfigurado()) return { texto: "Guardado solo en este celular (backend sin configurar).", ok: false };
    if (pendiente(id)) return { texto: "Guardado en el celular · se enviará al recuperar conexión.", ok: false };
    return { texto: "✓ Resultado guardado en Google Sheets.", ok: true };
  }

  function listaRecomendaciones(lista) {
    if (!lista || !lista.length) return "";
    return `<div class="recomendaciones"><h2>Recomendaciones</h2><ul>${lista.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
  }

  window.addEventListener("online", sincronizar);
  document.addEventListener("DOMContentLoaded", () => sincronizar());

  return { esc, nuevoId, persona, enCurso, crearResultado, registrar, ultimos, textoEnvio, contarPendientes, sincronizar, listaRecomendaciones };
})();
