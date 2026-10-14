/* =====================================================================
   PRODUCTOS (pants, etc.)
   Se crean desde la app y viven en el celular. Las fotos se guardan en el
   almacenamiento del celular (IndexedDB), no se suben a internet.
   ===================================================================== */

const prods = () => (state.products ||= []);
const prod = id => prods().find(p=>p.id===id);
const pst = p => {p.pub||=[];p.int||=[];p.seg||=[];p.status||="disp";p.fotos||=[];p.modo||="rota";p.cada||=1;p.titulos||=[];return p};
const activeProds = () => prods().filter(p=>pst(p).status==="disp").sort((a,b)=>(a.creado||"")<(b.creado||"")?-1:1);
const precioNumDe = s => String(s||"").replace(/[^\d]/g,"");

/* cómo entra cada producto a los grupos:
   rota = se turna con tus otros productos (1 producto por grupo al día)
   fijo = anuncio fijo: se publica en TODOS tus grupos de productos, sin turnarse */
const PMODOS = {rota:"Turnarse", fijo:"Anuncio fijo"};
const esFijo = p => p.modo==="fijo";
const CADA = {1:"Diario",2:"Cada 2 días",3:"Cada 3 días"};
const prodGroups = () => groups.filter(g=>!g.paused&&aceptaProds(g));
/* títulos alternos: en anuncios fijos cambia el título cada día para que no se vea repetido */
const prodTitulos = p => [p.nombre,...(p.titulos||[])].map(t=>String(t||"").trim()).filter(Boolean);
const prodTitulo = (p,dn) => {const t=prodTitulos(p);return t.length?t[(dn||0)%t.length]:""};

/* qué se publica en cada grupo. Sin elegir: bienes raíces = solo casas; los demás = casas y productos */
const ACEPTA = {ambos:"Casas y productos", casas:"Solo casas", productos:"Solo productos"};
const acepta = g => g.acepta || (g.type==="inmo"?"casas":"ambos");
const aceptaCasas = g => acepta(g)!=="productos";
const aceptaProds = g => acepta(g)!=="casas";

/* clave única de cada pendiente (un grupo puede tener casa + producto el mismo día) */
const ik = it => it.g+(it.p?"~"+it.p:"");

