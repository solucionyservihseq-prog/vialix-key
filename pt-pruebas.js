/* ============================================================
   VIALIX PSICOTEST - Las tres pruebas psicomotrices
   ------------------------------------------------------------
   Cada prueba dibuja en un <canvas> a pantalla completa, escucha
   los toques (pointer events, multitáctil) y al terminar llama a
   fin({ resumen, ensayos }).

   Tiempos: se usa el reloj de alta precisión del navegador
   (performance.now y event.timeStamp, en milisegundos). El momento
   del estímulo se toma cuando realmente se pinta en pantalla.
   ============================================================ */

const Pruebas = (() => {
  const COLOR = {
    fondo: "#14201B",
    panel: "#1E2E27",
    texto: "#FFFFFF",
    suave: "#9FB3AA",
    verde: "#2ECC71",
    rojo: "#E74C3C",
    amarillo: "#F5C518",
    apagado: "#33443C",
    camino: "#3B5249",
    borde: "#F5C518",
    bolita: "#FF8C2B",
    tunel: "#0B0F0D"
  };

  /* ---------- Utilidades ---------- */

  const ahora = () => performance.now();
  const azar = (min, max) => min + Math.random() * (max - min);
  const r0 = (v) => Math.round(v);
  const r1 = (v) => Math.round(v * 10) / 10;

  function barajar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  }

  function estadisticos(valores) {
    if (!valores.length) return { media: null, mediana: null, desv: null, min: null, max: null };
    const v = [...valores].sort((a, b) => a - b);
    const media = v.reduce((s, x) => s + x, 0) / v.length;
    const desv = Math.sqrt(v.reduce((s, x) => s + (x - media) ** 2, 0) / v.length);
    const mitad = Math.floor(v.length / 2);
    const mediana = v.length % 2 ? v[mitad] : (v[mitad - 1] + v[mitad]) / 2;
    return { media: r0(media), mediana: r0(mediana), desv: r0(desv), min: r0(v[0]), max: r0(v[v.length - 1]) };
  }

  // Momento del toque en el mismo reloj que performance.now()
  function momentoToque(e) {
    const t = e.timeStamp;
    return t > 0 && Math.abs(t - ahora()) < 1000 ? t : ahora();
  }

  // Canvas nítido en pantallas de alta densidad; se ajusta si gira el celular
  function crearLienzo(canvas) {
    const L = { ctx: canvas.getContext("2d"), w: 0, h: 0 };
    const ajustar = () => {
      const dpr = window.devicePixelRatio || 1;
      L.w = canvas.clientWidth;
      L.h = canvas.clientHeight;
      canvas.width = Math.round(L.w * dpr);
      canvas.height = Math.round(L.h * dpr);
      L.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    L.liberar = () => window.removeEventListener("resize", ajustar);
    return L;
  }

  function texto(ctx, t, x, y, { tam = 18, color = COLOR.texto, peso = 700, alin = "center" } = {}) {
    ctx.fillStyle = color;
    ctx.font = `${peso} ${tam}px -apple-system, Roboto, Arial, sans-serif`;
    ctx.textAlign = alin;
    ctx.textBaseline = "middle";
    ctx.fillText(t, x, y);
  }

  function circulo(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Esqueleto común: bucle de dibujo, toques y limpieza al terminar
  function ejecutar(canvas, { dibujar, tocar, mover, soltar }) {
    const L = crearLienzo(canvas);
    let activo = true;
    let raf = 0;
    const cuadro = (t) => {
      if (!activo) return;
      dibujar(L, t);
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
    const abajo = (e) => { e.preventDefault(); tocar && tocar(e, L); };
    const mov = (e) => { e.preventDefault(); mover && mover(e, L); };
    const arriba = (e) => { soltar && soltar(e, L); };
    canvas.addEventListener("pointerdown", abajo);
    canvas.addEventListener("pointermove", mov);
    canvas.addEventListener("pointerup", arriba);
    canvas.addEventListener("pointercancel", arriba);
    return {
      L,
      detener() {
        activo = false;
        cancelAnimationFrame(raf);
        canvas.removeEventListener("pointerdown", abajo);
        canvas.removeEventListener("pointermove", mov);
        canvas.removeEventListener("pointerup", arriba);
        canvas.removeEventListener("pointercancel", arriba);
        L.liberar();
      }
    };
  }

  /* ============================================================
     1. TIEMPOS DE REACCIÓN MÚLTIPLE
     Se enciende una de tres luces. Verde → ACELERAR (derecha),
     roja → FRENAR (izquierda), amarilla → no tocar.
     ============================================================ */

  function reaccion(canvas, fin) {
    const C = PSICOTEST_CONFIG.REACCION;
    const nNo = Math.round(C.ESTIMULOS * C.PROPORCION_NO_PRESIONAR);
    const nGo = C.ESTIMULOS - nNo;
    const secuencia = barajar([
      ...Array.from({ length: nGo }, (_, i) => (i % 2 ? "frenar" : "acelerar")),
      ...Array.from({ length: nNo }, () => "no_tocar")
    ]);

    const ensayos = [];
    let i = -1;
    let fase = "espera";     // espera | estimulo | retro | fin
    let actual = null;       // { tipo, pos, t0 }
    let timer = null;
    let anticipadas = 0;
    let destello = null;     // { ok, hasta }
    let pulsado = null;      // { lado, hasta }

    function siguiente() {
      i++;
      if (i >= secuencia.length) return terminar();
      fase = "espera";
      actual = null;
      timer = setTimeout(mostrar, azar(C.ESPERA_MIN_MS, C.ESPERA_MAX_MS));
    }

    function mostrar() {
      actual = { tipo: secuencia[i], pos: Math.floor(Math.random() * 3), t0: null };
      fase = "estimulo";
      const limite = actual.tipo === "no_tocar" ? C.DURACION_NO_PRESIONAR_MS : C.LIMITE_RESPUESTA_MS;
      timer = setTimeout(vencido, limite);
    }

    function vencido() {
      if (actual.tipo === "no_tocar") registrar({ resultado: "inhibicion_correcta", correcto: true, tiempo_ms: null });
      else registrar({ resultado: "omision", correcto: false, tiempo_ms: null });
    }

    function registrar(r) {
      clearTimeout(timer);
      ensayos.push({ n: i + 1, estimulo: actual.tipo, posicion: actual.pos + 1, ...r });
      destello = { ok: r.correcto, hasta: ahora() + 220 };
      actual = null;
      fase = "retro";
      timer = setTimeout(siguiente, 350);
    }

    function terminar() {
      fase = "fin";
      clearTimeout(timer);
      motor.detener();
      const go = ensayos.filter((e) => e.estimulo !== "no_tocar");
      const correctas = go.filter((e) => e.resultado === "correcta");
      const est = estadisticos(correctas.map((e) => e.tiempo_ms));
      const contar = (res) => ensayos.filter((e) => e.resultado === res).length;
      const resumen = {
        estimulos: ensayos.length,
        correctas: correctas.length,
        tiempo_medio_ms: est.media,
        tiempo_mediana_ms: est.mediana,
        desviacion_ms: est.desv,
        tiempo_min_ms: est.min,
        tiempo_max_ms: est.max,
        boton_equivocado: contar("boton_equivocado"),
        omisiones: contar("omision"),
        no_inhibio: contar("no_inhibio"),
        anticipadas
      };
      resumen.errores_totales = resumen.boton_equivocado + resumen.omisiones + resumen.no_inhibio + resumen.anticipadas;
      resumen.dentro_referencia = est.media != null && est.media <= C.REF_TIEMPO_MEDIO_MS && resumen.errores_totales <= C.REF_ERRORES_MAX;
      fin({ resumen, ensayos });
    }

    const motor = ejecutar(canvas, {
      dibujar(L) {
        const { ctx, w, h } = L;
        const t = ahora();
        ctx.fillStyle = COLOR.fondo;
        ctx.fillRect(0, 0, w, h);

        // Zonas de respuesta (mitad izquierda / derecha)
        const yZona = h * 0.52;
        const altoZona = h - yZona;
        const zona = (x, color, etiqueta, lado) => {
          const activo = pulsado && pulsado.lado === lado && t < pulsado.hasta;
          ctx.globalAlpha = activo ? 0.95 : 0.55;
          ctx.fillStyle = color;
          ctx.fillRect(x + 8, yZona, w / 2 - 16, altoZona - 10);
          ctx.globalAlpha = 1;
          texto(ctx, etiqueta, x + w / 4, yZona + altoZona / 2, { tam: Math.min(34, w / 12), peso: 800 });
        };
        zona(0, COLOR.rojo, "FRENAR", "frenar");
        zona(w / 2, COLOR.verde, "ACELERAR", "acelerar");

        // Semáforo de tres luces
        const rLuz = Math.min(w / 10, h * 0.13);
        const yLuz = h * 0.27;
        ctx.fillStyle = COLOR.panel;
        ctx.fillRect(w / 2 - rLuz * 4.2, yLuz - rLuz * 1.4, rLuz * 8.4, rLuz * 2.8);
        for (let k = 0; k < 3; k++) {
          const x = w / 2 + (k - 1) * rLuz * 2.7;
          let color = COLOR.apagado;
          if (actual && actual.pos === k) {
            color = actual.tipo === "acelerar" ? COLOR.verde : actual.tipo === "frenar" ? COLOR.rojo : COLOR.amarillo;
          }
          circulo(ctx, x, yLuz, rLuz, color);
        }
        // El estímulo cuenta desde el primer cuadro en que se pinta
        if (actual && actual.t0 == null) actual.t0 = ahora();

        texto(ctx, `${Math.min(i + 1, secuencia.length)} / ${secuencia.length}`, w / 2, h * 0.06, { tam: 15, color: COLOR.suave, peso: 600 });
        texto(ctx, "Verde: acelerar · Roja: frenar · Amarilla: no tocar", w / 2, h * 0.46, { tam: Math.min(15, w / 28), color: COLOR.suave, peso: 600 });

        if (destello && t < destello.hasta) {
          ctx.strokeStyle = destello.ok ? COLOR.verde : COLOR.rojo;
          ctx.lineWidth = 8;
          ctx.strokeRect(4, 4, w - 8, h - 8);
        }
      },
      tocar(e, L) {
        if (fase === "fin") return;
        const lado = e.offsetX < L.w / 2 ? "frenar" : "acelerar";
        pulsado = { lado, hasta: ahora() + 150 };
        if (fase === "espera") {
          // Tocó antes de que apareciera la luz
          anticipadas++;
          ensayos.push({ n: i + 1, estimulo: "ninguno", posicion: null, resultado: "anticipada", correcto: false, tiempo_ms: null });
          destello = { ok: false, hasta: ahora() + 220 };
          return;
        }
        if (fase !== "estimulo" || !actual || actual.t0 == null) return;
        const rt = r0(momentoToque(e) - actual.t0);
        if (actual.tipo === "no_tocar") registrar({ resultado: "no_inhibio", correcto: false, tiempo_ms: rt });
        else if (lado === actual.tipo) registrar({ resultado: "correcta", correcto: true, tiempo_ms: rt });
        else registrar({ resultado: "boton_equivocado", correcto: false, tiempo_ms: rt });
      }
    });

    siguiente();
    return { detener() { clearTimeout(timer); fase = "fin"; motor.detener(); } };
  }

  /* ============================================================
     2. COORDINACIÓN BIMANUAL
     Dos caminos que se mueven hacia abajo. Cada pulgar arrastra su
     bolita (movimiento relativo: el dedo no tapa la bolita).
     ============================================================ */

  function bimanual(canvas, fin) {
    const C = PSICOTEST_CONFIG.BIMANUAL;
    const medio = C.ANCHO_CAMINO / 2;
    const A = C.AMPLITUD_CURVAS;
    const VENTANA = 1;        // pantallas de camino visibles por delante
    const lados = ["izq", "der"].map(() => ({
      u: 0,                   // posición de la bolita: fracción del carril (−0,5 a 0,5)
      dedo: null, xPrevio: 0,
      fase1: azar(0, Math.PI * 2), fase2: azar(0, Math.PI * 2),
      f1: azar(0.45, 0.65), f2: azar(1.0, 1.3),
      dentro: true, tDentro: 0, desv: 0, salidas: 0
    }));

    const centro = (lado, s) => A * (0.6 * Math.sin(2 * Math.PI * lado.f1 * s + lado.fase1) +
                                     0.4 * Math.sin(2 * Math.PI * lado.f2 * s + lado.fase2));
    // Arranca con cada bolita sobre su camino
    lados.forEach((l) => { l.u = centro(l, 0); });

    const ensayos = [];
    let fase = "esperando";   // esperando | cuenta | corriendo | fin
    let tCuenta = 0;
    let tInicio = 0;
    let tPrevio = 0;
    let s = 0;                // distancia recorrida (pantallas)
    let total = 0;            // segundos medidos

    function terminar() {
      fase = "fin";
      motor.detener();
      const pct = (l) => (total > 0 ? r1((l.tDentro / total) * 100) : 0);
      const [iz, de] = lados;
      const resumen = {
        duracion_seg: r1(total),
        pct_dentro_izq: pct(iz),
        pct_dentro_der: pct(de),
        pct_dentro_total: r1((pct(iz) + pct(de)) / 2),
        salidas_izq: iz.salidas,
        salidas_der: de.salidas,
        salidas_totales: iz.salidas + de.salidas,
        desviacion_media_pct: total > 0 ? r1(((iz.desv + de.desv) / 2 / total) * 100) : 0
      };
      resumen.dentro_referencia = resumen.pct_dentro_total >= C.REF_PCT_DENTRO && resumen.salidas_totales <= C.REF_SALIDAS_MAX;
      fin({ resumen, ensayos });
    }

    const motor = ejecutar(canvas, {
      dibujar(L) {
        const { ctx, w, h } = L;
        const t = ahora();
        const anchoCarril = w / 2;
        const yBolita = h * 0.8;
        const rBolita = Math.max(9, Math.min(anchoCarril * 0.045, 18));

        // Avance del tiempo y medición
        if (fase === "cuenta" && t - tCuenta >= 3000) {
          fase = "corriendo";
          tInicio = tPrevio = t;
        }
        if (fase === "corriendo") {
          const dt = Math.min(0.05, (t - tPrevio) / 1000);   // si se congela la pantalla, no saltar
          tPrevio = t;
          const avance = Math.min(1, (t - tInicio) / 1000 / C.DURACION_SEG);
          s += (C.VELOCIDAD_INICIAL + (C.VELOCIDAD_FINAL - C.VELOCIDAD_INICIAL) * avance) * dt;
          total += dt;
          lados.forEach((l, k) => {
            const dif = Math.abs(l.u - centro(l, s));
            const dentro = dif <= medio;
            if (dentro) l.tDentro += dt;
            l.desv += Math.min(1, dif / medio) * dt;
            if (l.dentro && !dentro) {
              l.salidas++;
              ensayos.push({ n: ensayos.length + 1, lado: k === 0 ? "izquierda" : "derecha", segundo: r1(total), resultado: "salida" });
            }
            l.dentro = dentro;
          });
          if (avance >= 1) return terminar();
        }

        // Dibujo
        ctx.fillStyle = COLOR.fondo;
        ctx.fillRect(0, 0, w, h);
        lados.forEach((l, k) => {
          const x0 = k * anchoCarril;
          const xDe = (u) => x0 + anchoCarril * (0.5 + u);
          ctx.beginPath();
          const paso = 8;
          for (let y = 0; y <= h; y += paso) {
            const c = centro(l, s + ((yBolita - y) / h) * VENTANA);
            y === 0 ? ctx.moveTo(xDe(c - medio), y) : ctx.lineTo(xDe(c - medio), y);
          }
          for (let y = h; y >= 0; y -= paso) {
            const c = centro(l, s + ((yBolita - y) / h) * VENTANA);
            ctx.lineTo(xDe(c + medio), y);
          }
          ctx.closePath();
          ctx.fillStyle = COLOR.camino;
          ctx.fill();
          ctx.strokeStyle = COLOR.borde;
          ctx.lineWidth = 2;
          ctx.stroke();
          const dentro = Math.abs(l.u - centro(l, s)) <= medio;
          circulo(ctx, xDe(l.u), yBolita, rBolita, dentro ? COLOR.verde : COLOR.rojo);
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        ctx.fillStyle = "#FFFFFF33";
        ctx.fillRect(w / 2 - 1, 0, 2, h);

        if (fase === "esperando") {
          ctx.fillStyle = "#000000AA";
          ctx.fillRect(0, h * 0.3, w, h * 0.28);
          texto(ctx, "Pon un pulgar en cada lado de la pantalla", w / 2, h * 0.4, { tam: Math.min(20, w / 22) });
          const listos = lados.filter((l) => l.dedo != null).length;
          texto(ctx, `${listos} de 2 pulgares listos`, w / 2, h * 0.49, { tam: 15, color: COLOR.amarillo });
        } else if (fase === "cuenta") {
          const n = 3 - Math.floor((t - tCuenta) / 1000);
          texto(ctx, String(Math.max(1, n)), w / 2, h * 0.42, { tam: 72, peso: 800 });
        } else if (fase === "corriendo") {
          const resta = Math.max(0, C.DURACION_SEG - total);
          texto(ctx, `${Math.ceil(resta)} s`, w / 2, 22, { tam: 16, color: COLOR.suave });
          texto(ctx, `Salidas: ${lados[0].salidas}`, w * 0.25, 22, { tam: 14, color: COLOR.suave });
          texto(ctx, `Salidas: ${lados[1].salidas}`, w * 0.75, 22, { tam: 14, color: COLOR.suave });
        }
      },
      tocar(e, L) {
        const k = e.offsetX < L.w / 2 ? 0 : 1;
        const l = lados[k];
        if (l.dedo != null && l.dedo !== e.pointerId) return;
        l.dedo = e.pointerId;
        l.xPrevio = e.offsetX;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
        if (fase === "esperando" && lados.every((x) => x.dedo != null)) {
          fase = "cuenta";
          tCuenta = ahora();
        }
      },
      mover(e, L) {
        const l = lados.find((x) => x.dedo === e.pointerId);
        if (!l) return;
        const dx = e.offsetX - l.xPrevio;
        l.xPrevio = e.offsetX;
        l.u = Math.max(-0.5, Math.min(0.5, l.u + dx / (L.w / 2)));
      },
      soltar(e) {
        const l = lados.find((x) => x.dedo === e.pointerId);
        if (l) l.dedo = null;
      }
    });

    return { detener() { fase = "fin"; motor.detener(); } };
  }

  /* ============================================================
     3. ANTICIPACIÓN DE LA VELOCIDAD
     La bolita avanza a velocidad constante y entra a un túnel.
     Se toca la pantalla cuando debería empezar a salir.
     Error = momento del toque − momento real de salida
     (negativo = se adelantó, positivo = llegó tarde).
     ============================================================ */

  function anticipacion(canvas, fin) {
    const C = PSICOTEST_CONFIG.ANTICIPACION;
    const combinaciones = [];
    for (let k = 0; k < C.ENSAYOS; k++) {
      combinaciones.push({
        v: C.VELOCIDADES[k % C.VELOCIDADES.length],
        largo: C.LARGOS_TUNEL[Math.floor(k / C.VELOCIDADES.length) % C.LARGOS_TUNEL.length]
      });
    }
    barajar(combinaciones);

    const X0 = 0.04;          // inicio de la bolita (fracción del ancho)
    const FIN_TUNEL = 0.86;   // borde de salida del túnel
    const ensayos = [];
    let k = -1;
    let fase = "pausa";       // pausa | mov | retro | fin
    let ensayo = null;        // { v, largo, t0 }
    let tFase = ahora();
    let mensaje = "";

    // Tiempo (ms) desde que arranca hasta que el borde delantero llega a la salida
    const tiempoSalida = (en, L) => {
      const r = radio(L);
      return ((FIN_TUNEL * L.w - r - X0 * L.w) / (en.v * L.w)) * 1000;
    };
    const radio = (L) => Math.max(10, Math.min(L.w * 0.025, L.h * 0.06));

    function siguiente() {
      k++;
      if (k >= combinaciones.length) return terminar();
      ensayo = { ...combinaciones[k], t0: null };
      fase = "pausa";
      tFase = ahora();
      mensaje = "";
    }

    function registrar(errorMs, L) {
      const ms = errorMs == null ? null : r0(errorMs);
      ensayos.push({
        n: k + 1,
        velocidad: ensayo.v,
        largo_tunel: ensayo.largo,
        tiempo_oculto_ms: r0((ensayo.largo * L.w) / (ensayo.v * L.w) * 1000),
        error_ms: ms,
        resultado: ms == null ? "omision" : ms < 0 ? "anticipado" : "tardio"
      });
      mensaje = ms == null ? "No tocaste" : ms < 0 ? `Te adelantaste ${-ms} ms` : `Llegaste ${ms} ms tarde`;
      fase = "retro";
      tFase = ahora();
    }

    function terminar() {
      fase = "fin";
      motor.detener();
      const validos = ensayos.filter((e) => e.error_ms != null);
      const abs = validos.map((e) => Math.abs(e.error_ms));
      const media = (v) => (v.length ? r0(v.reduce((s, x) => s + x, 0) / v.length) : null);
      const resumen = {
        ensayos: ensayos.length,
        error_medio_abs_ms: media(abs),
        error_medio_ms: media(validos.map((e) => e.error_ms)),
        error_max_abs_ms: abs.length ? Math.max(...abs) : null,
        anticipados: ensayos.filter((e) => e.resultado === "anticipado").length,
        tardios: ensayos.filter((e) => e.resultado === "tardio").length,
        omisiones: ensayos.filter((e) => e.resultado === "omision").length
      };
      resumen.tendencia = resumen.error_medio_ms == null ? "" : resumen.error_medio_ms < -40 ? "se anticipa" : resumen.error_medio_ms > 40 ? "reacciona tarde" : "equilibrada";
      resumen.dentro_referencia = resumen.error_medio_abs_ms != null &&
        resumen.error_medio_abs_ms <= C.REF_ERROR_MEDIO_MS && resumen.omisiones <= C.REF_OMISIONES_MAX;
      fin({ resumen, ensayos });
    }

    const motor = ejecutar(canvas, {
      dibujar(L) {
        const { ctx, w, h } = L;
        const t = ahora();
        const r = radio(L);
        const y = h * 0.45;
        ctx.fillStyle = COLOR.fondo;
        ctx.fillRect(0, 0, w, h);
        if (!ensayo) return;

        if (fase === "pausa" && t - tFase > 1000) {
          fase = "mov";
          ensayo.t0 = null;
        }

        // Vía
        ctx.fillStyle = COLOR.panel;
        ctx.fillRect(0, y - r * 2, w, r * 4);
        ctx.strokeStyle = "#FFFFFF55";
        ctx.setLineDash([14, 12]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Bolita
        let x = X0 * w;
        if (fase === "mov" || fase === "retro") {
          if (ensayo.t0 == null) ensayo.t0 = t;
          x = X0 * w + ensayo.v * w * ((t - ensayo.t0) / 1000);
        }
        circulo(ctx, x, y, r, COLOR.bolita);

        // Túnel (tapa la bolita mientras pasa por dentro)
        const xIni = (FIN_TUNEL - ensayo.largo) * w;
        const xFin = FIN_TUNEL * w;
        ctx.fillStyle = COLOR.tunel;
        ctx.fillRect(xIni, y - r * 2.4, xFin - xIni, r * 4.8);
        ctx.strokeStyle = COLOR.amarillo;
        ctx.lineWidth = 3;
        ctx.strokeRect(xIni, y - r * 2.4, xFin - xIni, r * 4.8);
        texto(ctx, "TÚNEL", (xIni + xFin) / 2, y, { tam: 14, color: "#FFFFFF66" });

        // Omisión: no tocó a tiempo
        if (fase === "mov" && ensayo.t0 != null && t - ensayo.t0 > tiempoSalida(ensayo, L) + C.LIMITE_TARDE_MS) {
          registrar(null, L);
        }
        if (fase === "retro" && t - tFase > 1400) siguiente();

        texto(ctx, `${Math.min(k + 1, combinaciones.length)} / ${combinaciones.length}`, w / 2, h * 0.07, { tam: 15, color: COLOR.suave, peso: 600 });
        if (fase === "pausa") texto(ctx, "Atento…", w / 2, h * 0.75, { tam: 20, color: COLOR.suave });
        if (fase === "mov") texto(ctx, "Toca la pantalla cuando la bolita salga del túnel", w / 2, h * 0.75, { tam: Math.min(18, w / 26), color: COLOR.suave });
        if (fase === "retro") texto(ctx, mensaje, w / 2, h * 0.75, { tam: 22, color: COLOR.amarillo });
      },
      tocar(e, L) {
        if (fase !== "mov" || !ensayo || ensayo.t0 == null) return;
        registrar(momentoToque(e) - ensayo.t0 - tiempoSalida(ensayo, L), L);
      }
    });

    siguiente();
    return { detener() { fase = "fin"; motor.detener(); } };
  }

  /* ---------- Catálogo ---------- */

  const CATALOGO = {
    reaccion: {
      nombre: "Tiempos de reacción múltiple",
      icono: "🚦",
      horizontal: false,
      cuentaPropia: false,
      instrucciones: [
        "Arriba se enciende una de tres luces.",
        "Luz VERDE: toca el lado derecho (ACELERAR).",
        "Luz ROJA: toca el lado izquierdo (FRENAR).",
        "Luz AMARILLA: no toques nada.",
        "Responde lo más rápido que puedas sin equivocarte. No toques antes de que se encienda la luz."
      ],
      ejecutar: reaccion
    },
    bimanual: {
      nombre: "Coordinación bimanual",
      icono: "🎮",
      horizontal: true,
      cuentaPropia: true,
      instrucciones: [
        "Pon el celular en horizontal y sostenlo con las dos manos.",
        "Cada pulgar mueve una bolita: el izquierdo la de la izquierda y el derecho la de la derecha.",
        "Desliza el pulgar hacia los lados para mantener cada bolita dentro de su camino.",
        "Los caminos van cada uno por su lado y aceleran poco a poco. Dura " + PSICOTEST_CONFIG.BIMANUAL.DURACION_SEG + " segundos."
      ],
      ejecutar: bimanual
    },
    anticipacion: {
      nombre: "Anticipación de la velocidad",
      icono: "⏱️",
      horizontal: true,
      cuentaPropia: false,
      instrucciones: [
        "Pon el celular en horizontal.",
        "Una bolita avanza a velocidad constante y entra a un túnel donde deja de verse.",
        "Calcula su velocidad y toca la pantalla en el momento exacto en que creas que va a salir por el otro lado.",
        "Son " + PSICOTEST_CONFIG.ANTICIPACION.ENSAYOS + " intentos, con velocidades y túneles distintos."
      ],
      ejecutar: anticipacion
    }
  };

  /* ---------- Recomendaciones según el resultado ---------- */
  // Cada regla traduce un indicador a una conducta concreta en la vía.
  // Son pautas de autocuidado y formación, no un diagnóstico.

  function recomendaciones(id, r) {
    const C = PSICOTEST_CONFIG;
    const lista = [];
    if (id === "reaccion") {
      const R = C.REACCION;
      if (r.tiempo_medio_ms != null && r.tiempo_medio_ms > R.REF_TIEMPO_MEDIO_MS) {
        lista.push(`Tu tiempo de reacción (${r.tiempo_medio_ms} ms) está por encima de la referencia. Gana tiempo de respuesta: deja al menos 3 a 4 segundos de distancia con el vehículo de adelante y baja la velocidad en zonas urbanas.`);
      }
      if (r.desviacion_ms != null && r.desviacion_ms > 150) {
        lista.push("Tus tiempos cambian mucho de una luz a otra, señal de atención que va y viene. Duerme bien antes de conducir, haz pausas activas cada 2 horas y quita distractores (celular, radio alto).");
      }
      if (r.boton_equivocado >= 2) {
        lista.push(`Elegiste el botón equivocado ${r.boton_equivocado} veces. Ante algo inesperado, primero identifica y luego actúa; en intersecciones lleva el pie cerca del freno.`);
      }
      if (r.no_inhibio >= 1) {
        lista.push("Tocaste con la luz amarilla: tendencia a actuar por impulso. En semáforo amarillo prepárate para detenerte, no aceleres para pasar.");
      }
      if (r.anticipadas >= 2) {
        lista.push("Respondiste antes de que apareciera la luz. En la vía, confirma la señal o el espacio libre antes de arrancar o girar.");
      }
      if (r.omisiones >= 1) {
        lista.push(`No respondiste ${r.omisiones} ${r.omisiones === 1 ? "vez" : "veces"}: puede ser distracción o cansancio. Si te sientes fatigado, no conduzcas; descansa y repite la prueba.`);
      }
      if (!lista.length) lista.push("Reacción rápida y precisa. Mantén tus hábitos de descanso y conducción sin distracciones.");
    }
    if (id === "bimanual") {
      const B = C.BIMANUAL;
      if (r.pct_dentro_total < B.REF_PCT_DENTRO) {
        lista.push(`Mantuviste las bolitas en el camino el ${r.pct_dentro_total}% del tiempo. Conduce con las dos manos en el volante (posición 9 y 3) y evita manipular el celular, el radio o comer mientras conduces.`);
      }
      const dif = Math.abs(r.pct_dentro_izq - r.pct_dentro_der);
      if (dif >= 10) {
        const debil = r.pct_dentro_izq < r.pct_dentro_der ? "izquierda" : "derecha";
        lista.push(`Tu mano ${debil} tuvo menos control (${Math.min(r.pct_dentro_izq, r.pct_dentro_der)}% contra ${Math.max(r.pct_dentro_izq, r.pct_dentro_der)}%). Practica ejercicios de coordinación con esa mano y no sueltes el volante para hacer otras tareas.`);
      }
      if (r.salidas_totales > B.REF_SALIDAS_MAX) {
        lista.push(`Te saliste del camino ${r.salidas_totales} veces: corriges tarde. Mira más lejos hacia adelante para anticipar las curvas, en lugar de mirar justo frente al vehículo.`);
      }
      if (!lista.length) lista.push("Buena coordinación de las dos manos. Sigue conduciendo con ambas manos en el volante.");
    }
    if (id === "anticipacion") {
      const A = C.ANTICIPACION;
      if (r.error_medio_ms != null && r.error_medio_ms > 40) {
        lista.push("Tiendes a calcular que el objeto llega más tarde de lo real, es decir, subestimas su velocidad. Es el error más riesgoso al cruzar intersecciones o adelantar: deja márgenes más amplios y no adelantes si dudas.");
      } else if (r.error_medio_ms != null && r.error_medio_ms < -40) {
        lista.push("Tiendes a actuar antes de tiempo. En adelantamientos y maniobras, espera a confirmar la distancia y la velocidad reales del otro vehículo antes de decidir.");
      }
      if (r.error_medio_abs_ms != null && r.error_medio_abs_ms > A.REF_ERROR_MEDIO_MS) {
        lista.push(`Tu error medio (${r.error_medio_abs_ms} ms) supera la referencia. Aumenta la distancia de seguridad y reduce la velocidad: te da más margen cuando calculas mal la velocidad de otros.`);
      }
      if (r.omisiones > A.REF_OMISIONES_MAX) {
        lista.push(`No tocaste en ${r.omisiones} intentos. Mantén la atención en los objetos en movimiento y evita distracciones dentro del vehículo.`);
      }
      if (!lista.length) lista.push("Buena estimación de la velocidad. Mantén la distancia de seguridad para conservar ese margen.");
    }
    return lista;
  }

  return { CATALOGO, recomendaciones };
})();
