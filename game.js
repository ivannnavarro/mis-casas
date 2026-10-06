/* =====================================================================
   MODO JUEGO
   Todo el XP se calcula a partir de lo que de verdad hiciste (publicaciones,
   interesados, seguimientos, visitas, apartados y ventas). Si deshaces algo,
   el XP también se quita. Nada se guarda "a mano", así nunca se descuadra.
   ===================================================================== */

/* ---------- unidades (cada casa vendible = un mundo con su jefe) ---------- */
const UNITS = HOUSES.flatMap(h => h.unidades
  ? h.unidades.map(u => ({...u, house:h.id}))
  : [{id:h.id, nombre:h.nombre, jefe:h.jefe||{n:"Jefe final",e:"👾"}, house:h.id}]);
const unitsOf = h => UNITS.filter(u => u.house === h.id);

/* ---------- niveles y rangos ---------- */
const RANKS = [
  {lv:1,  name:"Novato"},
  {lv:3,  name:"Promotor"},
  {lv:6,  name:"Vendedor"},
  {lv:10, name:"Cerrador"},
  {lv:15, name:"Leyenda de Madero"}
];
const MAX_LV = 30;
const lvlXP = n => 100*n*(n-1);            // XP total para llegar al nivel n
function levelOf(xp){let n=1;while(n<MAX_LV&&lvlXP(n+1)<=xp)n++;return n}
const rankOf = lv => RANKS.filter(r=>r.lv<=lv).pop();

/* ---------- cosas que se desbloquean ---------- */
const ACCENTS = {
  naranja:{n:"Naranja",a:"#FF6A1A",b:"#FFA048"},
  oceano: {n:"Océano", a:"#0891B2",b:"#3CC4E8"},
  bosque: {n:"Bosque", a:"#15803D",b:"#4CCB7A"},
  uva:    {n:"Uva",    a:"#7C3AED",b:"#B892FF"},
  oro:    {n:"Oro",    a:"#C28A00",b:"#F2C230"},
  coral:  {n:"Coral",  a:"#E11D48",b:"#FF7A93",chest:true},
  menta:  {n:"Menta",  a:"#0D9488",b:"#4FD8C4",chest:true},
  cielo:  {n:"Cielo",  a:"#2563EB",b:"#7FB0FF",chest:true}
};
const FRAMES = {ninguno:"Sin marco",bronce:"Bronce",plata:"Plata",oro:"Oro",leyenda:"Leyenda"};
const BGS    = {liso:"Liso",atardecer:"Atardecer",noche:"Noche",playa:"Playa"};
const AVATARS= {casa:"🏠",llave:"🔑",cohete:"🚀",trofeo:"🏆",corona:"👑"};
const UNLOCKS = [
  {lv:1,kind:"accent",id:"naranja"},{lv:1,kind:"frame",id:"ninguno"},{lv:1,kind:"bg",id:"liso"},{lv:1,kind:"icon",id:"casa"},
  {lv:2,kind:"frame",id:"bronce"},{lv:3,kind:"accent",id:"oceano"},{lv:4,kind:"icon",id:"llave"},
  {lv:5,kind:"bg",id:"atardecer"},{lv:6,kind:"frame",id:"plata"},{lv:7,kind:"accent",id:"bosque"},
  {lv:8,kind:"icon",id:"cohete"},{lv:9,kind:"bg",id:"noche"},{lv:10,kind:"frame",id:"oro"},
  {lv:11,kind:"accent",id:"uva"},{lv:12,kind:"icon",id:"trofeo"},{lv:13,kind:"bg",id:"playa"},
  {lv:14,kind:"accent",id:"oro"},{lv:15,kind:"frame",id:"leyenda"},{lv:15,kind:"icon",id:"corona"}
];
function unlockName(u){
  if(u.kind==="accent")return "Tema "+ACCENTS[u.id].n;
  if(u.kind==="frame") return "Marco "+FRAMES[u.id];
  if(u.kind==="bg")    return "Fondo "+BGS[u.id];
  return "Ícono "+AVATARS[u.id];
}
function owned(kind,id){
  return UNLOCKS.some(u=>u.kind===kind&&u.id===id&&u.lv<=G.level) || (kind==="accent"&&game.chestThemes.includes(id));
}
function bestOwned(kind){const l=UNLOCKS.filter(u=>u.kind===kind&&u.lv<=G.level);return l[l.length-1].id}

