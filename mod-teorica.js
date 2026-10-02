/* ============================================================
   VIALIX KEY v1.9.5 - Evaluación de conocimiento dentro de la app
   ------------------------------------------------------------
   Una pregunta por pantalla, calificación al final, repaso de las
   respuestas incorrectas y recomendaciones por tema. El resultado
   va a la hoja de PSICOTEST (pestañas Teorica y Teorica_Respuestas).

   v1.9.5 - Tiempo máximo (TEORICA_CONFIG.TIEMPO_MAX_MIN):
   - El reloj corre con la hora real: sigue corriendo aunque la persona
     salga de la app o la cierre. Al volver, continúa su intento con el
     tiempo que le quede (no puede reiniciarlo saliendo y entrando).
   - Si se acaba el tiempo, la evaluación se cierra y se califica con
     lo respondido; lo que quedó sin responder cuenta como incorrecto.
   - Se cuenta cuántas veces salió de la app durante la evaluación
     (p. ej. para buscar en internet) y queda en la hoja.
   ============================================================ */

const ModTeorica = (() => {
  const LETRAS = ["A", "B", "C", "D"];
  const CLAVE_EN_CURSO = "vialix_teorica_en_curso";
  let intento = null;   // { preguntas, respuestas, i, inicio (Date), salidas, identificacion }
  let ultimo = null;
  let reloj = null;
  let calificando = false;

  const limiteMs = () => TEORICA_CONFIG.TIEMPO_MAX_MIN * 60 * 1000;
  const restanteMs = () => (intento ? intento.inicio.getTime() + limiteMs() - Date.now() : 0);
  const mmss = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  function barajar(lista) {
    const v = [...lista];
    for (let i = v.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [v[i], v[j]] = [v[j], v[i]];
    }
    return v;
  }

  /* ---------- Intento guardado en el celular (para continuarlo) ---------- */

  function guardarEnCurso() {
    if (!intento) return;
    try {
      localStorage.setItem(CLAVE_EN_CURSO, JSON.stringify({
        identificacion: intento.identificacion,
        inicio: intento.inicio.getTime(),
        preguntas: intento.preguntas.map((p) => ({ n: p.n, orden: p.orden })),
        respuestas: intento.respuestas,
        i: intento.i,
        salidas: intento.salidas
      }));
    } catch (e) { /* sin almacenamiento */ }
  }

  function borrarEnCurso() {
    try { localStorage.removeItem(CLAVE_EN_CURSO); } catch (e) { /* sin almacenamiento */ }
  }

  function recuperarEnCurso() {
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_EN_CURSO) || "null");
      if (!g || g.identificacion !== state.identificacion) return null;
      const banco = Object.fromEntries(TEORICA_PREGUNTAS.map((p) => [p.n, p]));
      if (!g.preguntas.every((p) => banco[p.n])) return null;   // cambió el banco de preguntas
      return {
        identificacion: g.identificacion,
        inicio: new Date(g.inicio),
        preguntas: g.preguntas.map((p) => ({ ...banco[p.n], orden: p.orden })),
        respuestas: g.respuestas || [],
        i: g.i || 0,
        salidas: g.salidas || 0
      };
    } catch (e) {
      return null;
    }
  }

  /* ---------- Inicio ---------- */

  function abrir() {
    // ¿Hay un intento sin terminar? Se continúa (o se califica si ya se acabó el tiempo)
    const pendiente = recuperarEnCurso();
    if (pendiente) {
      intento = pendiente;
      PruebasComun.enCurso(true);
      if (restanteMs() <= 0) return calificar(true);
      iniciarReloj();
      return mostrarPregunta(`Continúas tu evaluación. Te quedan ${mmss(restanteMs())}.`);
    }
    const r = PruebasComun.ultimos().teorica;
    $("#teo-ultimo").innerHTML = r
      ? `Último intento: <strong>${r.resumen.puntaje_pct}%</strong> · ${r.resumen.dentro_referencia ? "Aprobado" : "No aprobado"} · ${new Date(r.fecha).toLocaleString()}`
      : "";
    $("#teo-ultimo").classList.toggle("hidden", !r);
    $("#teo-aprobacion").textContent = TEORICA_CONFIG.APROBACION_PCT;
    $("#teo-total").textContent = TEORICA_PREGUNTAS.length;
    $("#teo-minutos").textContent = TEORICA_CONFIG.TIEMPO_MAX_MIN;
    showView("view-teorica-intro");
  }

  function comenzar() {
    const base = TEORICA_CONFIG.MEZCLAR_PREGUNTAS ? barajar(TEORICA_PREGUNTAS) : TEORICA_PREGUNTAS;
    intento = {
      identificacion: state.identificacion,
      // orden: posición original (0–3) de cada opción en pantalla
      preguntas: base.map((p) => ({ ...p, orden: TEORICA_CONFIG.MEZCLAR_OPCIONES ? barajar([0, 1, 2, 3]) : [0, 1, 2, 3] })),
      respuestas: [],
      i: 0,
      inicio: new Date(),
      salidas: 0
    };
    guardarEnCurso();
    PruebasComun.enCurso(true);
    iniciarReloj();
    mostrarPregunta();
  }

  /* ---------- Reloj ---------- */

  function iniciarReloj() {
    clearInterval(reloj);
    const pintar = () => {
      if (!intento) return clearInterval(reloj);
      const r = restanteMs();
      const el = $("#teo-reloj");
      el.textContent = `⏱ ${mmss(r)}`;
      el.classList.toggle("ultimo-minuto", r <= TEORICA_CONFIG.AVISO_ULTIMO_MIN * 60 * 1000);
      if (r <= 0) calificar(true);
    };
    pintar();
    reloj = setInterval(pintar, 500);
  }

  // Salir de la app (cambiar de app, abrir el navegador, bloquear la pantalla) queda registrado
  function alCambiarVisibilidad() {
    if (!intento || calificando) return;
    if (document.visibilityState === "hidden") {
      intento.salidas++;
      guardarEnCurso();
    } else if (restanteMs() <= 0) {
      calificar(true);
    }
  }

  /* ---------- Preguntas ---------- */

  function mostrarPregunta(aviso) {
    const p = intento.preguntas[intento.i];
    const total = intento.preguntas.length;
    $("#teo-progreso-texto").textContent = `Pregunta ${intento.i + 1} de ${total}`;
    $("#teo-progreso-barra").style.width = `${(intento.i / total) * 100}%`;
    $("#teo-enunciado").textContent = p.enunciado;
    $("#teo-aviso-reanudar").textContent = aviso || "";
    $("#teo-aviso-reanudar").classList.toggle("hidden", !aviso);
    const elegida = intento.respuestas[intento.i];
    $("#teo-opciones").innerHTML = p.orden.map((orig, k) => `
      <button type="button" class="teo-opcion${elegida === orig ? " elegida" : ""}" data-orig="${orig}">
        <span class="teo-letra">${LETRAS[k]}</span>
        <span>${PruebasComun.esc(p.opciones[orig])}</span>
      </button>`).join("");
    $("#btn-teo-siguiente").disabled = elegida == null;
    $("#btn-teo-siguiente").textContent = intento.i === total - 1 ? "Terminar y calificar" : "Siguiente →";
    $("#btn-teo-anterior").classList.toggle("hidden", intento.i === 0);
    showView("view-teorica-pregunta");
  }

  function elegir(orig) {
    if (!intento || calificando) return;
    intento.respuestas[intento.i] = orig;
    guardarEnCurso();
    $all("#teo-opciones .teo-opcion").forEach((b) => b.classList.toggle("elegida", Number(b.dataset.orig) === orig));
    $("#btn-teo-siguiente").disabled = false;
  }

  function siguiente() {
    if (!intento || intento.respuestas[intento.i] == null) return;
    if (intento.i < intento.preguntas.length - 1) {
      intento.i++;
      guardarEnCurso();
      mostrarPregunta();
    } else {
      calificar(false);
    }
  }

  function anterior() {
    if (intento && intento.i > 0) {
      intento.i--;
      guardarEnCurso();
      mostrarPregunta();
    }
  }

  // Salir antes de terminar = entregar con lo respondido (así no se puede reiniciar el reloj)
  function entregarAhora() {
    if (!intento) return irAPrueba();
    const faltan = intento.preguntas.length - intento.respuestas.filter((x) => x != null).length;
    const aviso = faltan
      ? `¿Entregar la evaluación ahora? Tienes ${faltan} pregunta${faltan > 1 ? "s" : ""} sin responder, que contarán como incorrectas.`
      : "¿Entregar la evaluación ahora?";
    if (confirm(aviso)) calificar(false);
  }

  /* ---------- Calificación ---------- */

  async function calificar(porTiempo) {
    if (!intento || calificando) return;
    calificando = true;
    clearInterval(reloj);
    const agotado = porTiempo || restanteMs() <= 0;
    const ensayos = intento.preguntas.map((p, k) => {
      const resp = intento.respuestas[k];
      const elegida = resp == null ? "" : LETRAS[resp];
      return {
        n: p.n,
        tema: p.tema,
        pregunta: p.enunciado,
        elegida,
        elegida_texto: resp == null ? "(sin responder)" : p.opciones[resp],
        correcta: p.correcta,
        correcto: elegida === p.correcta
      };
    });
    const correctas = ensayos.filter((e) => e.correcto).length;
    const sinResponder = ensayos.filter((e) => e.elegida === "").length;
    const puntaje = Math.round((correctas / ensayos.length) * 100);
    // Temas con al menos un error, ordenados por cantidad de errores
    const errores = {};
    ensayos.filter((e) => !e.correcto).forEach((e) => { errores[e.tema] = (errores[e.tema] || 0) + 1; });
    const temas = Object.keys(errores).sort((a, b) => errores[b] - errores[a]);
    const recomendaciones = temas.map((t) => `${TEORICA_TEMAS[t].nombre}: ${TEORICA_TEMAS[t].rec}`);
    const duracion = Math.round(Math.min(Date.now() - intento.inicio.getTime(), limiteMs()) / 1000);
    const resumen = {
      preguntas: ensayos.length,
      correctas,
      puntaje_pct: puntaje,
      duracion_seg: duracion,
      temas_a_reforzar: temas.map((t) => TEORICA_TEMAS[t].nombre).join(", "),
      recomendaciones: recomendaciones.join(" | "),
      dentro_referencia: puntaje >= TEORICA_CONFIG.APROBACION_PCT,
      tiempo_limite_min: TEORICA_CONFIG.TIEMPO_MAX_MIN,
      tiempo_agotado: agotado,
      sin_responder: sinResponder,
      salidas_app: intento.salidas
    };
    const r = PruebasComun.crearResultado("teorica", intento.inicio, resumen, ensayos);
    ultimo = { r, temas };
    intento = null;
    borrarEnCurso();
    PruebasComun.enCurso(false);
    mostrarResultado("Guardando…");
    await PruebasComun.registrar(r);
    calificando = false;
    mostrarResultado();
  }

  function mostrarResultado(estado) {
    const { r, temas } = ultimo;
    const s = r.resumen;
    const esc = PruebasComun.esc;
    const nivel = $("#teo-nivel");
    nivel.textContent = s.dentro_referencia ? `✓ Aprobado · ${s.puntaje_pct}%` : `No aprobado · ${s.puntaje_pct}%`;
    nivel.className = `nivel ${s.dentro_referencia ? "ok" : "alerta"}`;
    $("#teo-detalle").textContent = `${s.correctas} de ${s.preguntas} respuestas correctas · se aprueba con ${TEORICA_CONFIG.APROBACION_PCT}%.`;

    const notas = [];
    if (s.tiempo_agotado) notas.push(`⏱ Se acabó el tiempo (${s.tiempo_limite_min} min). ${s.sin_responder ? `${s.sin_responder} pregunta${s.sin_responder > 1 ? "s quedaron" : " quedó"} sin responder y cuenta${s.sin_responder > 1 ? "n" : ""} como incorrecta${s.sin_responder > 1 ? "s" : ""}.` : ""}`);
    else if (s.sin_responder) notas.push(`${s.sin_responder} pregunta${s.sin_responder > 1 ? "s" : ""} sin responder.`);
    if (s.salidas_app) notas.push(`Saliste de la app ${s.salidas_app} ${s.salidas_app === 1 ? "vez" : "veces"} durante la evaluación (queda registrado).`);
    $("#teo-notas").innerHTML = notas.map((t) => `<p>${esc(t)}</p>`).join("");
    $("#teo-notas").classList.toggle("hidden", !notas.length);

    const malas = r.ensayos.filter((e) => !e.correcto);
    const banco = Object.fromEntries(TEORICA_PREGUNTAS.map((p) => [p.n, p]));
    $("#teo-repaso").innerHTML = malas.length
      ? `<h2>Repasa estas preguntas</h2>` + malas.map((e) => {
          const p = banco[e.n];
          return `
            <div class="teo-repaso-item">
              <p class="teo-repaso-pregunta">${esc(p.enunciado)}</p>
              <p class="teo-mal">✗ ${e.elegida ? `Respondiste: ${esc(e.elegida_texto)}` : "Sin responder"}</p>
              <p class="teo-bien">✓ Correcta: ${esc(p.opciones[LETRAS.indexOf(p.correcta)])}</p>
              <p class="texto-ayuda">${esc(p.retro)} <em>(${esc(p.ref)})</em></p>
            </div>`;
        }).join("")
      : `<p class="teo-bien">¡Todas tus respuestas fueron correctas!</p>`;

    $("#teo-recomendaciones").innerHTML = temas.length
      ? `<div class="recomendaciones"><h2>Temas a reforzar</h2><ul>${temas.map((t) =>
          `<li><strong>${esc(TEORICA_TEMAS[t].nombre)}.</strong> ${esc(TEORICA_TEMAS[t].rec)}</li>`).join("")}</ul></div>`
      : PruebasComun.listaRecomendaciones(["Excelente conocimiento de las normas y buenas prácticas. Sigue aplicándolas en cada recorrido."]);

    const envio = estado ? { texto: estado, ok: false } : PruebasComun.textoEnvio(r.id);
    $("#teo-envio").textContent = envio.texto;
    $("#teo-envio").className = `estado-envio ${envio.ok ? "ok" : ""}`;
    showView("view-teorica-resultado");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#btn-teo-comenzar").addEventListener("click", comenzar);
    $("#btn-teo-volver").addEventListener("click", irAPrueba);
    $("#teo-opciones").addEventListener("click", (e) => {
      const b = e.target.closest(".teo-opcion");
      if (b) elegir(Number(b.dataset.orig));
    });
    $("#btn-teo-siguiente").addEventListener("click", siguiente);
    $("#btn-teo-anterior").addEventListener("click", anterior);
    $("#btn-teo-salir").addEventListener("click", entregarAhora);
    $("#btn-teo-repetir").addEventListener("click", comenzar);
    $("#btn-teo-fin").addEventListener("click", irAPrueba);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
  });

  // ¿Hay una evaluación sin terminar de este conductor?
  const hayPendiente = () => !!recuperarEnCurso();

  return { abrir, hayPendiente };
})();
