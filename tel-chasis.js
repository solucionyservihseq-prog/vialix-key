/* ============================================================
   VIALIX KEY v1.8.0 - Telemetría del chasis (Perfil B: dos ruedas)
   ------------------------------------------------------------
   El celular va VERTICAL en el soporte del manubrio, con la pantalla
   hacia el conductor y la parte de arriba hacia arriba.

   Ejes del celular (W3C): X = derecha, Y = arriba, Z = sale de la
   pantalla (hacia el conductor). Adelante del vehículo ≈ −Z.

   1. Calibración (3 s quieto y derecho): se mide la gravedad para
      saber qué es "arriba" (u), "adelante" (f) y "derecha" (r) en
      los ejes del celular, aunque el soporte esté un poco inclinado.
   2. Cada lectura del sensor (~60 Hz, DeviceMotionEvent) se proyecta:
      - G longitudinal = aceleración · f  (+ acelera, − frena)
      - G lateral      = aceleración · r  (+ hacia la derecha)
      - Velocidad de giro (yaw) = rotación · u
      - Inclinación (roll) = integral de la rotación sobre f, corregida
        lentamente con la gravedad solo cuando va derecho. En una curva
        bien tomada el acelerómetro "no ve" la inclinación (la fuerza
        centrífuga la compensa), por eso se usa el giroscopio.
   3. Se detectan frenadas/aceleraciones bruscas, inclinación extrema,
      zigzag, impactos y caídas, y se guardan muestras a 25 Hz.

   Signos: inclinación + = hacia la derecha; G longitudinal + = acelerando.
   ============================================================ */

