/* =====================================================================
   DATOS DE LAS CASAS Y GRUPOS
   Si cambias un precio, agregas una casa o un grupo, es aquí.
   (Los grupos que agregues/edites desde la app se guardan en el celular
   y tienen prioridad sobre esta lista.)
   ===================================================================== */

const COMISION = 25000;

const HOUSES = [
  {id:"lunaluna", nombre:"Casa en Col. Luna Luna", corto:"la casa de la Luna Luna",
   chip:"Luna Luna", jefe:{n:"El Guardián de la Luna", e:"🌕"},
   titulo:"Casa en venta Col. Luna Luna, Cd. Madero · 3 recámaras",
   precio:"$1,700,000", precioNum:"1700000",
   zona:"Calle José Puente, Col. Jesús Luna Luna, C.P. 89514, Cd. Madero, Tamps.",
   ubic:"en la calle José Puente, Col. Jesús Luna Luna, C.P. 89514, en Cd. Madero",
   mapa:"https://maps.app.goo.gl/kTcwBmbmWoYydgU76",
   resumen:"2 plantas · 3 recámaras · 1.5 baños · 115.50 m²",
   detalle:"Es de dos plantas, tiene 3 recámaras con closet, baño y medio, cochera para un carro y patio atrás. Son 115.50 m² y los papeles están en regla, lista para escriturar.",
   fotos:[12,10,5,9,11,7,8,1,3,4,2,6], video:false,
   texto:`🏡 CASA EN VENTA — COL. LUNA LUNA, CD. MADERO 🔑
💰 $1,700,000

Casa de dos plantas en calle interior, tranquila y segura. Cocina equipada con instalación para gas natural, closets en las 3 recámaras y documentación en regla — lista para escriturar.

PLANTA BAJA
▪️ Cochera con patio frontal (1 auto)
▪️ Sala y comedor
▪️ Cocina con barra, instalación para gas natural
▪️ Medio baño de visitas
▪️ Área de lavado techada
▪️ Patio trasero / área de servicio y tendedero

PLANTA ALTA
▪️ 3 recámaras con closet
▪️ Recámara principal con baño completo
▪️ 2 recámaras secundarias con baño compartido

✅ Documentación en regla, libre de gravamen
📏 Superficie: 115.50 m²

📲 ¿Interesado? Escríbeme y agendamos visita.`},
  {id:"ampliacion", nombre:"Casa en esquina, Amp. Unidad Nacional", corto:"la casa en esquina de la Unidad Nacional",
   chip:"Unidad Nacional", jefe:{n:"El Señor de la Esquina", e:"🏰"},
   titulo:"Casa en esquina en venta, Amp. Unidad Nacional, Cd. Madero",
   precio:"$2,350,000", precioNum:"2350000",
   zona:"13 de Septiembre y Benito Juárez, Amp. Unidad Nacional, Cd. Madero, Tamps.",
   ubic:"en la esquina de 13 de Septiembre y Benito Juárez, en la Ampliación Unidad Nacional, Madero",
   mapa:"https://maps.app.goo.gl/4bp56QBzNpcR2V617",
   resumen:"Esquina · 3 recámaras · 1.5 baños · cochera triple",
   detalle:"Es en esquina, tiene 3 recámaras con closet y minisplit, baño y medio y cochera para 3 carros. El terreno es de 141.46 m² y la construcción de 101 m².",
   fotos:[8,1,2,3,6,5,7,4], video:true,
   texto:`🏡 CASA EN VENTA — Esquina, Amp. Unidad Nacional, Cd. Madero
💰 $2,350,000

Casa independiente en esquina, ideal para ampliar o invertir.

• 3 recámaras c/closet y minisplit, 1.5 baños
• Sala, comedor, cocina con alacenas, estufa y campana
• Área de lavado interior techada y externa con tendido
• Bodeguita interior + bodega externa con llave
• Cochera triple, calentador Mabe 38L
• Bardeada con protecciones, pasillos amplios
• Terreno 141.46 m² | Construcción 101 m²

📲 Escríbeme para agendar visita.`},
  {id:"miramar", nombre:"Casa cerca de Playa Miramar", corto:"la casa de Miramar",
   chip:"Miramar", jefe:{n:"El Kraken de Miramar", e:"🦑"},
   titulo:"Casa en venta cerca de Playa Miramar · 4 recámaras, residencial con alberca",
   precio:"$4,672,500", precioNum:"4672500",
   zona:"Cerca de Playa Miramar, Cd. Madero, Tamps.",
   ubic:"cerca de Playa Miramar, en Madero, dentro de un residencial con vigilancia",
   mapa:"",
   resumen:"4 recámaras · 3.5 baños · 210 m² · alberca",
   detalle:"Son 210 m² de construcción, 4 recámaras (una abajo), 3 baños y medio y cocina equipada. El residencial tiene alberca, cancha de pádel, casa club y vigilancia 24/7.",
   fotos:[2,8,3,1,5,6,7,4], video:false,
   texto:`🏖️ Casa cerca de Playa Miramar — Prototipo Palmas
💰 $4,672,500

Ideal para familias grandes, a minutos de la playa.
📐 210 m² de construcción

DISTRIBUCIÓN
• 4 recámaras (1 en planta baja), todas con closet/vestidor
• 3.5 baños
• Cocina equipada con barra de granito, alacenas, parrilla y campana
• Cuarto de lavado
• Patio jardín junto a la recámara de planta baja
• Cisterna y presurizador
• Vigilancia 24/7 con acceso controlado

AMENIDADES DEL RESIDENCIAL
• Cancha de pádel, alberca, casa club, áreas verdes y locales comerciales

FORMA DE PAGO
• 20% de enganche, resto al recibir tu casa (o plan personalizado)
• Promesa notariada y servicios garantizados

📲 Escríbeme para más información y agendar visita.`},
  {id:"madero", nombre:"Preventa cerca de Madero Centro", corto:"las casas de preventa",
   chip:"Preventa",
   /* son 2 casas: cada una es su propio jefe y su propia comisión */
   unidades:[
     {id:"madero-medio", nombre:"Preventa · la de en medio", jefe:{n:"El Gemelo de en Medio", e:"🐉"}},
     {id:"madero-fondo", nombre:"Preventa · la del fondo",  jefe:{n:"El Gemelo del Fondo", e:"🐲"}}
   ],
   titulo:"Preventa casa nueva 3 recámaras cerca de Madero Centro",
   precio:"$2,600,000", precioNum:"2600000",
   quedan:"todavía quedan 2 disponibles, la de en medio y la del fondo",
   zona:"Col. Felipe Carrillo Puerto, calle Bolivia (frente al jardín de niños), Cd. Madero",
   ubic:"en la Col. Felipe Carrillo Puerto, calle Bolivia, frente al jardín de niños, cerca del centro de Madero",
   mapa:"https://maps.app.goo.gl/eHntYBJ1koMVaiuy5",
   resumen:"Nueva · 3 recámaras · 1.5 baños · 148 m² · quedan 2",
   detalle:"Son casas nuevas de dos plantas, 148 m², 3 recámaras, baño y medio, cocina con isla, balcón y 2 cajones de estacionamiento. Son 3 casas y quedan 2 disponibles, la de en medio y la del fondo.",
   fotos:[14,12,1,8,2,9,11,13,5,6,7,3,4], video:true,
   texto:`🏡 PREVENTA — Casa Nueva cerca de Madero Centro
💰 $2,600,000

Conjunto habitacional de 3 casas (quedan 2 disponibles: la de en medio y la del fondo), excelente ubicación cerca de escuelas, comercio, transporte y bancos.
📏 148 m² | Acabados de calidad

PLANTA BAJA
• Sala, comedor, cocina moderna con isla
• Baño de visitas, cuarto de lavado
• Cajón de estacionamiento

PLANTA ALTA
• 3 recámaras cómodas
• 1 baño completo
• Balcón/terraza
• Cajón de estacionamiento adicional

📍 Col. Felipe Carrillo Puerto, calle Bolivia, frente al jardín de niños.

📲 ¡No dejes que te ganen la tuya! Escríbeme para más info y apartar.`}
];