const DEFAULT_GAME = {
  season:1, seasons:[], archived:[],
  sound:true, vibra:true,
  look:{accent:"naranja", frame:"auto", bg:"liso", icon:"auto"},
  chestThemes:[], shields:[], x2:[], bonus:[],
  seen:{medals:null, level:0, prizes:[]},
  replies:[], prizes:[]
};

/* ---------- daño a los jefes (vida 100) ---------- */
const DMG = {grupo:.5, marketplace:3, interesado:8, seguimiento:1, visitaAgendada:12, visitaHecha:18};
const BOSS_FLOOR = 8; // el jefe sólo cae con el apartado o la venta

/* ---------- misiones del día ---------- */
function makeMissions(t){
  const dn=dayNum(t);
  const ints=HOUSES.reduce((a,h)=>a+hs(h.id).int.length,0);
  const m=[{id:"m1",type:"block"}];
  m.push(ints>=2 ? {id:"m2",type:"seg",n:ints>=6?3:2} : {id:"m2",type:"mkt"});
  const pool=[{type:"int"},{type:"mkt"},{type:"reply",n:5},{type:"posts",n:15}].filter(x=>x.type!==m[1].type);
  m.push({id:"m3",...pool[dn%pool.length]});
  return m;
}
const MISSION_TXT = {
  block:()=>"Publica en todos los grupos de un bloque",
  seg:m=>`Manda ${m.n} seguimientos a interesados`,
  mkt:()=>"Publica o renueva una casa en Marketplace",
  int:()=>"Consigue 1 interesado nuevo",
  reply:m=>`Contesta ${m.n} mensajes con respuestas rápidas`,
  posts:m=>`Publica en ${m.n} grupos`
};
function missionProgress(m,d){
  const c=G.dc[d]||{};
  switch(m.type){
    case "block":{
      const p=plans[d];if(!p||!p.items.length)return [0,1];
      const bs=[...new Set(p.items.map(i=>i.b))];let best=[0,1];
      for(const b of bs){const L=p.items.filter(i=>i.b===b&&(!i.gone||i.done));const n=L.filter(i=>i.done).length;
        if(L.length&&n===L.length)return [1,1];
        if(L.length&&n/L.length>best[0]/best[1])best=[n,L.length]}
      return best[0]?best:[0,1];
    }
    case "seg":   return [c.seguimiento||0,m.n];
    case "mkt":   return [c.marketplace||0,1];
    case "int":   return [c.interesado||0,1];
    case "reply": return [c.reply||0,m.n];
    case "posts": return [c.grupo||0,m.n];
  }
  return [0,1];
}
const missionDone = (m,d) => {const [a,b]=missionProgress(m,d);return a>=b};
function dayOk(d){
  const p=plans[d];if(!p)return false;
  if(p.missions) return p.missions.every(m=>missionDone(m,d));
  return !!(p.items.length&&p.items.every(i=>i.done)); // días de antes del modo juego
}

