/* Mis Casas · app (datos en data.js, juego en game.js) */
const APP_VERSION = "3.2.0";

/* ---------- storage ---------- */
const store = {
  get(k,d){try{const v=localStorage.getItem("casas:"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem("casas:"+k,JSON.stringify(v))}catch(e){}}
};
const clone = o => JSON.parse(JSON.stringify(o));
const DEFAULT_CFG = {blocks:["14:00","20:00"], gap:2, goals:{grupos:100,pub:7,conv:15,vis:3}, theme:"auto"};

let state  = store.get("state",{});
let custom = store.get("custom2",{});
let openerIdx = store.get("opener",0);
let groups = store.get("groups",null) || clone(DEFAULT_GROUPS);
let cfg    = Object.assign(clone(DEFAULT_CFG), store.get("cfg",{}));
cfg.goals  = Object.assign(clone(DEFAULT_CFG.goals), cfg.goals||{});
let rot    = store.get("rot",{cur:{},last:{},snap:null});
let plans  = store.get("plans",{});
let game   = mergeGame(store.get("game",{}));

function mergeGame(g){
  const d=clone(DEFAULT_GAME),o=Object.assign(d,g||{});
  o.look=Object.assign(clone(DEFAULT_GAME.look),(g&&g.look)||{});
  o.seen=Object.assign(clone(DEFAULT_GAME.seen),(g&&g.seen)||{});
  return o;
}
const hs = id => {const s=(state[id] ||= {status:"disp",pub:[]});s.pub||=[];s.int||=[];s.vis||=[];s.seg||=[];s.agen||=[];return s};
const us = id => {state.units ||= {};return (state.units[id] ||= {status:"disp",apar:null,vend:null})};
const houseStatus = h => {const st=unitsOf(h).map(u=>us(u.id).status);return st.every(s=>s==="vend")?"vend":st.some(s=>s==="disp")?"disp":"apar"};
const save = () => store.set("state",state);
const saveGroups = () => store.set("groups",groups);
const saveCfg = () => store.set("cfg",cfg);
const saveGame = () => store.set("game",game);
const savePlans = () => {store.set("plans",plans);store.set("rot",rot)};
const replyText = (h,r) => (custom[h.id]&&custom[h.id][r.id]) || r.x;
const house = id => HOUSES.find(h=>h.id===id);
const group = id => groups.find(g=>g.id===id);
const unit = id => UNITS.find(u=>u.id===id);

/* ---------- migración de datos viejos (v2 → v3) ---------- */
function migrate(){
  const now=new Date().toISOString();
  UNITS.forEach(u=>{
    if(!(state.units&&state.units[u.id])){
      const old=(state[u.house]&&state[u.house].status)||"disp";
      state.units ||= {};
      state.units[u.id]={status:old,apar:old!=="disp"?now:null,vend:old==="vend"?now:null};
    }
  });
  HOUSES.forEach(h=>hs(h.id).status=houseStatus(h));
  save();store.set("schema",3);
  // cambios de grupos (quitar grupos, poner links) sobre la lista guardada en el celular
  const gv=store.get("groupsV",0);let changed=false;
  GROUP_UPDATES.filter(u=>u.v>gv).forEach(u=>{
    const rm=new Set(u.remove||[]);
    const before=groups.length;
    groups=groups.filter(g=>!rm.has(g.id));
    rm.forEach(id=>{delete rot.cur[id];delete rot.last[id]});
    Object.entries(u.links||{}).forEach(([id,url])=>{const g=groups.find(x=>x.id===id);if(g&&url)g.url=url});
    changed=changed||groups.length!==before||!!u.links;
    store.set("groupsV",u.v);
  });
  if(changed){saveGroups();if(plans[todayKey()])rebuildToday()}
}

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const foto = (h,n) => `fotos/${h.id}/${String(n).padStart(2,"0")}.jpg`;
const cover = h => foto(h,h.fotos[0]);
const money = n => "$"+n.toLocaleString("es-MX");
const num = n => n.toLocaleString("es-MX");
const pad = n => String(n).padStart(2,"0");
const ymd = d => {d=d?new Date(d):new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const todayKey = () => ymd();
const dayNum = k => {const [y,m,d]=k.split("-").map(Number);return Math.round(Date.UTC(y,m-1,d)/864e5)};
const days = iso => Math.floor((Date.now()-new Date(iso).getTime())/864e5);
const toMin = t => {const [h,m]=String(t).split(":").map(Number);return (h||0)*60+(m||0)};
const fmtMin = m => {m=((m%1440)+1440)%1440;const h=Math.floor(m/60),mm=m%60;return `${h%12||12}:${pad(mm)} ${h<12?"am":"pm"}`};
const fmt24 = m => pad(Math.floor(m/60))+":"+pad(m%60);
const nowMin = () => {const d=new Date();return d.getHours()*60+d.getMinutes()};
const saludo = () => {const h=new Date().getHours();return h<12?"buenos días":h<19?"buenas tardes":"buenas noches"};
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
const safeUrl = u => /^https?:\/\//i.test(String(u||"").trim()) ? String(u).trim() : "";
const groupHref = g => safeUrl(g.url) || "https://www.facebook.com/search/groups/?q="+encodeURIComponent(g.name);
const lastPub = id => {const p=hs(id).pub;return p.length?p[p.length-1]:null};
const STATUS={disp:["Disponible",""],apar:["Apartada","acc"],vend:["Vendida","dark"]};
const pct = (a,b) => Math.max(0,Math.min(100,Math.round(a/(b||1)*100)));

/* íconos de línea (estilo Lucide, incluidos aquí para que funcionen sin señal) */
const I = p => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  home:I('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'),
  map:I('<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>'),
  send:I('<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'),
  trophy:I('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
  user:I('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  bell:I('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  plus:I('<path d="M5 12h14M12 5v14"/>'),
  minus:I('<path d="M5 12h14"/>'),
  pin:I('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  copy:I('<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),
  img:I('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
  ext:I('<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  check:I('<path d="M20 6 9 17l-5-5"/>'),
  back:I('<path d="m12 19-7-7 7-7M19 12H5"/>'),
  chev:I('<path d="m9 18 6-6-6-6"/>'),
  flame:I('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
  shield:I('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'),
  gift:I('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
  zap:I('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  lock:I('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  sound:I('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>'),
  mute:I('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/>'),
  cal:I('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  dl:I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'),
  ul:I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>'),
  users:I('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  msg:I('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
  heart:I('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
  key:I('<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>'),
  door:I('<path d="M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01"/><path d="M13 4.56v16.16a1 1 0 0 1-1.24.97L5 20V5.56a2 2 0 0 1 1.52-1.94l4-1A2 2 0 0 1 13 4.56Z"/>'),
  clock:I('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  mega:I('<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
  pause:I('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'),
  play:I('<path d="m6 3 14 9-14 9V3z"/>'),
  trash:I('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  sliders:I('<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>'),
  sparkles:I('<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>'),
  target:I('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  swords:I('<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>'),
  vibra:I('<rect x="7" y="4" width="10" height="16" rx="2"/><path d="M3 9v6M21 9v6"/>'),
  x:I('<path d="M18 6 6 18M6 6l12 12"/>'),
  coins:I('<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>')
};

/* ======================================================================
   ROTACIÓN (sin cambios): cada grupo lleva su propio "turno ponderado".
   ====================================================================== */
const activeHouses = () => HOUSES.filter(h=>hs(h.id).status!=="vend");
function weights(g){
  const w={};
  activeHouses().forEach(h=>{
    let x=1;const p=PESOS[h.id];
    if(p&&p[g.type]!=null) x*=p[g.type];
    if(hs(h.id).status==="apar") x*=PESO_APARTADA;
    w[h.id]=x;
  });
  const tot=Object.values(w).reduce((a,b)=>a+b,0)||1;
  for(const k in w) w[k]/=tot;
  return w;
}
function blockOf(i,n){return Math.min(cfg.blocks.length-1,Math.floor(i*cfg.blocks.length/n))}
function buildPlan(key, forced){
  const dn=dayNum(key);
  const act=groups.filter(g=>!g.paused);
  const n=act.length;if(!n) return [];
  const items=act.map((g,i)=>({g:g.id,b:blockOf(i,n),h:null}));
  const dayCnt={},blkCnt={};
  const idx=items.map((_,i)=>i);
  const rotIdx=idx.slice(dn%n).concat(idx.slice(0,dn%n));
  const order=rotIdx.filter(i=>forced[items[i].g]).concat(rotIdx.filter(i=>!forced[items[i].g]));
  for(const i of order){
    const it=items[i],g=group(it.g),w=weights(g),c=(rot.cur[g.id] ||= {});
    for(const k in c) if(!(k in w)) delete c[k];
    const cands=Object.keys(w);
    if(!cands.length) continue;
    for(const k of cands) c[k]=(c[k]||0)+w[k];
    let h=forced[g.id];
    if(!h){
      const last=rot.last[g.id];
      const pool=cands.length>1?cands.filter(k=>k!==last):cands;
      let best=-1e9;
      for(const k of pool){
        const s=c[k]-0.12*(dayCnt[k]||0)-0.22*(blkCnt[it.b+k]||0);
        if(s>best+1e-9){best=s;h=k}
      }
    }
    if(h in c) c[h]-=1;
    rot.last[g.id]=h;it.h=h;
    dayCnt[h]=(dayCnt[h]||0)+1;blkCnt[it.b+h]=(blkCnt[it.b+h]||0)+1;
  }
  const out=[];
  for(let b=0;b<cfg.blocks.length;b++){
    const L=items.filter(x=>x.b===b&&x.h);
    for(let k=1;k<L.length;k++){
      if(L[k].h===L[k-1].h){
        const j=L.findIndex((x,jj)=>jj>k&&x.h!==L[k-1].h);
        if(j>0){const [m]=L.splice(j,1);L.splice(k,0,m)}
      }
    }
    out.push(...L);
  }
  out.forEach((x,k)=>{x.o=(dn*5+k)%OPENERS.length});
  return out;
}
function ensureToday(){
  const t=todayKey();
  if(plans[t]){
    if(!plans[t].missions){plans[t].missions=makeMissions(t);savePlans()}
    return plans[t];
  }
  rot.snap={date:t,cur:clone(rot.cur),last:clone(rot.last)};
  plans[t]={items:buildPlan(t,{}),photos:{},missions:makeMissions(t)};
  // los días viejos se compactan (sólo lo publicado), nunca se borran: de ahí sale tu XP
  Object.keys(plans).forEach(k=>{if(dayNum(t)-dayNum(k)>45&&!plans[k].compact){
    plans[k]={...plans[k],items:plans[k].items.filter(i=>i.done).map(({g,h,b,done})=>({g,h,b,done})),photos:{},compact:true}}});
  savePlans();
  return plans[t];
}
function rebuildToday(){
  const t=todayKey();
  if(!plans[t]) return ensureToday();
  if(rot.snap&&rot.snap.date===t){rot.cur=clone(rot.snap.cur);rot.last=clone(rot.snap.last)}
  const old=plans[t].items,forced={};
  old.forEach(it=>{const g=group(it.g);if(g&&!g.paused&&(it.done||hs(it.h).status!=="vend"))forced[it.g]=it.h});
  const fresh=buildPlan(t,forced);
  fresh.forEach(it=>{const o=old.find(x=>x.g===it.g&&x.h===it.h);if(o){it.done=o.done;it.copied=o.copied;it.opened=o.opened}});
  old.filter(o=>o.done&&!fresh.some(x=>x.g===o.g)).forEach(o=>fresh.push({...o,b:Math.min(o.b,cfg.blocks.length-1),gone:true}));
  plans[t].items=fresh;
  savePlans();
}
const blockStart = b => toMin(cfg.blocks[b]||"14:00");
function itemTime(plan,it){
  const L=plan.items.filter(x=>x.b===it.b&&!x.gone);const k=L.indexOf(it);
  return blockStart(it.b)+Math.max(0,k)*cfg.gap;
}
function groupText(it){
  const h=house(it.h);
  const o=OPENERS[it.o%OPENERS.length].replace("{saludo}",cap(saludo()));
  return o+"\n\n"+h.texto+(h.mapa?`\n\n📍 ${h.mapa}`:"");
}
function duePending(){
  const p=plans[todayKey()];if(!p)return 0;const nm=nowMin();
  return p.items.filter(i=>!i.done&&!i.gone&&blockStart(i.b)<=nm).length;
}
function currentItem(plan){
  const nm=nowMin();
  const pend=plan.items.filter(i=>!i.done&&!i.gone);
  return pend.find(i=>blockStart(i.b)<=nm)||pend[0]||null;
}
function weekDays(){
  const d=new Date(),wd=(d.getDay()+6)%7;
  return [...Array(7)].map((_,i)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()-wd+i));
}
const thisWeek = () => G.weeks[weekKey(new Date())]||{grupos:0,pub:0,conv:0,vis:0};

/* ---------- copiar ---------- */
function copySync(text){
  const ta=document.createElement("textarea");ta.value=text;ta.setAttribute("readonly","");
  ta.style.cssText="position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;font-size:16px;opacity:.01;z-index:-1";
  document.body.appendChild(ta);ta.focus({preventScroll:true});ta.select();ta.setSelectionRange(0,text.length);
  let ok=false;try{ok=document.execCommand("copy")}catch(e){}
  ta.remove();return ok;
}
function flash(btn){
  if(!btn)return;
  const lbl=btn.querySelector(".copy");
  btn.classList.add("done");
  if(lbl){const o=lbl.dataset.label||lbl.textContent;lbl.dataset.label=o;lbl.classList.add("done");lbl.textContent="✓ Copiado";
    setTimeout(()=>{btn.classList.remove("done");lbl.classList.remove("done");lbl.textContent=o},1500)}
  else setTimeout(()=>btn.classList.remove("done"),1500);
}
function copy(text,btn,msg,after){
  const ok=()=>{flash(btn);haptic();toast(msg||"Copiado ✓");after&&after()};
  if(copySync(text)) return ok();
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok).catch(()=>copySheet(text,after));
  else copySheet(text,after);
}
function openSheet(html){
  closeSheet();
  const s=document.createElement("div");s.className="sheet";s.id="sheet";
  s.innerHTML=`<div class="sheet-box" role="dialog" aria-modal="true">${html}</div>`;
  s.addEventListener("click",e=>{if(e.target===s)closeSheet()});
  document.body.appendChild(s);return s;
}
function closeSheet(){const s=$("#sheet");if(s)s.remove()}
function copySheet(text,after){
  const s=openSheet(`<b>Tu celular no dejó copiar solo. Toca “Copiar” aquí abajo.</b><textarea class="copyarea"></textarea><div class="row2"><button class="btn ghost" data-x>Cerrar</button><button class="btn primary" data-c>Copiar</button></div>`);
  const ta=s.querySelector("textarea");ta.value=text;
  const sel=()=>{ta.focus();ta.select();ta.setSelectionRange(0,text.length)};sel();
  s.querySelector("[data-c]").onclick=()=>{sel();let ok=false;try{ok=document.execCommand("copy")}catch(e){}if(ok){toast("Copiado ✓");closeSheet();after&&after()}};
  s.querySelector("[data-x]").onclick=closeSheet;
}
let tt;
function toast(m,action){
  const t=$("#toast");t.innerHTML=`<span>${esc(m)}</span>${action?`<button>${esc(action.label)}</button>`:""}`;
  t.classList.toggle("act",!!action);t.classList.add("show");clearTimeout(tt);
  if(action)t.querySelector("button").onclick=()=>{t.classList.remove("show");action.fn()};
  tt=setTimeout(()=>t.classList.remove("show"),action?5000:1900);
}

/* ---------- fotos ---------- */
const fileCache={};
function prepFiles(h){
  if(fileCache[h.id])return;
  fileCache[h.id]="loading";
  Promise.all(h.fotos.map((n,i)=>fetch(foto(h,n)).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>new File([b],`${h.id}-${i+1}.jpg`,{type:"image/jpeg"}))))
    .then(f=>fileCache[h.id]=f).catch(()=>delete fileCache[h.id]);
}
function saveAll(h,btn,after){
  const files=fileCache[h.id];
  if(files==="loading"){toast("Preparando fotos… toca otra vez en un segundo");return}
  if(Array.isArray(files)&&navigator.canShare&&navigator.canShare({files})){
    navigator.share({files}).then(()=>{flash(btn);toast("Fotos guardadas ✓");after&&after()})
      .catch(e=>{if(e&&e.name==="AbortError")return;openLB(h,0,after)});
  } else {prepFiles(h);openLB(h,0,after)}
}
function openLB(h,i,after){
  const lb=document.createElement("div");lb.className="lb";lb.setAttribute("role","dialog");
  lb.innerHTML=`<div class="lb-top"><span id="lbn">${i+1} / ${h.fotos.length}</span><span style="display:flex;gap:8px"><a id="lbo" href="${foto(h,h.fotos[i])}" target="_blank" rel="noopener">Abrir original</a><button id="lbx">${after?"Listo":"Cerrar"}</button></span></div>
  <div class="lb-track">${h.fotos.map(n=>`<div><img src="${foto(h,n)}" alt=""></div>`).join("")}</div>
  <div class="lb-foot">Desliza para ver más · mantén presionada una foto para guardarla</div>`;
  document.body.appendChild(lb);document.body.style.overflow="hidden";
  const tr=lb.querySelector(".lb-track");requestAnimationFrame(()=>tr.scrollLeft=i*tr.clientWidth);
  tr.addEventListener("scroll",()=>{const k=Math.round(tr.scrollLeft/tr.clientWidth);lb.querySelector("#lbn").textContent=`${k+1} / ${h.fotos.length}`;lb.querySelector("#lbo").href=foto(h,h.fotos[k])},{passive:true});
  const close=()=>{lb.remove();document.body.style.overflow="";document.removeEventListener("keydown",key);after&&after()};
  const key=e=>{if(e.key==="Escape")close()};
  lb.querySelector("#lbx").onclick=close;document.addEventListener("keydown",key);
}

/* ======================================================================
   EFECTOS: confeti, +XP, ventanas de festejo (en fila, una tras otra)
   ====================================================================== */
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function confetti(big){
  if(reduced())return;
  const c=document.createElement("canvas");c.className="confetti";document.body.appendChild(c);
  const dpr=Math.min(2,devicePixelRatio||1),W=c.clientWidth||innerWidth,H=c.clientHeight||innerHeight;
  c.width=W*dpr;c.height=H*dpr;const x=c.getContext("2d");x.scale(dpr,dpr);
  const ac=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()||"#FF6A1A";
  const ac2=getComputedStyle(document.documentElement).getPropertyValue("--accent2").trim()||"#FFA048";
  const cols=[ac,ac2,"#111111","#FFFFFF","#FFD166"];
  const P=[...Array(big?180:110)].map(()=>({x:W/2+(Math.random()-.5)*80,y:H*.35,vx:(Math.random()-.5)*14,vy:-Math.random()*15-5,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.35,w:6+Math.random()*6,h:8+Math.random()*8,c:cols[Math.random()*cols.length|0]}));
  const t0=performance.now();
  (function f(t){
    x.clearRect(0,0,W,H);
    P.forEach(p=>{p.vy+=.38;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.r*2)));x.restore()});
    if(t-t0<2700)requestAnimationFrame(f);else c.remove();
  })(t0);
}
function xpPop(n,label){
  const d=document.createElement("div");d.className="xppop";
  d.innerHTML=`<b>+${num(n)} XP</b>${label?`<span>${esc(label)}</span>`:""}`;
  document.body.appendChild(d);setTimeout(()=>d.remove(),1400);
  const bar=$(".topxp");if(bar){bar.classList.remove("bump");void bar.offsetWidth;bar.classList.add("bump")}
}
const modalQ=[];
function modal(spec){modalQ.push(spec);if(modalQ.length===1)showModal()}
function showModal(){
  const s=modalQ[0];if(!s)return;
  const d=document.createElement("div");d.className="party";
  d.innerHTML=`<div class="party-box ${s.cls||""}" role="alertdialog" aria-label="${esc(s.title)}">
    <div class="pe">${s.art}</div><h2>${esc(s.title)}</h2>${s.html?`<div class="pt">${s.html}</div>`:`<p>${esc(s.text||"")}</p>`}
    <div class="pbtns">${(s.buttons||[{label:"Seguir"}]).map((b,i)=>`<button class="btn ${i===0?"primary":"ghost"}" data-i="${i}">${esc(b.label)}</button>`).join("")}</div></div>`;
  document.body.appendChild(d);
  if(s.confetti)confetti(s.confetti==="big");
  if(s.sound)sfx(s.sound);haptic();
  if(s.onShow)s.onShow(d);
  d.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{
    const fn=((s.buttons||[])[+b.dataset.i]||{}).fn;
    d.remove();modalQ.shift();
    if(fn)fn();
    setTimeout(showModal,120);
  });
}

/* ======================================================================
   ACCIONES QUE DAN XP
   ====================================================================== */
const XP_LABEL={grupo:"Publicaste en un grupo",marketplace:"Marketplace",interesado:"Nuevo interesado",seguimiento:"Seguimiento enviado",visitaAgendada:"Visita agendada",visitaHecha:"Visita hecha",apartado:"Apartado",venta:"Venta"};
const LOG_KEY={interesado:"int",seguimiento:"seg",visitaAgendada:"agen",visitaHecha:"vis",marketplace:"pub"};
function gain(kind,houseId){
  hs(houseId)[LOG_KEY[kind]].push(new Date().toISOString());save();
  const n=XP[kind]*(G.x2today?2:1);
  render();xpPop(n,XP_LABEL[kind]);sfx("xp");haptic();checkProgress();
}
function undoLast(kind,houseId){
  const a=hs(houseId)[LOG_KEY[kind]];if(!a.length)return;
  a.pop();save();render();toast(`Quitado: ${XP_LABEL[kind]} (−${XP[kind]} XP)`);
}
function setUnitStatus(uid,st){
  const u=unit(uid),s=us(uid),prev=s.status;if(prev===st)return;
  const now=new Date().toISOString();
  s.status=st;
  if(st==="disp"){s.apar=null;s.vend=null}
  if(st==="apar"){s.apar ||= now;s.vend=null}
  if(st==="vend"){s.apar ||= now;s.vend ||= now}
  const h=house(u.house);hs(h.id).status=houseStatus(h);save();rebuildToday();
  const before=G.xp;render();
  const won=G.xp-before;
  if(prev==="disp"&&st!=="disp") bossFall(u,st,won);
  else if(prev==="apar"&&st==="vend"){modal({art:"💰",title:"¡Vendida!",text:`${u.nombre}. +${num(won)} XP y ${money(COMISION)} de comisión.`,confetti:"big",sound:"level"})}
  else toast("Estado actualizado");
  checkProgress();
}
function bossFall(u,st,won){
  modal({cls:"m-boss",art:`<div class="bossfall">${u.jefe.e}</div><div class="bosswin">${st==="vend"?"👑":"🔑"}</div>`,title:`¡Derrotaste a ${u.jefe.n}!`,
    text:`${u.nombre} ${st==="vend"?"vendida":"apartada"}. Mundo conquistado. +${num(won)} XP${st==="vend"?` · ${money(COMISION)} de comisión`:""}.`,
    confetti:"big",sound:"boss"});
}

/* revisa: subir de nivel, medallas, premios, misiones, juego completado */
function checkProgress(){
  // nivel
  if(!game.seen.level)game.seen.level=G.level;
  if(G.level>game.seen.level){
    const from=game.seen.level,to=G.level;game.seen.level=to;
    const un=UNLOCKS.filter(u=>u.lv>from&&u.lv<=to);
    const rankUp=rankOf(to).name!==rankOf(from).name;
    modal({art:`<div class="lvbadge">${to}</div>`,title:`¡Subiste a nivel ${to}!`,
      html:`<p>${rankUp?`Ahora eres <b>${esc(rankOf(to).name)}</b>.`:`Sigues como ${esc(rankOf(to).name)}.`}</p>${un.length?`<div class="unl">${un.map(u=>`<span class="pill acc">🔓 ${esc(unlockName(u))}</span>`).join("")}</div>`:""}`,
      confetti:"big",sound:"level",buttons:un.length?[{label:"Seguir"},{label:"Personalizar",fn:()=>go({tab:"logros"})}]:null});
  }
  // medallas
  const earned=earnedMedals().map(m=>m.id);
  if(game.seen.medals===null)game.seen.medals=[];
  const nuevas=earned.filter(id=>!game.seen.medals.includes(id));
  if(nuevas.length){
    game.seen.medals=earned;
    const ms=nuevas.map(id=>MEDALS.find(m=>m.id===id));
    modal({art:`<div class="medalbig">${ms[0].e}</div>`,title:ms.length>1?`¡${ms.length} medallas nuevas!`:"¡Medalla nueva!",
      html:ms.map(m=>`<p><b>${m.e} ${esc(m.n)}</b><br><span class="muted">${esc(m.d)}</span></p>`).join(""),confetti:true,sound:"medal"});
  }
  // premios reales
  game.prizes.forEach(p=>{
    const [a,b]=prizeProgress(p);
    if(a>=b&&!game.seen.prizes.includes(p.id)){
      game.seen.prizes.push(p.id);
      modal({cls:"m-prize",art:`<div class="giftopen">🎁</div>`,title:"¡Premio desbloqueado!",html:`<p class="bigprize">${esc(p.name)}</p><p class="muted">Lo ganaste: ${esc(prizeGoalTxt(p))}. Te lo mereces.</p>`,confetti:"big",sound:"chest"});
    }
  });
  // misiones del día
  const t=todayKey(),p=plans[t];
  if(p&&p.missions&&!p.missionsSeen&&p.missions.every(m=>missionDone(m,t))){
    p.missionsSeen=true;savePlans();
    modal({art:`<div class="chestbig shake">🎁</div>`,title:"¡Misiones cumplidas!",text:"Ganaste el cofre del día. Ábrelo.",sound:"medal",
      buttons:[{label:"Abrir cofre",fn:openChest},{label:"Luego"}]});
  }
  // juego completado
  if(G.gameDone&&!game.seen.fin){
    game.seen.fin=true;
    modal({art:"🏆",title:"¡Juego completado!",text:"Vendiste todas las casas de la temporada.",confetti:"big",sound:"level",buttons:[{label:"Ver resumen",fn:()=>go({tab:"fin"})}]});
  }
  saveGame();
}

/* ---------- cofre ---------- */
function openChest(){
  const t=todayKey(),p=plans[t];if(!p||p.chest)return;
  if(!p.missions.every(m=>missionDone(m,t))){toast("Primero cumple las 3 misiones");return}
  const r=Math.random(),now=new Date().toISOString();let reward;
  const themes=Object.keys(ACCENTS).filter(k=>ACCENTS[k].chest&&!game.chestThemes.includes(k));
  if(r<.40) reward={type:"xp",xp:[50,75,100,150][Math.random()*4|0]};
  else if(r<.62) reward={type:"x2"};
  else if(r<.80&&themes.length) reward={type:"theme",id:themes[Math.random()*themes.length|0]};
  else reward={type:"shield"};
  if(reward.type==="xp") game.bonus.push({t:now,xp:reward.xp,why:"Cofre"});
  if(reward.type==="x2"){const d=new Date();d.setDate(d.getDate()+1);game.x2.push(ymd(d))}
  if(reward.type==="theme") game.chestThemes.push(reward.id);
  if(reward.type==="shield") game.shields.push(now);
  p.chest={t:now,reward};savePlans();saveGame();
  const txt=rewardTxt(reward);
  modal({cls:"m-chest",art:`<div class="chestbig open">🎁</div>`,title:txt.t,html:`<p>${txt.d}</p><p class="study">✓ Ya cumpliste por hoy. Vete a estudiar 📚<br><span class="muted">Mañana te espera otro cofre.</span></p>`,
    confetti:"big",sound:"chest",buttons:reward.type==="theme"?[{label:"Usar tema",fn:()=>{game.look.accent=reward.id;saveGame();render()}},{label:"Luego"}]:null});
  render();checkProgress();
}
function rewardTxt(r){
  if(r.type==="xp")return {t:`+${r.xp} XP extra`,d:"XP directo a tu barra."};
  if(r.type==="x2")return {t:"XP x2 mañana",d:"Todo lo que hagas mañana vale doble."};
  if(r.type==="theme")return {t:`Tema ${ACCENTS[r.id].n}`,d:"Un color nuevo para tu app. Cámbialo en Logros."};
  return {t:"Escudo de racha 🛡️",d:"Si un día no cumples, se gasta el escudo y tu racha sigue."};
}

/* ======================================================================
   VISTAS
   ====================================================================== */
let view={tab:"inicio"};
function go(v){view=v;closeSheet();render();window.scrollTo(0,0)}
function render(){
  ensureToday();calc();applyLook();
  const t=view.tab;let html;
  if(t==="inicio") html=inicioView();
  else if(t==="casas") html=view.id?houseView(house(view.id)):casasView();
  else if(t==="publicar") html=publicarView();
  else if(t==="logros") html=logrosView();
  else if(t==="perfil") html=view.sub==="grupos"?gruposView():perfilView();
  else if(t==="fin") html=finView();
  const detail=(t==="casas"&&view.id)||t==="fin";
  $("#app").innerHTML=(detail?"":t==="inicio"?`<div class="safe-top"></div>`:topXP())+html;
  document.body.classList.toggle("nonav",!!detail);
  renderNav();
}
function renderNav(){
  const due=duePending();
  const it=(k,ic,l)=>`<button class="nv ${view.tab===k?"on":""}" data-act="tab" data-t="${k}" ${view.tab===k?'aria-current="page"':""}>${ic}<span>${l}</span></button>`;
  $("#nav").innerHTML=`<div class="nav-in">${it("inicio",IC.home,"Inicio")}${it("casas",IC.map,"Casas")}
    <button class="nv-center ${view.tab==="publicar"?"on":""}" data-act="tab" data-t="publicar" aria-label="Publicar ahora"><span class="nv-c">${IC.send}</span>${due?`<span class="dot">${due}</span>`:""}</button>
    ${it("logros",IC.trophy,"Logros")}${it("perfil",IC.user,"Perfil")}</div>`;
}
function applyLook(){
  const a=ACCENTS[game.look.accent]&&owned("accent",game.look.accent)?ACCENTS[game.look.accent]:ACCENTS.naranja;
  const r=document.documentElement;
  r.style.setProperty("--accent",a.a);r.style.setProperty("--accent2",a.b);
  if(cfg.theme==="auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme",cfg.theme);
  const bg=owned("bg",game.look.bg)?game.look.bg:"liso";
  document.body.className=document.body.className.replace(/\bbg-\S+/g,"").trim()+" bg-"+bg;
  const dark=cfg.theme==="dark"||(cfg.theme==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.content=dark?"#0B0B0C":"#F2F2F2");
}
const myFrame = () => game.look.frame==="auto"||!owned("frame",game.look.frame)?bestOwned("frame"):game.look.frame;
const myIcon  = () => AVATARS[game.look.icon==="auto"||!owned("icon",game.look.icon)?bestOwned("icon"):game.look.icon];
const avatar = (size) => `<span class="av f-${myFrame()} ${size||""}">${myIcon()}</span>`;

/* barra de XP fija arriba en todas las pantallas */
function topXP(){
  return `<div class="topxp" data-act="tab" data-t="logros" role="button" aria-label="Nivel ${G.level}, ${G.into} de ${G.need} XP">
    <span class="lvchip">Nv ${G.level}</span>
    <div class="xpbar"><i style="width:${pct(G.into,G.need)}%"></i></div>
    <span class="xpleft">${num(G.need-G.into)} XP → Nv ${G.level+1}</span>
    ${G.x2today?`<span class="x2">x2</span>`:""}
  </div>`;
}
function fireSize(n){return n>=30?"f4":n>=14?"f3":n>=7?"f2":n>=1?"f1":"f0"}
const streakChip = () => `<span class="streak ${fireSize(G.streak)}" title="Racha">${IC.flame}<b>${G.streak}</b></span>`;

/* ----- INICIO ----- */
function inicioView(){
  const t=todayKey(),p=plans[t],ms=p.missions||[];
  const left=ms.filter(m=>!missionDone(m,t)).length;
  const due=duePending();
  const wk=thisWeek();
  const ganado=G.sold*COMISION,activos=G.active.filter(u=>us(u.id).status!=="vend").length,enJuego=activos*COMISION;
  // cofre + misiones de hoy (una sola tarjeta oscura)
  const mrow=m=>{const [a,b]=missionProgress(m,t),ok=a>=b;return `<div class="mrow ${ok?"ok":""}"><span class="mchk">${ok?IC.check:""}</span><span class="mt">${esc(MISSION_TXT[m.type](m))}</span><span class="mp">${Math.min(a,b)}/${b}</span></div>`};
  let chestHead;
  if(p.chest) chestHead=`<span class="eyebrow">${IC.check} Listo por hoy · cofre: ${esc(rewardTxt(p.chest.reward).t)}</span><h3>Ya cumpliste. Vete a estudiar 📚</h3>`;
  else if(!left) chestHead=`<span class="eyebrow">${IC.sparkles} Cofre del día</span><h3>¡Tu cofre está listo!</h3>`;
  else chestHead=`<span class="eyebrow">${IC.sparkles} Cofre del día</span><h3>Te ${left===1?"falta 1 misión":`faltan ${left} misiones`}</h3>`;
  // botón grande: siguiente bloque
  const cur=currentItem(p);let cta;
  if(!cur) cta=`<button class="btn dark big cta" data-act="tab" data-t="publicar">${IC.check} Grupos de hoy listos</button>`;
  else{
    const b=cur.b,start=blockStart(b),n=p.items.filter(i=>i.b===b&&!i.done&&!i.gone).length,now=start<=nowMin();
    cta=`<button class="btn primary big cta" data-act="tab" data-t="publicar"><span class="ctal">${IC.send}<span><b>Publicar ahora</b><small>${now?"Ya toca: ":"Siguiente: "}bloque de las ${fmtMin(start)}</small></span></span><span class="ctan"><b>${n}</b><small>grupo${n===1?"":"s"}</small></span></button>`;
  }
  const goal=(label,val,target,bonus)=>`<div class="goal ${val>=target?"hit":""}"><div class="gl"><span>${label}</span><b>${val}<small> / ${target}</small></b></div><div class="bar"><i style="width:${pct(val,target)}%"></i></div><small class="gb">${val>=target?"✓ ":""}+${bonus} XP</small></div>`;
  return `
  <header class="hdr compact">
    <div class="hdr-l">${avatar()}<div><h1>Hola, Ivan</h1><p class="loc">${IC.pin} Tampico · Madero</p></div></div>
    <div class="hdr-r">
      <button class="rbtn" data-act="quick" aria-label="Registrar algo">${IC.plus}</button>
      <button class="rbtn" data-act="tab" data-t="publicar" aria-label="Pendientes">${IC.bell}${due?`<span class="dot">${due}</span>`:""}</button>
    </div>
  </header>

  <button class="card lvline" data-act="tab" data-t="logros" aria-label="Nivel ${G.level}, ${G.rank}">
    <span class="lvnum sm">${G.level}</span>
    <span class="lvmid"><span class="lvrow"><b>${esc(G.rank)}</b><small>${G.x2today?"⚡ x2 · ":""}+${num(G.today)} hoy</small></span>
      <span class="xpbar"><i style="width:${pct(G.into,G.need)}%"></i></span>
      <small>${num(G.need-G.into)} XP para nivel ${G.level+1}</small></span>
    <span class="lvchips">${streakChip()}<span class="shields" title="Escudos de racha">${IC.shield}<b>${G.shieldsLeft}</b></span></span>
  </button>

  <section class="promo chestcard ${p.chest?"done":""}">
    <div class="ch-top"><div class="pr-l">${chestHead}</div><div class="pr-art ${!left&&!p.chest?"shake":""}">${p.chest?"📚":"🎁"}</div></div>
    <div class="ch-ms">${ms.map(mrow).join("")}</div>
    ${!left&&!p.chest?`<button class="btn primary full" data-act="chest">Abrir cofre</button>`:""}
  </section>

  ${cta}

  ${missionCard()}

  <section class="section">
    <div class="sechead"><h3>Metas de la semana</h3><span class="muted sm">bonus de XP</span></div>
    <div class="card goals">
      ${goal("Publicaciones en grupos",wk.grupos||0,cfg.goals.grupos,BONUS_SEMANA.grupos)}
      ${goal("Publicaciones en Marketplace",wk.pub,cfg.goals.pub,BONUS_SEMANA.pub)}
      ${goal("Conversaciones",wk.conv,cfg.goals.conv,BONUS_SEMANA.conv)}
      ${goal("Visitas",wk.vis,cfg.goals.vis,BONUS_SEMANA.vis)}
    </div>
  </section>

  <section class="section">
    <div class="sechead"><h3>Dinero en juego</h3><span class="muted sm">${money(COMISION)} por casa</span></div>
    <div class="card money">
      <div class="mtop"><div><small>Por ganar</small><b>${money(enJuego)}</b></div><div class="mr"><small>Ya ganado</small><b>${money(ganado)}</b></div></div>
      <div class="bar"><i style="width:${pct(ganado,ganado+enJuego)}%"></i></div>
      <div class="mleg"><span>${G.sold} vendida${G.sold===1?"":"s"}</span><span>${activos} por vender</span></div>
    </div>
  </section>
  <p class="quote">${esc(FRASES[dayNum(t)%FRASES.length])}</p>`;
}
function missionCard(){
  const cands=G.active.filter(u=>us(u.id).status==="disp");
  if(!cands.length)return "";
  const scored=cands.map(u=>{const h=house(u.house);return {u,h,st:houseStage(h),last:G.last[h.id]||""}})
    .sort((a,b)=>b.st-a.st||(b.last>a.last?1:b.last<a.last?-1:0));
  const {u,h,st}=scored[0];
  const steps=[["Publicar",IC.mega],["Interesado",IC.heart],["Visita",IC.door],["Apartado",IC.key]];
  const nextTxt=["Publícala en un grupo · +10 XP","Consigue un interesado · +25 XP","Agenda una visita · +100 XP","Consigue el apartado · +1,000 XP"][Math.min(st,3)];
  return `<section class="section">
    <div class="sechead"><h3>Misión actual</h3><button class="linkbtn" data-act="tab" data-t="casas">Ver todas</button></div>
    <button class="card mcard" data-act="open" data-id="${h.id}">
      <div class="mhead"><img class="mth" src="${cover(h)}" alt=""><div class="mn"><b>${esc(u.nombre)}</b><small>${esc(h.precio)} · Jefe: ${esc(u.jefe.n)}</small></div><span class="pill">${bossHP(u)}% vida</span></div>
      <div class="track">${steps.map(([l,ic],i)=>`<div class="tstep ${i<st?"done":i===st?"cur":""}">${i<st?`<span class="tc">${IC.check}</span>`:i===st?`<span class="tc ph"><img src="${cover(h)}" alt=""></span>`:`<span class="tc">${ic}</span>`}<small>${l}</small></div>${i<3?`<i class="tl ${i<st?"done":""}"></i>`:""}`).join("")}</div>
      <div class="mfoot"><div><small>${IC.pin} Zona</small><b>${esc(h.chip||"Madero")}</b></div><div><small>${IC.target} Siguiente</small><b>${esc(nextTxt)}</b></div><img class="mphoto" src="${foto(h,h.fotos[1]||h.fotos[0])}" alt=""></div>
    </button></section>`;
}

/* ----- CASAS (mundos) ----- */
function casasView(){
  const f=view.f||"all";
  const list=G.active.filter(u=>f==="all"||u.house===f);
  const conq=G.active.filter(u=>us(u.id).status!=="disp").length;
  return `
  <header class="hdr"><div><h1>Mundos</h1><p class="loc">Temporada ${game.season} · ${conq}/${G.active.length} conquistados</p></div>
    <div class="hdr-r">${streakChip()}</div></header>
  <div class="chips">${[["all","Todas"],...HOUSES.filter(h=>G.active.some(u=>u.house===h.id)).map(h=>[h.id,h.chip||h.nombre])].map(([k,l])=>`<button class="chip ${f===k?"on":""}" data-act="filter" data-f="${k}">${esc(l)}</button>`).join("")}</div>
  ${list.length?`<div class="grid">${list.map(u=>{const h=house(u.house),s=us(u.id),hp=bossHP(u),hh=hs(h.id);
    return `<button class="world ${s.status!=="disp"?"won":""}" data-act="open" data-id="${h.id}">
      <div class="wimg"><img src="${cover(h)}" alt="" loading="lazy"><span class="boss">${u.jefe.e}</span>${s.status!=="disp"?`<span class="crown">${s.status==="vend"?"👑 Vendida":"🔑 Apartada"}</span>`:""}</div>
      <b class="wn">${esc(u.nombre)}</b>
      <span class="wp">${esc(h.precio)}</span>
      <small class="wd">${s.status!=="disp"?"Mundo conquistado":hh.int.length?`${hh.int.length} interesado${hh.int.length>1?"s":""}`:"Sin interesados aún"}</small>
      <div class="hp"><div class="bar"><i style="width:${hp}%"></i></div><small>${s.status!=="disp"?"Jefe derrotado":`Jefe ${hp}%`}</small></div>
    </button>`}).join("")}</div>`
  :`<div class="empty"><div class="e">🗺️</div><h3>No hay mundos nuevos</h3><p>Pídele a Claude Code que agregue casas nuevas en data.js para la Temporada ${game.season}.</p></div>`}`;
}

/* Respuestas con tu forma de escribir: cortas, sin rellenos y sin preguntar por la visita en cada mensaje */
function buildReplies(h){
  const pre = !h.precioNum;
  const otras = HOUSES.filter(o=>o.id!==h.id && hs(o.id).status==="disp")
    .map(o=>`- ${o.nombre}, ${o.precio} (${o.resumen.replace(/ · /g,", ")})`).join("\n");
  const r = [
    {id:"hola", t:"Hola, ¿sigue disponible?", main:true, x: pre
      ? `Hola, ${saludo()}, sí, todavía hay disponibles. ¿Gustaría agendar una visita para conocerlas?`
      : h.quedan ? `Hola, ${saludo()}, sí, ${h.quedan}. ¿Gustaría agendar una visita para conocerlas?`
      : `Hola, ${saludo()}, sí sigue en venta. ¿Gustaría agendar una visita para conocerla?`},
    {id:"precio", t:"¿Cuánto cuesta?", x: pre
      ? `Ahorita le confirmo el precio de preventa y se lo paso por aquí.`
      : `Está en ${h.precio}.`},
    {id:"ubicacion", t:"¿Dónde está?", x: h.mapa
      ? `Está ${h.ubic}. Aquí le paso la ubicación:\n${h.mapa}`
      : `Está ${h.ubic}.`},
    {id:"detalle", t:"¿Cómo es? / ¿Cuántas recámaras?", x:h.detalle},
    {id:"visita", t:"¿Qué día puede ser la visita?", x:`Claro, estos son los días y horarios en los que se puede:\n\nLunes de 5pm en adelante\nMartes por la tarde, a cualquier hora\nDe miércoles a domingo desde las 9am en adelante\n\n¿Qué día le queda mejor?`},
    {id:"fotos", t:"Me pide más fotos", x:`Sí, claro, ahorita se las mando.`},
    {id:"nose", t:"No sé la respuesta", x:`Déjeme confirmarlo y ahorita le aviso.`},
    {id:"seguimiento", t:"No volvió a contestar", x:`Hola, ${saludo()}, ¿todavía le interesa ${h.corto}? Sigue disponible por si gusta ir a verla.`},
    {id:"info", t:"Mándame toda la info", x:h.texto + (h.mapa?`\n\n📍 ${h.mapa}`:"")},
  ];
  if(otras) r.push({id:"otras", t:"Ya se vendió → ofrecer otras",
    x:`Esa ya se apartó, pero tengo otras aquí en Madero:\n${otras}\n\n¿Le interesa alguna?`});
  return r;
}
function houseView(h){
  const s=hs(h.id),lp=lastPub(h.id),us_=unitsOf(h);
  const fields=[["Título","titulo",h.titulo],...(h.precioNum?[["Precio","precio",h.precioNum]]:[]),["Descripción","texto",h.texto],["Ubicación","zona",h.zona]];
  if(h.mapa) fields.push(["Link de Google Maps","mapa",h.mapa]);
  const counter=(kind,label,ic,n)=>`<div class="ctr"><span class="ci">${ic}</span><div class="cl"><b>${n}</b><small>${label}</small><em>+${XP[kind]} XP</em></div>
    <button class="cbtn m" data-act="undo" data-k="${kind}" aria-label="Quitar ${label}" ${n?"":"disabled"}>${IC.minus}</button><button class="cbtn" data-act="gain" data-k="${kind}" aria-label="Sumar ${label}">${IC.plus}</button></div>`;
  return `
  <div class="dtop"><button class="rbtn" data-act="tab" data-t="casas" aria-label="Regresar">${IC.back}</button><h2>Detalle</h2><span class="rbtn ghostspace"></span></div>
  <div class="dhero" data-act="lb" data-i="0" role="button" aria-label="Ver fotos"><img src="${cover(h)}" alt=""><span class="cnt">${IC.img} ${h.fotos.length}</span></div>
  <div class="strip">${h.fotos.slice(1).map((n,i)=>`<button data-act="lb" data-i="${i+1}" aria-label="Foto ${i+2}"><img src="${foto(h,n)}" alt="" loading="lazy"></button>`).join("")}</div>

  <section class="card dinfo">
    <div class="dl"><h2>${esc(h.nombre)}</h2><p class="muted">${esc(h.resumen)}</p><b class="dprice">${esc(h.precio)}</b></div>
    <p class="addr">${IC.pin} ${esc(h.zona)}</p>
  </section>

  <section class="card">
    <div class="sechead"><h3>Publicar</h3><span class="muted sm">Marketplace</span></div>
    <div class="rows">
      <button class="row" data-act="savefotos"><div><b>Fotos</b><span class="t">Guardar las ${h.fotos.length} fotos (la primera es la portada)</span></div><span class="copy">Guardar</span></button>
      ${fields.map(([k,key,v])=>`<button class="row ${key==="texto"?"main":""}" data-act="field" data-k="${key}"><div><b>${k}</b><span class="t">${esc(v)}</span></div><span class="copy">Copiar</span></button>`).join("")}
      <button class="row" data-act="group"><div><b>Para un grupo de Facebook</b><span class="t">Frase de apertura + descripción + mapa</span></div><span class="copy">Copiar</span></button>
    </div>
    <div class="small">${lp?"Última vez en Marketplace: "+(days(lp)===0?"hoy":"hace "+days(lp)+" días")+` · ${s.pub.length} en total`:"Todavía no la has publicado en Marketplace"}${s.pub.length?` · <button class="linkbtn sm" data-act="undo" data-k="marketplace">deshacer última</button>`:""}</div>
  </section>

  <section class="card">
    <div class="sechead"><h3>Responder mensajes</h3><button class="linkbtn" data-act="toggleedit">${view.editing?"Cancelar":"Editar textos"}</button></div>
    <p class="sub">Toca el que necesites y pégalo en Messenger.</p>
    <div class="rows">
      ${buildReplies(h).map(r=>view.editing
        ? `<div class="ed"><label for="rp-${r.id}">${esc(r.t)}</label><textarea id="rp-${r.id}" data-rid="${r.id}">${esc(replyText(h,r))}</textarea></div>`
        : `<button class="row ${r.main?"main":""}" data-act="reply" data-rid="${r.id}"><div><b>${esc(r.t)}</b><span class="t">${esc(replyText(h,r))}</span></div><span class="copy">Copiar</span></button>`).join("")}
      ${view.editing?`<div class="row2"><button class="btn ghost" data-act="resetreplies">Volver a los originales</button><button class="btn primary" data-act="saveedit">Guardar</button></div>`:""}
    </div>
  </section>

  <section class="card">
    <div class="sechead"><h3>Estadísticas</h3><span class="muted sm">súmale cuando pase de verdad</span></div>
    ${us_.map(u=>{const hp=bossHP(u),st=us(u.id).status;return `<div class="bossrow ${st!=="disp"?"won":""}"><span class="be">${u.jefe.e}</span><div class="bi"><b>${esc(u.jefe.n)}</b><small>${us_.length>1?esc(u.nombre)+" · ":""}${st!=="disp"?(st==="vend"?"Vendida 👑":"Apartada 🔑"):`${hp}% de vida · sólo cae con el apartado`}</small><div class="bar"><i style="width:${hp}%"></i></div></div></div>`}).join("")}
    <div class="ctrs" style="margin-top:8px">
      ${counter("interesado","Interesados",IC.heart,s.int.length)}
      ${counter("seguimiento","Seguimientos",IC.send,s.seg.length)}
      ${counter("visitaAgendada","Visitas agendadas",IC.cal,s.agen.length)}
      ${counter("visitaHecha","Visitas hechas",IC.door,s.vis.length)}
    </div>
  </section>

  ${h.video?`<section class="card"><h3 class="h3">Video</h3><video src="fotos/${h.id}/video.mp4" controls playsinline preload="none" poster="${cover(h)}"></video><div class="small"><a href="fotos/${h.id}/video.mp4" target="_blank" rel="noopener">Abrir video aparte</a> para guardarlo.</div></section>`:""}

  <section class="card">
    <h3 class="h3">Estado</h3>
    ${us_.map(u=>`${us_.length>1?`<p class="ulabel">${esc(u.nombre)}</p>`:""}<div class="pills">${Object.entries(STATUS).map(([k,[l]])=>`<button class="ptab ${us(u.id).status===k?"on":""}" data-act="status" data-u="${u.id}" data-s="${k}">${l}</button>`).join("")}</div>`).join("")}
    <p class="small">Vendida = sale sola de la rotación de grupos. Apartada = sale menos seguido. Apartar o vender tumba al jefe (+1,000 XP).</p>
  </section>

  <div class="sticky"><button class="btn primary big" data-act="published">${IC.check} Ya la publiqué en Marketplace <small>+${XP.marketplace} XP</small></button></div>`;
}

/* ----- PUBLICAR AHORA (botón central) ----- */
function publicarView(){
  const t=todayKey(),plan=plans[t],items=plan.items.filter(i=>!i.gone);
  const done=items.filter(i=>i.done).length,total=items.length;
  const cur=currentItem(plan),nm=nowMin(),tab=view.ptab||"ahora";
  const missionsOk=(plan.missions||[]).every(m=>missionDone(m,t));
  let next;
  if(!total) next=`<div class="nextup">No hay grupos activos. Actívalos en Perfil → Grupos.</div>`;
  else if(done===total) next=`<div class="nextup fin">${IC.check} Todos los grupos de hoy listos.</div>`;
  else{
    const b=cur.b,start=blockStart(b),left=plan.items.filter(i=>i.b===b&&!i.done&&!i.gone).length;
    if(start<=nm) next=`<div class="nextup now">${IC.clock} Ya toca: bloque de las ${fmtMin(start)} · faltan ${left}</div>`;
    else{const m=start-nm;next=`<div class="nextup">${IC.clock} Siguiente bloque a las ${fmtMin(start)} · en ${m>=60?Math.floor(m/60)+" h ":""}${m%60} min</div>`}
  }
  const photos=plan.photos||{};
  let body="";
  if(tab==="ahora"){
    const b=cur?cur.b:null;
    const L=b==null?[]:plan.items.filter(i=>i.b===b&&!i.gone);
    body=b==null?`<div class="empty"><div class="e">✅</div><h3>No hay pendientes</h3><p>${missionsOk?"Ya cumpliste tus misiones. Vete a estudiar 📚":"Revisa tus misiones en Inicio."}</p></div>`
      :`<div class="blockhead"><h3>Bloque ${b+1} · ${fmtMin(blockStart(b))}</h3><span class="muted sm">${L.filter(i=>i.done).length}/${L.length}</span></div><div class="items">${L.map(it=>itemCard(plan,it,cur,photos)).join("")}</div>`;
  }else{
    const want=tab==="hechas";
    body=cfg.blocks.map((bt,b)=>{const L=plan.items.filter(i=>i.b===b&&!i.gone&&!!i.done===want);if(!L.length)return "";
      return `<div class="blockhead"><h3>Bloque ${b+1} · ${fmtMin(toMin(bt))}</h3><span class="muted sm">${L.length}</span></div><div class="items">${L.map(it=>itemCard(plan,it,cur,photos)).join("")}</div>`}).join("")
      ||`<div class="empty"><div class="e">${want?"🫙":"✅"}</div><h3>${want?"Todavía nada palomeado":"Nada pendiente"}</h3></div>`;
  }
  return `
  <header class="hdr"><div><h1>Publicar ahora</h1><p class="loc">${cap(new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"}))}</p></div><div class="hdr-r">${streakChip()}</div></header>
  ${missionsOk?`<div class="okbanner">${IC.check} Ya cumpliste tus misiones de hoy. Lo demás es extra; si quieres, vete a estudiar 📚</div>`:""}
  <section class="card dayhead">
    <div class="nums"><b>${done}<span> / ${total}</span></b><em>grupos hoy<br>+${XP.grupo} XP cada uno</em></div>
    <div class="bar"><i style="width:${pct(done,total)}%"></i></div>
    ${next}
  </section>
  <div class="pills tabs3">${[["ahora","Ahora"],["pend","Pendientes"],["hechas","Hechas"]].map(([k,l])=>`<button class="ptab ${tab===k?"on":""}" data-act="ptab" data-v="${k}">${l}</button>`).join("")}</div>
  ${body}
  ${total&&done<total?`<p class="small center">Por cada grupo: copia el texto → guarda las fotos → abre el grupo, pega y sube las fotos → palomea.</p>`:""}`;
}
function itemCard(plan,it,cur,photos){
  const g=group(it.g)||{name:"(grupo borrado)",url:""},h=house(it.h);
  const isCur=cur&&cur===it;
  const hasUrl=!!safeUrl(g.url);
  return `<div class="item ${it.done?"done":""} ${isCur?"cur":""}" id="it-${it.g}">
    <div class="ihead">
      <img class="ith" src="${cover(h)}" alt="" loading="lazy">
      <div class="iinfo"><div class="gname">${esc(g.name)}</div>
        <div class="gmeta"><span>${esc(h.chip||h.nombre)}</span><span>·</span><span class="tm">${fmtMin(itemTime(plan,it))}</span>${group(it.g)?`<button class="glink" data-act="gedit" data-g="${it.g}">${hasUrl?"cambiar link":"poner link"}</button>`:""}</div></div>
      <button class="check" role="checkbox" aria-checked="${!!it.done}" aria-label="Ya publiqué en ${esc(g.name)}" data-act="tick" data-g="${it.g}">${IC.check}</button>
    </div>
    <div class="acts">
      <button class="act ${it.copied?"did":"pri"}" data-act="gcopy" data-g="${it.g}">${IC.copy}${it.copied?"Copiado":"Copiar texto"}</button>
      <button class="act ${photos[it.h]?"did":""}" data-act="gfotos" data-g="${it.g}">${IC.img}${photos[it.h]?"Fotos ✓":"Fotos"}</button>
      <a class="act ${it.opened?"did":""}" data-act="gopen" data-g="${it.g}" href="${esc(groupHref(g))}" target="_blank" rel="noopener">${IC.ext}${hasUrl?"Abrir grupo":"Buscar"}</a>
    </div>
  </div>`;
}

/* ----- LOGROS ----- */
function logrosView(){
  const earned=new Set(earnedMedals().map(m=>m.id));
  const tab=view.ltab||"medallas";
  let body="";
  if(tab==="medallas"){
    body=`<div class="medals">${MEDALS.map(m=>{const ok=earned.has(m.id);return `<button class="medal ${ok?"ok":""}" data-act="medal" data-m="${m.id}"><span class="mi">${ok?m.e:IC.lock}</span><b>${esc(m.n)}</b></button>`}).join("")}</div>`;
  }else if(tab==="niveles"){
    const lvls=[...Array(15)].map((_,i)=>i+1);
    body=`<div class="card"><div class="lvpath">${lvls.map(l=>{const un=UNLOCKS.filter(u=>u.lv===l&&l>1),r=RANKS.find(r=>r.lv===l),ok=G.level>=l;
      return `<div class="lvp ${ok?"ok":""} ${G.level===l?"cur":""}"><span class="lvn">${ok?l:IC.lock}</span><div><b>Nivel ${l}${r?` · ${esc(r.name)}`:""}</b><small>${num(lvlXP(l))} XP${un.length?" · "+un.map(unlockName).join(", "):""}</small></div></div>`}).join("")}</div></div>
    <section class="section"><div class="sechead"><h3>Personaliza</h3></div>
      <div class="card look">
        <p class="lk">Color</p><div class="swatches">${Object.entries(ACCENTS).map(([k,a])=>{const ok=owned("accent",k);return `<button class="sw ${game.look.accent===k?"on":""}" ${ok?`data-act="look" data-k="accent" data-v="${k}"`:"disabled"} style="--c:${a.a};--c2:${a.b}" aria-label="Tema ${a.n}">${ok?"":IC.lock}</button>`}).join("")}</div>
        <p class="lk">Marco</p><div class="pills wrap">${Object.entries(FRAMES).map(([k,l])=>lookBtn("frame",k,l)).join("")}</div>
        <p class="lk">Fondo</p><div class="pills wrap">${Object.entries(BGS).map(([k,l])=>lookBtn("bg",k,l)).join("")}</div>
        <p class="lk">Ícono</p><div class="pills wrap">${Object.entries(AVATARS).map(([k,l])=>lookBtn("icon",k,l)).join("")}</div>
      </div></section>`;
  }else{
    body=`<button class="btn dark full" data-act="prizeadd">${IC.plus} Agregar premio</button>
    <div class="prizes">${game.prizes.length?game.prizes.map(p=>{const [a,b]=prizeProgress(p),ok=a>=b;return `
      <div class="card prize ${ok?"ok":""}"><div class="pz"><span class="pzi">${ok?"🎁":IC.lock}</span><div><b>${esc(p.name)}</b><small>${esc(prizeGoalTxt(p))}</small></div><button class="rbtn sm" data-act="prizedel" data-id="${p.id}" aria-label="Borrar premio">${IC.trash}</button></div>
      <div class="bar"><i style="width:${pct(a,b)}%"></i></div><small class="muted">${ok?"¡Desbloqueado! Ve por él.":`${num(a)} / ${num(b)}`}</small></div>`}).join("")
      :`<div class="empty"><div class="e">🎁</div><h3>Ponte premios de verdad</h3><p>Ej.: “Llegar a Vendedor → unos tenis” o “Primera venta → cena”.</p></div>`}</div>`;
  }
  return `
  <header class="hdr"><div class="hdr-l">${avatar("lg")}<div><h1>Logros</h1><p class="loc">Nv ${G.level} · ${esc(G.rank)} · ${earned.size}/${MEDALS.length} medallas</p></div></div></header>
  <div class="pills tabs3">${[["medallas","Medallas"],["niveles","Niveles"],["premios","Mis premios"]].map(([k,l])=>`<button class="ptab ${tab===k?"on":""}" data-act="ltab" data-v="${k}">${l}</button>`).join("")}</div>
  ${body}`;
}
function lookBtn(kind,k,l){
  const ok=owned(kind,k),on=game.look[kind]===k||(game.look[kind]==="auto"&&bestOwned(kind)===k);
  return `<button class="ptab ${on?"on":""}" ${ok?`data-act="look" data-k="${kind}" data-v="${k}"`:"disabled"}>${ok?"":"🔒 "}${esc(l)}</button>`;
}
function prizeSheet(){
  const s=openSheet(`<h3>Nuevo premio</h3>
    <div class="field"><label for="pz-n">¿Qué te vas a regalar?</label><input class="inp" id="pz-n" placeholder="Ej. unos tenis" autocomplete="off"></div>
    <div class="field"><label for="pz-t">¿Cuándo?</label><select class="inp" id="pz-t">${Object.entries(PRIZE_TYPES).map(([k,t])=>`<option value="${k}">${esc(t.n)}</option>`).join("")}</select></div>
    <div class="field" id="pz-vw"></div>
    <button class="btn primary big" data-p="save">Guardar premio</button><button class="btn ghost" data-p="x">Cancelar</button>`);
  const vw=s.querySelector("#pz-vw"),sel=s.querySelector("#pz-t");
  const upd=()=>{const t=sel.value;
    vw.innerHTML=t==="rank"?`<label for="pz-v">Rango</label><select class="inp" id="pz-v">${RANKS.slice(1).map(r=>`<option>${esc(r.name)}</option>`).join("")}</select>`
      :PRIZE_TYPES[t].unit?`<label for="pz-v">¿Cuántos? (${PRIZE_TYPES[t].unit})</label><input class="inp" id="pz-v" type="number" inputmode="numeric" min="1" value="${t==="racha"?7:t==="pubs"?100:t==="xp"?5000:t==="level"?5:1}">`:""};
  sel.onchange=upd;upd();
  s.querySelector('[data-p="x"]').onclick=closeSheet;
  s.querySelector('[data-p="save"]').onclick=()=>{
    const name=s.querySelector("#pz-n").value.trim();if(!name){toast("Escribe el premio");return}
    const v=s.querySelector("#pz-v");
    game.prizes.push({id:"p"+Date.now(),name,type:sel.value,val:v?v.value:""});saveGame();closeSheet();render();toast("Premio guardado 🎁");checkProgress();
  };
}

/* ----- PERFIL ----- */
function perfilView(){
  const T=G.tot;
  const stat=(n,l)=>`<div class="stat"><b>${num(n)}</b><small>${l}</small></div>`;
  const step=(act,val,suf)=>`<div class="stepper"><button data-act="${act}" data-d="-1" aria-label="Menos">${IC.minus}</button><b>${val}${suf||""}</b><button data-act="${act}" data-d="1" aria-label="Más">${IC.plus}</button></div>`;
  const tog=(act,on,ic,label)=>`<button class="setrow" data-act="${act}"><span class="si">${ic}</span><span class="sl">${label}</span><span class="sw2 ${on?"on":""}"><i></i></span></button>`;
  return `
  <header class="hdr"><div class="hdr-l">${avatar("lg")}<div><h1>Ivan</h1><p class="loc">Nv ${G.level} · ${esc(G.rank)} · Temporada ${game.season}</p></div></div></header>

  <section class="card"><div class="sechead"><h3>Estadísticas totales</h3></div>
    <div class="stats">
      ${stat(G.xp,"XP total")}${stat(G.maxStreak,"mejor racha")}
      ${stat(T.grupo,"posts en grupos")}${stat(T.marketplace,"en Marketplace")}
      ${stat(T.interesado,"interesados")}${stat(T.seguimiento,"seguimientos")}
      ${stat(T.visitaAgendada,"visitas agendadas")}${stat(T.visitaHecha,"visitas hechas")}
      ${stat(T.apartado,"apartados")}${stat(T.venta,"ventas")}
      ${stat(G.chests,"cofres")}${stat(G.sold*COMISION,"pesos de comisión")}
    </div></section>

  <section class="section"><div class="sechead"><h3>Ajustes</h3></div>
    <div class="card setlist">
      <button class="setrow" data-act="tab" data-t="perfil" data-sub="grupos"><span class="si">${IC.users}</span><span class="sl">Grupos de Facebook<small>${groups.filter(g=>!g.paused).length} activos · links, pausar, agregar</small></span>${IC.chev}</button>
      ${tog("sound",game.sound,game.sound?IC.sound:IC.mute,"Sonidos")}
      ${tog("vibra",game.vibra,IC.vibra,"Vibración")}
      <div class="setrow col"><span class="sl">Apariencia</span><div class="pills">${[["auto","Automático"],["light","Claro"],["dark","Oscuro"]].map(([k,l])=>`<button class="ptab ${cfg.theme===k?"on":""}" data-act="theme" data-v="${k}">${l}</button>`).join("")}</div></div>
    </div></section>

  <section class="section"><div class="sechead"><h3>Bloques del día</h3></div>
    <div class="card">
      <div class="blocks">${cfg.blocks.map((t,i)=>`<div class="brow"><b>Bloque ${i+1}</b><input class="inp" type="time" value="${t}" data-act="btime" data-i="${i}" aria-label="Hora del bloque ${i+1}">${cfg.blocks.length>1?`<button class="rbtn sm" data-act="bdel" data-i="${i}" aria-label="Quitar bloque">${IC.x}</button>`:"<span></span>"}</div>`).join("")}</div>
      ${cfg.blocks.length<4?`<button class="linkbtn" data-act="badd">＋ Agregar bloque</button>`:""}
      <div class="field"><span>Minutos entre grupo y grupo</span>${step("gap",cfg.gap," min")}</div>
      <p class="small">Los grupos activos se reparten parejo entre los bloques.</p>
    </div></section>

  <section class="section"><div class="sechead"><h3>Avisos en el iPhone</h3></div>
    <div class="card">
      <p class="p">Te suena una alarma del <b>Calendario</b> a la hora de cada bloque, aunque la app esté cerrada.</p>
      <a class="btn primary big" href="${icsChanged()?"#":"recordatorios.ics"}" data-act="ics">${IC.cal} Descargar recordatorios (.ics)</a>
      <ol class="howto small">
        <li>Hazlo desde <b>Safari</b> (no desde el ícono de la app).</li>
        <li>Toca <b>Agregar todo</b> y elige tu calendario.</li>
        <li>Diario a las ${cfg.blocks.map(t=>fmtMin(toMin(t))).join(" y ")} te avisa (y 5 min antes).</li>
      </ol>
    </div></section>

  <section class="section"><div class="sechead"><h3>Metas semanales</h3></div>
    <div class="card">
      <div class="field"><span>Publicaciones en grupos</span>${step("ggrupos",cfg.goals.grupos)}</div>
      <div class="field"><span>Publicaciones en Marketplace</span>${step("gpub",cfg.goals.pub)}</div>
      <div class="field"><span>Conversaciones</span>${step("gconv",cfg.goals.conv)}</div>
      <div class="field"><span>Visitas</span>${step("gvis",cfg.goals.vis)}</div>
    </div></section>

  <section class="section"><div class="sechead"><h3>Respaldo</h3></div>
    <div class="card">
      <p class="p">Todo se guarda en tu celular. Saca un respaldo de vez en cuando.</p>
      <div class="row2"><button class="btn ghost" data-act="backup">${IC.dl} Guardar</button><label class="btn ghost" for="restore">${IC.ul} Cargar</label></div>
      <input type="file" id="restore" accept=".json,application/json" hidden>
      <button class="linkbtn" data-act="regen">Rehacer el plan de hoy</button>
    </div></section>
  <p class="small center">Mis Casas v${APP_VERSION}</p>`;
}
const icsChanged = () => cfg.blocks.join()!==DEFAULT_CFG.blocks.join();

/* ----- GRUPOS (dentro de Perfil) ----- */
function gruposView(){
  const plan=plans[todayKey()];
  const act=groups.filter(g=>!g.paused).length;
  const cnt=t=>groups.filter(g=>g.type===t&&!g.paused).length;
  return `
  <div class="dtop"><button class="rbtn" data-act="tab" data-t="perfil" aria-label="Regresar">${IC.back}</button><h2>Grupos</h2><button class="rbtn" data-act="gadd" aria-label="Agregar grupo">${IC.plus}</button></div>
  <p class="loc center">${groups.length} grupos · ${act} activos</p>
  <div class="chips">${Object.entries(GROUP_TYPES).map(([k,l])=>`<span class="chip static">${esc(l)} · ${cnt(k)}</span>`).join("")}</div>
  <div class="glist">
    ${groups.map((g,i)=>{const it=plan&&plan.items.find(x=>x.g===g.id&&!x.gone);const hasUrl=!!safeUrl(g.url);return `
      <div class="grow ${g.paused?"paused":""}">
        <span class="n">${i+1}</span>
        <button class="nm" data-act="gedit" data-g="${g.id}">${esc(g.name)}
          <span class="gtags"><span class="pill">${esc(GROUP_TYPES[g.type]||g.type)}</span>${g.paused?`<span class="pill">Pausado</span>`:it?`<span class="pill ${it.done?"acc":""}">Hoy: ${esc(house(it.h).chip||house(it.h).nombre)}${it.done?" ✓":""}</span>`:""}${hasUrl?"":`<span class="pill warn">sin link</span>`}</span>
        </button>
        <span class="r">
          <a class="rbtn sm ${hasUrl?"acc":""}" href="${esc(groupHref(g))}" target="_blank" rel="noopener" aria-label="Abrir grupo">${IC.ext}</a>
          <button class="rbtn sm" data-act="gpause" data-g="${g.id}" aria-label="${g.paused?"Reactivar":"Pausar"} grupo">${g.paused?IC.play:IC.pause}</button>
        </span>
      </div>`}).join("")}
  </div>
  <p class="small">Toca el nombre para editarlo o guardar su link. En Facebook: abre el grupo → <b>Compartir</b> → <b>Copiar enlace</b>.</p>
  <button class="linkbtn" data-act="resetgroups" style="color:var(--danger)">Restaurar la lista original de grupos</button>`;
}
function groupSheet(id){
  const g=id?group(id):{id:"",name:"",url:"",type:"general",paused:false};
  const s=openSheet(`
    <h3>${id?"Editar grupo":"Nuevo grupo"}</h3>
    <div class="field"><label for="gf-n">Nombre</label><input class="inp" id="gf-n" value="${esc(g.name)}" autocomplete="off"></div>
    <div class="field"><label for="gf-u">Link del grupo</label><input class="inp" id="gf-u" type="url" inputmode="url" placeholder="https://www.facebook.com/groups/..." value="${esc(g.url)}" autocomplete="off"><div class="small" style="margin:0">En Facebook: abre el grupo → Compartir → Copiar enlace, y pégalo aquí.</div></div>
    <div class="field"><span>Tipo</span><div class="pills wrap" id="gf-t">${Object.entries(GROUP_TYPES).map(([k,l])=>`<button class="ptab ${g.type===k?"on":""}" type="button" data-type="${k}">${esc(l)}</button>`).join("")}</div></div>
    <button class="btn primary big" data-gs="save">Guardar</button>
    ${id?`<div class="row2"><button class="btn ghost" data-gs="pause">${g.paused?"Reactivar":"Pausar"}</button><button class="btn ghost danger" data-gs="del">Borrar</button></div>`:`<button class="btn ghost" data-gs="cancel">Cancelar</button>`}`);
  let type=g.type;
  s.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{type=b.dataset.type;s.querySelectorAll("[data-type]").forEach(x=>x.classList.toggle("on",x===b))});
  s.querySelectorAll("[data-gs]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.gs;
    if(a==="cancel") return closeSheet();
    if(a==="save"){
      const name=$("#gf-n").value.trim(),url=$("#gf-u").value.trim();
      if(!name){toast("Ponle nombre al grupo");return}
      if(url&&!safeUrl(url)){toast("El link debe empezar con https://");return}
      const typeChanged=id&&g.type!==type;
      if(id){Object.assign(g,{name,url,type})}
      else{const n=groups.reduce((m,x)=>Math.max(m,+x.id.slice(1)||0),0)+1;groups.push({id:"g"+n,name,url,type,paused:false})}
      saveGroups();if(!id||typeChanged)rebuildToday();closeSheet();render();toast(id?"Grupo guardado ✓":"Grupo agregado ✓");
    }
    if(a==="pause"){g.paused=!g.paused;saveGroups();rebuildToday();closeSheet();render();toast(g.paused?"Grupo pausado":"Grupo activo otra vez")}
    if(a==="del"){if(!confirm(`¿Borrar "${g.name}"?`))return;groups=groups.filter(x=>x.id!==g.id);saveGroups();rebuildToday();closeSheet();render();toast("Grupo borrado")}
  });
}

/* ----- JUEGO COMPLETADO ----- */
function finView(){
  const T=G.tot,season=G.active;
  return `<div class="fin">
    <div class="fin-art">🏆</div>
    <h1>¡Juego completado!</h1>
    <p class="muted">Temporada ${game.season}: vendiste ${season.length} casa${season.length===1?"":"s"}.</p>
    <div class="card money big"><small>Comisión ganada</small><b>${money(G.sold*COMISION)}</b></div>
    <div class="stats">
      <div class="stat"><b>${num(G.xp)}</b><small>XP total</small></div><div class="stat"><b>Nv ${G.level}</b><small>${esc(G.rank)}</small></div>
      <div class="stat"><b>${num(T.grupo+T.marketplace)}</b><small>publicaciones</small></div><div class="stat"><b>${num(T.interesado)}</b><small>interesados</small></div>
      <div class="stat"><b>${num(T.visitaHecha)}</b><small>visitas</small></div><div class="stat"><b>${G.maxStreak}</b><small>mejor racha</small></div>
    </div>
    <button class="btn primary big" data-act="season">${IC.sparkles} Empezar Temporada ${game.season+1}</button>
    <button class="btn ghost full" data-act="tab" data-t="inicio">Volver al inicio</button>
    <p class="small center">En la Temporada ${game.season+1} pídele a Claude Code que agregue las casas nuevas. Tu nivel, XP y medallas se quedan.</p>
  </div>`;
}

/* ---------- registro rápido (+) ---------- */
function quickSheet(kind){
  if(!kind){
    const s=openSheet(`<h3>¿Qué pasó?</h3><div class="qgrid">${[["interesado",IC.heart,"Nuevo interesado"],["seguimiento",IC.send,"Mandé seguimiento"],["visitaAgendada",IC.cal,"Agendé visita"],["visitaHecha",IC.door,"Hice visita"]].map(([k,ic,l])=>`<button class="qbtn" data-k="${k}">${ic}<b>${l}</b><small>+${XP[k]} XP</small></button>`).join("")}</div><button class="btn ghost" data-x>Cancelar</button>`);
    s.querySelector("[data-x]").onclick=closeSheet;
    s.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>quickSheet(b.dataset.k));
    return;
  }
  const s=openSheet(`<h3>${esc(XP_LABEL[kind])} · ¿de qué casa?</h3><div class="pick">${HOUSES.filter(h=>hs(h.id).status!=="vend").map(h=>`<button data-h="${h.id}"><img src="${cover(h)}" alt=""><span>${esc(h.nombre)}</span></button>`).join("")}</div><button class="btn ghost" data-x>Cancelar</button>`);
  s.querySelector("[data-x]").onclick=closeSheet;
  s.querySelectorAll("[data-h]").forEach(b=>b.onclick=()=>{closeSheet();gain(kind,b.dataset.h)});
}

/* ---------- calendario y respaldo ---------- */
function buildICS(){
  const d=new Date(),start=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const url=location.href.split("#")[0].replace(/[^/]*$/,"");
  const ev=cfg.blocks.map((t,i)=>{const [h,m]=t.split(":");const end=toMin(t)+30;return [
    "BEGIN:VEVENT",`UID:mis-casas-bloque-${i+1}-${t.replace(":","")}@mis-casas`,`DTSTAMP:${start}T000000Z`,
    `DTSTART;TZID=America/Mexico_City:${start}T${h}${m}00`,`DTEND;TZID=America/Mexico_City:${start}T${pad(Math.floor(end/60)%24)}${pad(end%60)}00`,
    "RRULE:FREQ=DAILY",`SUMMARY:🏡 Publicar casas – bloque ${fmtMin(toMin(t))}`,
    `DESCRIPTION:Abre Mis Casas → Publicar ahora.\\n${url}`,`URL:${url}`,
    "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Toca publicar en los grupos","TRIGGER:-PT5M","END:VALARM",
    "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Ya toca publicar","TRIGGER:PT0M","END:VALARM","END:VEVENT"].join("\r\n")}).join("\r\n");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mis Casas//ES","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VTIMEZONE","TZID:America/Mexico_City","BEGIN:STANDARD","DTSTART:19700101T000000","TZOFFSETFROM:-0600","TZOFFSETTO:-0600","TZNAME:CST","END:STANDARD","END:VTIMEZONE",
    ev,"END:VCALENDAR"].join("\r\n");
}
function downloadFile(name,type,text){
  const file=new File([text],name,{type});
  if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file]}).catch(()=>{});return}
  const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);
}