/* Tipos de grupo:
   inmo    = grupos grandes de bienes raíces / casas
   general = ventas en general (de todo)
   unidad  = grupos de la colonia Unidad Nacional */
const GROUP_TYPES = {
  inmo:    "Bienes raíces",
  general: "Ventas generales",
  unidad:  "Unidad Nacional"
};

/* El id (g1, g3...) es fijo: así el celular reconoce cada grupo aunque cambies el nombre o el link.
   "Tampico Ventas" (g2) se quitó. */
const DEFAULT_GROUPS = [
  ["g1","Casas y terrenos en venta y renta en Tampico, Madero y Altamira","inmo","https://www.facebook.com/share/g/1NYszRM8o1/"],
  ["g3","Ampliación Unidad Nacional (ventas y Servicios)","unidad","https://www.facebook.com/share/g/14qVaGv2br8/"],
  ["g4","VENTAM BIENES RAICES","inmo","https://www.facebook.com/share/g/1Ff4LSPm3r/"],
  ["g5","VENTAM","general","https://www.facebook.com/share/g/18n3AbzmBy/"],
  ["g6","VENTA Y RENTA DE CASAS, LOCALES EN Tampico, Madero y Altamira","inmo","https://www.facebook.com/share/g/1EVkqyenxY/"],
  ["g7","Ventas Seguras Tampico, Madero y Altamira","general","https://www.facebook.com/share/g/1C11k1AzQn/"],
  ["g8","VEMTAN : TAMPICO-MADERO-ALTAMIRA","general","https://www.facebook.com/share/g/1DLSUG85rb/"],
  ["g9","LA AMPLIACION UNIDAD NACIONAL Ventas / Intercambios / Anuncios","unidad","https://www.facebook.com/share/g/1Cemnsm9Ef/"],
  ["g10","COLONIA UNIDAD NACIONAL CD. MADERO TAMAULIPAS","unidad","https://www.facebook.com/share/g/1DGjPFPLRm/"],
  ["g11","VENTAS TAMPICO,MADERO Y ALTAMIRA","general","https://www.facebook.com/share/g/1E6sJwKksV/"],
  ["g12","VentasLagunadelcarpintero","general","https://www.facebook.com/share/g/1Et4UQLuk2/"],
  ["g13","VENTA Y RENTA DE CASAS EN TAMPICO, MADERO Y ALTAMIRA","inmo","https://www.facebook.com/share/g/19VtkKan5C/"],
  ["g14","Bienes Raíces Tampico, Madero y Altamira","inmo","https://www.facebook.com/share/g/1GdpbGuWk2/"],
  ["g15","TAMPICOMPRAS Y MAS","general","https://www.facebook.com/share/g/1MFriPYdUg/"],
  ["g16","Ventas Colonia Tamaulipas","general","https://www.facebook.com/share/g/1JYLantJ1o/"],
  ["g17","Casas, Terrenos y locales comerciales Tampico/Madero/Altamira","inmo","https://www.facebook.com/share/g/1FN8Zgsa1w/"],
  ["g18","Altama venta y renta de casas depas y terrenos","inmo","https://www.facebook.com/share/g/1HKXyBpdZo/"],
  ["g19","Bienes Raíces Altamira, Madero y Tampico Almatam","inmo","https://www.facebook.com/share/g/1HP7kD2ozR/"],
  ["g20","Venta Local (Tampico - Madero - Altamira)","general","https://www.facebook.com/share/g/1BztnUhDxp/"],
  ["g21","VENTAM CASAS","inmo","https://www.facebook.com/share/g/1FGwxMssnh/"]
].map(([id,name,type,url])=>({id, name, type, url, paused:false}));