const Chasis = (() => {
  const G = 9.80665;
  const RAD = Math.PI / 180;
  const GRA = 180 / Math.PI;

  /* ---------- Vectores ---------- */
  const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norma = (a) => Math.hypot(a[0], a[1], a[2]);
  const escalar = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const unitario = (a) => { const n = norma(a) || 1; return escalar(a, 1 / n); };
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;

  /* ---------- Calibración ---------- */

  // lecturas: [{ accG: [x,y,z] }] con el vehículo quieto y derecho
  function calibrar(lecturas) {
    if (lecturas.length < 10) throw new Error("No llegaron suficientes datos del sensor para calibrar.");
    const suma = [0, 0, 0];
    lecturas.forEach((l) => { suma[0] += l.accG[0]; suma[1] += l.accG[1]; suma[2] += l.accG[2]; });
    const g0 = escalar(suma, 1 / lecturas.length);
    const modulo = norma(g0);
    if (modulo < 7 || modulo > 12.5) throw new Error("La lectura de gravedad no es estable. Deja el vehículo quieto y vuelve a calibrar.");
    // Por norma W3C, en reposo con el celular vertical Y ≈ +9,8. Algunos navegadores
    // (iPhone antiguos) entregan el signo contrario: se detecta y se corrige.
    const signo = g0[1] >= 0 ? 1 : -1;
    const u = unitario(escalar(g0, signo));
    if (Math.abs(u[2]) > 0.8) throw new Error("El celular parece estar acostado. Ponlo VERTICAL en el soporte, con la pantalla hacia ti.");
    const atras = [0, 0, 1];
    const fBruto = resta(escalar(atras, -1), escalar(u, punto(escalar(atras, -1), u)));
    const f = unitario(fBruto);
    const r = cruz(f, u);   // derecha
    return { u, f, r, signo, g0: modulo };
  }

  /* ---------- Procesador de eventos ---------- */

  function crearProcesador(C, calib, { alAlerta } = {}) {
    const { u, f, r, signo } = calib;
    const e = {
      t: null,
      gLong: 0, gLat: 0, yaw: 0, roll: 0,
      gravedad: escalar(u, G),          // gravedad filtrada en ejes del celular
      ventanaPico: 0,                   // g máximo desde la última muestra guardada
      eventos: [],
      ultimo: {},                       // último evento por tipo (antirrebote)
      frenada: null, aceleracion: null, inclinacion: null, caida: null,
      zig: [],                          // cambios de lado recientes
      rollMax: 0, rollMin: 0, gLongMax: 0, gLongMin: 0, gLatMax: 0, gPicoMax: 0,
      tInclinacion: 0, tTotal: 0
    };

    const filtro = (previo, nuevo, dt, tau) => previo + (nuevo - previo) * Math.min(1, dt / tau);

    function evento(tipo, t, valor, extra = {}) {
      if (t - (e.ultimo[tipo] ?? -Infinity) < C.ANTIRREBOTE_MS) return;
      e.ultimo[tipo] = t;
      const ev = { t: Math.round(t), tipo, valor: r2(valor), ...extra };
      e.eventos.push(ev);
      if ((tipo === "caida" || tipo === "impacto") && alAlerta) alAlerta(ev);
    }

    // l: { t (ms), acc: [x,y,z] sin gravedad o null, accG: [x,y,z], rot: [x,y,z] °/s }
    function procesar(l) {
      const dt = e.t == null ? 0 : Math.min(0.1, Math.max(0, (l.t - e.t) / 1000));
      e.t = l.t;
      const accG = escalar(l.accG, signo);
      const w = l.rot;   // °/s en ejes X, Y, Z
      // Gravedad en ejes del celular: gira con el giroscopio (la gravedad está fija en el
      // mundo, así que en ejes del celular gira al revés) y solo se corrige con el
      // acelerómetro cuando este mide ~1 g, es decir, cuando no hay frenadas ni curvas.
      if (dt > 0) {
        e.gravedad = resta(e.gravedad, escalar(cruz(escalar(w, RAD), e.gravedad), dt));
        if (Math.abs(norma(accG) - G) / G < 0.08) e.gravedad = e.gravedad.map((g, i) => filtro(g, accG[i], dt, 1));
        e.gravedad = escalar(unitario(e.gravedad), G);
      }
      // Aceleración lineal: la del navegador o, si no la entrega, acc con gravedad − gravedad filtrada
      const lin = l.acc ? escalar(l.acc, signo) : resta(accG, e.gravedad);

      // Valores instantáneos y filtrados (quitan la vibración del motor y del manubrio)
      const gPico = norma(lin) / G;
      e.ventanaPico = Math.max(e.ventanaPico, gPico);
      e.gPicoMax = Math.max(e.gPicoMax, gPico);
      e.gLong = filtro(e.gLong, punto(lin, f) / G, dt, 0.2);
      e.gLat = filtro(e.gLat, punto(lin, r) / G, dt, 0.2);
      e.yaw = filtro(e.yaw, punto(w, u), dt, 0.1);

      // Inclinación: giroscopio + corrección lenta con la gravedad cuando va derecho
      e.roll += punto(w, f) * dt;
      const derecho = Math.abs(e.yaw) < 5 && Math.abs(e.gLat) < 0.08 && Math.abs(e.gLong) < 0.1;
      if (derecho || Math.abs(e.roll) > 60) {
        const rollGravedad = Math.atan2(-punto(e.gravedad, r), punto(e.gravedad, u)) * GRA;
        e.roll = filtro(e.roll, rollGravedad, dt, derecho ? 3 : 1);
      }

      if (dt === 0) return e;
      const t = l.t;
      e.tTotal += dt;
      e.rollMax = Math.max(e.rollMax, e.roll);
      e.rollMin = Math.min(e.rollMin, e.roll);
      e.gLongMax = Math.max(e.gLongMax, e.gLong);
      e.gLongMin = Math.min(e.gLongMin, e.gLong);
      e.gLatMax = Math.max(e.gLatMax, Math.abs(e.gLat));

      // Frenada / aceleración brusca: sostenidas DURACION_MIN_MS
      const tramo = (clave, activo, valor, tipo) => {
        if (activo) {
          if (!e[clave]) e[clave] = { desde: t, pico: valor };
          else e[clave].pico = Math.max(e[clave].pico, valor);
        } else if (e[clave]) {
          if (t - e[clave].desde >= C.DURACION_MIN_MS) evento(tipo, e[clave].desde, e[clave].pico, { duracion_ms: Math.round(t - e[clave].desde) });
          e[clave] = null;
        }
      };
      tramo("frenada", e.gLong < -C.FRENADA_G, -e.gLong, "frenada_brusca");
      tramo("aceleracion", e.gLong > C.ACELERACION_G, e.gLong, "aceleracion_brusca");

      // Inclinación extrema en curva
      const absRoll = Math.abs(e.roll);
      if (absRoll > C.INCLINACION_MAX_GRADOS && absRoll < C.CAIDA_INCLINACION_GRADOS) {
        e.tInclinacion += dt;
        if (!e.inclinacion) e.inclinacion = { desde: t, pico: e.roll };
        else if (absRoll > Math.abs(e.inclinacion.pico)) e.inclinacion.pico = e.roll;
      } else if (e.inclinacion) {
        if (t - e.inclinacion.desde >= C.INCLINACION_MIN_MS) {
          evento("inclinacion_extrema", e.inclinacion.desde, Math.abs(e.inclinacion.pico), { lado: e.inclinacion.pico > 0 ? "derecha" : "izquierda" });
        }
        e.inclinacion = null;
      }

      // Zigzag: giros rápidos alternados con fuerza lateral
      if (Math.abs(e.yaw) > C.ZIGZAG_VEL_GIRO_GPS && Math.abs(e.gLat) > C.ZIGZAG_ACEL_LATERAL_G) {
        const lado = Math.sign(e.yaw);
        const ult = e.zig[e.zig.length - 1];
        if (!ult || ult.lado !== lado) e.zig.push({ t, lado });
      }
      e.zig = e.zig.filter((z) => t - z.t <= C.ZIGZAG_VENTANA_MS);
      if (e.zig.length >= C.ZIGZAG_CAMBIOS) {
        evento("zigzag", e.zig[0].t, e.zig.length);
        e.zig = [];
      }

      // Impacto: pico extremo de fuerza G
      if (gPico > C.IMPACTO_G) evento("impacto", t, gPico);

      // Caída: queda acostado de lado
      if (absRoll >= C.CAIDA_INCLINACION_GRADOS) {
        if (!e.caida) e.caida = { desde: t, registrada: false };
        if (!e.caida.registrada && t - e.caida.desde >= C.CAIDA_MIN_MS) {
          e.caida.registrada = true;
          evento("caida", e.caida.desde, absRoll, { lado: e.roll > 0 ? "derecha" : "izquierda" });
        }
      } else if (absRoll < 30) {
        e.caida = null;
      }
      return e;
    }

    // Valor para la muestra guardada (y reinicia el pico de la ventana)
    function muestra(tRel) {
      const fila = [Math.round(tRel), r2(e.gLong), r2(e.gLat), r1(e.roll), r1(e.yaw), r2(e.ventanaPico)];
      e.ventanaPico = 0;
      return fila;
    }

    // ¿Toca guardar muestra? Reloj fijo a FRECUENCIA_MUESTREO_HZ aunque el sensor llegue a otro ritmo
    let proxima = null;
    function tocaMuestra(t) {
      const periodo = 1000 / C.FRECUENCIA_MUESTREO_HZ;
      if (proxima == null || t - proxima > periodo * 5) proxima = t;   // primer dato o pausa larga
      if (t < proxima) return false;
      proxima += periodo;
      return true;
    }

    return { procesar, muestra, tocaMuestra, estado: () => e };
  }

  /* ---------- Sensor (DeviceMotionEvent) ---------- */

  let oyente = null;
  let demoTimer = null;

  function disponible() {
    return "DeviceMotionEvent" in window;
  }

  async function pedirPermiso() {
    try {
      if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function") {
        return (await DeviceMotionEvent.requestPermission()) === "granted";
      }
      return true;
    } catch (err) {
      console.warn("Permiso de movimiento rechazado:", err);
      return false;
    }
  }

  // Entrega cada lectura a "alLeer". Devuelve true si llegan datos.
  function iniciar({ modoDemo = false, alLeer }) {
    detener();
    if (modoDemo) {
      iniciarDemo(alLeer);
      return Promise.resolve(true);
    }
    if (!disponible()) return Promise.resolve(false);
    return new Promise((resolve) => {
      let recibido = false;
      oyente = (ev) => {
        const ag = ev.accelerationIncludingGravity;
        if (!ag || ag.x == null) return;
        const a = ev.acceleration;
        const rr = ev.rotationRate || {};
        recibido = true;
        alLeer({
          t: performance.now(),
          acc: a && a.x != null ? [a.x, a.y, a.z] : null,
          accG: [ag.x, ag.y, ag.z],
          // rotationRate: alpha = eje Z, beta = eje X, gamma = eje Y
          rot: [rr.beta || 0, rr.gamma || 0, rr.alpha || 0]
        });
      };
      window.addEventListener("devicemotion", oyente);
      setTimeout(() => {
        if (!recibido) detener();
        resolve(recibido);
      }, 2500);
    });
  }

  function detener() {
    if (oyente) window.removeEventListener("devicemotion", oyente);
    oyente = null;
    clearInterval(demoTimer);
    demoTimer = null;
  }

  /* ---------- Modo demostración ---------- */
  // Recorrido simulado: 5 s quieto (calibración), luego tramos con frenada
  // brusca, aceleración brusca, curva con 40° de inclinación y un zigzag.
  // Incluye vibración de manubrio. No simula caídas.

  function guionDemo(s) {
    if (s < 5) return { aLong: 0, roll: 0, yaw: 0, aLatExtra: 0 };
    const c = (s - 5) % 40;
    let aLong = 0.05 * Math.sin(s / 2), roll = 4 * Math.sin(s / 3), yaw = 0, aLatExtra = 0;
    if (c > 4 && c < 5.2) aLong = -0.55;                                   // frenada brusca
    if (c > 9 && c < 10.2) aLong = 0.45;                                    // aceleración brusca
    if (c > 14 && c < 20) {                                                 // curva a la izquierda, 40°
      const k = Math.sin(((c - 14) / 6) * Math.PI);
      roll = -42 * k;
      yaw = 22 * k;
    }
    if (c > 26 && c < 29) {                                                 // zigzag
      const k = Math.sin((c - 26) * Math.PI * 1.6);
      yaw = 45 * k;
      aLatExtra = 0.32 * k;
      roll = 10 * k;
    }
    return { aLong, roll, yaw, aLatExtra };
  }

  // Lectura simulada en el segundo s (sPrevio: segundo de la lectura anterior)
  function lecturaDemo(s, sPrevio) {
    const d = guionDemo(s);
    const previo = guionDemo(sPrevio);
    const dt = Math.max(0.001, s - sPrevio);
    const ruido = () => (Math.random() - 0.5) * 0.3 * G;   // vibración del manubrio (±0,15 g)
    // En una curva bien tomada la gravedad aparente sigue al chasis (G / cos θ sobre Y);
    // el zigzag sí produce fuerza lateral (eje X). Adelante = −Z.
    const lin = [d.aLatExtra * G + ruido(), ruido() * 0.5, -d.aLong * G + ruido()];
    const gApar = [0, G / Math.max(0.3, Math.cos(d.roll * RAD)), 0];
    const rollRate = (d.roll - previo.roll) / dt;
    // El giro de la curva es alrededor de la vertical del MUNDO; con el vehículo inclinado,
    // en ejes del celular se reparte entre Y (cos θ) y X (−sen θ). La inclinación es alrededor de −Z.
    const th = d.roll * RAD;
    return {
      acc: lin,
      accG: [gApar[0] + lin[0], gApar[1] + lin[1], gApar[2] + lin[2]],
      rot: [-d.yaw * Math.sin(th), d.yaw * Math.cos(th), -rollRate]
    };
  }

  function iniciarDemo(alLeer) {
    const inicio = performance.now();
    let sPrevio = 0;
    demoTimer = setInterval(() => {
      const ahora = performance.now();
      const s = (ahora - inicio) / 1000;
      alLeer({ t: ahora, ...lecturaDemo(s, sPrevio) });
      sPrevio = s;
    }, 16);
  }

  /* ---------- Métricas ---------- */

  function metricas(muestras, estado, C) {
    const n = muestras.length;
    const duracion = n > 1 ? (muestras[n - 1][0] - muestras[0][0]) / 1000 : 0;
    const contar = (tipo) => estado.eventos.filter((ev) => ev.tipo === tipo).length;
    const m = {
      duracion_seg: r1(duracion),
      muestras: n,
      frecuencia_real_hz: duracion > 0 ? r1((n - 1) / duracion) : 0,
      frenadas_bruscas: contar("frenada_brusca"),
      aceleraciones_bruscas: contar("aceleracion_brusca"),
      inclinaciones_extremas: contar("inclinacion_extrema"),
      zigzags: contar("zigzag"),
      impactos: contar("impacto"),
      caidas: contar("caida"),
      inclinacion_max_der: r1(Math.max(0, estado.rollMax)),
      inclinacion_max_izq: r1(Math.max(0, -estado.rollMin)),
      g_frenada_max: r2(Math.max(0, -estado.gLongMin)),
      g_aceleracion_max: r2(Math.max(0, estado.gLongMax)),
      g_lateral_max: r2(estado.gLatMax),
      g_pico_max: r2(estado.gPicoMax),
      pct_inclinacion_extrema: estado.tTotal > 0 ? r1((estado.tInclinacion / estado.tTotal) * 100) : 0,
      eventos: estado.eventos.slice()
    };
    const ponderados = m.frenadas_bruscas + m.aceleraciones_bruscas + m.inclinaciones_extremas + 2 * m.zigzags;
    const horas = duracion / 3600;
    m.eventos_por_hora = horas > 0 ? r1(ponderados / horas) : 0;
    m.nivel_riesgo = m.caidas || m.impactos ? "alto"
      : m.eventos_por_hora >= C.NIVEL_ALTO_EVENTOS_HORA ? "alto"
      : m.eventos_por_hora >= C.NIVEL_MEDIO_EVENTOS_HORA ? "medio" : "bajo";
    return m;
  }

  /* ---------- Recomendaciones ---------- */

  function recomendaciones(m, vehiculo) {
    const C = TELEMETRIA_CONFIG.PERFIL_B;
    const moto = vehiculo === "motocicleta";
    const lista = [];
    if (m.caidas) lista.push("Se registró una posible caída. Si hubo lesiones o daños, repórtalo de inmediato con el botón EMERGENCIAS VIALES y no continúes hasta revisar el vehículo y tu estado.");
    if (m.impactos) lista.push(`Se registró un golpe fuerte (${m.g_pico_max} g). Revisa llantas, rines, suspensión y el soporte del celular; si fue una caída o choque, repórtalo.`);
    if (m.frenadas_bruscas) lista.push(`${m.frenadas_bruscas} frenada${m.frenadas_bruscas > 1 ? "s" : ""} brusca${m.frenadas_bruscas > 1 ? "s" : ""} (hasta ${m.g_frenada_max} g). Anticipa: aumenta la distancia de seguridad y mira más lejos para frenar de forma progresiva${moto ? ", usando ambos frenos" : ""}.`);
    if (m.aceleraciones_bruscas) lista.push(`${m.aceleraciones_bruscas} ${m.aceleraciones_bruscas > 1 ? "aceleraciones bruscas" : "aceleración brusca"}. Acelera de forma suave: arrancar fuerte reduce el agarre y aumenta el riesgo en intersecciones.`);
    if (m.inclinaciones_extremas) lista.push(`Inclinaste más de ${C.INCLINACION_MAX_GRADOS}° en ${m.inclinaciones_extremas} curva${m.inclinaciones_extremas > 1 ? "s" : ""} (máximo ${Math.max(m.inclinacion_max_der, m.inclinacion_max_izq)}°). Reduce la velocidad antes de entrar a la curva, no dentro de ella; con lluvia o arena el agarre es mucho menor.`);
    if (m.zigzags) lista.push(`${m.zigzags} maniobra${m.zigzags > 1 ? "s" : ""} de zigzag o cambio de carril agresivo. Mantén tu carril, señaliza con anticipación y no te metas entre vehículos en movimiento.`);
    if (!lista.length) lista.push(moto
      ? "Conducción suave y estable. Sigue usando el equipo de protección completo y manteniendo la distancia de seguridad."
      : "Conducción suave y estable. Sigue usando casco y elementos reflectivos, y respeta la ciclorruta.");
    return lista;
  }

  /* ---------- CSV ---------- */

  const CAMPOS_CSV = ["t_seg", "g_longitudinal", "g_lateral", "inclinacion_grados", "vel_giro_gps", "g_pico"];

  function aCSV(muestras, formato) {
    const excel = formato !== "estandar";
    const sep = excel ? ";" : ",";
    const num = (v, dec) => { const t = Number(v).toFixed(dec); return excel ? t.replace(".", ",") : t; };
    const filas = [CAMPOS_CSV.join(sep)];
    for (const s of muestras) {
      filas.push([num(s[0] / 1000, 2), num(s[1], 2), num(s[2], 2), num(s[3], 1), num(s[4], 1), num(s[5], 2)].join(sep));
    }
    return "﻿" + filas.join("\r\n");
  }

  /* ---------- Resultado en pantalla ---------- */

  const NOMBRES_EVENTO = {
    frenada_brusca: "Frenada brusca",
    aceleracion_brusca: "Aceleración brusca",
    inclinacion_extrema: "Inclinación extrema",
    zigzag: "Zigzag / culebreo",
    impacto: "Impacto",
    caida: "Posible caída"
  };
  const UNIDAD_EVENTO = { frenada_brusca: "g", aceleracion_brusca: "g", inclinacion_extrema: "°", zigzag: "cambios", impacto: "g", caida: "°" };
  const NIVELES = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

  function dibujarSerie(canvas, muestras) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (muestras.length < 2) return;
    const t0 = muestras[0][0], t1 = muestras[muestras.length - 1][0];
    const x = (t) => ((t - t0) / Math.max(1, t1 - t0)) * (w - 8) + 4;
    // Dos paneles: inclinación (±60°) arriba y G longitudinal (±1 g) abajo
    const panel = (y0, alto, escala, col, color, etiqueta, umbral) => {
      const y = (v) => y0 + alto / 2 - (Math.max(-escala, Math.min(escala, v)) / escala) * (alto / 2);
      ctx.strokeStyle = "#ECEFEE"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y(0)); ctx.lineTo(w, y(0)); ctx.stroke();
      ctx.strokeStyle = "#D64545"; ctx.setLineDash([4, 4]);
      [umbral, -umbral].forEach((u) => { ctx.beginPath(); ctx.moveTo(0, y(u)); ctx.lineTo(w, y(u)); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath();
      const paso = Math.max(1, Math.floor(muestras.length / (w * 2)));
      for (let i = 0; i < muestras.length; i += paso) {
        const p = muestras[i];
        i === 0 ? ctx.moveTo(x(p[0]), y(p[col])) : ctx.lineTo(x(p[0]), y(p[col]));
      }
      ctx.stroke();
      ctx.fillStyle = "#7A8580"; ctx.font = "11px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(etiqueta, 4, y0 + 12);
    };
    const C = TELEMETRIA_CONFIG.PERFIL_B;
    panel(0, h / 2 - 4, 60, 3, "#6B4FA0", "Inclinación (°)", C.INCLINACION_MAX_GRADOS);
    panel(h / 2 + 4, h / 2 - 4, 1, 1, "#2F6FB0", "G longitudinal (+ acelera / − frena)", C.FRENADA_G);
  }

  function renderResultado(cont, sesion) {
    const m = sesion.metricas;
    const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (!m || m.muestras < 2) {
      cont.innerHTML = `<div class="card"><p>La medición es demasiado corta para analizarla.</p></div>`;
      return;
    }
    const veh = TELEMETRIA_CONFIG.VEHICULOS.find((v) => v.id === sesion.tipo_vehiculo) || { icono: "🏍️", nombre: "Dos ruedas" };
    const dur = (s) => { s = Math.round(s); const mm = Math.floor(s / 60), ss = s % 60; return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`; };
    const recs = recomendaciones(m, sesion.tipo_vehiculo);
    const eventos = (m.eventos || []).map((ev) =>
      `<li><span>${dur(ev.t / 1000)}</span> ${esc(NOMBRES_EVENTO[ev.tipo] || ev.tipo)}${ev.lado ? " · " + ev.lado : ""} <strong>${esc(ev.valor)} ${UNIDAD_EVENTO[ev.tipo] || ""}</strong></li>`).join("");
    cont.innerHTML = `
      <div class="card resumen-cabecera">
        <p class="etiqueta">${new Date(sesion.inicio).toLocaleString()}</p>
        <h2>${veh.icono} Telemetría del vehículo · ${esc(veh.nombre)}</h2>
        <p class="resumen-meta">${esc(sesion.usuario || "")}${sesion.placa ? ` · ${esc(sesion.placa)}` : ""}${sesion.modo_demo ? " · <strong>Datos de demostración</strong>" : ""}</p>
      </div>
      <div class="kpis">
        <div class="kpi"><span class="kpi-valor">${dur(m.duracion_seg)}</span><span class="kpi-nombre">Duración</span></div>
        <div class="kpi nivel-${m.nivel_riesgo}"><span class="kpi-valor">${NIVELES[m.nivel_riesgo]}</span><span class="kpi-nombre">Nivel de riesgo · ${m.eventos_por_hora} eventos/h</span></div>
        <div class="kpi"><span class="kpi-valor">${m.frenadas_bruscas} / ${m.aceleraciones_bruscas}</span><span class="kpi-nombre">Frenadas / aceleraciones bruscas</span></div>
        <div class="kpi"><span class="kpi-valor">${m.inclinaciones_extremas} / ${m.zigzags}</span><span class="kpi-nombre">Inclinaciones extremas / zigzag</span></div>
      </div>
      ${m.caidas || m.impactos ? `<div class="alerta-caida-resumen">⚠️ ${m.caidas ? `${m.caidas} posible${m.caidas > 1 ? "s" : ""} caída${m.caidas > 1 ? "s" : ""}` : ""}${m.caidas && m.impactos ? " · " : ""}${m.impactos ? `${m.impactos} impacto${m.impactos > 1 ? "s" : ""}` : ""}</div>` : ""}
      <div class="card">
        <div class="recomendaciones"><h2>Recomendaciones</h2><ul>${recs.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      </div>
      <div class="card">
        <h2>Recorrido</h2>
        <canvas class="grafica grafica-grande" aria-label="Inclinación y fuerza G en el tiempo"></canvas>
        <p class="ayuda">Arriba: inclinación del vehículo (+ derecha). Abajo: fuerza G longitudinal. Las líneas punteadas son los umbrales.</p>
      </div>
      <div class="card">
        <h2>Valores máximos</h2>
        <div class="res-fila"><span>Inclinación máxima derecha / izquierda</span><strong>${m.inclinacion_max_der}° / ${m.inclinacion_max_izq}°</strong></div>
        <div class="res-fila"><span>Tiempo con inclinación extrema</span><strong>${m.pct_inclinacion_extrema}%</strong></div>
        <div class="res-fila"><span>Frenada máxima</span><strong>${m.g_frenada_max} g</strong></div>
        <div class="res-fila"><span>Aceleración máxima</span><strong>${m.g_aceleracion_max} g</strong></div>
        <div class="res-fila"><span>Fuerza lateral máxima</span><strong>${m.g_lateral_max} g</strong></div>
        <div class="res-fila"><span>Pico de fuerza G</span><strong>${m.g_pico_max} g</strong></div>
        <p class="ayuda">${m.muestras.toLocaleString()} muestras a ${m.frecuencia_real_hz} Hz.</p>
      </div>
      <div class="card">
        <h2>Eventos</h2>
        ${eventos ? `<ul class="eventos">${eventos}</ul>` : `<p class="ayuda">No se detectaron eventos.</p>`}
      </div>
      <p class="nota">Indicadores orientativos de conducción. No reemplazan la evaluación de un instructor ni el análisis de un siniestro.</p>`;
    const canvas = cont.querySelector("canvas");
    requestAnimationFrame(() => dibujarSerie(canvas, sesion.muestras || []));
  }

  return {
    calibrar, crearProcesador, disponible, pedirPermiso, iniciar, detener,
    metricas, recomendaciones, aCSV, renderResultado, NOMBRES_EVENTO, lecturaDemo
  };
})();