/* ---------- fotos en el celular (IndexedDB) ---------- */
const IDB = {
  db:null,
  open(){return this.db ||= new Promise((res,rej)=>{const r=indexedDB.open("miscasas",1);
    r.onupgradeneeded=()=>r.result.createObjectStore("fotos");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
  async tx(mode,fn){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction("fotos",mode);const out=fn(t.objectStore("fotos"));
    t.oncomplete=()=>res(out&&out.result);t.onerror=()=>rej(t.error)})},
  put(k,v){return this.tx("readwrite",s=>s.put(v,k))},
  get(k){return this.tx("readonly",s=>s.get(k))},
  del(k){return this.tx("readwrite",s=>s.delete(k))}
};
const purl = {};               // clave → URL para <img>
async function loadPhoto(k){
  if(purl[k])return purl[k];
  try{const b=await IDB.get(k);if(b)purl[k]=URL.createObjectURL(b)}catch(e){}
  return purl[k]||"";
}
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const pimg = (k,cls,alt) => k?`<img ${cls?`class="${cls}"`:""} src="${purl[k]||BLANK}" data-pfoto="${k}" alt="${alt||""}">`:`<span class="nophoto ${cls||""}">📦</span>`;
/* después de pintar, pone las fotos que todavía no estaban cargadas */
function hydratePhotos(root){
  (root||document).querySelectorAll("img[data-pfoto]").forEach(img=>{
    const k=img.dataset.pfoto;if(purl[k]){img.src=purl[k];return}
    loadPhoto(k).then(u=>{if(u){img.src=u;return}
      const ph=document.createElement("span");ph.className="nophoto "+(img.className||"");ph.textContent="📦";img.replaceWith(ph)});
  });
}
function shrinkPhoto(file){
  return new Promise(res=>{
    const img=new Image(),u=URL.createObjectURL(file);
    img.onload=()=>{const m=1600,s=Math.min(1,m/Math.max(img.width,img.height));
      const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);
      c.toBlob(b=>res(b||file),"image/jpeg",.85)};
    img.onerror=()=>{URL.revokeObjectURL(u);res(file)};
    img.src=u;
  });
}
async function prodFiles(p){
  const out=[];
  for(let i=0;i<p.fotos.length;i++){const b=await IDB.get(p.fotos[i]).catch(()=>null);if(b)out.push(new File([b],`${p.id}-${i+1}.jpg`,{type:b.type||"image/jpeg"}))}
  return out;
}
function prepProdFiles(p){
  const k="p:"+p.id;if(fileCache[k])return;fileCache[k]="loading";
  prodFiles(p).then(f=>fileCache[k]=f).catch(()=>delete fileCache[k]);
}
function saveProdFotos(p,btn,after){
  const k="p:"+p.id,files=fileCache[k];
  if(!p.fotos.length){toast("Este producto no tiene fotos");return}
  if(files==="loading"||!files){prepProdFiles(p);toast("Preparando fotos… toca otra vez en un segundo");return}
  if(navigator.canShare&&navigator.canShare({files})){
    navigator.share({files}).then(()=>{flash(btn);toast("Fotos guardadas ✓");after&&after()}).catch(e=>{if(e&&e.name==="AbortError")return;prodLB(p,after)});
  } else prodLB(p,after);
}
function prodLB(p,after){
  const lb=document.createElement("div");lb.className="lb";lb.setAttribute("role","dialog");
  lb.innerHTML=`<div class="lb-top"><span>${p.fotos.length} foto${p.fotos.length===1?"":"s"}</span><button id="lbx">${after?"Listo":"Cerrar"}</button></div>
  <div class="lb-track">${p.fotos.map(k=>`<div>${pimg(k)}</div>`).join("")}</div>
  <div class="lb-foot">Desliza para ver más · mantén presionada una foto para guardarla</div>`;
  document.body.appendChild(lb);document.body.style.overflow="hidden";hydratePhotos(lb);
  lb.querySelector("#lbx").onclick=()=>{lb.remove();document.body.style.overflow="";after&&after()};
}

/* ---------- textos ---------- */
function prodTexto(p,dn){
  return `${dn==null?p.nombre:prodTitulo(p,dn)}\n💰 ${p.precio}${p.descripcion?`\n\n${p.descripcion}`:""}${p.zona?`\n\n📍 ${p.zona}`:""}`;
}
function prodReplies(p){
  return [
    {id:"hola",t:"Hola, ¿sigue disponible?",main:true,x:`Hola, ${saludo()}, sí, todavía lo tengo disponible.`},
    {id:"precio",t:"¿Cuánto cuesta?",x:`Está en ${p.precio}.`},
    {id:"donde",t:"¿Dónde lo entregas?",x:`Lo entrego en ${p.zona||"Cd. Madero"}. ¿Por dónde le queda bien?`},
    {id:"fotos",t:"Me pide más fotos",x:`Sí, claro, ahorita se las mando.`},
    {id:"nose",t:"No sé la respuesta",x:`Déjeme confirmarlo y ahorita le aviso.`},
    {id:"seguimiento",t:"No volvió a contestar",x:`Hola, ${saludo()}, ¿todavía le interesa ${p.nombre}? Sigue disponible.`},
    {id:"info",t:"Mándame toda la info",x:prodTexto(p)}
  ];
}

/* ---------- jefe del producto ---------- */
const prodHP = p => p.status!=="disp"?0:Math.max(BOSS_FLOOR,Math.round(100-((G.dmg||{})["p:"+p.id]||0)));
const PSTATUS = {disp:"Disponible",apar:"Apartado",vend:"Vendido"};

