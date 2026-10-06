/* Service worker: la app funciona sin señal y se actualiza sola.
   - index, app.js, data.js, app.css: primero internet (para traer cambios), si no hay señal usa la copia guardada.
   - fotos: se guardan en el celular y se usan sin internet.
   Si cambias algo y quieres forzar que se borre todo lo guardado, sube el número de VERSION. */
const VERSION = "v6";
const SHELL = "shell-" + VERSION;
const PHOTOS = "fotos-v1";
const CORE = ["./","index.html","app.css","app.js","game.js","data.js","manifest.webmanifest",
  "icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL && k !== PHOTOS).map(k => caches.delete(k)));
    await self.clients.claim();
    precachePhotos();
  })());
});

/* guarda todas las fotos en segundo plano (no los videos, son muy pesados) */
async function precachePhotos(){
  try{
    const res = await fetch("data.js", {cache:"no-store"});
    const txt = await res.text();
    const c = await caches.open(PHOTOS);
    const re = /id:"([a-z0-9_-]+)"[\s\S]*?fotos:\[([\d,\s]+)\]/g;
    let m;
    while((m = re.exec(txt))){
      for(const n of m[2].split(",").map(s => s.trim()).filter(Boolean)){
        const url = `fotos/${m[1]}/${n.padStart(2,"0")}.jpg`;
        if(!(await c.match(url))) { try{ await c.add(url); }catch(e){} }
      }
    }
  }catch(e){}
}

function timeout(ms){ return new Promise((_, rej) => setTimeout(rej, ms)); }

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;
  if(url.pathname.endsWith(".mp4") || url.pathname.endsWith(".ics")) return; // directo de internet

  if(url.pathname.includes("/fotos/")){
    e.respondWith(caches.open(PHOTOS).then(async c => {
      const hit = await c.match(req, {ignoreSearch:true});
      if(hit) return hit;
      const res = await fetch(req);
      if(res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // red primero (con límite de 3.5 s por si la señal está mala), si no, lo guardado
  e.respondWith((async () => {
    const c = await caches.open(SHELL);
    try{
      const res = await Promise.race([fetch(req, {cache:"no-cache"}), timeout(3500)]);
      if(res && res.ok) c.put(req, res.clone());
      return res;
    }catch(err){
      const hit = await c.match(req, {ignoreSearch:true}) || (req.mode === "navigate" ? await c.match("index.html") : null);
      if(hit) return hit;
      return fetch(req);
    }
  })());
});