/* ======================================================================
   EVENTOS
   ====================================================================== */
function afterTick(plan,it,wasBlockDone){
  if(!it.done)return;
  const n=XP.grupo*(G.x2today?2:1);xpPop(n,"Publicaste en un grupo");sfx("xp");haptic();
  const before=modalQ.length;checkProgress();
  if(modalQ.length>before)return;
  const L=plan.items.filter(i=>i.b===it.b&&!i.gone);
  if(L.every(i=>i.done)&&!wasBlockDone){
    const all=plan.items.filter(i=>!i.gone||i.done),rest=all.filter(i=>!i.done).length;
    modal({art:"🎉",title:`¡Bloque de las ${fmtMin(blockStart(it.b))} listo!`,text:`${L.length} grupos publicados.${rest?` Te quedan ${rest} para el siguiente bloque.`:" Terminaste todos los grupos de hoy."}`,confetti:true,sound:"medal"});
    return;
  }
  const nxt=plan.items.find(i=>!i.done&&!i.gone&&i.b===it.b);
  if(nxt) setTimeout(()=>{const el=document.getElementById("it-"+nxt.g);el&&el.scrollIntoView({behavior:"smooth",block:"center"})},150);
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b)return;
  const act=b.dataset.act;const h=view.id&&house(view.id);
  const plan=plans[todayKey()];
  const it=b.dataset.g&&plan?plan.items.find(x=>x.g===b.dataset.g&&!x.gone):null;
  switch(act){
    case "tab": go({tab:b.dataset.t,sub:b.dataset.sub});break;
    case "filter": view.f=b.dataset.f;render();break;
    case "ptab": view.ptab=b.dataset.v;render();break;
    case "ltab": view.ltab=b.dataset.v;render();break;
    case "quick": quickSheet();break;
    case "chest": openChest();break;
    /* publicar en grupos */
    case "tick": {if(!it)break;
      const wasBlockDone=plan.items.filter(i=>i.b===it.b&&!i.gone).every(i=>i.done);
      it.done=it.done?null:new Date().toISOString();savePlans();render();
      if(!it.done){sfx("tick");toast(`−${XP.grupo} XP`)}
      afterTick(plan,it,wasBlockDone);break;}
    case "gcopy": if(it){copy(groupText(it),b,"Texto copiado. Ahora las fotos 👉",()=>{it.copied=true;savePlans();render()})}break;
    case "gfotos": if(it){saveAll(house(it.h),b,()=>{plan.photos=plan.photos||{};plan.photos[it.h]=true;savePlans();render()})}break;
    case "gopen": if(it){it.opened=true;savePlans();setTimeout(render,400)}break;
    /* casas */
    case "open": go({tab:"casas",id:b.dataset.id,f:view.f});break;
    case "lb": openLB(h,+b.dataset.i);break;
    case "savefotos": saveAll(h,b);break;
    case "published": gain("marketplace",h.id);break;
    case "gain": gain(b.dataset.k,h.id);break;
    case "undo": undoLast(b.dataset.k,h.id);break;
    case "group": {openerIdx=(openerIdx+1)%OPENERS.length;store.set("opener",openerIdx);
      copy(OPENERS[openerIdx].replace("{saludo}",cap(saludo()))+"\n\n"+h.texto+(h.mapa?`\n\n📍 ${h.mapa}`:""),b,"Copiado para grupo ✓");break;}
    case "field": {const k=b.dataset.k;copy(k==="precio"?(h.precioNum||""):h[k],b);break;}
    case "reply": {const r=buildReplies(h).find(x=>x.id===b.dataset.rid);
      copy(replyText(h,r),b,"Copiado, pégalo en Messenger ✓",()=>{
        game.replies.push(new Date().toISOString());game.replies=game.replies.slice(-500);saveGame();calc();
        if(r.id==="seguimiento") toast("¿Ya lo mandaste?",{label:`Sí · +${XP.seguimiento} XP`,fn:()=>gain("seguimiento",h.id)});
        checkProgress();
      });break;}
    case "toggleedit": view.editing=!view.editing;render();break;
    case "status": setUnitStatus(b.dataset.u,b.dataset.s);break;
    case "saveedit": {const base=Object.fromEntries(buildReplies(h).map(r=>[r.id,r.x])),m={};
      document.querySelectorAll(".ed textarea").forEach(t=>{if(t.value.trim()&&t.value!==base[t.dataset.rid])m[t.dataset.rid]=t.value});
      custom[h.id]=m;store.set("custom2",custom);view.editing=false;render();toast("Textos guardados ✓");break;}
    case "resetreplies": delete custom[h.id];store.set("custom2",custom);view.editing=false;render();toast("Textos originales de vuelta");break;
    /* logros */
    case "medal": {const m=MEDALS.find(x=>x.id===b.dataset.m),ok=m.ok();toast(`${ok?m.e+" ":"🔒 "}${m.n}: ${m.d}`);break;}
    case "look": game.look[b.dataset.k]=b.dataset.v;saveGame();render();sfx("tick");break;
    case "prizeadd": prizeSheet();break;
    case "prizedel": if(confirm("¿Borrar este premio?")){game.prizes=game.prizes.filter(p=>p.id!==b.dataset.id);saveGame();render()}break;
    /* grupos */
    case "gadd": groupSheet(null);break;
    case "gedit": groupSheet(b.dataset.g);break;
    case "gpause": {const g=group(b.dataset.g);g.paused=!g.paused;saveGroups();rebuildToday();render();toast(g.paused?"Grupo pausado":"Grupo activo otra vez");break;}
    case "resetgroups": if(confirm("¿Volver a la lista original de grupos? Se pierden los cambios que les hiciste.")){groups=clone(DEFAULT_GROUPS);saveGroups();rebuildToday();render();toast("Lista original restaurada")}break;
    /* perfil */
    case "sound": game.sound=!game.sound;saveGame();render();if(game.sound)sfx("xp");break;
    case "vibra": game.vibra=!game.vibra;saveGame();render();haptic();break;
    case "gap": cfg.gap=Math.max(0,Math.min(15,cfg.gap+ +b.dataset.d));saveCfg();render();break;
    case "gpub": case "gconv": case "gvis": case "ggrupos": {const k=act.slice(1),st=k==="grupos"?10:1;cfg.goals[k]=Math.max(st,cfg.goals[k]+st* +b.dataset.d);saveCfg();render();break;}
    case "badd": {const last=toMin(cfg.blocks[cfg.blocks.length-1]);cfg.blocks.push(fmt24(Math.min(23*60,last+120)));saveCfg();rebuildToday();render();break;}
    case "bdel": cfg.blocks.splice(+b.dataset.i,1);saveCfg();rebuildToday();render();break;
    case "ics": if(icsChanged()){e.preventDefault();downloadFile("recordatorios-mis-casas.ics","text/calendar",buildICS())}break;
    case "theme": cfg.theme=b.dataset.v;saveCfg();render();break;
    case "backup": {const data={v:3,fecha:new Date().toISOString(),state,custom,groups,cfg,rot,plans,game};
      downloadFile(`respaldo-mis-casas-${todayKey()}.json`,"application/json",JSON.stringify(data));break;}
    case "regen": if(confirm("¿Rehacer el plan de hoy? Lo que ya palomeaste se queda.")){rebuildToday();toast("Plan de hoy actualizado");go({tab:"publicar"})}break;
    case "season": {
      game.seasons.push({n:game.season,fin:new Date().toISOString(),casas:G.active.map(u=>u.id),comision:G.active.length*COMISION});
      game.archived.push(...G.active.map(u=>u.id));game.season++;game.seen.fin=false;saveGame();
      modal({art:"🗺️",title:`Temporada ${game.season}`,text:"Nuevos mundos te esperan. Pídele a Claude Code que agregue las casas nuevas.",sound:"level"});
      go({tab:"casas"});break;}
  }
});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.act==="btime"&&t.value){cfg.blocks[+t.dataset.i]=t.value;cfg.blocks.sort();saveCfg();rebuildToday();render();toast("Horario guardado ✓")}
  if(t.id==="restore"&&t.files&&t.files[0]){
    t.files[0].text().then(txt=>{
      const d=JSON.parse(txt);if(!d||!d.state||!d.groups)throw 0;
      if(!confirm("¿Cargar este respaldo? Reemplaza lo que tienes ahora en el celular."))return;
      state=d.state;custom=d.custom||{};groups=d.groups;cfg=Object.assign(clone(DEFAULT_CFG),d.cfg||{});rot=d.rot||{cur:{},last:{},snap:null};plans=d.plans||{};game=mergeGame(d.game);
      migrate();store.set("custom2",custom);saveGroups();saveCfg();savePlans();saveGame();render();toast("Respaldo cargado ✓");
    }).catch(()=>toast("Ese archivo no es un respaldo válido"));
    t.value="";
  }
});

/* al volver a la app: si cambió el día, plan nuevo; refresca avisos */
function refresh(){
  if(document.hidden||$("#sheet")||document.querySelector(".lb,.party"))return;
  if(view.tab==="inicio"||view.tab==="publicar")render();else renderNav();
}
document.addEventListener("visibilitychange",refresh);
setInterval(refresh,60000);
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>render());

migrate();
render();
checkProgress();
setTimeout(()=>{const p=plans[todayKey()];if(p)[...new Set(p.items.map(i=>i.h))].forEach(id=>prepFiles(house(id)))},900);