/* ---------- vistas ---------- */
function catTabs(){
  const c=view.cat||"casas";
  return `<div class="pills tabs3" style="margin-top:0">${[["casas","Casas"],["prod",`Productos${prods().length?" · "+prods().length:""}`]].map(([k,l])=>`<button class="ptab ${c===k?"on":""}" data-act="cat" data-v="${k}">${l}</button>`).join("")}</div>`;
}
function prodsView(){
  const L=prods().map(pst);
  return `
  <header class="hdr"><div><h1>Productos</h1><p class="loc">${L.filter(p=>p.status!=="vend").length} a la venta · ${L.filter(p=>p.status==="vend").length} vendidos</p></div>
    <div class="hdr-r"><button class="rbtn" data-act="padd" aria-label="Agregar producto">${IC.plus}</button></div></header>
  ${catTabs()}
  <button class="btn dark full" data-act="padd" style="margin:12px 0 14px">${IC.plus} Agregar producto</button>
  ${L.length?`<div class="grid">${L.map(p=>{const hp=prodHP(p);return `
    <button class="world ${p.status!=="disp"?"won":""}" data-act="openp" data-id="${p.id}">
      <div class="wimg">${pimg(p.fotos[0])}<span class="boss">👾</span>${esFijo(p)&&p.status==="disp"?`<span class="adtag">📢 Anuncio fijo</span>`:""}${p.status!=="disp"?`<span class="crown">${p.status==="vend"?"👑 Vendido":"🔑 Apartado"}</span>`:""}</div>
      <b class="wn">${esc(p.nombre)}</b>
      <span class="wp">${esc(p.precio)}</span>
      <small class="wd">${p.status==="vend"?`Ganaste ${money(+p.ganancia||0)}`:p.int.length?`${p.int.length} interesado${p.int.length>1?"s":""}`:`Ganancia ${money(+p.ganancia||0)}`}</small>
      <div class="hp"><div class="bar"><i style="width:${hp}%"></i></div><small>${p.status!=="disp"?"Jefe derrotado":`Jefe ${hp}%`}</small></div>
    </button>`}).join("")}</div>`
  :`<div class="empty"><div class="e">📦</div><h3>Todavía no tienes productos</h3><p>Agrega lo que quieras vender (ropa, cosas de la casa, lo que sea). Puedes ponerlo a turnarse con tus otros productos o como anuncio fijo en todos tus grupos.</p></div>`}`;
}
function prodView(p){
  if(!p){view.pid=null;return prodsView()}
  pst(p);prepProdFiles(p);
  const lp=p.pub.length?p.pub[p.pub.length-1]:null;
  const fields=[["Título","nombre",p.nombre],["Precio","precioNum",precioNumDe(p.precio)],["Descripción","descripcion",p.descripcion||""],["Ubicación","zona",p.zona||""]];
  const counter=(kind,label,ic,n)=>`<div class="ctr"><span class="ci">${ic}</span><div class="cl"><b>${n}</b><small>${label}</small><em>+${XP[kind]} XP</em></div>
    <button class="cbtn m" data-act="p-undo" data-k="${kind}" aria-label="Quitar ${label}" ${n?"":"disabled"}>${IC.minus}</button><button class="cbtn" data-act="p-gain" data-k="${kind}" aria-label="Sumar ${label}">${IC.plus}</button></div>`;
  const hp=prodHP(p);
  return `
  <div class="dtop"><button class="rbtn" data-act="cat" data-v="prod" aria-label="Regresar">${IC.back}</button><h2>Producto</h2><button class="rbtn" data-act="p-edit" aria-label="Editar">${IC.sliders}</button></div>
  <div class="dhero" ${p.fotos.length?`data-act="p-lb" role="button" aria-label="Ver fotos"`:""}>${pimg(p.fotos[0])}${p.fotos.length?`<span class="cnt">${IC.img} ${p.fotos.length}</span>`:""}</div>
  ${p.fotos.length>1?`<div class="strip">${p.fotos.slice(1).map(k=>`<button data-act="p-lb" aria-label="Ver fotos">${pimg(k)}</button>`).join("")}</div>`:`<div style="height:12px"></div>`}
  <section class="card dinfo">
    <div class="dl"><h2>${esc(p.nombre)}</h2><b class="dprice">${esc(p.precio)}</b></div>
    <p class="addr">${IC.coins} Si lo vendes ganas <b>&nbsp;${money(+p.ganancia||0)}</b></p>
  </section>

  <section class="card">
    <div class="sechead"><h3>Publicar</h3><span class="muted sm">Marketplace</span></div>
    <div class="rows">
      <button class="row" data-act="p-fotos"><div><b>Fotos</b><span class="t">${p.fotos.length?(p.fotos.length===1?"Guardar la foto":`Guardar las ${p.fotos.length} fotos`):"Sin fotos · agrégalas en Editar"}</span></div><span class="copy">Guardar</span></button>
      ${fields.map(([k,key,v])=>`<button class="row ${key==="descripcion"?"main":""}" data-act="p-field" data-k="${key}"><div><b>${k}</b><span class="t">${esc(v||"—")}</span></div><span class="copy">Copiar</span></button>`).join("")}
      <button class="row" data-act="p-mkt"><div><b>Link de mi publicación en Marketplace</b><span class="t">${safeUrl(p.mktUrl)?esc(p.mktUrl):"Sin guardar · para compartirla en grupos de venta sin duplicarla"}</span></div><span class="copy">${safeUrl(p.mktUrl)?"Cambiar":"Guardar"}</span></button>
      <button class="row" data-act="p-group"><div><b>Para un grupo de Facebook</b><span class="t">${esFijo(p)&&p.titulos.length?"Con el título de hoy · ":""}Nombre, precio y descripción</span></div><span class="copy">Copiar</span></button>
    </div>
    <div class="small">${lp?"Última vez en Marketplace: "+(days(lp)===0?"hoy":"hace "+days(lp)+" días")+` · ${p.pub.length} en total`:"Todavía no lo has publicado en Marketplace"}${p.pub.length?` · <button class="linkbtn sm" data-act="p-undo" data-k="marketplace">deshacer última</button>`:""}</div>
  </section>

  ${prodGruposCard(p)}

  <section class="card">
    <div class="sechead"><h3>Responder mensajes</h3></div>
    <p class="sub">Toca el que necesites y pégalo en Messenger.</p>
    <div class="rows">${prodReplies(p).map(r=>`<button class="row ${r.main?"main":""}" data-act="p-reply" data-rid="${r.id}"><div><b>${esc(r.t)}</b><span class="t">${esc(r.x)}</span></div><span class="copy">Copiar</span></button>`).join("")}</div>
  </section>

  <section class="card">
    <div class="sechead"><h3>Estadísticas</h3><span class="muted sm">súmale cuando pase de verdad</span></div>
    <div class="bossrow ${p.status!=="disp"?"won":""}"><span class="be">👾</span><div class="bi"><b>Jefe del producto</b><small>${p.status!=="disp"?(p.status==="vend"?"Vendido 👑":"Apartado 🔑"):`${hp}% de vida · sólo cae con la venta`}</small><div class="bar"><i style="width:${hp}%"></i></div></div></div>
    <div class="ctrs" style="margin-top:8px">
      ${counter("interesado","Interesados",IC.heart,p.int.length)}
      ${counter("seguimiento","Seguimientos",IC.send,p.seg.length)}
    </div>
  </section>

  <section class="card">
    <h3 class="h3">Estado</h3>
    <div class="pills">${Object.entries(PSTATUS).map(([k,l])=>`<button class="ptab ${p.status===k?"on":""}" data-act="p-status" data-s="${k}">${l}</button>`).join("")}</div>
    <p class="small">Apartado = deja de publicarse en tus grupos (también si es anuncio fijo). Vendido = sale de tus grupos y suma tu ganancia (+${XP.ventaProducto} XP).</p>
    <div class="row2"><button class="btn ghost" data-act="p-edit">Editar</button><button class="btn ghost danger" data-act="p-del">Borrar</button></div>
  </section>

  <div class="sticky"><button class="btn primary big" data-act="p-pub">${IC.check} Ya lo publiqué en Marketplace <small>+${XP.marketplace} XP</small></button></div>`;
}

