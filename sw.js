// Prefijo propio: solo se borran cachés de VIALIX KEY, nunca los de otras
// apps publicadas en el mismo dominio github.io (p. ej. VIALIX HEADSENSE).
const CACHE_PREFIJO = "vialix-key-v";
const CACHE_NAME = CACHE_PREFIJO + "21";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./config-pruebas.js",
  "./teorica-banco.js",
  "./hs-sensor.js",
  "./hs-analisis.js",
  "./hs-almacen.js",
  "./pt-pruebas.js",
  "./tel-chasis.js",
  "./mod-comun.js",
  "./mod-teorica.js",
  "./mod-psicotest.js",
  "./mod-headsense.js",
  "./mod-telemetria.js",
  "./pruebas.css",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./logo-vialix.png",
  "./logo-arl-bolivar.png",
  "./logo-eficacia-extras.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    // cache: "reload" evita copiar archivos viejos que el navegador o el CDN de
    // GitHub aún tengan guardados (hasta ~10 min) al instalar una versión nueva.
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" })))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIJO) && k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Nunca cachear las llamadas al backend (Apps Script): siempre red o falla explícita
  if (req.method !== "GET" || req.url.includes("script.google.com")) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