/* ---------- cálculo general (se corre en cada pantalla) ---------- */
let G = {level:1, dc:{}};
const weekKey = t => {const d=new Date(t);const wd=(d.getDay()+6)%7;return ymd(new Date(d.getFullYear(),d.getMonth(),d.getDate()-wd))};
function calc(){
  const ev=[];
  Object.values(plans).forEach(p=>p.items.forEach(i=>{if(i.done)ev.push({t:i.done,k:"grupo",h:i.h})}));
  HOUSES.forEach(h=>{const s=hs(h.id);
    s.pub.forEach(t=>ev.push({t,k:"marketplace",h:h.id}));
    s.int.forEach(t=>ev.push({t,k:"interesado",h:h.id}));
    s.seg.forEach(t=>ev.push({t,k:"seguimiento",h:h.id}));
    s.agen.forEach(t=>ev.push({t,k:"visitaAgendada",h:h.id}));
    s.vis.forEach(t=>ev.push({t,k:"visitaHecha",h:h.id}));
  });
  UNITS.forEach(u=>{const s=us(u.id);
    if(s.apar)ev.push({t:s.apar,k:"apartado",h:u.house,u:u.id});
    if(s.vend)ev.push({t:s.vend,k:"venta",h:u.house,u:u.id});
  });
  const x2=new Set(game.x2),dc={},dmg={},last={},weeks={};
  const tot={grupo:0,marketplace:0,interesado:0,seguimiento:0,visitaAgendada:0,visitaHecha:0,apartado:0,venta:0};
  let xp=0;
  for(const e of ev){
    const d=ymd(e.t);
    e.xp=XP[e.k]*(x2.has(d)?2:1);xp+=e.xp;
    const c=(dc[d] ||= {xp:0});c[e.k]=(c[e.k]||0)+1;c.xp+=e.xp;
    tot[e.k]++;
    if(DMG[e.k]){dmg[e.h]=(dmg[e.h]||0)+DMG[e.k]}
    if(!last[e.h]||e.t>last[e.h])last[e.h]=e.t;
    const w=weekKey(e.t),W=(weeks[w] ||= {grupos:0,pub:0,conv:0,vis:0});
    if(e.k==="grupo")W.grupos++;if(e.k==="marketplace")W.pub++;if(e.k==="interesado")W.conv++;if(e.k==="visitaHecha")W.vis++;
  }
  game.replies.forEach(t=>{const c=(dc[ymd(t)] ||= {xp:0});c.reply=(c.reply||0)+1});
  let weekBonus=0,perfectWeeks=0;
  for(const w in weeks){const W=weeks[w];let n=0;
    if(W.grupos>=cfg.goals.grupos){weekBonus+=BONUS_SEMANA.grupos;n++}
    if(W.pub>=cfg.goals.pub){weekBonus+=BONUS_SEMANA.pub;n++}
    if(W.conv>=cfg.goals.conv){weekBonus+=BONUS_SEMANA.conv;n++}
    if(W.vis>=cfg.goals.vis){weekBonus+=BONUS_SEMANA.vis;n++}
    if(n===4)perfectWeeks++}
  const bonus=game.bonus.reduce((a,b)=>a+b.xp,0);
  game.bonus.forEach(b=>{const c=(dc[ymd(b.t)] ||= {xp:0});c.xp+=b.xp});
  xp+=weekBonus+bonus;
  G={xp,dc,dmg,last,weeks,tot,weekBonus};
  G.level=levelOf(xp);G.rank=rankOf(G.level).name;
  G.into=xp-lvlXP(G.level);G.need=lvlXP(G.level+1)-lvlXP(G.level);
  G.today=(dc[todayKey()]||{}).xp||0;G.x2today=x2.has(todayKey());
  G.chests=Object.values(plans).filter(p=>p.chest).length;
  G.fullDays=Object.values(plans).filter(p=>p.items.length&&p.items.every(i=>i.done)).length;
  // 10 mensajes en menos de 10 min
  const r=game.replies.map(t=>+new Date(t)).sort((a,b)=>a-b);G.fast10=false;
  for(let i=0;i+9<r.length;i++)if(r[i+9]-r[i]<=6e5){G.fast10=true;break}
  G.conq={};HOUSES.forEach(h=>G.conq[h.id]=unitsOf(h).every(u=>us(u.id).status!=="disp"));
  G.sold=UNITS.filter(u=>us(u.id).status==="vend").length;
  const active=UNITS.filter(u=>!game.archived.includes(u.id));
  G.active=active;G.gameDone=active.length>0&&active.every(u=>us(u.id).status==="vend");
  Object.assign(G,streakCalc());
  G.perfectWeeks=perfectWeeks;
  return G;
}