/* ---------- cómo sale en grupos ---------- */
function prodGruposCard(p){
  const G2=prodGroups(),n=G2.length,porDia=esFijo(p)?Math.ceil(n/p.cada):0;
  const tits=prodTitulos(p);
  return `<section class="card">
    <div class="sechead"><h3>En mis grupos</h3>${esFijo(p)?`<span class="pill acc tiny">📢 Anuncio fijo</span>`:""}</div>
    <div class="pills">${Object.entries(PMODOS).map(([k,l])=>`<button class="ptab ${p.modo===k?"on":""}" data-act="p-modo" data-v="${k}">${l}</button>`).join("")}</div>
    ${esFijo(p)?`
    <p class="sub" style="margin-top:10px">Sale en <b>todos</b> tus grupos de productos sin turnarse con nada. ${p.status==="disp"?`Hoy: <b>${porDia} grupo${porDia===1?"":"s"}</b>.`:`<b>Está ${p.status==="apar"?"apartado":"vendido"}, por ahora no sale.</b>`}</p>
    <div class="pills">${Object.entries(CADA).map(([k,l])=>`<button class="ptab ${+p.cada===+k?"on":""}" data-act="p-cada" data-v="${k}">${l}</button>`).join("")}</div>
    <div class="rows" style="margin-top:10px">
      <button class="row" data-act="p-tits"><div><b>Títulos que se van turnando</b><span class="t">${tits.length>1?`${tits.length} títulos · hoy: ${esc(prodTitulo(p,dayNum(todayKey())))}`:"Solo uno · agrega más para que no se vea repetido"}</span></div><span class="copy">Editar</span></button>
      <button class="row" data-act="tab" data-t="perfil" data-sub="grupos"><div><b>${n} grupo${n===1?"":"s"} aceptan productos</b><span class="t">Para sumar o quitar grupos cambia “Qué publico aquí” en cada grupo</span></div><span class="copy">Ver</span></button>
    </div>`
    :`<p class="small">Se turna con tus otros productos: cada grupo de productos recibe uno distinto cada día. ${n} grupo${n===1?"":"s"} aceptan productos.</p>`}
  </section>`;
}
function titsSheet(p){
  const s=openSheet(`<h3>Títulos del anuncio</h3>
    <p class="small" style="margin:0">Uno por renglón. Cada día se usa el siguiente, así tu anuncio no se ve igual todos los días en el mismo grupo. El primero es el título principal.</p>
    <textarea class="inp" id="tt-x" rows="6" placeholder="Pants Premium Nuevos\nPants deportivos nuevos, varias tallas\n2 pants por $599">${esc(prodTitulos(p).join("\n"))}</textarea>
    <button class="btn primary big" data-t="save">Guardar</button><button class="btn ghost" data-t="x">Cancelar</button>`);
  s.querySelector('[data-t="x"]').onclick=closeSheet;
  s.querySelector('[data-t="save"]').onclick=()=>{
    const L=s.querySelector("#tt-x").value.split("\n").map(x=>x.trim()).filter(Boolean);
    if(!L.length){toast("Deja al menos un título");return}
    p.nombre=L[0];p.titulos=L.slice(1);delete fileCache["p:"+p.id];save();closeSheet();render();toast("Títulos guardados ✓")};
}

