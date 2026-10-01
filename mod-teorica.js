/* ============================================================
   VIALIX KEY v1.7.0 - Evaluación teórica dentro de la app
   ------------------------------------------------------------
   Una pregunta por pantalla, calificación al final, repaso de las
   respuestas incorrectas y recomendaciones por tema. El resultado
   va a la hoja de PSICOTEST (pestañas Teorica y Teorica_Respuestas).
   ============================================================ */

const ModTeorica = (() => {
  const LETRAS = ["A", "B", "C", "D"];
  let intento = null;   // { preguntas, respuestas, i, inicio }
  let ultimo = null;

  function barajar(lista) {
    const v = [...lista];
    for (let i = v.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [v[i], v[j]] = [v[j], v[i]];
    }
    return v;
  }

  function abrir() {
    const r = PruebasComun.ultimos().teorica;
    $("#teo-ultimo").innerHTML = r
      ? `Último intento: <strong>${r.resumen.puntaje_pct}%</strong> · ${r.resumen.dentro_referencia ? "Aprobado" : "No aprobado"} · ${new Date(r.fecha).toLocaleString()}`
      : "";
    $("#teo-ultimo").classList.toggle("hidden", !r);
    $("#teo-aprobacion").textContent = TEORICA_CONFIG.APROBACION_PCT;
    $("#teo-total").textContent = TEORICA_PREGUNTAS.length;
    showView("view-teorica-intro");
  }

  function comenzar() {
    const base = TEORICA_CONFIG.MEZCLAR_PREGUNTAS ? barajar(TEORICA_PREGUNTAS) : TEORICA_PREGUNTAS;
    intento = {
      // orden: posición original (0–3) de cada opción en pantalla
      preguntas: base.map((p) => ({ ...p, orden: TEORICA_CONFIG.MEZCLAR_OPCIONES ? barajar([0, 1, 2, 3]) : [0, 1, 2, 3] })),
      respuestas: [],
      i: 0,
      inicio: new Date()
    };
    PruebasComun.enCurso(true);
    mostrarPregunta();
  }

  function mostrarPregunta() {
    const p = intento.preguntas[intento.i];
    const total = intento.preguntas.length;
    $("#teo-progreso-texto").textContent = `Pregunta ${intento.i + 1} de ${total}`;
    $("#teo-progreso-barra").style.width = `${(intento.i / total) * 100}%`;
    $("#teo-enunciado").textContent = p.enunciado;
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
    intento.respuestas[intento.i] = orig;
    $all("#teo-opciones .teo-opcion").forEach((b) => b.classList.toggle("elegida", Number(b.dataset.orig) === orig));
    $("#btn-teo-siguiente").disabled = false;
  }

  function siguiente() {
    if (intento.respuestas[intento.i] == null) return;
    if (intento.i < intento.preguntas.length - 1) {
      intento.i++;
      mostrarPregunta();
    } else {
      calificar();
    }
  }

  function anterior() {
    if (intento.i > 0) {
      intento.i--;
      mostrarPregunta();
    }
  }

  function cancelar() {
    if (intento && intento.respuestas.length && !confirm("¿Salir de la evaluación? Se perderán las respuestas de este intento.")) return;
    intento = null;
    PruebasComun.enCurso(false);
    irAPrueba();
  }

  async function calificar() {
    const ensayos = intento.preguntas.map((p, k) => {
      const elegida = LETRAS[intento.respuestas[k]];
      return {
        n: p.n,
        tema: p.tema,
        pregunta: p.enunciado,
        elegida,
        elegida_texto: p.opciones[intento.respuestas[k]],
        correcta: p.correcta,
        correcto: elegida === p.correcta
      };
    });
    const correctas = ensayos.filter((e) => e.correcto).length;
    const puntaje = Math.round((correctas / ensayos.length) * 100);
    // Temas con al menos un error, ordenados por cantidad de errores
    const errores = {};
    ensayos.filter((e) => !e.correcto).forEach((e) => { errores[e.tema] = (errores[e.tema] || 0) + 1; });
    const temas = Object.keys(errores).sort((a, b) => errores[b] - errores[a]);
    const recomendaciones = temas.map((t) => `${TEORICA_TEMAS[t].nombre}: ${TEORICA_TEMAS[t].rec}`);
    const resumen = {
      preguntas: ensayos.length,
      correctas,
      puntaje_pct: puntaje,
      duracion_seg: Math.round((Date.now() - intento.inicio.getTime()) / 1000),
      temas_a_reforzar: temas.map((t) => TEORICA_TEMAS[t].nombre).join(", "),
      recomendaciones: recomendaciones.join(" | "),
      dentro_referencia: puntaje >= TEORICA_CONFIG.APROBACION_PCT
    };
    const r = PruebasComun.crearResultado("teorica", intento.inicio, resumen, ensayos);
    ultimo = { r, temas };
    intento = null;
    PruebasComun.enCurso(false);
    mostrarResultado("Guardando…");
    await PruebasComun.registrar(r);
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

    const malas = r.ensayos.filter((e) => !e.correcto);
    const banco = Object.fromEntries(TEORICA_PREGUNTAS.map((p) => [p.n, p]));
    $("#teo-repaso").innerHTML = malas.length
      ? `<h2>Repasa estas preguntas</h2>` + malas.map((e) => {
          const p = banco[e.n];
          return `
            <div class="teo-repaso-item">
              <p class="teo-repaso-pregunta">${esc(p.enunciado)}</p>
              <p class="teo-mal">✗ Respondiste: ${esc(e.elegida_texto)}</p>
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
    $("#btn-teo-salir").addEventListener("click", cancelar);
    $("#btn-teo-repetir").addEventListener("click", comenzar);
    $("#btn-teo-fin").addEventListener("click", irAPrueba);
  });

  return { abrir };
})();
