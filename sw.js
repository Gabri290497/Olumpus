/* OLYMPVS — funzionamento senza rete.
   La pagina si chiede alla rete e si ripiega sulla copia locale solo quando
   la rete non c'e'. Cosi' un aggiornamento caricato su GitHub arriva da solo,
   senza reinstallare nulla. Il resto (icone, manifest) resta a copia locale,
   perche' cambia di rado. */
const CACHE = "olympvs-v2";
const FILE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* la pagina dell'app: prima la rete, poi la copia */
function paginaApp(req){
  return req.mode === "navigate" ||
    (req.destination === "document") ||
    /\/(index\.html)?(\?.*)?$/.test(new URL(req.url).pathname);
}

self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if(url.origin !== self.location.origin) return;

  if(paginaApp(e.request)){
    e.respondWith(
      fetch(e.request).then(res => {
        if(res && res.status === 200){
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copia));
        }
        return res;
      }).catch(() => caches.match("./index.html").then(hit => hit || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if(res && res.status === 200 && res.type === "basic"){
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