/* ---------- agregar / editar ---------- */
function prodSheet(id){
  const isNew=!id,p=id?pst(prod(id)):{id:"p"+Date.now().toString(36),nombre:"",precio:"",descripcion:"",zona:"Cd. Madero",ganancia:"",fotos:[],modo:"rota",cada:1,titulos:[]};
  let modo=p.modo||"rota";
  let fotos=p.fotos.slice();const added=[];
  const s=openSheet(`<h3>${isNew?"Agregar producto":"Editar producto"}</h3>
    <div class="field"><label for="pf-n">Nombre</label><input class="inp" id="pf-n" value="${esc(p.nombre)}" placeholder="Ej. Pants deportivos talla M" autocomplete="off"></div>
    <div class="row2" style="margin:0"><div class="field"><label for="pf-p">Precio</label><input class="inp" id="pf-p" value="${esc(p.precio)}" placeholder="$350" inputmode="decimal" autocomplete="off"></div>
      <div class="field"><label for="pf-g">¿Cuánto ganas?</label><input class="inp" id="pf-g" value="${esc(p.ganancia)}" placeholder="150" inputmode="numeric" autocomplete="off"></div></div>
    <div class="field"><label for="pf-d">Descripción</label><textarea class="inp" id="pf-d" rows="4" placeholder="Talla, color, estado, si es nuevo o usado…">${esc(p.descripcion)}</textarea></div>
    <div class="field"><label for="pf-z">Zona (general, sin dirección exacta)</label><input class="inp" id="pf-z" value="${esc(p.zona)}" autocomplete="off"></div>
    <div class="field"><span>Fotos</span><div class="pfotos" id="pf-f"></div>
      <label class="btn ghost full" for="pf-in">${IC.img} Agregar fotos</label><input type="file" id="pf-in" accept="image/*" multiple hidden></div>
    <div class="field"><span>¿Cómo lo publico en mis grupos?</span><div class="pills" id="pf-m" style="margin-top:4px"></div><small class="muted" id="pf-mh"></small></div>
    <button class="btn primary big" data-pf="save">${isNew?"Agregar producto":"Guardar"}</button><button class="btn ghost" data-pf="x">Cancelar</button>`);
  const mbox=s.querySelector("#pf-m"),mh=s.querySelector("#pf-mh");
  const drawM=()=>{mbox.innerHTML=Object.entries(PMODOS).map(([k,l])=>`<button type="button" class="ptab ${modo===k?"on":""}" data-m="${k}">${l}</button>`).join("");
    mh.textContent=modo==="fijo"?"Sale en todos tus grupos de productos, sin turnarse con tus otros productos.":"Se turna con tus otros productos: un producto distinto por grupo cada día.";
    mbox.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{modo=b.dataset.m;drawM()})};
  drawM();
  const box=s.querySelector("#pf-f");
  const draw=()=>{box.innerHTML=fotos.length?fotos.map((k,i)=>`<span class="pf">${pimg(k)}<button type="button" data-rm="${i}" aria-label="Quitar foto">${IC.x}</button></span>`).join(""):`<small class="muted">Sin fotos todavía</small>`;
    hydratePhotos(box);box.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{fotos.splice(+b.dataset.rm,1);draw()})};
  draw();
  s.querySelector("#pf-in").onchange=async e=>{
    const files=[...e.target.files];e.target.value="";if(!files.length)return;
    toast("Guardando fotos…");
    for(const f of files){const k=`${p.id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`;
      try{await IDB.put(k,await shrinkPhoto(f));added.push(k);fotos.push(k)}catch(err){toast("No se pudo guardar una foto")}}
    draw();toast(`${files.length} foto${files.length>1?"s":""} lista${files.length>1?"s":""} ✓`);
  };
  const cleanup=()=>{added.filter(k=>!fotos.includes(k)).forEach(k=>IDB.del(k).catch(()=>{}))};
  s.querySelector('[data-pf="x"]').onclick=()=>{added.forEach(k=>IDB.del(k).catch(()=>{}));closeSheet()};
  s.querySelector('[data-pf="save"]').onclick=()=>{
    const nombre=s.querySelector("#pf-n").value.trim(),precio=s.querySelector("#pf-p").value.trim();
    if(!nombre){toast("Ponle nombre al producto");return}
    if(!precio){toast("Ponle precio");return}
    const removed=p.fotos.filter(k=>!fotos.includes(k));
    Object.assign(p,{nombre,precio:/^\d/.test(precio)?"$"+precio:precio,descripcion:s.querySelector("#pf-d").value.trim(),
      zona:s.querySelector("#pf-z").value.trim(),ganancia:precioNumDe(s.querySelector("#pf-g").value),fotos,modo});
    removed.forEach(k=>IDB.del(k).catch(()=>{}));cleanup();
    delete fileCache["p:"+p.id];
    if(isNew){p.creado=new Date().toISOString();prods().push(pst(p))}
    save();rebuildToday();closeSheet();
    if(isNew){go({tab:"casas",cat:"prod",pid:p.id});toast(modo==="fijo"?"Producto agregado ✓ · sale como anuncio en tus grupos":"Producto agregado ✓ · ya entra a la rotación")}else{render();toast("Producto guardado ✓")}
  };
}