/* ---------- racha con escudos (2 al mes + los que salgan del cofre) ---------- */
function streakCalc(){
  const keys=Object.keys(plans).sort(),today=todayKey();
  if(!keys.length)return {streak:0,maxStreak:0,shieldsLeft:2,todayOk:false,shieldDays:[]};
  const d=new Date(keys[0]+"T12:00:00");let cur=0,max=0,extraUsed=0;const used={},shieldDays=[];
  while(ymd(d)<today){
    const k=ymd(d);
    if(dayOk(k))cur++;
    else if(cur>0){
      const mo=k.slice(0,7);
      if((used[mo]||0)<2){used[mo]=(used[mo]||0)+1;shieldDays.push(k)}
      else if(game.shields.filter(s=>ymd(s)<k).length-extraUsed>0){extraUsed++;shieldDays.push(k)}
      else cur=0;
    }
    max=Math.max(max,cur);d.setDate(d.getDate()+1);
  }
  const todayOk=dayOk(today);if(todayOk)cur++;max=Math.max(max,cur);
  const shieldsLeft=Math.max(0,2-(used[today.slice(0,7)]||0))+(game.shields.length-extraUsed);
  return {streak:cur,maxStreak:max,shieldsLeft,todayOk,shieldDays};
}

/* ---------- medallas ---------- */
const MEDALS = [
  {id:"pub1",   e:"📣", n:"Primera publicación", d:"Publica por primera vez", ok:()=>G.tot.grupo+G.tot.marketplace>=1},
  {id:"int1",   e:"💬", n:"Primer interesado",   d:"Registra tu primer interesado", ok:()=>G.tot.interesado>=1},
  {id:"vis1",   e:"🚪", n:"Primera visita",      d:"Agenda o haz tu primera visita", ok:()=>G.tot.visitaAgendada+G.tot.visitaHecha>=1},
  {id:"apar1",  e:"🔑", n:"Primer apartado",     d:"Aparta tu primera casa", ok:()=>G.tot.apartado>=1},
  {id:"venta1", e:"💰", n:"Primera venta",       d:"Vende tu primera casa", ok:()=>G.tot.venta>=1},
  {id:"racha7", e:"🔥", n:"Racha de 7 días",     d:"7 días seguidos cumpliendo misiones", ok:()=>G.maxStreak>=7},
  {id:"racha30",e:"☄️", n:"Racha de 30 días",    d:"30 días seguidos cumpliendo misiones", ok:()=>G.maxStreak>=30},
  {id:"pub100", e:"💯", n:"100 publicaciones",   d:"Entre grupos y Marketplace", ok:()=>G.tot.grupo+G.tot.marketplace>=100},
  {id:"pub500", e:"🚀", n:"500 publicaciones",   d:"Entre grupos y Marketplace", ok:()=>G.tot.grupo+G.tot.marketplace>=500},
  {id:"todos",  e:"🌐", n:"Todos en un día",     d:"Publica en todos los grupos en un día", ok:()=>G.fullDays>=1},
  {id:"rayo",   e:"⚡", n:"Rayo",                d:"Contesta 10 mensajes en menos de 10 min", ok:()=>G.fast10},
  {id:"seg20",  e:"📨", n:"Insistente",          d:"Manda 20 seguimientos", ok:()=>G.tot.seguimiento>=20},
  {id:"vis10",  e:"🏡", n:"Anfitrión",           d:"Haz 10 visitas", ok:()=>G.tot.visitaHecha>=10},
  {id:"cofre1", e:"🎁", n:"Primer cofre",        d:"Abre tu primer cofre", ok:()=>G.chests>=1},
  {id:"cofre10",e:"🧰", n:"Coleccionista",       d:"Abre 10 cofres", ok:()=>G.chests>=10},
  {id:"semana", e:"🏅", n:"Semana perfecta",     d:"Cumple las 4 metas de una semana", ok:()=>G.perfectWeeks>=1},
  ...HOUSES.map(h=>({id:"conq_"+h.id, e:(h.jefe||(h.unidades&&h.unidades[0].jefe)||{e:"🏆"}).e, n:"Conquistar "+(h.chip||h.nombre),
     d:h.unidades?`Aparta o vende las ${h.unidades.length} casas`:"Aparta o vende la casa", ok:()=>!!G.conq[h.id]})),
  {id:"vendedor",e:"🤝",n:"Rango Vendedor",      d:"Llega al nivel 6", ok:()=>G.level>=6},
  {id:"leyenda", e:"👑",n:"Leyenda de Madero",   d:"Llega al nivel 15", ok:()=>G.level>=15},
  {id:"fin",     e:"🏆",n:"Juego completado",    d:"Vende todas las casas de la temporada", ok:()=>G.gameDone||game.seasons.length>0}
];
const earnedMedals = () => MEDALS.filter(m=>m.ok());