/* Cambios a los grupos que ya están guardados en el celular. Se aplican una sola vez cada uno
   (por número de versión), sin tocar lo demás que tengas guardado. */
const GROUP_UPDATES = [
  {v:1, remove:["g2"], links:Object.fromEntries(DEFAULT_GROUPS.map(g=>[g.id,g.url]))}
];

/* Pesos de la rotación (1 = normal). Más alto = sale más seguido en ese tipo de grupo.
   Las apartadas se multiplican por PESO_APARTADA; las vendidas salen solas. */
const PESOS = {
  ampliacion: {unidad:3},              // su colonia: la ven casi un día sí y uno no
  miramar:    {inmo:1.8, general:0.5}  // la más cara: más en bienes raíces, menos en ventas generales
};
const PESO_APARTADA = 0.4;

/* Frases de apertura para grupos (se van rotando para que no se vea igual).
   {saludo} se cambia por "Buenas tardes" o "Buenas noches" según el bloque. */
const OPENERS = [
  "Sigue disponible 👇",
  "Casa en venta en Madero 👇",
  "Para quien ande buscando casa en Madero 👇",
  "{saludo}, les comparto esta casa en venta 👇",
  "Se vende, info por mensaje 👇",
  "Si andan buscando casa en Madero, chéquenla 👇",
  "Todavía disponible, aquí van los detalles 👇",
  "Les dejo esta opción en Madero 👇",
  "Por si alguien anda buscando o conoce a alguien 👇",
  "Casa en venta, pregunten sin compromiso 👇",
  "{saludo} grupo, sigo con esta casa disponible 👇",
  "Se vende casa, aquí la info completa 👇",
  "Interesados mándenme mensaje 👇",
  "Se puede ir a ver esta semana 👇"
];

/* XP por cada cosa REAL que haces */
const XP = {
  grupo:10,            // publicar en un grupo
  marketplace:15,      // publicar/renovar en Marketplace
  interesado:25,
  seguimiento:10,      // mensaje de seguimiento enviado
  visitaAgendada:100,
  visitaHecha:150,
  apartado:1000,
  venta:1000
};
/* Bonus de XP al cumplir cada meta semanal */
const BONUS_SEMANA = {grupos:200, pub:100, conv:150, vis:250};

/* Frases para motivarte: cortas y al grano */
const FRASES = [
  "Una venta son $25,000. Hoy es otro boleto.",
  "Nadie compra una casa que no vio.",
  "Publicar es lo único que depende de ti. Lo demás llega.",
  "Más publicaciones, más mensajes, más visitas.",
  "Ya está todo armado. Copia, pega, palomea.",
  "Diez minutos ahorita valen más que una hora mañana.",
  "El que publica diario es el que vende.",
  "No necesitas ganas, nada más el celular.",
  "Cada mensaje que contestas rápido es un cliente que no se va con otro."
];