/* ---------- acciones ---------- */
function prodGain(p,kind){
  const key={interesado:"int",seguimiento:"seg",marketplace:"pub"}[kind];
  p[key].push(new Date().toISOString());save();
  const n=XP[kind]*(G.x2today?2:1);render();xpPop(n,XP_LABEL[kind]);sfx("xp");haptic();checkProgress();
}
function prodAct(act,b){
  if(act==="padd"){prodSheet(null);return}
  if(act==="openp"){go({tab:"casas",cat:"prod",pid:b.dataset.id});return}
  if(act==="p-mktfor"){const x=prod(b.dataset.id);if(x)mktSheetFor(x);return}
  const p=prod(view.pid);if(!p)return;pst(p);
  switch(act){
    case "p-edit": prodSheet(p.id);break;
    case "p-lb": prodLB(p);break;
    case "p-fotos": saveProdFotos(p,b);break;
    case "p-field": {const v=b.dataset.k==="precioNum"?precioNumDe(p.precio):(p[b.dataset.k]||"");if(!v){toast("Ese campo está vacío · llénalo en Editar");break}copy(v,b);break;}
    case "p-group": copy(prodTexto(p,dayNum(todayKey())),b,"Copiado para grupo ✓");break;
    case "p-modo": {const v=b.dataset.v;if(v===p.modo)break;p.modo=v;save();rebuildToday();render();
      toast(v==="fijo"?`📢 Anuncio fijo · sale en tus ${prodGroups().length} grupos de productos`:"Ahora se turna con tus otros productos");break;}
    case "p-cada": {p.cada=+b.dataset.v||1;save();rebuildToday();render();toast(CADA[p.cada]+" ✓");break;}
    case "p-tits": titsSheet(p);break;
    case "p-mkt": mktSheetFor(p);break;
    case "p-reply": {const r=prodReplies(p).find(x=>x.id===b.dataset.rid);
      copy(r.x,b,"Copiado, pégalo en Messenger ✓",()=>{game.replies.push(new Date().toISOString());game.replies=game.replies.slice(-500);saveGame();calc();
        if(r.id==="seguimiento")toast("¿Ya lo mandaste?",{label:`Sí · +${XP.seguimiento} XP`,fn:()=>prodGain(p,"seguimiento")});checkProgress()});break;}
    case "p-gain": prodGain(p,b.dataset.k);break;
    case "p-pub": prodGain(p,"marketplace");break;
    case "p-undo": {const key={interesado:"int",seguimiento:"seg",marketplace:"pub"}[b.dataset.k];if(p[key].length){p[key].pop();save();render();toast(`Quitado (−${XP[b.dataset.k]} XP)`)}break;}
    case "p-status": {const st=b.dataset.s,prev=p.status;if(st===prev)break;
      const before=G.xp;p.status=st;const now=new Date().toISOString();
      if(st==="vend")p.vendT=now;else delete p.vendT;
      save();rebuildToday();render();
      if(st==="vend")modal({art:`<div class="bossfall">👾</div><div class="bosswin">👑</div>`,title:"¡Vendido!",text:`${p.nombre}. +${num(G.xp-before)} XP y ${money(+p.ganancia||0)} de ganancia.`,confetti:"big",sound:"boss"});
      else toast("Estado actualizado");
      checkProgress();break;}
    case "p-del": if(confirm(`¿Borrar "${p.nombre}"? Sale de la app y de tus grupos.`)){
      p.fotos.forEach(k=>IDB.del(k).catch(()=>{}));state.products=prods().filter(x=>x.id!==p.id);save();rebuildToday();go({tab:"casas",cat:"prod"});toast("Producto borrado")}break;
  }
}
function mktSheetFor(p){
  const s=openSheet(`<h3>Link de tu publicación en Marketplace</h3>
    <p class="small" style="margin:0">En Facebook abre tu publicación de <b>${esc(p.nombre)}</b> → <b>Compartir</b> → <b>Copiar enlace</b>, y pégalo aquí.</p>
    <input class="inp" id="mk-u" type="url" inputmode="url" placeholder="https://www.facebook.com/marketplace/item/..." value="${esc(p.mktUrl||"")}" autocomplete="off">
    <button class="btn primary big" data-m="save">Guardar</button><button class="btn ghost" data-m="x">Cancelar</button>`);
  s.querySelector('[data-m="x"]').onclick=closeSheet;
  s.querySelector('[data-m="save"]').onclick=()=>{const u=s.querySelector("#mk-u").value.trim();
    if(u&&!safeUrl(u)){toast("El link debe empezar con https://");return}
    p.mktUrl=u;save();closeSheet();render();toast(u?"Link guardado ✓":"Link quitado")};
}