/* ---------- premios de la vida real ---------- */
const PRIZE_TYPES = {
  rank:  {n:"Llegar a un rango"},
  level: {n:"Llegar a un nivel", unit:"nivel"},
  apar1: {n:"Primer apartado"},
  venta1:{n:"Primera venta"},
  ventas:{n:"Vender N casas", unit:"casas"},
  racha: {n:"Racha de N días", unit:"días"},
  pubs:  {n:"N publicaciones", unit:"publicaciones"},
  xp:    {n:"Juntar N XP", unit:"XP"}
};
function prizeProgress(p){
  const v=+p.val||1;
  switch(p.type){
    case "rank":  {const r=RANKS.find(r=>r.name===p.val)||RANKS[1];return [Math.min(G.level,r.lv),r.lv]}
    case "level": return [Math.min(G.level,v),v];
    case "apar1": return [Math.min(G.tot.apartado,1),1];
    case "venta1":return [Math.min(G.tot.venta,1),1];
    case "ventas":return [Math.min(G.tot.venta,v),v];
    case "racha": return [Math.min(G.maxStreak,v),v];
    case "pubs":  {const n=G.tot.grupo+G.tot.marketplace;return [Math.min(n,v),v]}
    case "xp":    return [Math.min(G.xp,v),v];
  }
  return [0,1];
}
function prizeGoalTxt(p){
  const t=PRIZE_TYPES[p.type];if(!t)return "";
  if(p.type==="rank")return "Llegar a "+p.val;
  if(t.unit)return t.n.replace("N",Number(p.val).toLocaleString("es-MX"));
  return t.n;
}

/* ---------- jefes ---------- */
function bossHP(u){
  const s=us(u.id);if(s.status!=="disp")return 0;
  return Math.max(BOSS_FLOOR,Math.round(100-(G.dmg[u.house]||0)));
}
function houseStage(h){ // 0 nada · 1 publicada · 2 interesado · 3 visita · 4 apartada
  const s=hs(h.id);
  if(unitsOf(h).some(u=>us(u.id).status!=="disp"))return 4;
  if(s.agen.length||s.vis.length)return 3;
  if(s.int.length)return 2;
  if(s.pub.length||Object.values(plans).some(p=>p.items.some(i=>i.h===h.id&&i.done)))return 1;
  return 0;
}

/* ---------- sonido y vibración ---------- */
let actx;
function tone(seq){
  if(!game.sound||!seq)return;
  try{
    actx ||= new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==="suspended")actx.resume();
    const t0=actx.currentTime+.01;
    seq.forEach(([f,dt,dur,type,vol])=>{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type=type||"sine";o.frequency.value=f;
      g.gain.setValueAtTime(0,t0+dt);g.gain.linearRampToValueAtTime(vol||.12,t0+dt+.012);
      g.gain.exponentialRampToValueAtTime(.0001,t0+dt+dur);
      o.connect(g).connect(actx.destination);o.start(t0+dt);o.stop(t0+dt+dur+.05);
    });
  }catch(e){}
}
const SFX = {
  tick:[[660,0,.07]],
  xp:[[880,0,.08],[1320,.06,.13]],
  medal:[[784,0,.1],[1175,.08,.28]],
  chest:[[523,0,.12],[659,.1,.12],[784,.2,.12],[1047,.3,.35]],
  level:[[392,0,.16,"triangle"],[523,.13,.16,"triangle"],[659,.26,.16,"triangle"],[784,.39,.45,"triangle"]],
  boss:[[220,0,.22,"sawtooth",.06],[147,.18,.4,"sawtooth",.06],[523,.62,.14],[784,.74,.4]]
};
const sfx = k => tone(SFX[k]);
function haptic(){
  if(!game.vibra)return;
  if(navigator.vibrate){try{navigator.vibrate(14)}catch(e){}return}
  // iPhone (iOS 18+): un switch nativo da vibración ligera al tocarlo
  try{const l=document.createElement("label"),i=document.createElement("input");
    i.type="checkbox";i.setAttribute("switch","");l.appendChild(i);l.style.display="none";
    document.body.appendChild(l);l.click();l.remove()}catch(e){}
}
