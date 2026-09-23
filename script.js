function num(id){ var el=document.getElementById(id); var v=parseFloat(el.value); return isNaN(v)?0:v; }
function txt(id){ return document.getElementById(id).value.trim(); }
// Defensivo: .selectedOptions puede fallar o venir vacío en algunos navegadores,
// sobre todo en un <select> que fue reubicado en el DOM (como hace
// envolverSecciones() con cada sección). Probamos selectedOptions primero,
// caemos a options[selectedIndex] si hace falta, y nunca dejamos que esto
// rompa el flujo — en el peor caso devuelve texto vacío en vez de tronar.
function textoOpcionSeleccionada(selectId){
  var sel = document.getElementById(selectId);
  if(!sel) return '';
  try {
    if(sel.selectedOptions && sel.selectedOptions.length && sel.selectedOptions[0]){
      return sel.selectedOptions[0].text || '';
    }
  } catch(e){}
  try {
    var idx = sel.selectedIndex;
    if(idx!==undefined && idx>=0 && sel.options && sel.options[idx]){
      return sel.options[idx].text || '';
    }
  } catch(e){}
  return '';
}
function fmtMoney(n){ var s=n<0?'-':''; return s+'$'+Math.round(Math.abs(n)).toLocaleString('es-ES'); }
function fmtPct(n){ return (n>=0?'+':'')+n.toFixed(1)+'%'; }
function fmtNum(n){ return Math.round(n).toLocaleString('es-ES'); }
function fmtImpacto(v){ return (typeof v==='number' && !isNaN(v) && v!==0) ? fmtMoney(v) : null; }

var LEVERS = {
  abasto:['Identificar los SKUs con stock bajo o agotado','Confirmar fechas de resurtido','Priorizar productos con mayor demanda perdida','Definir sustitutos cuando no haya disponibilidad'],
  digital:['Mostrar alternativas mientras se resuelve el stock','Mejorar recomendaciones de sustitutos','Revisar mensajes de disponibilidad','Revisar el flujo PDP → carrito → checkout en mobile'],
  crm:['Identificar clientes recurrentes afectados','Activar comunicación cuando vuelva el producto','Sugerir sustitutos relevantes','Medir recuperación de esos clientes']
};
var LEVER_NAMES = {abasto:'Abasto', digital:'Producto digital', crm:'CRM'};
var CANAL_NAMES = {ecommerce:'Ecommerce', app:'App', whatsapp:'WhatsApp', llamadas:'Llamadas'};
var CSV_FIELD_MAP = {
  'meta':'inp-meta', 'venta_actual':'inp-venta-actual', 'dias_transcurridos':'inp-dias-t', 'dias_totales':'inp-dias-total',
  'venta_yoy':'inp-yoy-base', 'venta_mom':'inp-mom-base',
  'sesiones_actual':'inp-ses-a', 'sesiones_base':'inp-ses-b', 'cr_actual':'inp-cr-a', 'cr_base':'inp-cr-b',
  'aov_actual':'inp-aov-a', 'aov_base':'inp-aov-b',
  'pedidos_nuevos_actual':'inp-pn-a', 'pedidos_nuevos_base':'inp-pn-b',
  'pedidos_recurrentes_actual':'inp-pr-a', 'pedidos_recurrentes_base':'inp-pr-b',
  'frecuencia_actual':'inp-fr-a', 'frecuencia_base':'inp-fr-b',
  'pedidos_totales_actual':'inp-pt-a', 'pedidos_totales_base':'inp-pt-b',
  'piezas_actual':'inp-piezas-a', 'piezas_base':'inp-piezas-b',
  'meta_pedidos':'inp-meta-pedidos',
  'meta_sesiones':'inp-meta-sesiones',
  'variacion_cr_desktop':'inp-device-desktop', 'variacion_cr_mobile':'inp-device-mobile',
  'funnel_sesiones_desktop':'fun-ses-d', 'funnel_pdp_desktop':'fun-pdp-d', 'funnel_addtocart_desktop':'fun-atc-d', 'funnel_checkout_desktop':'fun-chk-d', 'funnel_compra_desktop':'fun-pur-d',
  'funnel_sesiones_mobile':'fun-ses-m', 'funnel_pdp_mobile':'fun-pdp-m', 'funnel_addtocart_mobile':'fun-atc-m', 'funnel_checkout_mobile':'fun-chk-m', 'funnel_compra_mobile':'fun-pur-m'
};
// Columnas "empaquetadas": cada fila dinámica (categoría, SKU, canal de adquisición) va en
// una sola celda, separando entradas con ";" y campos dentro de cada entrada con ":".
// Ej. categorias: "AETOPS:-21:120000;GLP1:-8:45000"
var CSV_PACKED_FIELDS = {
  'categorias': {key:'_cats', campos:3},              // nombre:variación%:impacto$
  'skus': {key:'_skus', campos:4},                    // nombre:sesiones%:addtocart%:stock(ok|bajo|agotado)
  'canales_adquisicion': {key:'_acq', campos:5}        // canal:sesiones_base:sesiones_actual:conversión%:aov
};

function canalEsDirecto(canal){ return canal==='llamadas' || canal==='whatsapp'; }

// --- Persistencia por canal ---------------------------------------------
// Todo el formulario (secciones 01-06) se guarda por canal para que cambiar
// el selector no pise los datos del canal anterior. Días/días totales/umbral
// son del período, no del canal, así que se excluyen y se guardan aparte.
var CAMPOS_PERIODO = ['inp-dias-t','inp-dias-total','inp-umbral'];
var CAMPOS_EXCLUIR_CANAL = ['sel-canal','sel-modo','sel-vista-historial','inp-csv-import','inp-historial-import'].concat(CAMPOS_PERIODO);

function serializarFormularioActual(){
  var datos = {};
  document.querySelectorAll('.wrap input[id], .wrap select[id]').forEach(function(el){
    if(CAMPOS_EXCLUIR_CANAL.indexOf(el.id)===-1) datos[el.id]=el.value;
  });
  datos._cats = Array.prototype.map.call(document.querySelectorAll('#cat-rows-container .cat-row'), function(row){
    return [row.querySelector('.cat-name').value, row.querySelector('.cat-var').value, row.querySelector('.cat-impacto').value];
  });
  datos._skus = Array.prototype.map.call(document.querySelectorAll('#sku-rows-container .sku-row'), function(row){
    return [row.querySelector('.sku-name').value, row.querySelector('.sku-ses').value, row.querySelector('.sku-cart').value, row.querySelector('.sku-stock').value];
  });
  datos._acq = Array.prototype.map.call(document.querySelectorAll('#canales-rows-container .canales-row'), function(row){
    return [row.querySelector('.acq-canal').value, row.querySelector('.acq-sb').value, row.querySelector('.acq-sa').value, row.querySelector('.acq-c').value, row.querySelector('.acq-aov').value];
  });
  return datos;
}
function ajustarCantidadFilas(containerId, rowSelector, crearFn, minimo, cantidad){
  cantidad = Math.max(cantidad, minimo);
  var container = document.getElementById(containerId);
  var actuales = container.querySelectorAll(rowSelector);
  while(actuales.length < cantidad){ crearFn(); actuales = container.querySelectorAll(rowSelector); }
  while(actuales.length > cantidad){ container.removeChild(actuales[actuales.length-1]); actuales = container.querySelectorAll(rowSelector); }
}
function restaurarFormulario(datos){
  datos = datos || {};
  // _lastHipKey/_lastChecklistKey evitan re-renderizar cuando las hipótesis/señales
  // no cambiaron DENTRO del mismo canal (para no perder una hipótesis ya tildada).
  // Pero como son variables globales, si no se resetean acá, un canal nuevo con el
  // mismo "key" que el anterior (typicamente vacío) hace que renderHipotesis()/
  // renderChecklist() corten antes de pintar nada — mostrando el contenido del
  // canal anterior en vez del actual. Cada carga de formulario es, por definición,
  // un canal "nuevo" para estos efectos.
  _lastHipKey = undefined;
  _lastChecklistKey = undefined;
  _lastHipCrecKey = undefined;
  _lastChecklistOpKey = undefined;
  document.getElementById('hipotesis-output').style.display = 'none';
  document.getElementById('gemini-hipotesis-respuesta').style.display = 'none';
  document.getElementById('calc-impacto-wrap').style.display = 'none';
  document.querySelectorAll('.wrap input[id], .wrap select[id]').forEach(function(el){
    if(CAMPOS_EXCLUIR_CANAL.indexOf(el.id)===-1) el.value = datos[el.id]!==undefined ? datos[el.id] : '';
  });
  var cats = datos._cats || [];
  ajustarCantidadFilas('cat-rows-container','.cat-row',crearFilaCategoria,5,cats.length);
  document.querySelectorAll('#cat-rows-container .cat-row').forEach(function(row,i){
    var c = cats[i]||['','',''];
    row.querySelector('.cat-name').value=c[0]||''; row.querySelector('.cat-var').value=c[1]||''; row.querySelector('.cat-impacto').value=c[2]||'';
  });
  var skus = datos._skus || [];
  ajustarCantidadFilas('sku-rows-container','.sku-row',crearFilaSku,5,skus.length);
  document.querySelectorAll('#sku-rows-container .sku-row').forEach(function(row,i){
    var s = skus[i]||['','','','ok'];
    row.querySelector('.sku-name').value=s[0]||''; row.querySelector('.sku-ses').value=s[1]||''; row.querySelector('.sku-cart').value=s[2]||''; row.querySelector('.sku-stock').value=s[3]||'ok';
  });
  var acq = datos._acq || [];
  ajustarCantidadFilas('canales-rows-container','.canales-row',crearFilaCanal,4,acq.length);
  document.querySelectorAll('#canales-rows-container .canales-row').forEach(function(row,i){
    var a = acq[i]||['','','','',''];
    row.querySelector('.acq-canal').value=a[0]||''; row.querySelector('.acq-sb').value=a[1]||''; row.querySelector('.acq-sa').value=a[2]||''; row.querySelector('.acq-c').value=a[3]||''; row.querySelector('.acq-aov').value=a[4]||'';
    actualizarCRFilaCanal(row);
  });
}
function fetchDatosPorCanal(){
  try { var raw = localStorage.getItem('datos-por-canal'); return raw ? JSON.parse(raw) : {}; } catch(e){ return {}; }
}
function guardarDatosPorCanalFull(obj){
  try { localStorage.setItem('datos-por-canal', JSON.stringify(obj)); return true; } catch(e){ return false; }
}
var datosPorCanal = fetchDatosPorCanal();
var canalActual = null;
function guardarCanalActual(){
  if(!canalActual || canalActual==='global') return;
  datosPorCanal[canalActual] = serializarFormularioActual();
  guardarDatosPorCanalFull(datosPorCanal);
}
function fetchPeriodoCompartido(){
  try { var raw = localStorage.getItem('periodo-compartido'); return raw ? JSON.parse(raw) : null; } catch(e){ return null; }
}
function guardarPeriodoCompartido(){
  var p = {}; CAMPOS_PERIODO.forEach(function(id){ p[id]=document.getElementById(id).value; });
  try { localStorage.setItem('periodo-compartido', JSON.stringify(p)); } catch(e){}
}
function restaurarPeriodoCompartido(){
  var p = fetchPeriodoCompartido();
  if(p){ CAMPOS_PERIODO.forEach(function(id){ if(p[id]!==undefined) document.getElementById(id).value=p[id]; }); }
}
function driverWord(name, canal){
  var d = canalEsDirecto(canal);
  if(name==='sesiones') return d ? 'una caída de interacciones' : 'una caída de tráfico';
  if(name==='cr') return d ? 'una caída en la tasa de cierre' : 'una caída de conversión';
  return 'una caída del ticket promedio';
}

function planRecurrentes(skuCount, deviceLabel, categoryLabel, frecuenciaCae){
  if(skuCount>0){
    return {palanca:'Abasto, producto digital y CRM (ver plan de acción abajo)', dueno:'Abasto — acción directa', showPlan:true, groups:['abasto','digital','crm']};
  } else if(deviceLabel || categoryLabel){
    return {palanca:'CRM y producto digital (ver plan de acción abajo)', dueno:'CRM — escalar', showPlan:true, groups:['digital','crm']};
  } else {
    return {palanca: frecuenciaCae
        ? 'Revisar CRM/automatizaciones y disponibilidad de SKUs clave; la frecuencia de recompra está cayendo.'
        : 'Revisar CRM/automatizaciones y disponibilidad de SKUs clave.',
      dueno:'CRM — escalar (stock: acción directa)', showPlan:false, groups:[]};
  }
}

function computeAll(){
  var canal = document.getElementById('sel-canal').value;
  var sesLabel = canalEsDirecto(canal) ? 'Interacciones' : 'Sesiones';
  var crLabel = canalEsDirecto(canal) ? 'Tasa de cierre' : 'CR';

  var meta=num('inp-meta'), diasT=num('inp-dias-t'), diasTotal=num('inp-dias-total'), ventaActual=num('inp-venta-actual');
  var umbral = document.getElementById('inp-umbral').value===''? -5 : num('inp-umbral');
  var pctTiempo = diasTotal>0 ? diasT/diasTotal : 0;
  var ventaEsperada = meta*pctTiempo;
  var brechaAbs = ventaActual-ventaEsperada;
  var brechaPct = ventaEsperada!==0 ? (brechaAbs/ventaEsperada*100) : null;
  var estado, estadoClass;
  if(ventaEsperada===0){ estado='Completa el pacing'; estadoClass='estado-muted'; }
  else if(brechaPct<=umbral){ estado='En riesgo'; estadoClass='estado-danger'; }
  else if(brechaPct<0){ estado='Por ajustar'; estadoClass='estado-warning'; }
  else { estado='En línea'; estadoClass='estado-success'; }

  var metaPedidosPacing=num('inp-meta-pedidos');
  var ptActualDerivado = num('inp-pt-a');
  var realPedidosPacing = ptActualDerivado>0 ? ptActualDerivado : (num('inp-pn-a')+num('inp-pr-a'));
  var pedidosEsperados = metaPedidosPacing*pctTiempo;
  var brechaPedidos = realPedidosPacing-pedidosEsperados;
  var brechaPedidosPct = pedidosEsperados!==0 ? (brechaPedidos/pedidosEsperados*100) : null;

  var metaSesionesPacing=num('inp-meta-sesiones');
  var realSesionesPacing = num('inp-ses-a');
  var sesionesPacingEsperadas = metaSesionesPacing*pctTiempo;
  var brechaSesionesPacing = realSesionesPacing-sesionesPacingEsperadas;
  var brechaSesionesPacingPct = sesionesPacingEsperadas!==0 ? (brechaSesionesPacing/sesionesPacingEsperadas*100) : null;

  var resultado01 = null;
  if(pctTiempo>0 && meta>0){
    var cierreProyectado = ventaActual/pctTiempo;
    var cierrePct = cierreProyectado/meta*100;
    var proyeccionTxt = 'Al ritmo actual, vas a cerrar el período en '+fmtMoney(cierreProyectado)+' ('+cierrePct.toFixed(0)+'% de la meta).';
    var estadoTxt = estadoClass==='estado-success' ? 'Vas en buen ritmo — no hay problemas de pacing en este canal. '
      : estadoClass==='estado-warning' ? 'Vas levemente por debajo del ritmo esperado. '
      : estadoClass==='estado-danger' ? 'Vas por debajo del ritmo esperado. '
      : '';
    resultado01 = estadoTxt + proyeccionTxt;
  }

  var yoyBase=num('inp-yoy-base'), momBase=num('inp-mom-base');
  var yoyPct = yoyBase>0 ? ((ventaActual/yoyBase)-1)*100 : null;
  var momPct = momBase>0 ? ((ventaActual/momBase)-1)*100 : null;
  var lecturaContexto='';
  if(yoyPct!==null && momPct!==null){
    var caso;
    if(yoyPct>=0 && momPct>=0) caso='Crecimiento saludable, sin señal de alarma reciente.';
    else if(yoyPct>=0 && momPct<0) caso='La base anual es sana; la caída es reciente y puntual — foco operativo.';
    else if(yoyPct<0 && momPct>=0) caso='Arrastre estructural o estacional; la mejora reciente todavía no revierte la base.';
    else caso='Caída estructural y reciente a la vez — revisar ambos frentes.';
    lecturaContexto='Con un YoY de '+fmtPct(yoyPct)+' y un MoM de '+fmtPct(momPct)+': '+caso;
  }

  var sesA=num('inp-ses-a'), sesB=num('inp-ses-b'), crA=num('inp-cr-a'), crB=num('inp-cr-b'), aovA=num('inp-aov-a'), aovB=num('inp-aov-b');
  var efSes=(sesA-sesB)*(crB/100)*aovB;
  var efCR=sesA*((crA-crB)/100)*aovB;
  var efAOV=sesA*(crA/100)*(aovA-aovB);
  var ventaCalcActual = sesA*(crA/100)*aovA;
  var reconciliaPct = null;
  if(ventaActual>0 && ventaCalcActual>0){ reconciliaPct = (ventaCalcActual-ventaActual)/ventaActual*100; }

  var sumAbsEfectosDrivers = Math.abs(efSes)+Math.abs(efCR)+Math.abs(efAOV) || 1;
  var drivers=[
    {name:'sesiones',label:sesLabel,val:efSes,pct:efSes/sumAbsEfectosDrivers*100},
    {name:'cr',label:crLabel,val:efCR,pct:efCR/sumAbsEfectosDrivers*100},
    {name:'aov',label:'AOV',val:efAOV,pct:efAOV/sumAbsEfectosDrivers*100}
  ];
  var sorted=drivers.slice().sort(function(a,b){return a.val-b.val;});
  var primary = sorted[0].val<0 ? sorted[0] : null;
  var mejorDriver = sorted[sorted.length-1].val>0 ? sorted[sorted.length-1] : null;
  var maxAbs1=Math.max(Math.abs(efSes),Math.abs(efCR),Math.abs(efAOV),1);
  var variacionTotal = efSes+efCR+efAOV;
  var sumAbsEfectos = sumAbsEfectosDrivers;
  var pctSes = efSes/sumAbsEfectos*100, pctCR = efCR/sumAbsEfectos*100, pctAOV = efAOV/sumAbsEfectos*100;
  var resultado03 = primary
    ? primary.label+' explica '+fmtMoney(Math.abs(primary.val))+' de la variación vs. período de comparación (no de la brecha contra meta), el driver con mayor efecto entre los tres.'
    : ((sesA||crA||aovA) ? 'Ningún factor muestra un efecto negativo dominante todavía.' : null);

  var pnA=num('inp-pn-a'), pnB=num('inp-pn-b'), prA=num('inp-pr-a'), prB=num('inp-pr-b'), frA=num('inp-fr-a'), frB=num('inp-fr-b');
  var deltaN=pnA-pnB, deltaR=prA-prB;

  var ptA=num('inp-pt-a'), ptB=num('inp-pt-b');
  var deltaPT = ptA-ptB;
  var pctPT = ptB!==0 ? (deltaPT/ptB*100) : null;
  var maxAbs2=Math.max(Math.abs(deltaN),Math.abs(deltaR),1);
  var frecuenciaCae = frB>0 && frA<frB;
  var frecuenciaCrece = frB>0 && frA>frB;

  var umbralDrill = document.getElementById('inp-umbral-drill').value===''? -5 : num('inp-umbral-drill');

  var subcausa=null, causaCorta='Completa las secciones anteriores.', palanca='—', dueno='—';
  var deviceLabel=null, categoryLabel=null, skuCount=0, showPlan=false, groups=[];
  var cats=[], anySku=false, categoryTopVar=null, categoryTopImpacto=null, deviceTopVar=null, resultado04a=null, resultado04b=null, resultado04c=null;
  var driverLbl = primary ? primary.label : 'Pedidos';
  var causaSecundaria = null, palancaSecundaria=null, duenoSecundaria=null, showPlanSecundario=false, groupsSecundario=[];

  // Multi-señal: nuevos y recurrentes se evalúan de forma independiente.
  // Que uno sea "el principal" para la síntesis de una línea no borra al otro —
  // el que quede afuera se conserva como señal secundaria, nunca se descarta.
  var nuevosCae = deltaN<0;
  var recurrentesCae = deltaR<0;
  var nuevosCrece = deltaN>0;
  var recurrentesCrece = deltaR>0;
  var resultado04 = null;
  if(nuevosCae && recurrentesCae) resultado04 = 'Cayeron ambos segmentos: nuevos ('+fmtNum(deltaN)+') y recurrentes ('+fmtNum(deltaR)+').';
  else if(recurrentesCae) resultado04 = 'La caída se concentra en clientes recurrentes ('+fmtNum(deltaR)+' pedidos vs. '+fmtNum(deltaN)+' en nuevos).';
  else if(nuevosCae) resultado04 = 'La caída se concentra en clientes nuevos ('+fmtNum(deltaN)+' pedidos vs. '+fmtNum(deltaR)+' en recurrentes).';
  else if(deltaN!==0 || deltaR!==0) resultado04 = 'No hay una concentración clara entre nuevos y recurrentes.';

  var subPrincipal = null;
  if(nuevosCae && recurrentesCae){ subPrincipal = deltaN<=deltaR ? 'nuevos' : 'recurrentes'; }
  else if(nuevosCae){ subPrincipal='nuevos'; }
  else if(recurrentesCae){ subPrincipal='recurrentes'; }
  var subSecundaria = null;
  if(subPrincipal==='nuevos' && recurrentesCae) subSecundaria='recurrentes';
  else if(subPrincipal==='recurrentes' && nuevosCae) subSecundaria='nuevos';
  subcausa = subPrincipal;

  if(recurrentesCae){
    var deskVar=num('inp-device-desktop'), mobVar=num('inp-device-mobile');
    if(deskVar!==0 || mobVar!==0){ deviceLabel = deskVar<mobVar ? 'Desktop' : (mobVar<deskVar ? 'Mobile' : null); }
    if(deviceLabel) deviceTopVar = deskVar<mobVar ? deskVar : mobVar;
    resultado04a = deviceLabel ? ('El dispositivo más afectado es '+deviceLabel+'.') : ((deskVar!==0||mobVar!==0) ? 'Ningún dispositivo muestra una diferencia clara todavía.' : null);

    document.querySelectorAll('#cat-rows-container .cat-row').forEach(function(row){
      var cn = row.querySelector('.cat-name').value.trim();
      if(cn!==''){
        var cv=parseFloat(row.querySelector('.cat-var').value); cv=isNaN(cv)?0:cv;
        var ciEl=row.querySelector('.cat-impacto'); var ci = ciEl ? parseFloat(ciEl.value) : NaN;
        cats.push({name:cn, val:cv, impacto:isNaN(ci)?null:ci});
      }
    });
    var catsConImpacto = cats.filter(function(c){return c.impacto!==null;});
    if(cats.length){
      if(catsConImpacto.length){ cats.sort(function(a,b){ return (a.impacto===null?0:a.impacto)-(b.impacto===null?0:b.impacto); }); }
      else { cats.sort(function(a,b){return a.val-b.val;}); }
      categoryTopVar=cats[0].val; categoryTopImpacto=cats[0].impacto;
      if(cats[0].val<umbralDrill || (cats[0].impacto!==null && cats[0].impacto<0)) categoryLabel=cats[0].name;
    }
    resultado04b = categoryLabel ? ('La categoría concentradora es '+categoryLabel+' (variación '+fmtPct(categoryTopVar)+(categoryTopImpacto!==null?', impacto '+fmtMoney(categoryTopImpacto):'')+').') : (cats.length ? 'Ninguna categoría supera el umbral mínimo definido.' : 'Todavía no cargaste categorías.');

    document.querySelectorAll('#sku-rows-container .sku-row').forEach(function(row){
      var sn = row.querySelector('.sku-name').value.trim();
      if(sn===''){ return; }
      anySku=true;
      var sv=parseFloat(row.querySelector('.sku-ses').value); sv=isNaN(sv)?0:sv;
      var cv=parseFloat(row.querySelector('.sku-cart').value); cv=isNaN(cv)?0:cv;
      var st=row.querySelector('.sku-stock').value;
      if(sv>Math.abs(umbralDrill) && cv<0 && st!=='ok') skuCount++;
    });
    resultado04c = skuCount>0 ? ('Se identificaron '+skuCount+' SKU'+(skuCount>1?'s':'')+' candidatos a causa raíz por disponibilidad.') : (anySku ? 'Ninguno de los SKUs cargados muestra el patrón de riesgo de stock.' : 'Todavía no cargaste SKUs.');
  }

  // Oportunidades: mismos datos de Nivel 2, leídos en espejo — qué está creciendo
  // fuerte y podría empujarse más. A diferencia del bloque de riesgo, no depende de
  // que nuevos/recurrentes estén cayendo — una categoría, SKU o dispositivo puede
  // ser una oportunidad aunque el resto del canal esté parejo.
  var resultadoOp04 = null;
  if(nuevosCrece && recurrentesCrece) resultadoOp04 = 'Crecieron ambos segmentos: nuevos ('+fmtNum(deltaN)+') y recurrentes ('+fmtNum(deltaR)+').';
  else if(recurrentesCrece) resultadoOp04 = 'El crecimiento se concentra en clientes recurrentes ('+fmtNum(deltaR)+' pedidos vs. '+fmtNum(deltaN)+' en nuevos).';
  else if(nuevosCrece) resultadoOp04 = 'El crecimiento se concentra en clientes nuevos ('+fmtNum(deltaN)+' pedidos vs. '+fmtNum(deltaR)+' en recurrentes).';

  var deviceGrowLabel=null, deviceGrowVar=null;
  var deskVarOp=num('inp-device-desktop'), mobVarOp=num('inp-device-mobile');
  if(deskVarOp>0 || mobVarOp>0){ deviceGrowLabel = deskVarOp>mobVarOp ? 'Desktop' : (mobVarOp>deskVarOp ? 'Mobile' : null); }
  if(deviceGrowLabel) deviceGrowVar = deskVarOp>mobVarOp ? deskVarOp : mobVarOp;

  var categoryGrowLabel=null, categoryGrowVar=null, categoryGrowImpacto=null;
  var catsGrow = [];
  document.querySelectorAll('#cat-rows-container .cat-row').forEach(function(row){
    var cn = row.querySelector('.cat-name').value.trim();
    if(cn!==''){
      var cv=parseFloat(row.querySelector('.cat-var').value); cv=isNaN(cv)?0:cv;
      var ciEl=row.querySelector('.cat-impacto'); var ci = ciEl ? parseFloat(ciEl.value) : NaN;
      catsGrow.push({name:cn, val:cv, impacto:isNaN(ci)?null:ci});
    }
  });
  var catsGrowConImpacto = catsGrow.filter(function(c){return c.impacto!==null;});
  if(catsGrow.length){
    if(catsGrowConImpacto.length){ catsGrow.sort(function(a,b){ return (b.impacto===null?0:b.impacto)-(a.impacto===null?0:a.impacto); }); }
    else { catsGrow.sort(function(a,b){return b.val-a.val;}); }
    if(catsGrow[0].val>Math.abs(umbralDrill) || (catsGrow[0].impacto!==null && catsGrow[0].impacto>0)){
      categoryGrowLabel=catsGrow[0].name; categoryGrowVar=catsGrow[0].val; categoryGrowImpacto=catsGrow[0].impacto;
    }
  }

  var skuGrowCount=0;
  document.querySelectorAll('#sku-rows-container .sku-row').forEach(function(row){
    var sn = row.querySelector('.sku-name').value.trim();
    if(sn===''){ return; }
    var sv=parseFloat(row.querySelector('.sku-ses').value); sv=isNaN(sv)?0:sv;
    var cv=parseFloat(row.querySelector('.sku-cart').value); cv=isNaN(cv)?0:cv;
    var st=row.querySelector('.sku-stock').value;
    if(sv>Math.abs(umbralDrill) && cv>Math.abs(umbralDrill) && st==='ok') skuGrowCount++;
  });

  function textoSenalSegmento(seg){
    if(seg==='nuevos') return 'clientes nuevos cayeron ('+fmtNum(deltaN)+' vs. '+fmtNum(deltaR)+' en recurrentes)';
    return 'clientes recurrentes cayeron ('+fmtNum(deltaR)+' vs. '+fmtNum(deltaN)+' en nuevos)'+(deviceLabel?' en '+deviceLabel.toLowerCase():'')+(categoryLabel?', dentro de '+categoryLabel:'');
  }

  // Sugerencia automática de subcausa de AOV — mismo espíritu que el drill-down de
  // CR, pero con menos señales propias: hoy solo piezas por pedido y la categoría
  // concentradora (ya calculada en Nivel 2) tienen datos reales detrás. Precio,
  // promoción y cross-sell no tienen ningún campo propio todavía, así que se
  // quedan como elección manual — sugerir ahí sería adivinar, no calcular.
  var piezasA = num('inp-piezas-a'), piezasB = num('inp-piezas-b');
  var deltaPiezas = piezasA-piezasB;
  var pctPiezas = piezasB>0 ? (deltaPiezas/piezasB*100) : null;
  var categoriaConcentradoraAov = categoryLabel || categoryGrowLabel || null;
  var sugerenciaAovSubcausa = null, sugerenciaAovTexto = null;
  if(pctPiezas!==null && pctPiezas<umbralDrill){
    sugerenciaAovSubcausa = 'unidades';
    sugerenciaAovTexto = 'Sugerencia automática: unidades por pedido — cayeron '+fmtPct(pctPiezas)+' ('+piezasB.toFixed(1)+' → '+piezasA.toFixed(1)+').';
  } else if(categoriaConcentradoraAov){
    sugerenciaAovSubcausa = 'mix';
    sugerenciaAovTexto = 'Sugerencia automática: mix de categoría — '+categoriaConcentradoraAov+' concentra el movimiento en Nivel 2.';
  } else {
    sugerenciaAovTexto = 'Sin sugerencia automática todavía — precio, promoción y cross-sell no tienen datos propios. Elegí manualmente.';
  }

  if(primary && primary.name==='aov'){
    var sub=document.getElementById('sel-aov-subcausa').value;
    if(sub==='mix'){ causaCorta='Ticket promedio — mix de categoría'; palanca='Revisar el peso de categorías de menor precio en el mix.'; }
    else if(sub==='promo'){ causaCorta='Ticket promedio — presión promocional'; palanca='Revisar profundidad y alcance de los descuentos activos.'; }
    else if(sub==='crosssell'){ causaCorta='Ticket promedio — falta de cross-sell'; palanca='Reforzar recomendaciones y bundles en el checkout.'; }
    else if(sub==='unidades'){ causaCorta='Ticket promedio — unidades por pedido'; palanca='Revisar por qué bajaron las unidades por pedido (bundles, mínimos de compra, sustitución).'; }
    else if(sub==='precio'){ causaCorta='Ticket promedio — precio promedio por unidad'; palanca='Revisar cambios de precio o de mix de precios dentro de las categorías vendidas.'; }
    else { causaCorta='AOV es el driver, pero falta clasificar qué lo explica'; palanca='Elegí arriba qué explica el AOV (mix, promoción, cross-sell, unidades o precio).'; }
    dueno = sub ? 'Acción directa' : '—';

    var secundarias=[];
    if(subPrincipal) secundarias.push(textoSenalSegmento(subPrincipal));
    if(subSecundaria) secundarias.push(textoSenalSegmento(subSecundaria));
    if(secundarias.length){
      causaSecundaria = 'Señal'+(secundarias.length>1?'es':'')+' secundaria'+(secundarias.length>1?'s':'')+': '+secundarias.join('; ')+'. Son independientes del ticket promedio — no implican que expliquen la caída de AOV, pero cada una merece su propia investigación (ver "Señales detectadas" abajo).';
      var segPlan = subPrincipal || subSecundaria;
      if(segPlan==='recurrentes'){
        var p2 = planRecurrentes(skuCount, deviceLabel, categoryLabel, frecuenciaCae);
        palancaSecundaria = p2.palanca; duenoSecundaria = p2.dueno; showPlanSecundario = p2.showPlan; groupsSecundario = p2.groups;
      } else {
        palancaSecundaria = 'Revisar calidad e inversión de tráfico pago (Google/Meta) y SEO.';
        duenoSecundaria = 'Marketing — escalar';
      }
    }
  } else if(subPrincipal==='recurrentes'){
    causaCorta = driverLbl+' — clientes recurrentes'+(deviceLabel?' — '+deviceLabel:'')+(categoryLabel?' — '+categoryLabel:'');
    var p = planRecurrentes(skuCount, deviceLabel, categoryLabel, frecuenciaCae);
    palanca=p.palanca; dueno=p.dueno; showPlan=p.showPlan; groups=p.groups;
    if(subSecundaria==='nuevos'){
      causaSecundaria = 'Señal secundaria: '+textoSenalSegmento('nuevos')+'. Recurrentes explica más de la variación de pedidos, pero nuevos también está cayendo.';
      palancaSecundaria = 'Revisar calidad e inversión de tráfico pago (Google/Meta) y SEO.';
      duenoSecundaria = 'Marketing — escalar';
    }
  } else if(subPrincipal==='nuevos'){
    causaCorta=driverLbl+' — adquisición de clientes nuevos';
    palanca='Revisar calidad e inversión de tráfico pago (Google/Meta) y SEO.';
    dueno='Marketing — escalar';
    if(subSecundaria==='recurrentes'){
      causaSecundaria = 'Señal secundaria: '+textoSenalSegmento('recurrentes')+'. Nuevos explica más de la variación de pedidos, pero recurrentes también está cayendo.';
      var p3 = planRecurrentes(skuCount, deviceLabel, categoryLabel, frecuenciaCae);
      palancaSecundaria = p3.palanca; duenoSecundaria = p3.dueno; showPlanSecundario = p3.showPlan; groupsSecundario = p3.groups;
    }
  } else if(deltaN===0 && deltaR===0){
    if(primary){
      causaCorta = primary.label+' es el driver, pero falta el desglose de nuevos vs. recurrentes.';
      palanca='Completa la sección 04 para afinar la causa.';
    } else if(sesA||crA||aovA){
      causaCorta='Sin driver negativo dominante en el desglose de nivel 1.';
      palanca='Revisar factores externos (días hábiles, catálogo, feriados) o ampliar la ventana de comparación.';
    }
  } else {
    causaCorta='Sin concentración clara entre nuevos y recurrentes.';
    palanca='Revisar los montos cargados en la sección 04.';
  }

  var notaValidar = skuCount>0;
  var narrativa=null;
  if(primary || subcausa){
    var periodoLbl = document.getElementById('sel-periodo').value==='mom' ? 'el mes anterior' : 'el año anterior';
    var frase1;
    if(primary){
      var othersHealthy = drivers.filter(function(d){return d.name!==primary.name;}).every(function(d){return d.val>=0;});
      frase1='La principal variación de venta vs. '+periodoLbl+' está explicada por '+driverWord(primary.name, canal)+(othersHealthy?', sin señales relevantes en los otros dos factores.':'.')+' Esto no es lo mismo que la brecha contra la meta (sección 01) — son dos comparaciones distintas.';
    } else {
      frase1='La variación de pedidos vs. '+periodoLbl+' se concentra en una caída de pedidos.';
    }
    var frases=[frase1];
    if(primary && primary.name==='aov'){
      if(causaSecundaria) frases.push(causaSecundaria);
    } else if(subPrincipal==='recurrentes'){
      var lugar='clientes recurrentes'+(deviceLabel?' en '+deviceLabel.toLowerCase():'')+(categoryLabel?', principalmente dentro de '+categoryLabel:'');
      frases.push('Los pedidos disminuyeron '+(primary?'por '+(primary.name==='cr'?driverWord('cr',canal):driverWord('sesiones',canal))+', ':'')+'concentrada en '+lugar+'.');
      if(skuCount>0){
        frases.push('Dentro de'+(categoryLabel?' '+categoryLabel:' la categoría analizada')+' se identificaron '+skuCount+' SKU'+(skuCount>1?'s':'')+' de alta demanda con disponibilidad reducida o agotada, mientras las sesiones crecían. Esto sugiere intención de compra con menor capacidad de convertirla.');
      }
      if(causaSecundaria) frases.push(causaSecundaria);
    } else if(subPrincipal==='nuevos'){
      frases.push('El deterioro se concentra en la adquisición de clientes nuevos.');
      if(causaSecundaria) frases.push(causaSecundaria);
    }
    narrativa = frases.join(' ');
  }

  var peorCanal = null, mejorCanal = null, canalesList = [];
  document.querySelectorAll('#canales-rows-container .canales-row').forEach(function(row){
    var n = row.querySelector('.acq-canal').value.trim();
    if(n){
      var sb = parseFloat(row.querySelector('.acq-sb').value)||0;
      var sa = parseFloat(row.querySelector('.acq-sa').value)||0;
      var c = parseFloat(row.querySelector('.acq-c').value)||0;
      var aov = parseFloat(row.querySelector('.acq-aov').value)||0;
      var cr = sa>0 ? (c/sa*100) : 0;
      var delta = sa-sb;
      var impacto = Math.min(delta,0)*(cr/100)*aov;
      var impactoPositivo = Math.max(delta,0)*(cr/100)*aov;
      canalesList.push({name:n, delta:delta, cr:cr, aov:aov, impacto:impacto, impactoPositivo:impactoPositivo});
    }
  });
  var canalesCayendo=0, canalesCreciendo=0;
  if(canalesList.length>0){
    // Prioriza por impacto económico estimado (sesiones perdidas × CR × AOV propios del canal)
    // cuando hay AOV cargado en al menos un canal; si no, cae a la caída de sesiones cruda —
    // una caída % chica con mucho volumen puede pesar más que una caída % grande con poco volumen.
    var algunAov = canalesList.some(function(c){return c.aov>0;});
    if(algunAov){ canalesList.sort(function(a,b){ return a.impacto-b.impacto; }); }
    else { canalesList.sort(function(a,b){ return a.delta-b.delta; }); }
    peorCanal = canalesList[0];
    peorCanal.perdidaEstimada = Math.abs(peorCanal.impacto);
    canalesCayendo = canalesList.filter(function(c){return c.delta<0;}).length;
    canalesCreciendo = canalesList.filter(function(c){return c.delta>0;}).length;

    var canalesListGrow = canalesList.slice().sort(function(a,b){ return algunAov ? (b.impactoPositivo-a.impactoPositivo) : (b.delta-a.delta); });
    if(canalesListGrow[0].delta>0){
      mejorCanal = canalesListGrow[0];
      mejorCanal.gananciaEstimada = Math.abs(mejorCanal.impactoPositivo);
    }
  }

  var dSes=num('fun-ses-d'), dPdp=num('fun-pdp-d'), dAtc=num('fun-atc-d'), dChk=num('fun-chk-d'), dPur=num('fun-pur-d');
  var mSes=num('fun-ses-m'), mPdp=num('fun-pdp-m'), mAtc=num('fun-atc-m'), mChk=num('fun-chk-m'), mPur=num('fun-pur-m');
  var paseD=[{s:'Sesiones → PDP',r:dSes>0?dPdp/dSes:0},{s:'PDP → Add to cart',r:dPdp>0?dAtc/dPdp:0},{s:'Add to cart → Checkout',r:dAtc>0?dChk/dAtc:0},{s:'Checkout → Compra',r:dChk>0?dPur/dChk:0}];
  var paseM=[{s:'Sesiones → PDP',r:mSes>0?mPdp/mSes:0},{s:'PDP → Add to cart',r:mPdp>0?mAtc/mPdp:0},{s:'Add to cart → Checkout',r:mAtc>0?mChk/mAtc:0},{s:'Checkout → Compra',r:mChk>0?mPur/mChk:0}];
  var peorPaseD = paseD.filter(function(p){return p.r>0;}).sort(function(a,b){return a.r-b.r;})[0] || null;
  var peorPaseM = paseM.filter(function(p){return p.r>0;}).sort(function(a,b){return a.r-b.r;})[0] || null;

  return {canal:canal, meta:meta, ventaActual:ventaActual, ventaEsperada:ventaEsperada, brechaAbs:brechaAbs, brechaPct:brechaPct,
    estado:estado, estadoClass:estadoClass, yoyPct:yoyPct, momPct:momPct, lecturaContexto:lecturaContexto,
    efSes:efSes, efCR:efCR, efAOV:efAOV, maxAbs1:maxAbs1, primary:primary, subcausa:subcausa, reconciliaPct:reconciliaPct, ventaCalcActual:ventaCalcActual,
    deltaN:deltaN, deltaR:deltaR, maxAbs2:maxAbs2, frecuenciaCae:frecuenciaCae,
    deviceLabel:deviceLabel, categoryLabel:categoryLabel, skuCount:skuCount, categoryTopVar:categoryTopVar, deviceTopVar:deviceTopVar,
    causaCorta:causaCorta, palanca:palanca, dueno:dueno, notaValidar:notaValidar, narrativa:narrativa,
    showPlan:showPlan, groups:groups,
    resultado01:resultado01, resultado03:resultado03, resultado04:resultado04,
    resultado04a:resultado04a, resultado04b:resultado04b, resultado04c:resultado04c, causaSecundaria:causaSecundaria,
    palancaSecundaria:palancaSecundaria, duenoSecundaria:duenoSecundaria, showPlanSecundario:showPlanSecundario, groupsSecundario:groupsSecundario,
    peorCanal:peorCanal, peorPaseD:peorPaseD, peorPaseM:peorPaseM,
    pctSes:pctSes, pctCR:pctCR, pctAOV:pctAOV, variacionTotal:variacionTotal,
    nuevosCae:nuevosCae, recurrentesCae:recurrentesCae, subPrincipal:subPrincipal, subSecundaria:subSecundaria,
    categoryTopImpacto:categoryTopImpacto,
    pedidosEsperados:pedidosEsperados, brechaPedidos:brechaPedidos, brechaPedidosPct:brechaPedidosPct,
    sesionesPacingEsperadas:sesionesPacingEsperadas, brechaSesionesPacing:brechaSesionesPacing, brechaSesionesPacingPct:brechaSesionesPacingPct,
    deltaPT:deltaPT, pctPT:pctPT,
    mejorDriver:mejorDriver, nuevosCrece:nuevosCrece, recurrentesCrece:recurrentesCrece, frecuenciaCrece:frecuenciaCrece,
    resultadoOp04:resultadoOp04, deviceGrowLabel:deviceGrowLabel, deviceGrowVar:deviceGrowVar,
    categoryGrowLabel:categoryGrowLabel, categoryGrowVar:categoryGrowVar, categoryGrowImpacto:categoryGrowImpacto,
    skuGrowCount:skuGrowCount, mejorCanal:mejorCanal,
    sugerenciaAovSubcausa:sugerenciaAovSubcausa, sugerenciaAovTexto:sugerenciaAovTexto, pctPiezas:pctPiezas,
    canalesCayendo:canalesCayendo, canalesCreciendo:canalesCreciendo};
}

function setNote(id, text){
  var el = document.getElementById(id);
  if(text){ el.style.display='block'; el.textContent=text; } else { el.style.display='none'; }
}

function setBar(fillId,valId,value,maxAbs,pct,esPedidos){
  var fill=document.getElementById(fillId), val=document.getElementById(valId);
  var pctBar=Math.min(100, Math.abs(value)/maxAbs*100);
  fill.style.width=pctBar+'%';
  fill.style.background = value<0 ? 'var(--danger)' : 'var(--accent)';
  var texto = esPedidos ? fmtNum(value)+' pedidos' : fmtMoney(value);
  val.textContent = texto + (typeof pct==='number' ? ' ('+(pct>=0?'+':'')+pct.toFixed(0)+'%)' : '');
}

function buildGroupsHtml(groups){
  var html='';
  groups.forEach(function(g){
    html += '<h4>'+LEVER_NAMES[g]+'</h4><ul>';
    LEVERS[g].forEach(function(item){ html += '<li>'+item+'</li>'; });
    html += '</ul>';
  });
  return html;
}

function renderPlan(r){
  var el=document.getElementById('plan-accion');
  var elGen=document.getElementById('plan-general');

  if(!r.causaSecundaria){
    elGen.style.display='none';
    if(!r.showPlan){ el.style.display='none'; return; }
    el.style.display='block';
    el.innerHTML = buildGroupsHtml(r.groups);
    return;
  }

  el.style.display='none';
  if(!r.showPlan && !r.showPlanSecundario){ elGen.style.display='none'; return; }
  elGen.style.display='block';
  var html = '<h4 style="color:var(--accent);">Principal — '+r.dueno+'</h4>'
    + '<p style="margin:0 0 8px;font-size:12.5px;color:var(--ink-secondary);">'+r.palanca+'</p>'
    + buildGroupsHtml(r.groups)
    + '<h4 style="color:var(--warning);margin-top:16px;">Secundario — '+r.duenoSecundaria+'</h4>'
    + '<p style="margin:0 0 8px;font-size:12.5px;color:var(--ink-secondary);">'+r.palancaSecundaria+'</p>'
    + buildGroupsHtml(r.groupsSecundario);
  elGen.innerHTML = html;
}

// Motor de señales: cada hallazgo real de Nivel 2 (independiente del driver de Nivel 1)
// se convierte en una señal con su propio "por qué investigar" y "datos necesarios".
// El checklist y las hipótesis se arman desde esta lista — nunca desde una lista fija
// por driver — así solo aparece lo que el diagnóstico realmente encontró hasta ahora.
function detectarSenales(r){
  var s = [];
  // 03 no debe "borrar" otros drivers negativos solo porque uno es el principal —
  // si además de AOV, Sesiones o CR también dan negativo, quedan como señal propia.
  if(r.primary){
    var sesLbl = canalEsDirecto(r.canal) ? 'Interacciones' : 'Sesiones';
    var crLbl = canalEsDirecto(r.canal) ? 'Tasa de cierre' : 'CR';
    var otros = [{name:'sesiones', label:sesLbl, val:r.efSes, pct:r.pctSes}, {name:'cr', label:crLbl, val:r.efCR, pct:r.pctCR}, {name:'aov', label:'AOV', val:r.efAOV, pct:r.pctAOV}]
      .filter(function(d){ return d.name!==r.primary.name && d.val<0; });
    otros.forEach(function(d){
      s.push({id:'driver-sec-'+d.name, impacto:1, label:d.label+' también es negativo ('+fmtMoney(Math.abs(d.val))+', '+d.pct.toFixed(0)+'% de la variación)',
        revisar:d.label+' (driver secundario de Nivel 1)',
        porQue:'No es el driver principal, pero también contribuye negativamente a la variación — no se descarta solo por no ser el mayor.',
        datos:'Mismos datos de Nivel 1 (03), mirando si el patrón se repite en el detalle de '+d.label.toLowerCase()+'.',
        resultadoEsperado:'Ver si este efecto secundario crece, se mantiene o se corrige en el próximo corte.'});
    });
  }
  if(r.nuevosCae){
    s.push({id:'nuevos', impacto:3, label:'Clientes nuevos cayeron ('+fmtNum(r.deltaN)+' vs. '+fmtNum(r.deltaR)+' recurrentes)',
      revisar:'Adquisición de clientes nuevos',
      porQue:'Los pedidos de nuevos cayeron en el período — independiente de si es el segmento que más explica la variación total.',
      datos:'Fuente/medio, SEO, Paid Media, landing pages, mix de adquisición.',
      resultadoEsperado:'Si se concentra en pocos canales, apunta a adquisición; si es pareja en todos, podría ser calidad general del tráfico.'});
  }
  if(r.recurrentesCae){
    s.push({id:'recurrentes', impacto:3, label:'Clientes recurrentes cayeron ('+fmtNum(r.deltaR)+' vs. '+fmtNum(r.deltaN)+' nuevos)',
      revisar:'Retención y recompra de clientes recurrentes',
      porQue:'Los pedidos de recurrentes cayeron en el período — independiente de si es el segmento que más explica la variación total.',
      datos:'Frecuencia histórica, días desde última compra, CRM.',
      resultadoEsperado:'Si la frecuencia también cayó, apunta a retención; si es estable, podría ser un problema de experiencia puntual.'});
  }
  if(r.deviceLabel){
    s.push({id:'device', impacto:2, device:r.deviceLabel, label:r.deviceLabel+(r.deviceTopVar!==null?' ('+fmtPct(r.deviceTopVar)+' CR)':'')+' concentra la caída entre recurrentes',
      revisar:'Experiencia en '+r.deviceLabel,
      porQue:'La caída de conversión entre clientes recurrentes se concentra en '+r.deviceLabel.toLowerCase()+'.',
      datos:'Sesiones y CR por dispositivo, funnel segmentado, grabaciones de sesión.',
      resultadoEsperado:'Confirmar si hay mayor tasa de error o abandono específico de esa plataforma.'});
  }
  if(r.categoryLabel){
    s.push({id:'categoria', impacto:2, categoria:r.categoryLabel, label:'Categoría '+r.categoryLabel+(r.categoryTopVar!==null?' ('+fmtPct(r.categoryTopVar)+'%'+(r.categoryTopImpacto?', '+fmtMoney(r.categoryTopImpacto):'')+')':'')+' concentra la caída',
      revisar:'Categoría '+r.categoryLabel,
      porQue:'Es la categoría priorizada por '+(r.categoryTopImpacto!==null?'impacto económico':'variación de CR')+' entre clientes recurrentes.',
      datos:'CR, tráfico, participación en la venta y disponibilidad de '+r.categoryLabel+'.',
      resultadoEsperado:'Ver si el precio, el contenido o el stock de esa categoría cambiaron en el período.'});
  }
  if(r.skuCount>0){
    s.push({id:'stock', impacto:(r.skuCount>=2?3:2), label:r.skuCount+' SKU'+(r.skuCount>1?'s':'')+' con riesgo de stock (sesiones al alza, add to cart a la baja)',
      revisar:'Disponibilidad / stock',
      porQue:r.skuCount+' SKU(s) muestran más interés (sesiones) pero menos capacidad de convertirlo (add to cart), con stock bajo o agotado.',
      datos:'Stock, sesiones y add to cart por SKU.',
      resultadoEsperado:'Confirmar fechas de quiebre de stock coincidentes con la caída de conversión.'});
  }
  if(r.recurrentesCae && r.frecuenciaCae){
    s.push({id:'frecuencia', impacto:1, label:'La frecuencia de recompra está bajando',
      revisar:'Comportamiento post-compra',
      porQue:'La frecuencia de recompra de la base recurrente cayó vs. el período de comparación.',
      datos:'Frecuencia histórica, días desde última compra, campañas de reactivación.',
      resultadoEsperado:'Ver tiempo desde la última compra y tasa de reactivación de la base.'});
  }
  if(r.peorCanal && r.peorCanal.delta<0){
    s.push({id:'canal', impacto:3, canal:r.peorCanal.name, label:'Canal '+r.peorCanal.name+' cayó '+fmtNum(Math.abs(r.peorCanal.delta))+' sesiones'+(r.peorCanal.perdidaEstimada>0?' (~'+fmtMoney(r.peorCanal.perdidaEstimada)+')':''),
      revisar:'Canal '+r.peorCanal.name,
      porQue:'Es el canal priorizado por '+(r.peorCanal.aov>0?'impacto económico estimado':'caída absoluta de sesiones')+'.',
      datos:'Inversión, calidad de tráfico y CR propio del canal.',
      resultadoEsperado:'Ver si la inversión, el CPC o la segmentación de ese canal cambiaron.'});
  }
  function profundizarEtapa(etapa){
    if(!etapa) return '';
    if(etapa==='Sesiones → PDP') return 'Profundizar en descubrimiento: búsqueda interna, navegación, relevancia de resultados.';
    if(etapa==='PDP → Add to cart') return 'Profundizar en fricción de producto: fotos, precio, descripción, reviews.';
    if(etapa==='Add to cart → Checkout') return 'Profundizar en fricción de decisión: costos de envío mostrados, urgencia, comparación.';
    if(etapa==='Checkout → Compra') return 'Profundizar en fricción transaccional: métodos de pago, costos/envío, formularios, errores, abandono del checkout.';
    return '';
  }
  if(r.peorPaseD){
    s.push({id:'funnel-d', impacto:3, etapa:r.peorPaseD.s, label:'Desktop: mayor quiebre en '+r.peorPaseD.s+' ('+fmtPct(r.peorPaseD.r*100)+')',
      revisar:'Etapa "'+r.peorPaseD.s+'" (Desktop)',
      porQue:'Es la tasa de pase más baja del embudo en desktop.',
      datos:'Funnel de conversión por dispositivo, errores técnicos.',
      resultadoEsperado:'Revisar si hay errores técnicos o cambios recientes en esa etapa.',
      profundizar:profundizarEtapa(r.peorPaseD.s)});
  }
  if(r.peorPaseM){
    s.push({id:'funnel-m', impacto:3, etapa:r.peorPaseM.s, label:'Mobile: mayor quiebre en '+r.peorPaseM.s+' ('+fmtPct(r.peorPaseM.r*100)+')',
      revisar:'Etapa "'+r.peorPaseM.s+'" (Mobile)',
      porQue:'Es la tasa de pase más baja del embudo en mobile.',
      datos:'Funnel de conversión por dispositivo, errores técnicos.',
      resultadoEsperado:'Revisar si hay errores técnicos o cambios recientes en esa etapa.',
      profundizar:profundizarEtapa(r.peorPaseM.s)});
  }
  s.sort(function(a,b){ return b.impacto-a.impacto; });
  return s;
}

// Motor de oportunidades: espejo positivo de detectarSenales — mismos datos de
// Nivel 2, leídos para encontrar qué está creciendo y podría empujarse más,
// en vez de qué está cayendo y hay que investigar.
function detectarOportunidades(r){
  var s = [];
  if(r.mejorDriver){
    s.push({id:'driver-pos', impacto:3, label:r.mejorDriver.label+' está creciendo ('+fmtMoney(r.mejorDriver.val)+', '+r.mejorDriver.pct.toFixed(0)+'% de la variación)',
      empujar:r.mejorDriver.label+' (driver principal en positivo)',
      porQue:'Es el factor de Nivel 1 que más está aportando a la variación de venta vs. el período de comparación.',
      datos:'Mismos datos de Nivel 1 (03), mirando qué está impulsando ese '+r.mejorDriver.label.toLowerCase()+'.',
      resultadoEsperado:'Ver si ese impulso se sostiene en el próximo corte o fue puntual del período.'});
  }
  if(r.nuevosCrece){
    s.push({id:'nuevos-pos', impacto:3, label:'Clientes nuevos crecieron (+'+fmtNum(r.deltaN)+' vs. '+fmtNum(r.deltaR)+' recurrentes)',
      empujar:'Adquisición de clientes nuevos',
      porQue:'Los pedidos de nuevos crecieron en el período — vale la pena ver qué está funcionando para escalarlo.',
      datos:'Fuente/medio, SEO, Paid Media, landing pages, mix de adquisición.',
      resultadoEsperado:'Si se concentra en pocos canales, ahí conviene aumentar inversión; si es parejo, podría ser una mejora general.'});
  }
  if(r.recurrentesCrece){
    s.push({id:'recurrentes-pos', impacto:3, label:'Clientes recurrentes crecieron (+'+fmtNum(r.deltaR)+' vs. '+fmtNum(r.deltaN)+' nuevos)',
      empujar:'Retención y recompra de clientes recurrentes',
      porQue:'Los pedidos de recurrentes crecieron en el período — vale la pena ver qué está funcionando para sostenerlo.',
      datos:'Frecuencia histórica, campañas de CRM activas, cambios de producto o experiencia.',
      resultadoEsperado:'Si la frecuencia también subió, hay una mejora de retención real para replicar.'});
  }
  if(r.deviceGrowLabel){
    s.push({id:'device-pos', impacto:2, device:r.deviceGrowLabel, label:r.deviceGrowLabel+(r.deviceGrowVar!==null?' ('+fmtPct(r.deviceGrowVar)+' CR)':'')+' viene mejorando',
      empujar:'Experiencia en '+r.deviceGrowLabel,
      porQue:'La conversión viene mejorando en '+r.deviceGrowLabel.toLowerCase()+' — podría valer la pena priorizar inversión o UX ahí.',
      datos:'Sesiones y CR por dispositivo, qué cambió recientemente en esa plataforma.',
      resultadoEsperado:'Confirmar si hubo un cambio de producto/UX reciente que explique la mejora, para replicarlo.'});
  }
  if(r.categoryGrowLabel){
    s.push({id:'categoria-pos', impacto:2, categoria:r.categoryGrowLabel, label:'Categoría '+r.categoryGrowLabel+(r.categoryGrowVar!==null?' (+'+fmtPct(r.categoryGrowVar)+'%'+(r.categoryGrowImpacto?', '+fmtMoney(r.categoryGrowImpacto):'')+')':'')+' está creciendo fuerte',
      empujar:'Categoría '+r.categoryGrowLabel,
      porQue:'Es la categoría con mejor variación positiva — candidata a empujar con más exposición, stock o inversión.',
      datos:'Stock, exposición en home/búsqueda y participación en la venta de '+r.categoryGrowLabel+'.',
      resultadoEsperado:'Asegurar disponibilidad y considerar más presupuesto/visibilidad mientras dure el impulso.'});
  }
  if(r.skuGrowCount>0){
    s.push({id:'stock-pos', impacto:(r.skuGrowCount>=2?3:2), label:r.skuGrowCount+' SKU'+(r.skuGrowCount>1?'s':'')+' con tracción fuerte (sesiones y add to cart al alza, stock OK)',
      empujar:'Producto destacado / featured',
      porQue:r.skuGrowCount+' SKU(s) muestran más interés y más conversión a la vez, con stock disponible.',
      datos:'Sesiones, add to cart y stock por SKU.',
      resultadoEsperado:'Asegurar que no se agote el stock y evaluar destacarlos más (home, búsqueda, email).'});
  }
  if(r.recurrentesCrece && r.frecuenciaCrece){
    s.push({id:'frecuencia-pos', impacto:1, label:'La frecuencia de recompra está subiendo',
      empujar:'Programa de recompra / CRM',
      porQue:'La frecuencia de recompra de la base recurrente creció vs. el período de comparación.',
      datos:'Frecuencia histórica, campañas de CRM activas en el período.',
      resultadoEsperado:'Identificar qué campaña o cambio coincide, para sostenerlo.'});
  }
  if(r.mejorCanal){
    s.push({id:'canal-pos', impacto:3, canal:r.mejorCanal.name, label:'Canal '+r.mejorCanal.name+' creció '+fmtNum(r.mejorCanal.delta)+' sesiones'+(r.mejorCanal.gananciaEstimada>0?' (~'+fmtMoney(r.mejorCanal.gananciaEstimada)+')':''),
      empujar:'Canal '+r.mejorCanal.name,
      porQue:'Es el canal con mejor variación positiva — candidato a escalar inversión mientras el CR/AOV se mantenga.',
      datos:'Inversión actual, CPC, CR y AOV propios del canal.',
      resultadoEsperado:'Ver cuánto margen hay para aumentar presupuesto ahí sin que se deteriore el CR/AOV.'});
  }
  s.sort(function(a,b){ return b.impacto-a.impacto; });
  return s;
}

function generarOportunidadesCrecimiento(r){
  // Mismo formato "si X, entonces Y, porque Z" que generarHipotesis, pero en espejo:
  // Y es una acción de negocio para empujar (no una investigación de causa raíz),
  // porque amplificar algo que ya funciona empíricamente pesa menos que declarar
  // una causa todavía no validada.
  var top3 = detectarOportunidades(r).slice(0,3);
  var byId = {};
  top3.forEach(function(s){ byId[s.id]=s; });
  var op = [];

  if(byId['recurrentes-pos'] && byId['device-pos']){
    op.push('Si el crecimiento de recurrentes viene de una mejor experiencia en '+byId['device-pos'].device+', entonces reforzar inversión/UX ahí podría sostener el crecimiento, porque ya hay tracción real que respalda la apuesta. (Señales: recurrentes + dispositivo)');
  }
  if(byId['categoria-pos'] && byId['stock-pos'] && op.length<3){
    op.push('Si el crecimiento de la categoría '+byId['categoria-pos'].categoria+' viene acompañado de SKUs con tracción y stock disponible, entonces asegurar ese stock y darle más exposición podría capturar más de la demanda, porque el interés ya está confirmado. (Señales: categoría + stock)');
  }
  if(r.mejorDriver && r.mejorDriver.name==='sesiones' && byId['canal-pos'] && op.length<3){
    op.push('Si el crecimiento de tráfico viene de adquisición en '+byId['canal-pos'].canal+', entonces escalar inversión ahí podría traer más sesiones al mismo ritmo, porque ese canal ya muestra mejor variación que el resto. (Señal: canal)');
  }
  if(byId['nuevos-pos'] && op.length<3){
    op.push('Si el crecimiento de clientes nuevos viene de adquisición, entonces conviene identificar en qué canal o fuente se concentra para escalar presupuesto ahí, porque esos son los que están trayendo el flujo de nuevos clientes. (Señal: nuevos)');
  }
  if(byId['recurrentes-pos'] && !byId['device-pos'] && op.length<3){
    op.push('Si la mejora de recurrentes viene de retención, entonces vale la pena identificar qué campaña o cambio de producto coincide con la mejora de frecuencia, para sostenerlo o replicarlo en otros segmentos. (Señal: recurrentes)');
  }
  if(byId['categoria-pos'] && !byId['stock-pos'] && op.length<3){
    op.push('Si el crecimiento de la categoría '+byId['categoria-pos'].categoria+' no viene de un SKU puntual, entonces podría ser un cambio de demanda o de posicionamiento — vale la pena revisar si conviene ampliar el catálogo o la inversión en esa categoría. (Señal: categoría)');
  }
  if(byId['stock-pos'] && !byId['categoria-pos'] && op.length<3){
    op.push('Si la tracción de esos SKUs se sostiene, entonces conviene asegurar reposición y considerar destacarlos (home, búsqueda, email) antes de que el stock se vuelva una limitante. (Señal: stock)');
  }
  if(r.mejorDriver && r.mejorDriver.name==='aov' && op.length<3){
    op.push('Si el crecimiento de AOV viene del mix de categorías, entonces reforzar la exposición de las categorías o SKUs de mayor ticket podría sostener ese impulso, porque el mix ya se está moviendo en esa dirección. (Driver: AOV)');
  }
  return op.slice(0,3);
}

// Síntesis riesgo+oportunidad: cuando las dos direcciones conviven en el mismo
// canal, mostrarlas como dos listas separadas deja que el analista arme la
// lectura de negocio en la cabeza. Esta función arma esa lectura una sola vez,
// con dos niveles de confianza:
// 1) Tensión de driver — primary (Nivel 1, negativo) y mejorDriver (Nivel 1,
//    positivo) son matemáticamente excluyentes entre sí (mismo array, uno es el
//    más negativo y el otro el más positivo), así que si ambos existen a la vez
//    es porque dos métricas DISTINTAS se están moviendo en direcciones opuestas
//    — la lectura más confiable posible, viene directo de Nivel 1.
// 2) Señal + oportunidad puntual — sin tensión de driver, pero con al menos una
//    señal de riesgo y una de oportunidad reales en Nivel 2. Más liviana, se
//    apoya en las mismas listas ya mostradas arriba, no en un cálculo nuevo.
function sintetizarRiesgoOportunidad(r){
  if(r.primary && r.mejorDriver){
    return 'Mientras '+r.primary.label+' arrastra '+fmtMoney(r.primary.val)+' ('+Math.abs(r.primary.pct).toFixed(0)+'% de la variación), '+r.mejorDriver.label+' compensa '+fmtMoney(r.mejorDriver.val)+' ('+r.mejorDriver.pct.toFixed(0)+'%) — atender lo primero sin descuidar lo segundo, porque ahí hay una palanca real funcionando.';
  }
  var senales = detectarSenales(r), oportunidades = detectarOportunidades(r);
  if(senales.length && oportunidades.length){
    return 'Además de "'+senales[0].label+'", hay una oportunidad real en "'+oportunidades[0].label+'" — vale la pena mirar las dos en paralelo, no solo la que más preocupa.';
  }
  return null;
}

// Mapa de la brecha: no calcula nada nuevo — arma un resumen del mismo r que ya
// se muestra en el resto de la pantalla, y cada paso lleva a su sección real.
// El valor está en ver la cadena completa de un vistazo y saltar directo,
// no en descubrir algo que las secciones de abajo no digan ya.
function renderMapaBrecha(r){
  var cont = document.getElementById('mapa-brecha-container');
  if(!r.meta && !r.ventaActual){
    cont.innerHTML = '<p style="font-size:12.5px;color:var(--ink-muted);">Cargá al menos Pacing y Nivel 1 para ver el mapa completo.</p>';
    return;
  }

  var nodos = [];

  var pacingTxt = r.meta>0
    ? ('Meta '+fmtMoney(r.meta)+' vs. real '+fmtMoney(r.ventaActual)+(r.brechaPct!==null?' — brecha '+fmtPct(r.brechaPct):''))
    : 'Cargá la meta del período para ver el pacing.';
  nodos.push({titulo:'Pacing', texto:pacingTxt, color:null, target:'sec-nav-01'});

  var driverTxt, driverColor;
  if(r.primary){ driverTxt = r.primary.label+' es el driver — '+fmtMoney(r.primary.val)+' ('+Math.abs(r.primary.pct).toFixed(0)+'% de la variación)'; driverColor='accent'; }
  else if(r.mejorDriver){ driverTxt = r.mejorDriver.label+' es el que más crece — '+fmtMoney(r.mejorDriver.val)+' ('+r.mejorDriver.pct.toFixed(0)+'%)'; driverColor='success'; }
  else { driverTxt = 'Cargá Sesiones, CR y AOV para ver el driver de Nivel 1.'; driverColor=null; }
  nodos.push({titulo:'Driver (Nivel 1)', texto:driverTxt, color:driverColor, target:'sec-nav-03'});

  var senales = detectarSenales(r), oportunidades = detectarOportunidades(r);
  var oportunidadesNivel2 = oportunidades.filter(function(o){ return o.id!=='driver-pos'; });
  var nivel2Txt;
  if(senales.length && oportunidadesNivel2.length){ nivel2Txt = senales.length+' señal'+(senales.length>1?'es':'')+' de riesgo, '+oportunidadesNivel2.length+' de oportunidad — la más relevante: '+senales[0].label; }
  else if(senales.length){ nivel2Txt = senales[0].label; }
  else if(oportunidadesNivel2.length){ nivel2Txt = oportunidadesNivel2[0].label; }
  else if(oportunidades.length){ nivel2Txt = oportunidades[0].label; }
  else { nivel2Txt = 'Completá las subsecciones de Nivel 2 para ver dónde se concentra.'; }
  nodos.push({titulo:'Nivel 2: dónde se concentra', texto:nivel2Txt, color:'warning', target:'sec-nav-04'});

  var hips = generarHipotesis(r);
  nodos.push({titulo:'Hipótesis', texto: hips.length ? hips[0] : 'Sin hipótesis sugeridas todavía — faltan señales.', color:'accent', target:'sec-nav-05'});

  var estadoVal = document.getElementById('sel-validacion').value || 'pendiente';
  var estadoLbl = {pendiente:'Pendiente de validar', confirmada:'Hipótesis confirmada', rechazada:'Hipótesis rechazada'}[estadoVal] || 'Pendiente de validar';
  nodos.push({titulo:'Validar y recomendar', texto:estadoLbl, color:'success', target:'sec-nav-05'});

  cont.innerHTML = nodos.map(function(n, i){
    var borde = n.color ? ('border-left:3px solid var(--'+n.color+');') : 'border-left:3px solid var(--border);';
    return '<div class="mapa-nodo" data-target="'+n.target+'" style="'+borde+'cursor:pointer;padding:10px 12px;margin-bottom:6px;background:var(--bg-page);border-radius:8px;">'
      + '<div style="font-size:11px;font-weight:600;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.03em;">'+n.titulo+'</div>'
      + '<div style="font-size:13px;color:var(--ink);margin-top:2px;line-height:1.4;">'+escaparHTML(n.texto)+'</div>'
      + '</div>'
      + (i<nodos.length-1 ? '<div style="text-align:center;color:var(--ink-muted);font-size:13px;margin:-2px 0 2px;">↓</div>' : '');
  }).join('');
}
document.getElementById('mapa-brecha-container').addEventListener('click', function(e){
  var nodo = e.target.closest('.mapa-nodo');
  if(!nodo) return;
  var target = nodo.getAttribute('data-target');
  var el = document.getElementById(target);
  if(!el) return;
  var num = target.replace('sec-nav-','');
  var seccion = SECCIONES_COLAPSABLES.find(function(s){ return s.num===num; });
  if(seccion && seccion.wrapper.style.display==='none'){
    seccion.wrapper.style.display='';
    seccion.icon.textContent='▾ ocultar';
  }
  el.scrollIntoView({behavior:'smooth', block:'start'});
});

var _lastChecklistKey;
function renderChecklist(r){
  var senales = detectarSenales(r);
  var key = senales.map(function(s){return s.id;}).join('|');
  if(key === _lastChecklistKey) return;
  _lastChecklistKey = key;
  var el = document.getElementById('checklist-investigacion');
  var elOtras = document.getElementById('otras-senales');
  if(!senales.length){
    el.innerHTML='<p style="margin:0;font-size:12.5px;color:var(--ink-muted);">Todavía no hay señales para investigar — completá las subsecciones de Nivel 2 según corresponda.</p>';
    elOtras.style.display='none';
    return;
  }
  var top3 = senales.slice(0,3);
  var resto = senales.slice(3);
  el.innerHTML = top3.map(function(s,i){
    return '<label class="chk-label"><input type="checkbox"><b>'+(i+1)+'.</b>&nbsp;'+s.revisar+'</label>'
      + '<p class="chk-why">'+s.porQue+' · Datos: '+s.datos+' · Resultado esperado: '+s.resultadoEsperado+'</p>'
      + (s.profundizar ? '<p class="chk-why" style="color:var(--accent);">↳ '+s.profundizar+'</p>' : '');
  }).join('');
  if(resto.length){
    elOtras.style.display='block';
    elOtras.innerHTML = '<p style="font-size:11px;color:var(--ink-muted);margin:0 0 4px;text-transform:uppercase;letter-spacing:.03em;">Otras señales detectadas</p>'
      + resto.map(function(s){ return '<div class="out" style="padding:4px 0;"><span class="l" style="font-size:12px;">'+s.revisar+'</span></div>'; }).join('');
  } else {
    elOtras.style.display='none';
  }
}

function renderSenales(r){
  var senales = detectarSenales(r);
  var card = document.getElementById('card-senales-detectadas');
  if(!senales.length){
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  var el = document.getElementById('senales-detectadas');
  var IMPACTO_LABEL = {3:'Alto', 2:'Medio', 1:'Bajo'};
  el.innerHTML = senales.map(function(s){
    return '<div class="out"><span class="l">'+s.label+'</span><span class="v" style="font-size:11px;color:var(--ink-muted);">'+IMPACTO_LABEL[s.impacto]+'</span></div>';
  }).join('');
}

var _lastChecklistOpKey;
function renderChecklistOportunidades(r){
  var ops = detectarOportunidades(r);
  var key = ops.map(function(s){return s.id;}).join('|');
  if(key === _lastChecklistOpKey) return;
  _lastChecklistOpKey = key;
  var el = document.getElementById('checklist-oportunidades');
  var elOtras = document.getElementById('otras-oportunidades');
  if(!ops.length){
    el.innerHTML='<p style="margin:0;font-size:12.5px;color:var(--ink-muted);">Todavía no hay nada creciendo lo suficiente como para priorizar — completá las subsecciones de Nivel 2 según corresponda.</p>';
    elOtras.style.display='none';
    return;
  }
  var top3 = ops.slice(0,3);
  var resto = ops.slice(3);
  el.innerHTML = top3.map(function(s,i){
    return '<label class="chk-label"><input type="checkbox"><b>'+(i+1)+'.</b>&nbsp;'+s.empujar+'</label>'
      + '<p class="chk-why">'+s.porQue+' · Datos: '+s.datos+' · Resultado esperado: '+s.resultadoEsperado+'</p>';
  }).join('');
  if(resto.length){
    elOtras.style.display='block';
    elOtras.innerHTML = '<p style="font-size:11px;color:var(--ink-muted);margin:0 0 4px;text-transform:uppercase;letter-spacing:.03em;">Otras oportunidades detectadas</p>'
      + resto.map(function(s){ return '<div class="out" style="padding:4px 0;"><span class="l" style="font-size:12px;">'+s.empujar+'</span></div>'; }).join('');
  } else {
    elOtras.style.display='none';
  }
}

function renderOportunidades(r){
  var ops = detectarOportunidades(r);
  var card = document.getElementById('card-oportunidades-detectadas');
  if(!ops.length){
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  var el = document.getElementById('oportunidades-detectadas');
  var IMPACTO_LABEL = {3:'Alto', 2:'Medio', 1:'Bajo'};
  el.innerHTML = ops.map(function(s){
    return '<div class="out"><span class="l">'+s.label+'</span><span class="v" style="font-size:11px;color:var(--success);">'+IMPACTO_LABEL[s.impacto]+'</span></div>';
  }).join('');
}

function generarHipotesis(r){
  // Las hipótesis se arman a partir de las hasta 3 señales prioritarias (mismo orden
  // que "Prioridad de investigación"), con la forma "si X, entonces Y, porque Z" —
  // Y es una predicción todavía no observada, no una repetición de la señal misma.
  var top3 = detectarSenales(r).slice(0,3);
  var byId = {};
  top3.forEach(function(s){ byId[s.id]=s; });
  var hip = [];

  if(byId.recurrentes && byId.device){
    hip.push('Si la caída de conversión entre recurrentes proviene de fricción en '+byId.device.device+', entonces debería verse mayor abandono o errores técnicos específicos de esa plataforma, porque una fricción de experiencia se refleja en más de un indicador. (Señales: recurrentes + dispositivo)');
  }
  if(byId.categoria && byId.stock && hip.length<3){
    hip.push('Si la caída de la categoría '+byId.categoria.categoria+' proviene de disponibilidad, entonces los SKUs afectados deberían mostrar mayor incidencia de quiebre o restricción de stock, porque eso confirmaría que hay demanda no satisfecha. (Señales: categoría + stock)');
  }
  if(r.primary && r.primary.name==='sesiones' && byId.canal && hip.length<3){
    hip.push('Si la caída de tráfico proviene de adquisición en '+byId.canal.canal+', entonces debería verse una reducción de sesiones concentrada en ese canal frente a los demás, porque el resto del tráfico no debería verse afectado por igual. (Señal: canal)');
  }
  if(r.primary && r.primary.name==='cr' && (byId['funnel-d'] || byId['funnel-m']) && hip.length<3){
    var dispPeor = (r.peorPaseM && (!r.peorPaseD || r.peorPaseM.r<r.peorPaseD.r)) ? 'Mobile' : 'Desktop';
    var etapaPeor = dispPeor==='Mobile' ? r.peorPaseM.s : r.peorPaseD.s;
    hip.push('Si la caída de conversión proviene de fricción transaccional en '+etapaPeor+' ('+dispPeor+'), entonces debería verse una caída desproporcionada en esa etapa frente a las demás, porque una fricción puntual no afecta igual a todo el recorrido. (Señal: embudo)');
  }
  if(byId.nuevos && hip.length<3){
    hip.push('Si el deterioro de clientes nuevos proviene de adquisición, entonces debería verse una reducción concentrada en determinados canales o fuentes, porque esos canales son los que generan el flujo de nuevos clientes. (Señal: nuevos)');
  }
  if(byId.recurrentes && !byId.device && hip.length<3){
    hip.push('Si el deterioro de recurrentes proviene de retención, entonces debería verse una caída en la frecuencia de recompra o más días desde la última compra, porque eso indicaría un debilitamiento del vínculo con la base existente. (Señal: recurrentes)');
  }
  if(byId.categoria && !byId.stock && hip.length<3){
    hip.push('Si el deterioro de la categoría '+byId.categoria.categoria+' no proviene de disponibilidad, entonces debería explicarse por precio, contenido o cambios de demanda — conviene descartar disponibilidad primero. (Señal: categoría)');
  }
  if(byId.stock && !byId.categoria && hip.length<3){
    hip.push('Si la caída de pedidos está relacionada con disponibilidad, entonces los SKUs afectados deberían presentar mayor incidencia de quiebre de stock, porque eso confirmaría demanda no satisfecha. (Señal: stock)');
  }
  if(r.primary && r.primary.name==='aov' && hip.length<3){
    hip.push('Si la caída de AOV proviene del mix de categorías, entonces debería verse una menor participación de categorías o SKUs de mayor ticket, porque un cambio de mix desplaza la composición de venta hacia productos más baratos. (Driver: AOV)');
  }
  return hip.slice(0,3);
}


var _lastHipKey;
function renderHipotesis(r){
  var hips = generarHipotesis(r);
  var key = hips.join('|');
  if(key === _lastHipKey) return;
  _lastHipKey = key;
  var el = document.getElementById('hipotesis-lista');
  if(!hips.length){ el.innerHTML='<p style="margin:0;font-size:12.5px;color:var(--ink-muted);">Todavía no hay suficientes datos para sugerir hipótesis.</p>'; return; }
  el.innerHTML = hips.map(function(h,i){
    return '<label class="hip-label"><input type="radio" name="hip-radio" value="'+i+'">'+h+'</label>';
  }).join('') + '<p style="font-size:11.5px;color:var(--ink-muted);margin:8px 0 0;">Son líneas de investigación sugeridas, no conclusiones.</p>';
}

var _lastHipCrecKey;
function renderHipotesisCrecimiento(r){
  var ops = generarOportunidadesCrecimiento(r);
  var key = ops.join('|');
  if(key === _lastHipCrecKey) return;
  _lastHipCrecKey = key;
  var el = document.getElementById('hipotesis-crecimiento-lista');
  if(!ops.length){ el.innerHTML='<p style="margin:0;font-size:12.5px;color:var(--ink-muted);">Todavía no hay suficiente tracción como para sugerir qué empujar.</p>'; return; }
  el.innerHTML = ops.map(function(h,i){
    return '<label class="hip-label"><input type="radio" name="hip-crec-radio" value="'+i+'">'+h+'</label>';
  }).join('') + '<p style="font-size:11.5px;color:var(--ink-muted);margin:8px 0 0;">Son palancas a evaluar, no una garantía de que vayan a funcionar de nuevo.</p>';
}

function actualizarBadge(){
  var estado = document.getElementById('sel-validacion').value;
  var fuente = txt('inp-fuente-validacion');
  var badge = document.getElementById('badge-validacion');
  if(estado==='confirmada' && fuente){ badge.textContent='✓ CAUSA CONFIRMADA'; badge.className='badge-validacion confirmada'; }
  else if(estado==='rechazada'){ badge.textContent='✕ HIPÓTESIS RECHAZADA'; badge.className='badge-validacion rechazada'; }
  else { badge.textContent='HIPÓTESIS — POR VALIDAR'; badge.className='badge-validacion'; }
}

function aplicarModo(){
  var modo = document.getElementById('sel-modo').value;
  document.querySelectorAll('.apoyo-detalle').forEach(function(el){ el.style.display = modo==='guia' ? 'none' : 'block'; });
  document.getElementById('hipotesis-checklist-wrap').style.display = modo==='guia' ? 'none' : 'block';
  document.getElementById('hipotesis-lista-wrap').style.display = modo==='guia' ? 'none' : 'block';
  document.getElementById('hipotesis-builder-wrap').style.display = modo==='copiloto' ? 'block' : 'none';
}

function recalc(){
  var r=computeAll();
  var banner=document.getElementById('banner');
  banner.className='banner '+r.estadoClass;
  document.getElementById('out-estado').textContent=r.estado;
  document.getElementById('out-brecha-pct').textContent=r.brechaPct===null?'—':fmtPct(r.brechaPct);
  document.getElementById('out-brecha-sub').textContent = r.ventaEsperada===0
    ? 'Ingresa la meta y la venta a la fecha para ver el estado.'
    : 'Brecha de '+fmtMoney(r.brechaAbs)+' vs. lo esperado a la fecha.';
  document.getElementById('out-venta-esperada').textContent=fmtMoney(r.ventaEsperada);
  document.getElementById('out-brecha-abs').textContent=fmtMoney(r.brechaAbs);
  document.getElementById('out-pedidos-esperados').textContent = r.pedidosEsperados===0 ? '—' : fmtNum(r.pedidosEsperados);
  document.getElementById('out-brecha-pedidos').textContent = r.brechaPedidosPct===null ? '—' : fmtNum(r.brechaPedidos)+' ('+fmtPct(r.brechaPedidosPct)+')';
  document.getElementById('out-sesiones-esperadas').textContent = r.sesionesPacingEsperadas===0 ? '—' : fmtNum(r.sesionesPacingEsperadas);
  document.getElementById('out-brecha-sesiones').textContent = r.brechaSesionesPacingPct===null ? '—' : fmtNum(r.brechaSesionesPacing)+' ('+fmtPct(r.brechaSesionesPacingPct)+')';
  setNote('out-resultado-01', r.resultado01);
  document.getElementById('out-yoy').textContent=r.yoyPct===null?'—':fmtPct(r.yoyPct);
  document.getElementById('out-mom').textContent=r.momPct===null?'—':fmtPct(r.momPct);
  var ctxNote=document.getElementById('out-contexto-lectura');
  if(r.lecturaContexto){ ctxNote.style.display='block'; ctxNote.textContent=r.lecturaContexto; }
  else { ctxNote.style.display='none'; }

  setBar('bar-ses','bar-ses-val',r.efSes,r.maxAbs1,r.pctSes);
  setBar('bar-cr','bar-cr-val',r.efCR,r.maxAbs1,r.pctCR);
  setBar('bar-aov','bar-aov-val',r.efAOV,r.maxAbs1,r.pctAOV);
  document.getElementById('out-driver').textContent = r.primary ? r.primary.label : 'Sin driver negativo';
  setNote('out-resultado-03', r.resultado03);

  var reconEl=document.getElementById('out-reconciliacion');
  if(r.reconciliaPct!==null && Math.abs(r.reconciliaPct)>5){
    reconEl.style.display='block';
    reconEl.textContent='La venta de Pacing ('+fmtMoney(r.ventaActual)+') no coincide con '+document.querySelector('.ses-label').textContent+'×'+document.querySelector('.cr-label').textContent+'×AOV ('+fmtMoney(r.ventaCalcActual)+'), una diferencia de '+fmtPct(r.reconciliaPct)+'. Revisá los datos cargados.';
  } else { reconEl.style.display='none'; }

  document.getElementById('out-pedidos-totales').textContent = r.pctPT===null ? '—' : fmtNum(r.deltaPT)+' ('+fmtPct(r.pctPT)+')';
  setBar('bar-n','bar-n-val',r.deltaN,r.maxAbs2,undefined,true);
  setBar('bar-r','bar-r-val',r.deltaR,r.maxAbs2,undefined,true);
  document.getElementById('out-frecuencia-nota').style.display = r.frecuenciaCae ? 'block':'none';
  setNote('out-resultado-04', r.resultado04);

  document.getElementById('sec-device').style.display = canalEsDirecto(r.canal) ? 'none' : 'block';
  ['sec-category','sec-sku'].forEach(function(id){ document.getElementById(id).style.display = 'block'; });
  setNote('out-resultado-04a', r.resultado04a);
  setNote('out-resultado-04b', r.resultado04b);
  setNote('out-resultado-04c', r.resultado04c);

  document.getElementById('sec-canales').style.display = 'block';
  if(r.peorCanal){
    var txtCanal = 'El canal con mayor caída es '+r.peorCanal.name+' ('+fmtNum(r.peorCanal.delta)+' sesiones, CR '+r.peorCanal.cr.toFixed(1)+'%)';
    if(r.peorCanal.aov>0) txtCanal += ' — pérdida estimada de '+fmtMoney(r.peorCanal.perdidaEstimada);
    txtCanal += '.';
    if(r.canalesCayendo>1) txtCanal += ' Otro'+(r.canalesCayendo-1>1?'s '+(r.canalesCayendo-1)+' canales':' canal más')+' también '+(r.canalesCayendo-1>1?'cayeron':'cayó')+' en sesiones — no es un problema aislado de uno solo.';
    if(r.mejorCanal && r.mejorCanal.name!==r.peorCanal.name){
      txtCanal += ' En contraste, '+r.mejorCanal.name+' creció '+fmtNum(r.mejorCanal.delta)+' sesiones'+(r.mejorCanal.gananciaEstimada>0?' (~'+fmtMoney(r.mejorCanal.gananciaEstimada)+')':'')+' — es el que más está contribuyendo ahora.';
    }
    setNote('out-resultado-04d', txtCanal);
  } else { setNote('out-resultado-04d', 'Cargá al menos un canal para identificar el responsable.'); }

  document.getElementById('sec-funnel').style.display = canalEsDirecto(r.canal) ? 'none' : 'block';
  var fTxt = '';
  if(r.peorPaseD) fTxt += 'Desktop: el mayor quiebre de pase es en '+r.peorPaseD.s+' ('+fmtPct(r.peorPaseD.r*100)+'). ';
  if(r.peorPaseM) fTxt += 'Mobile: el mayor quiebre de pase es en '+r.peorPaseM.s+' ('+fmtPct(r.peorPaseM.r*100)+').';
  setNote('out-resultado-04e', fTxt ? fTxt : 'Cargá los pasos del embudo para ver dónde ocurre el mayor quiebre.');

  document.getElementById('aov-subcausa-card').style.display = (r.primary && r.primary.name==='aov') ? 'block':'none';
  if(r.primary && r.primary.name==='aov'){
    setNote('out-sugerencia-aov', r.sugerenciaAovTexto);
    var selAov = document.getElementById('sel-aov-subcausa');
    if(r.sugerenciaAovSubcausa && selAov.value===''){
      // r ya se calculó con el desplegable todavía vacío — el causaCorta/palanca de
      // ese cálculo no reflejan la sugerencia recién aplicada. Recalculamos una vez
      // más ahora que el valor está puesto, y cortamos acá: seguir usando este r
      // pintaría la causa vieja ("falta clasificar") encima de la sugerencia nueva.
      selAov.value = r.sugerenciaAovSubcausa;
      recalc();
      return;
    }
  }

  renderSenales(r);
  renderChecklist(r);
  renderHipotesis(r);
  renderOportunidades(r);
  var sintesis = sintetizarRiesgoOportunidad(r);
  document.getElementById('card-sintesis-riesgo-oportunidad').style.display = sintesis ? 'block' : 'none';
  document.getElementById('out-sintesis-riesgo-oportunidad').textContent = sintesis || '';
  renderChecklistOportunidades(r);
  renderHipotesisCrecimiento(r);
  renderMapaBrecha(r);
  actualizarBadge();

  document.getElementById('out-narrativa').textContent = r.narrativa || 'Completa las secciones anteriores.';
  document.getElementById('k-secundario').style.display = r.causaSecundaria ? 'block':'none';
  document.getElementById('out-secundario').style.display = r.causaSecundaria ? 'block':'none';
  if(r.causaSecundaria) document.getElementById('out-secundario').textContent = r.causaSecundaria;
  document.getElementById('k-validar').style.display = r.notaValidar ? 'block':'none';
  document.getElementById('out-validar').style.display = r.notaValidar ? 'block':'none';
  if(r.notaValidar) document.getElementById('out-validar').textContent = 'Es una hipótesis a validar con el equipo de abasto antes de tratarla como causa confirmada.';
  document.getElementById('out-palanca').textContent=r.palanca;
  document.getElementById('out-dueno').textContent=r.dueno;
  var showSec = !!r.causaSecundaria;
  ['k-palanca-sec','out-palanca-sec','k-dueno-sec','out-dueno-sec'].forEach(function(id){ document.getElementById(id).style.display = showSec ? 'block':'none'; });
  if(showSec){
    document.getElementById('out-palanca-sec').textContent = r.palancaSecundaria;
    document.getElementById('out-dueno-sec').textContent = r.duenoSecundaria;
  }
  renderPlan(r);

  var warnEl = document.getElementById('out-warning-secuencia');
  var estadoVal = document.getElementById('sel-validacion').value;
  warnEl.style.display = (estadoVal!=='confirmada' && num('inp-impacto')!==0) ? 'block' : 'none';
}

// Recorre los 4 canales reales, carga temporalmente los datos guardados de cada
// uno en el formulario (oculto mientras estamos en Vista global) y usa el mismo
// computeAll() de siempre para sacar su foto — sin tocar el DOM visible ni pisar
// lo que haya en localStorage.
function tieneDatosReales(datos){
  if(!datos) return false;
  return Object.keys(datos).some(function(k){
    if(k==='_cats' || k==='_skus' || k==='_acq') return false;
    return datos[k]!==undefined && datos[k]!=='';
  });
}
function calcularSnapshotsPorCanal(){
  var canales = ['ecommerce','app','whatsapp','llamadas'];
  var snaps = [];
  canales.forEach(function(c){
    var datos = datosPorCanal[c];
    if(!tieneDatosReales(datos)) return;
    document.getElementById('sel-canal').value = c;
    restaurarFormulario(datos);
    var r = computeAll();
    var ptActualSnap = num('inp-pt-a');
    var realPedidosSnap = ptActualSnap>0 ? ptActualSnap : (num('inp-pn-a')+num('inp-pr-a'));
    snaps.push({
      canal:c, meta:num('inp-meta'), ventaActual:num('inp-venta-actual'),
      metaPedidos:num('inp-meta-pedidos'), realPedidos:realPedidosSnap,
      pnA:num('inp-pn-a'), pnB:num('inp-pn-b'), prA:num('inp-pr-a'), prB:num('inp-pr-b'),
      ptA:num('inp-pt-a'), ptB:num('inp-pt-b'), r:r
    });
  });
  document.getElementById('sel-canal').value = 'global';
  return snaps;
}

var COLOR_ESTADO = {'estado-danger':'var(--danger)','estado-warning':'var(--warning)','estado-success':'var(--success)','estado-muted':'var(--ink-muted)'};

// Pendientes de validar se arma con la ÚLTIMA lectura GUARDADA de cada canal, no
// con lo que esté en pantalla sin guardar — out-hipotesis-texto es un texto de
// trabajo que nunca se limpia ni se persiste por canal (no es un input/select),
// así que leerlo directo del DOM entre canales arrastra el texto del último
// canal donde se usó "Ayúdame a construir la hipótesis" hacia todos los demás.
// El historial, en cambio, graba canal + hipótesis + estadoValidacion por
// separado en cada lectura guardada — ahí sí hay aislamiento real.
function calcularPendientesValidar(){
  var historial = fetchHistorialFull();
  var canales = ['ecommerce','app','whatsapp','llamadas'];
  var out = [];
  canales.forEach(function(c){
    var ultima = historial.filter(function(h){ return h.canal===c; })[0]; // más reciente: se guarda con unshift
    if(!ultima) return;
    out.push({canal:c, estadoValidacion: ultima.estadoValidacion||'pendiente', hipotesis: ultima.hipotesis||null, fecha: ultima.fecha});
  });
  return out;
}

function renderPendientesValidar(){
  var todasLecturas = calcularPendientesValidar();
  var pendientes = todasLecturas.filter(function(l){ return l.estadoValidacion==='pendiente' && l.hipotesis; });
  var sinLectura = ['ecommerce','app','whatsapp','llamadas'].filter(function(c){ return !todasLecturas.some(function(l){return l.canal===c;}); });
  var elPend = document.getElementById('g-pendientes-validar');
  if(!todasLecturas.length){
    elPend.innerHTML = '<p style="font-size:12.5px;color:var(--ink-muted);">Todavía no guardaste ninguna lectura — esto se arma con el historial guardado de cada canal, no con lo que tengas sin guardar en pantalla.</p>';
    return;
  }
  if(!pendientes.length){
    elPend.innerHTML = '<p style="font-size:12.5px;color:var(--ink-muted);">Sin hipótesis pendientes de validar en la última lectura guardada de cada canal.</p>';
  } else {
    elPend.innerHTML = '<p style="font-size:12px;color:var(--ink-muted);margin:0 0 8px;">'+pendientes.length+' de '+todasLecturas.length+' canal'+(todasLecturas.length>1?'es':'')+' con historial, con hipótesis pendiente de validar.</p>'
      + pendientes.map(function(l){
          return '<div style="padding:8px 0;border-bottom:1px solid var(--border);">'
            + '<span style="font-size:12.5px;font-weight:600;">'+(CANAL_NAMES[l.canal]||l.canal)+'</span>'
            + '<span style="font-size:11px;color:var(--ink-muted);"> — '+(l.fecha||'')+'</span>'
            + '<p style="font-size:12px;color:var(--ink-secondary);margin:3px 0 0;">'+escaparHTML(l.hipotesis)+'</p></div>';
        }).join('');
  }
  if(sinLectura.length && sinLectura.length<4){
    elPend.innerHTML += '<p style="font-size:11px;color:var(--ink-muted);margin:8px 0 0;">'+sinLectura.map(function(c){return CANAL_NAMES[c]||c;}).join(', ')+' todavía no tiene ninguna lectura guardada.</p>';
  }
}

function renderVistaGlobal(){
  var snaps = calcularSnapshotsPorCanal();
  var idsVacios = ['out-g-pedidos-meta','out-g-pedidos-real','out-g-pedidos-esperados','out-g-pedidos-brecha','out-g-aov','out-g-nuevos','out-g-recurrentes'];

  if(!snaps.length){
    document.getElementById('banner-global').className='banner estado-muted';
    document.getElementById('out-estado-global').textContent='Sin datos todavía';
    document.getElementById('out-brecha-pct-global').textContent='—';
    document.getElementById('out-brecha-sub-global').textContent='Cargá al menos un canal (Ecommerce, App, WhatsApp o Llamadas) para ver el estado global.';
    ['out-g-meta','out-g-venta','out-g-venta-esperada','out-g-brecha'].forEach(function(id){ document.getElementById(id).textContent='$0'; });
    idsVacios.forEach(function(id){ document.getElementById(id).textContent='—'; });
    document.getElementById('g-insights-canal').innerHTML='<p style="font-size:12.5px;color:var(--ink-muted);">Todavía no hay canales con datos cargados.</p>';
    renderPendientesValidar();
    return;
  }

  var umbral = document.getElementById('inp-umbral').value===''? -5 : num('inp-umbral');
  var metaTotal=0, ventaActualTotal=0, ventaEsperadaTotal=0;
  var metaPedidosTotal=0, realPedidosTotal=0, pedidosEsperadosTotal=0;
  var pnATotal=0, pnBTotal=0, prATotal=0, prBTotal=0, pedidosParaAOV=0;

  snaps.forEach(function(s){
    metaTotal+=s.meta; ventaActualTotal+=s.ventaActual; ventaEsperadaTotal+=s.r.ventaEsperada;
    metaPedidosTotal+=s.metaPedidos; realPedidosTotal+=s.realPedidos; pedidosEsperadosTotal+=s.r.pedidosEsperados;
    pnATotal+=s.pnA; pnBTotal+=s.pnB; prATotal+=s.prA; prBTotal+=s.prB;
    pedidosParaAOV += s.ptA>0 ? s.ptA : ((s.pnA+s.prA)>0 ? (s.pnA+s.prA) : s.realPedidos);
  });

  var brechaTotal = ventaActualTotal-ventaEsperadaTotal;
  var brechaTotalPct = ventaEsperadaTotal!==0 ? (brechaTotal/ventaEsperadaTotal*100) : null;
  var estado, estadoClass;
  if(ventaEsperadaTotal===0){ estado='Completa el pacing'; estadoClass='estado-muted'; }
  else if(brechaTotalPct<=umbral){ estado='En riesgo'; estadoClass='estado-danger'; }
  else if(brechaTotalPct<0){ estado='Por ajustar'; estadoClass='estado-warning'; }
  else { estado='En línea'; estadoClass='estado-success'; }

  document.getElementById('banner-global').className='banner '+estadoClass;
  document.getElementById('out-estado-global').textContent=estado;
  document.getElementById('out-brecha-pct-global').textContent = brechaTotalPct===null ? '—' : fmtPct(brechaTotalPct);
  document.getElementById('out-brecha-sub-global').textContent = ventaEsperadaTotal===0
    ? 'Cargá al menos un canal para ver el estado global.'
    : 'Brecha de '+fmtMoney(brechaTotal)+' vs. lo esperado a la fecha, sumando '+snaps.length+' canal'+(snaps.length!==1?'es':'')+' con datos.';

  document.getElementById('out-g-meta').textContent=fmtMoney(metaTotal);
  document.getElementById('out-g-venta').textContent=fmtMoney(ventaActualTotal);
  document.getElementById('out-g-venta-esperada').textContent=fmtMoney(ventaEsperadaTotal);
  document.getElementById('out-g-brecha').textContent=fmtMoney(brechaTotal);

  var brechaPedidosTotal = realPedidosTotal-pedidosEsperadosTotal;
  var brechaPedidosTotalPct = pedidosEsperadosTotal!==0 ? (brechaPedidosTotal/pedidosEsperadosTotal*100) : null;
  document.getElementById('out-g-pedidos-meta').textContent = metaPedidosTotal>0 ? fmtNum(metaPedidosTotal) : '—';
  document.getElementById('out-g-pedidos-real').textContent = realPedidosTotal>0 ? fmtNum(realPedidosTotal) : '—';
  document.getElementById('out-g-pedidos-esperados').textContent = pedidosEsperadosTotal>0 ? fmtNum(pedidosEsperadosTotal) : '—';
  document.getElementById('out-g-pedidos-brecha').textContent = brechaPedidosTotalPct===null ? '—' : fmtNum(brechaPedidosTotal)+' ('+fmtPct(brechaPedidosTotalPct)+')';

  document.getElementById('out-g-aov').textContent = pedidosParaAOV>0 ? fmtMoney(ventaActualTotal/pedidosParaAOV) : '—';

  var deltaNTotal=pnATotal-pnBTotal, deltaRTotal=prATotal-prBTotal;
  document.getElementById('out-g-nuevos').textContent = (pnATotal||pnBTotal) ? (fmtNum(pnATotal)+' vs. '+fmtNum(pnBTotal)+' ('+fmtNum(deltaNTotal)+')') : '—';
  document.getElementById('out-g-recurrentes').textContent = (prATotal||prBTotal) ? (fmtNum(prATotal)+' vs. '+fmtNum(prBTotal)+' ('+fmtNum(deltaRTotal)+')') : '—';

  var ordenados = snaps.slice().sort(function(a,b){
    var pa=a.r.brechaPct===null?999:a.r.brechaPct, pb=b.r.brechaPct===null?999:b.r.brechaPct;
    return pa-pb;
  });
  document.getElementById('g-insights-canal').innerHTML = ordenados.map(function(s){
    var r = s.r;
    var brechaTxt = r.brechaPct===null ? 'sin pacing cargado' : fmtPct(r.brechaPct)+' vs. esperado';
    var vaAdelante = r.brechaPct!==null && r.brechaPct>=0;
    var driverTxt;
    if(r.primary){
      driverTxt = vaAdelante
        ? ('Vas adelante en pacing, pero '+r.primary.label+' viene cayendo vs. base — vale la pena mirarlo igual.')
        : ('Driver: '+r.primary.label+'.');
    } else if(r.brechaPct===null){
      driverTxt = 'Todavía no hay suficientes datos de Nivel 1.';
    } else if(vaAdelante){
      var sesLbl = canalEsDirecto(r.canal) ? 'Interacciones' : 'Sesiones';
      var crLbl = canalEsDirecto(r.canal) ? 'Tasa de cierre' : 'CR';
      var pos = [{label:sesLbl,val:r.efSes},{label:crLbl,val:r.efCR},{label:'AOV',val:r.efAOV}].sort(function(a,b){return b.val-a.val;})[0];
      driverTxt = pos.val>0 ? ('Impulsado por '+pos.label+', que viene creciendo vs. base.') : 'Sin cambios relevantes vs. base — el adelanto viene de una meta conservadora.';
    } else {
      driverTxt = 'Sin caída de Nivel 1 — el atraso es de meta: sesiones, CR y AOV no bajaron vs. base, pero van por detrás de lo que pedía el objetivo.';
    }
    return '<div class="out"><span class="l">'+(CANAL_NAMES[s.canal]||s.canal)+'</span>'
      + '<span class="v" style="color:'+(COLOR_ESTADO[r.estadoClass]||'var(--ink)')+';">'+r.estado+' ('+brechaTxt+')</span></div>'
      + '<p class="chk-why" style="margin:-4px 0 10px;">'+driverTxt+'</p>';
  }).join('');

  renderPendientesValidar();
}

function actualizarLabelsCanal(){
  var canal = document.getElementById('sel-canal').value;
  var sesTxt = canalEsDirecto(canal) ? 'Interacciones' : 'Sesiones';
  var crTxt = canalEsDirecto(canal) ? 'Tasa de cierre' : 'CR';
  document.querySelectorAll('.ses-label').forEach(function(el){ el.textContent = sesTxt; });
  document.querySelectorAll('.cr-label').forEach(function(el){ el.textContent = crTxt; });
}

document.getElementById('sel-periodo').addEventListener('change', function(){
  var label = this.value==='mom' ? 'mes anterior' : 'año anterior';
  document.querySelectorAll('.periodo-txt').forEach(function(el){ el.textContent=label; });
});

document.getElementById('sel-canal').addEventListener('change', function(){
  var nuevo = this.value;
  guardarCanalActual();
  try { localStorage.setItem('canal-actual', nuevo); } catch(e){}
  if(nuevo==='global'){
    canalActual='global';
    document.getElementById('form-canal').style.display='none';
    document.getElementById('vista-global').style.display='block';
    renderVistaGlobal();
  } else {
    document.getElementById('form-canal').style.display='';
    document.getElementById('vista-global').style.display='none';
    restaurarFormulario(datosPorCanal[nuevo]);
    canalActual=nuevo;
    actualizarLabelsCanal();
    recalc();
    aplicarEstadoColapsoInicial();
    cargarHistorial();
  }
});

document.getElementById('sel-modo').addEventListener('change', aplicarModo);
document.getElementById('sel-vista-historial').addEventListener('change', cargarHistorial);

// Delegación de eventos: cubre también los inputs/selects agregados dinámicamente
// (filas de categoría/SKU), sin necesidad de volver a atar listeners uno por uno.
document.addEventListener('input', function(e){
  if(!e.target.matches('input, select')) return;
  recalc();
  if(CAMPOS_PERIODO.indexOf(e.target.id)!==-1) guardarPeriodoCompartido();
  else guardarCanalActual();
});
document.addEventListener('change', function(e){
  if(!e.target.matches('input, select')) return;
  recalc();
  if(CAMPOS_PERIODO.indexOf(e.target.id)!==-1) guardarPeriodoCompartido();
  else guardarCanalActual();
});

var catRowsDefaultHTML = document.getElementById('cat-rows-container').innerHTML;
var skuRowsDefaultHTML = document.getElementById('sku-rows-container').innerHTML;
var canalesRowsDefaultHTML = document.getElementById('canales-rows-container').innerHTML;

function limpiarCanalActual(){
  document.querySelectorAll('.wrap input[id]').forEach(function(el){
    if(CAMPOS_EXCLUIR_CANAL.indexOf(el.id)===-1) el.value='';
  });
  document.getElementById('inp-umbral-drill').value=-5;
  document.getElementById('sel-aov-subcausa').selectedIndex=0;
  document.getElementById('sel-validacion').selectedIndex=0;
  document.getElementById('inp-aprendizaje').value='';
  document.getElementById('cat-rows-container').innerHTML = catRowsDefaultHTML;
  document.getElementById('sku-rows-container').innerHTML = skuRowsDefaultHTML;
  document.getElementById('canales-rows-container').innerHTML = canalesRowsDefaultHTML;
  document.getElementById('hipotesis-output').style.display='none';
  document.getElementById('gemini-hipotesis-respuesta').style.display='none';
  document.getElementById('calc-impacto-wrap').style.display='none';
  document.getElementById('import-status').style.display='none';
  _lastHipKey=undefined; _lastChecklistKey=undefined; _lastHipCrecKey=undefined; _lastChecklistOpKey=undefined;
  recalc();
  if(canalActual && canalActual!=='global') guardarCanalActual();
  aplicarEstadoColapsoInicial();
}
function limpiarTodosLosCanales(){
  ['ecommerce','app','whatsapp','llamadas'].forEach(function(c){ datosPorCanal[c] = {}; });
  guardarDatosPorCanalFull(datosPorCanal);
  if(canalActual && canalActual!=='global'){
    limpiarCanalActual();
  } else if(canalActual==='global'){
    renderVistaGlobal();
  }
  mostrarEstadoImport('Se borraron los 4 canales.');
}

function itemsNavegacion(){
  var items = [{label:'⬆ Volver arriba', target:null}];
  if(canalActual==='global'){
    items.push({label:'🌐 Pacing global', target:'sec-nav-global-pacing'});
    items.push({label:'🌐 Clientes — todos los canales', target:'sec-nav-global-clientes'});
    items.push({label:'🌐 Insights por canal', target:'sec-nav-global-insights'});
    items.push({label:'🌐 Pendientes de validar', target:'sec-nav-global-pendientes'});
  } else {
    items.push({label:'01 Pacing', target:'sec-nav-01'});
    items.push({label:'02 Contexto', target:'sec-nav-02'});
    items.push({label:'03 Diagnóstico nivel 1', target:'sec-nav-03'});
    items.push({label:'04 Diagnóstico nivel 2', target:'sec-nav-04'});
    items.push({label:'05 Hipótesis y causa', target:'sec-nav-05'});
    items.push({label:'06 Aprendizaje', target:'sec-nav-06'});
    items.push({label:'07 Mapa de la brecha', target:'sec-nav-07'});
  }
  items.push({label:'↺ Historial', target:'sec-nav-historial'});
  return items;
}
function poblarMenuNavegacion(){
  var menu = document.getElementById('menu-nav-flotante');
  menu.innerHTML = itemsNavegacion().map(function(it, i){
    return '<button type="button" class="item-nav-flotante" data-target="'+(it.target||'')+'" style="display:block;width:100%;text-align:left;padding:10px 14px;background:none;border:none;font-size:12.5px;color:var(--ink);cursor:pointer;'+(i>0?'border-top:1px solid var(--border);':'')+'">'+it.label+'</button>';
  }).join('');
}
document.getElementById('btn-nav-flotante').addEventListener('click', function(e){
  e.stopPropagation();
  var menu = document.getElementById('menu-nav-flotante');
  var abrir = menu.style.display==='none';
  if(abrir) poblarMenuNavegacion();
  menu.style.display = abrir ? 'block' : 'none';
});
document.addEventListener('click', function(e){
  var menu = document.getElementById('menu-nav-flotante');
  if(menu.style.display==='block' && !menu.contains(e.target) && e.target.id!=='btn-nav-flotante'){
    menu.style.display = 'none';
  }
});
document.getElementById('menu-nav-flotante').addEventListener('click', function(e){
  var btn = e.target.closest('.item-nav-flotante');
  if(!btn) return;
  var target = btn.getAttribute('data-target');
  document.getElementById('menu-nav-flotante').style.display = 'none';
  if(target){
    var el = document.getElementById(target);
    if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
  } else {
    window.scrollTo({top:0, behavior:'smooth'});
  }
});

document.getElementById('btn-clear-toggle').addEventListener('click', function(e){
  e.stopPropagation();
  var menu = document.getElementById('menu-clear');
  menu.style.display = menu.style.display==='none' ? 'block' : 'none';
});
document.addEventListener('click', function(e){
  var menu = document.getElementById('menu-clear');
  if(menu.style.display==='block' && !menu.contains(e.target) && e.target.id!=='btn-clear-toggle'){
    menu.style.display = 'none';
  }
});
document.getElementById('btn-clear-canal').addEventListener('click', function(){
  document.getElementById('menu-clear').style.display = 'none';
  if(canalActual==='global'){
    mostrarEstadoImport('Seleccioná un canal (Ecommerce, App, WhatsApp o Llamadas) para limpiarlo — la vista global solo muestra el resumen de los 4.');
    return;
  }
  limpiarCanalActual();
});
document.getElementById('btn-clear-todos').addEventListener('click', function(){
  document.getElementById('menu-clear').style.display = 'none';
  if(confirm('¿Borrar los datos guardados de los 4 canales (Ecommerce, App, WhatsApp y Llamadas)? Esto no se puede deshacer. El historial de lecturas guardadas no se toca.')){
    limpiarTodosLosCanales();
  }
});

function cargarEjemplo(){
  EJEMPLOS_CANALES.forEach(function(ejemplo){
    var datos = {};
    Object.keys(ejemplo).forEach(function(h){
      if(h==='canal') return;
      if(CSV_PACKED_FIELDS[h]){
        var spec = CSV_PACKED_FIELDS[h];
        var filas = String(ejemplo[h]).split(';').map(function(entry){
          var campos = entry.split(':');
          while(campos.length < spec.campos) campos.push('');
          return campos.slice(0, spec.campos);
        });
        datos[spec.key] = filas;
        return;
      }
      var targetId = CSV_FIELD_MAP[h];
      if(targetId && CAMPOS_PERIODO.indexOf(targetId)===-1){ datos[targetId] = String(ejemplo[h]); }
    });
    datosPorCanal[ejemplo.canal] = datos;
  });
  guardarDatosPorCanalFull(datosPorCanal);

  document.getElementById('inp-dias-t').value = EJEMPLOS_CANALES[0].dias_transcurridos;
  document.getElementById('inp-dias-total').value = EJEMPLOS_CANALES[0].dias_totales;
  guardarPeriodoCompartido();

  document.getElementById('sel-canal').value='ecommerce';
  document.getElementById('form-canal').style.display='';
  document.getElementById('vista-global').style.display='none';
  canalActual='ecommerce';
  try { localStorage.setItem('canal-actual','ecommerce'); } catch(e){}
  restaurarFormulario(datosPorCanal['ecommerce']);

  // Un toque extra en Ecommerce, para ver también el flujo de impacto esperado.
  document.getElementById('inp-impacto').value=650000;
  document.getElementById('inp-fecha-medicion').value='2026-04-10';

  actualizarLabelsCanal();
  recalc();
  guardarCanalActual();
  aplicarEstadoColapsoInicial();
  mostrarEstadoImport('Cargamos ejemplos en los 4 canales — Ecommerce y App por detrás del ritmo, WhatsApp y Llamadas adelante — para ver ambos casos funcionando. Tocá "Limpiar ▾" para volver a empezar con datos reales.');
}
document.getElementById('btn-ejemplo').addEventListener('click', cargarEjemplo);

function crearFilaCategoria(){
  var div=document.createElement('div');
  div.className='subrow cat-row';
  div.style.gridTemplateColumns='1fr 44px 60px 20px';
  div.innerHTML='<input type="text" class="cat-name" placeholder="Categoría"><input type="number" step="0.1" class="cat-var" placeholder="%"><input type="number" class="cat-impacto" placeholder="$ (opc.)"><button type="button" class="btn-row-remove">×</button>';
  document.getElementById('cat-rows-container').appendChild(div);
}
function crearFilaSku(){
  var div=document.createElement('div');
  div.className='subrow sku sku-row';
  div.innerHTML='<input type="text" class="sku-name" placeholder="SKU"><input type="number" step="1" class="sku-ses" placeholder="%"><input type="number" step="1" class="sku-cart" placeholder="%"><select class="sku-stock"><option value="ok">OK</option><option value="bajo">Bajo</option><option value="agotado">Agotado</option></select><button type="button" class="btn-row-remove">×</button>';
  document.getElementById('sku-rows-container').appendChild(div);
}
function crearFilaCanal(){
  var div=document.createElement('div');
  div.className='subrow canales-row';
  div.style.gridTemplateColumns='1fr 58px 58px 52px 52px 58px 20px';
  div.innerHTML='<input type="text" class="acq-canal" placeholder="Canal"><input type="number" class="acq-sb" placeholder="0"><input type="number" class="acq-sa" placeholder="0"><input type="number" class="acq-c" placeholder="0"><span class="acq-cr" style="text-align:right;font-size:12.5px;color:var(--ink-muted);">—</span><input type="number" class="acq-aov" placeholder="$"><button type="button" class="btn-row-remove">×</button>';
  document.getElementById('canales-rows-container').appendChild(div);
}

// El CR de cada canal se calcula solo (conversiones / sesiones actuales) — no es
// un dato que se cargue a mano, así que se recalcula en vivo mientras se escribe.
function actualizarCRFilaCanal(row){
  var sa = parseFloat(row.querySelector('.acq-sa').value);
  var c = parseFloat(row.querySelector('.acq-c').value);
  var out = row.querySelector('.acq-cr');
  if(!out) return;
  out.textContent = (!isNaN(sa) && sa>0 && !isNaN(c)) ? (c/sa*100).toFixed(1)+'%' : '—';
}
document.getElementById('canales-rows-container').addEventListener('input', function(e){
  if(e.target.classList.contains('acq-sa') || e.target.classList.contains('acq-c')){
    actualizarCRFilaCanal(e.target.closest('.canales-row'));
  }
});
document.getElementById('btn-add-cat').addEventListener('click', crearFilaCategoria);
document.getElementById('btn-add-sku').addEventListener('click', crearFilaSku);
document.getElementById('btn-add-canal').addEventListener('click', crearFilaCanal);
document.addEventListener('click', function(e){
  if(e.target.classList.contains('btn-row-remove')){
    e.target.closest('.subrow').remove();
    recalc();
  }
});

document.getElementById('btn-construir-hipotesis').addEventListener('click', function(){
  var r=computeAll();
  var hips=generarHipotesis(r);
  var selected=document.querySelector('input[name="hip-radio"]:checked');
  var out=document.getElementById('hipotesis-output');
  var texto=document.getElementById('out-hipotesis-texto');
  if(!selected || !hips.length){
    texto.textContent='Elegí una hipótesis de la lista de arriba para construirla.';
    out.style.display='block';
    return;
  }
  var idx=Number(selected.value);
  var metricaLbl = r.primary ? r.primary.label : 'Pedidos';
  var efVal = r.primary ? (r.primary.name==='sesiones'?r.efSes:r.primary.name==='cr'?r.efCR:r.efAOV) : 0;
  var segmento = r.subcausa==='recurrentes'
    ? ('clientes recurrentes'+(r.deviceLabel?' en '+r.deviceLabel.toLowerCase():'')+(r.categoryLabel?', dentro de '+r.categoryLabel:''))
    : (r.subcausa==='nuevos' ? 'la adquisición de clientes nuevos' : 'el período analizado');
  var fuente = txt('inp-fuente-validacion') || 'el área correspondiente';
  texto.textContent = 'La caída de '+metricaLbl+' en '+segmento+' podría estar relacionada con: "'+hips[idx].replace(/\.$/,'')+'", debido a que '+metricaLbl+' explica '+fmtMoney(Math.abs(efVal))+' de la brecha total. Para confirmarlo, debemos validar los datos correspondientes con '+fuente+'.';
  out.style.display='block';
});

function buildReporte(r){
  var lineas=[];
  lineas.push('0. Canal: '+CANAL_NAMES[r.canal]+'.');
  lineas.push('1. Problema: brecha de '+fmtMoney(r.brechaAbs)+' vs. meta ('+(r.brechaPct===null?'—':fmtPct(r.brechaPct))+').');
  lineas.push('2. Fuga: '+(r.primary?r.primary.label:'sin driver dominante')+'.');
  var segmento='—';
  if(r.primary && r.primary.name==='aov'){
    segmento = textoOpcionSeleccionada('sel-aov-subcausa');
  } else if(r.subcausa==='nuevos') segmento='Adquisición de clientes nuevos';
  else if(r.subcausa==='recurrentes'){
    segmento='Clientes recurrentes';
    if(r.deviceLabel) segmento += ' — '+r.deviceLabel;
    if(r.categoryLabel) segmento += ' — '+r.categoryLabel;
  }
  lineas.push('3. Segmento: '+segmento+'.');
  lineas.push('4. Causa: '+r.causaCorta+(r.notaValidar?' (a validar)':'')+'.');
  if(r.causaSecundaria) lineas.push('4b. Señal secundaria: '+r.causaSecundaria);
  lineas.push('5. Palanca: '+r.palanca+'.');
  lineas.push('6. Acción: '+(r.showPlan ? r.groups.map(function(g){return LEVER_NAMES[g];}).join(' + ') : r.dueno)+'.');
  if(r.causaSecundaria){
    lineas.push('6b. Acción secundaria: '+r.palancaSecundaria+' ('+(r.showPlanSecundario ? r.groupsSecundario.map(function(g){return LEVER_NAMES[g];}).join(' + ') : r.duenoSecundaria)+').');
  }
  var impactoEsp = num('inp-impacto');
  lineas.push('7. Impacto esperado: '+(impactoEsp? fmtMoney(impactoEsp) : '—')+'.');
  lineas.push('8. Medición: '+(txt('inp-fecha-medicion')||'—')+'.');
  var hipTxt = document.getElementById('out-hipotesis-texto').textContent.trim(); if(hipTxt==='—') hipTxt='';
  lineas.push('9. Hipótesis: '+(hipTxt||'—')+'.');
  lineas.push('9b. Evidencia: '+(txt('inp-evidencia')||'—')+'.');
  lineas.push('10. Validación: '+(textoOpcionSeleccionada('sel-validacion')||'Pendiente')+' ('+(txt('inp-fuente-validacion')||'sin fuente')+').');
  lineas.push('11. Aprendizaje: '+(txt('inp-aprendizaje')||'—')+'.');
  return lineas.join('\n');
}

document.getElementById('btn-copy').addEventListener('click', async function(){
  var r=computeAll();
  var texto=buildReporte(r);
  var btn=this;
  try {
    await navigator.clipboard.writeText(texto);
    btn.textContent='Copiado';
  } catch(e){
    try {
      var ta=document.createElement('textarea');
      ta.value=texto; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      btn.textContent='Copiado';
    } catch(e2){ btn.textContent='No se pudo copiar'; }
  }
  setTimeout(function(){ btn.textContent='Copiar diagnóstico'; }, 1800);
});

// Persistencia: localStorage es la API nativa y sincrónica que soporta cualquier
// navegador, a diferencia de window.storage (específico del entorno de Claude).
function fetchHistorialFull(){
  try {
    var raw = localStorage.getItem('historial-diagnostico');
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}
function guardarHistorialFull(historial){
  try { localStorage.setItem('historial-diagnostico', JSON.stringify(historial)); return true; }
  catch(e){ return false; }
}
function cargarHistorial(){
  renderHistorial(fetchHistorialFull());
}

function renderHistorial(historialFull){
  var vista = document.getElementById('sel-vista-historial').value;
  document.getElementById('consolidado-breakdown').style.display='none';
  document.getElementById('patrones-breakdown').style.display='none';
  if(vista==='consolidada'){
    document.getElementById('consolidado-breakdown').style.display='block';
    renderConsolidado(historialFull);
    return;
  }
  if(vista==='patrones'){
    document.getElementById('patrones-breakdown').style.display='block';
    renderPatrones(historialFull);
    return;
  }
  var canal = document.getElementById('sel-canal').value;
  var historial = historialFull.filter(function(h){ return h.canal===canal; });
  renderChart(historial);

  var list=document.getElementById('historial-list');
  if(!historial || historial.length===0){ list.innerHTML='<div class="empty-hist">Todavía no guardaste ninguna lectura en este canal.</div>'; return; }
  var VAL_ICON = {confirmada:'✓', rechazada:'✕', pendiente:'⏳'};
  list.innerHTML = historial.map(function(h){
    var imp = fmtImpacto(h.impactoEsperado);
    var real = fmtImpacto(h.impactoReal);
    var impactoLinea = '';
    if(imp){ impactoLinea = 'Esperado: '+imp+(real?' · Real: '+real:''); }
    var icon = VAL_ICON[h.estadoValidacion] || '';
    return '<div class="hist-item">'
      + '<div class="r1"><span class="hist-date">'+(icon?icon+' ':'')+h.fecha+'</span><span class="hist-mid">'+h.causa+'</span><span class="hist-brecha">'+(h.brechaPct===null||h.brechaPct===undefined?'—':fmtPct(h.brechaPct))+'</span></div>'
      + (impactoLinea ? '<div class="hist-impacto">'+impactoLinea+'</div>' : '')
      + '</div>';
  }).join('');
}

function computeConsolidado(historialFull){
  var porFecha = {};
  historialFull.forEach(function(h){
    if(typeof h.ventaActual!=='number' || typeof h.ventaEsperada!=='number') return;
    if(!porFecha[h.fecha]) porFecha[h.fecha] = {fecha:h.fecha, ventaActual:0, ventaEsperada:0, porCanal:{}};
    porFecha[h.fecha].ventaActual += h.ventaActual;
    porFecha[h.fecha].ventaEsperada += h.ventaEsperada;
    porFecha[h.fecha].porCanal[h.canal] = (porFecha[h.fecha].porCanal[h.canal]||0) + h.ventaActual;
  });
  var arr = Object.keys(porFecha).map(function(f){ return porFecha[f]; });
  arr.forEach(function(d){ d.brechaPct = d.ventaEsperada>0 ? (d.ventaActual-d.ventaEsperada)/d.ventaEsperada*100 : null; });
  arr.sort(function(a,b){ return a.fecha<b.fecha ? 1 : (a.fecha>b.fecha ? -1 : 0); });
  return arr;
}

function renderConsolidado(historialFull){
  var arr = computeConsolidado(historialFull);
  var el = document.getElementById('consolidado-breakdown');
  if(!arr.length){
    el.innerHTML = '<div class="empty-hist">Todavía no hay lecturas con venta cargada en el mismo día para más de un canal.</div>';
    renderChart([]);
    document.getElementById('historial-list').innerHTML = '<div class="empty-hist">Sin datos consolidados.</div>';
    return;
  }
  var ultimo = arr[0], anterior = arr[1];
  var canales = Object.keys(ultimo.porCanal);
  var html = '<p style="font-size:12px;color:var(--ink-muted);margin:0 0 8px;">Último corte: '+ultimo.fecha+'</p>'
    + '<div class="out"><span class="l">Venta total</span><span class="v">'+fmtMoney(ultimo.ventaActual)+'</span></div>'
    + '<div class="out"><span class="l">Esperada</span><span class="v">'+fmtMoney(ultimo.ventaEsperada)+'</span></div>'
    + '<div class="out"><span class="l">Brecha consolidada</span><span class="v">'+(ultimo.brechaPct===null?'—':fmtPct(ultimo.brechaPct))+'</span></div>'
    + '<p style="font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-muted);margin:12px 0 6px;">Peso por canal</p>';
  canales.forEach(function(c){
    var pct = ultimo.ventaActual>0 ? (ultimo.porCanal[c]/ultimo.ventaActual*100) : 0;
    var deltaTxt = '';
    if(anterior && anterior.ventaActual>0 && anterior.porCanal[c]!==undefined){
      var pctAnt = anterior.porCanal[c]/anterior.ventaActual*100;
      var delta = pct-pctAnt;
      deltaTxt = ' ('+(delta>=0?'+':'')+delta.toFixed(1)+'pp vs. anterior)';
    }
    html += '<div class="out"><span class="l">'+(CANAL_NAMES[c]||c)+'</span><span class="v">'+fmtMoney(ultimo.porCanal[c])+' — '+pct.toFixed(0)+'%'+deltaTxt+'</span></div>';
  });
  el.innerHTML = html;

  renderChart(arr);

  var list=document.getElementById('historial-list');
  var todas = historialFull.slice().sort(function(a,b){ return a.fecha<b.fecha?1:-1; });
  list.innerHTML = todas.map(function(h){
    return '<div class="hist-item"><div class="r1"><span class="hist-date">'+h.fecha+' · '+(CANAL_NAMES[h.canal]||h.canal)+'</span><span class="hist-mid">'+h.causa+'</span><span class="hist-brecha">'+(h.brechaPct===null||h.brechaPct===undefined?'—':fmtPct(h.brechaPct))+'</span></div></div>';
  }).join('');
}

function agruparTop(historial, campo, n){
  var mapa = {};
  historial.forEach(function(h){
    var v = h[campo];
    if(!v) return;
    var key = campo==='causa' ? v.split(' — ').slice(0,2).join(' — ') : v;
    mapa[key] = (mapa[key]||0)+1;
  });
  return Object.keys(mapa).map(function(k){ return {key:k, count:mapa[k]}; })
    .sort(function(a,b){ return b.count-a.count; }).slice(0,n);
}

function renderPatrones(historialFull){
  var el = document.getElementById('patrones-breakdown');
  if(!historialFull.length){
    el.innerHTML = '<div class="empty-hist">Todavía no hay lecturas guardadas — los patrones se arman a partir del historial acumulado.</div>';
    return;
  }
  var total = historialFull.length;
  var porEstado = {pendiente:0, confirmada:0, rechazada:0};
  historialFull.forEach(function(h){ var e=h.estadoValidacion||'pendiente'; porEstado[e]=(porEstado[e]||0)+1; });
  var evaluadas = porEstado.confirmada+porEstado.rechazada;
  var tasaConf = evaluadas>0 ? (porEstado.confirmada/evaluadas*100) : null;
  var topCausas = agruparTop(historialFull, 'causa', 5);
  var topPalancas = agruparTop(historialFull, 'dueno', 5);

  var html = '<p style="font-size:12px;color:var(--ink-muted);margin:0 0 10px;">Sobre '+total+' lectura'+(total>1?'s':'')+' guardada'+(total>1?'s':'')+' (todos los canales).</p>';
  html += '<div class="out"><span class="l">Confirmadas</span><span class="v">'+porEstado.confirmada+'</span></div>';
  html += '<div class="out"><span class="l">Rechazadas</span><span class="v">'+porEstado.rechazada+'</span></div>';
  html += '<div class="out"><span class="l">Pendientes</span><span class="v">'+porEstado.pendiente+'</span></div>';
  if(tasaConf!==null) html += '<div class="out"><span class="l">Tasa de confirmación</span><span class="v">'+tasaConf.toFixed(0)+'%</span></div>';

  html += '<p style="font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-muted);margin:14px 0 6px;">Causas más frecuentes</p>';
  html += topCausas.length ? topCausas.map(function(c){ return '<div class="out" style="padding:5px 0;"><span class="l" style="font-size:12.5px;">'+c.key+'</span><span class="v">'+c.count+'×</span></div>'; }).join('') : '<p style="font-size:12px;color:var(--ink-muted);margin:0;">Sin datos suficientes.</p>';

  html += '<p style="font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-muted);margin:14px 0 6px;">Palancas más usadas</p>';
  html += topPalancas.length ? topPalancas.map(function(p){ return '<div class="out" style="padding:5px 0;"><span class="l" style="font-size:12.5px;">'+p.key+'</span><span class="v">'+p.count+'×</span></div>'; }).join('') : '<p style="font-size:12px;color:var(--ink-muted);margin:0;">Sin datos suficientes.</p>';

  el.innerHTML = html;

  document.getElementById('chart-container').innerHTML = '<div class="empty-hist">La tendencia no aplica a esta vista — cambiá a "Por canal" o "Consolidada".</div>';
  document.getElementById('historial-list').innerHTML = '';
}

function renderChart(historial){
  var container = document.getElementById('chart-container');
  var data = historial.filter(function(h){ return typeof h.brechaPct === 'number'; }).slice().reverse();
  if(data.length < 2){ container.innerHTML = '<div class="empty-hist">Guardá al menos 2 lecturas para ver la tendencia.</div>'; return; }
  var w=560, h=120, padL=8, padR=8, padT=14, padB=20;
  var vals = data.map(function(d){return d.brechaPct;});
  var maxV = Math.max.apply(null, vals.concat([0]));
  var minV = Math.min.apply(null, vals.concat([0]));
  if(maxV===minV){ maxV+=1; minV-=1; }
  var rangeV = maxV-minV;
  var plotW = w-padL-padR, plotH = h-padT-padB;
  function xAt(i){ return padL + (data.length===1?0:(i/(data.length-1))*plotW); }
  function yAt(v){ return padT + (1-((v-minV)/rangeV))*plotH; }
  var zeroY = yAt(0);
  var pathD = data.map(function(d,i){ return (i===0?'M':'L')+xAt(i).toFixed(1)+','+yAt(d.brechaPct).toFixed(1); }).join(' ');
  var dots = data.map(function(d,i){
    var color = d.brechaPct<=-5 ? 'var(--danger)' : (d.brechaPct<0?'var(--warning)':'var(--success)');
    return '<circle cx="'+xAt(i).toFixed(1)+'" cy="'+yAt(d.brechaPct).toFixed(1)+'" r="3.5" style="fill:'+color+'"></circle>';
  }).join('');
  var svg = '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" xmlns="http://www.w3.org/2000/svg">'
    + '<line x1="'+padL+'" y1="'+zeroY.toFixed(1)+'" x2="'+(w-padR)+'" y2="'+zeroY.toFixed(1)+'" style="stroke:var(--border-strong);stroke-dasharray:3,3"/>'
    + '<path d="'+pathD+'" style="fill:none;stroke:var(--accent);stroke-width:2"/>'
    + dots
    + '<text x="'+padL+'" y="'+(h-4)+'" font-size="10" style="fill:var(--ink-muted);font-family:var(--sans)">'+data[0].fecha+'</text>'
    + '<text x="'+(w-padR)+'" y="'+(h-4)+'" font-size="10" text-anchor="end" style="fill:var(--ink-muted);font-family:var(--sans)">'+data[data.length-1].fecha+'</text>'
    + '</svg>';
  container.innerHTML = svg;
}

document.getElementById('btn-save').addEventListener('click', function(){
  var r=computeAll();
  var hipTxtGuardar = document.getElementById('out-hipotesis-texto').textContent.trim();
  var snapshot={id:r.canal+'-'+Date.now(), fecha:new Date().toISOString().slice(0,10), canal:r.canal, estado:r.estado, brechaPct:r.brechaPct,
    ventaActual:r.ventaActual, ventaEsperada:r.ventaEsperada,
    causa:r.causaCorta, palanca:r.palanca, dueno:r.dueno,
    impactoEsperado:num('inp-impacto'), impactoReal:null, fechaMedicion:txt('inp-fecha-medicion'),
    estadoValidacion:document.getElementById('sel-validacion').value, fuenteValidacion:txt('inp-fuente-validacion'),
    hipotesis:(hipTxtGuardar==='—'?'':hipTxtGuardar), evidencia:txt('inp-evidencia'), aprendizaje:txt('inp-aprendizaje')};
  var btn=this;
  var historial=fetchHistorialFull();
  historial.unshift(snapshot);
  historial=historial.slice(0,60);
  if(guardarHistorialFull(historial)){
    renderHistorial(historial);
    btn.textContent='Lectura guardada';
  } else {
    btn.textContent='No se pudo guardar';
  }
  setTimeout(function(){ btn.textContent='Guardar lectura'; }, 1800);
});

document.getElementById('btn-impacto-real').addEventListener('click', function(){
  var canal = document.getElementById('sel-canal').value;
  var real = num('inp-impacto-real');
  var btn = this;
  var historial = fetchHistorialFull();
  // El historial se guarda siempre con unshift (más reciente primero), así que el primer
  // match por canal ES la última lectura — nunca "una cualquiera". Se identifica además
  // por su id único (canal+timestamp) para no depender solo del orden del array.
  var idx = historial.findIndex(function(h){ return h.canal===canal; });
  if(idx===-1){
    btn.textContent='No hay lecturas en este canal';
  } else {
    var targetId = historial[idx].id;
    if(targetId){ idx = historial.findIndex(function(h){ return h.id===targetId; }); }
    historial[idx].impactoReal = real;
    historial[idx].fechaImpactoReal = new Date().toISOString().slice(0,10);
    if(guardarHistorialFull(historial)){
      renderHistorial(historial);
      btn.textContent='Registrado';
    } else {
      btn.textContent='No se pudo registrar';
    }
  }
  setTimeout(function(){ btn.textContent='Registrar impacto real en la última lectura'; }, 2000);
});

function exportarHistorialCSV(){
  var historial = fetchHistorialFull();
  if(!historial.length){ alert('Todavía no hay lecturas guardadas para exportar.'); return; }
  var headers = ['id','fecha','canal','estado','brechaPct','ventaActual','ventaEsperada','causa','palanca','dueno','impactoEsperado','impactoReal','fechaMedicion','estadoValidacion','fuenteValidacion','hipotesis','evidencia','aprendizaje'];
  var rows = [headers.join(',')];
  historial.forEach(function(h){
    var row = headers.map(function(k){
      var v = (h[k]===undefined || h[k]===null) ? '' : h[k];
      v = String(v).replace(/"/g,'""');
      if(v.indexOf(',')>-1 || v.indexOf('"')>-1 || v.indexOf('\n')>-1) v = '"'+v+'"';
      return v;
    });
    rows.push(row.join(','));
  });
  var blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'historial-diagnostico-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
document.getElementById('btn-export-csv').addEventListener('click', exportarHistorialCSV);

// Parser CSV simple con soporte de comillas (coincide con el formato que arma exportarHistorialCSV).
function csvSplitLine(line){
  var result=[], cur='', inQuotes=false;
  for(var i=0;i<line.length;i++){
    var c=line[i];
    if(inQuotes){
      if(c==='"'){ if(line[i+1]==='"'){ cur+='"'; i++; } else { inQuotes=false; } }
      else { cur+=c; }
    } else {
      if(c==='"'){ inQuotes=true; }
      else if(c===','){ result.push(cur); cur=''; }
      else { cur+=c; }
    }
  }
  result.push(cur);
  return result;
}
function csvParseAll(texto){
  var lineas = String(texto).split(/\r?\n/).filter(function(l){ return l.trim()!==''; });
  if(lineas.length<2) return [];
  var headers = csvSplitLine(lineas[0]).map(function(h){ return h.trim(); });
  var out=[];
  for(var i=1;i<lineas.length;i++){
    var vals = csvSplitLine(lineas[i]);
    var obj={};
    headers.forEach(function(h,idx){ obj[h]=vals[idx]; });
    out.push(obj);
  }
  return out;
}
function filaAHistorial(row){
  function numOrNull(v){ if(v===undefined||v===''||v===null) return null; var n=parseFloat(v); return isNaN(n)?null:n; }
  return {
    id: row.id || (row.canal+'-'+row.fecha+'-'+Math.random().toString(36).slice(2,8)),
    fecha: row.fecha||'', canal: row.canal||'ecommerce', estado: row.estado||'',
    brechaPct: numOrNull(row.brechaPct), ventaActual: numOrNull(row.ventaActual), ventaEsperada: numOrNull(row.ventaEsperada),
    causa: row.causa||'', palanca: row.palanca||'', dueno: row.dueno||'',
    impactoEsperado: numOrNull(row.impactoEsperado)||0, impactoReal: numOrNull(row.impactoReal),
    fechaMedicion: row.fechaMedicion||'', estadoValidacion: row.estadoValidacion||'pendiente', fuenteValidacion: row.fuenteValidacion||'',
    hipotesis: row.hipotesis||'', evidencia: row.evidencia||'', aprendizaje: row.aprendizaje||''
  };
}
function importarHistorialCSV(file){
  var reader = new FileReader();
  reader.onload = function(e){
    try {
      var filas = csvParseAll(e.target.result);
      if(!filas.length){ mostrarEstadoImport('El CSV no tiene filas de historial para importar.'); return; }
      var nuevas = filas.map(filaAHistorial);
      var actual = fetchHistorialFull();
      var idsActuales = {}; actual.forEach(function(h){ if(h.id) idsActuales[h.id]=true; });
      var agregadas = 0;
      nuevas.forEach(function(n){
        if(n.id && idsActuales[n.id]) return; // ya existe, se salta (evita duplicar si se reimporta el mismo archivo)
        actual.push(n); idsActuales[n.id]=true; agregadas++;
      });
      actual.sort(function(a,b){ return (a.fecha<b.fecha)?1:((a.fecha>b.fecha)?-1:0); });
      if(guardarHistorialFull(actual)){
        cargarHistorial();
        mostrarEstadoImport('Se importaron '+agregadas+' lectura'+(agregadas!==1?'s':'')+' nueva'+(agregadas!==1?'s':'')+' al historial ('+(filas.length-agregadas)+' ya existían).');
      } else {
        mostrarEstadoImport('No se pudo guardar el historial importado.');
      }
    } catch(err){ mostrarEstadoImport('No se pudo leer el CSV de historial.'); }
  };
  reader.readAsText(file);
}
document.getElementById('inp-historial-import').addEventListener('change', function(e){
  if(e.target.files && e.target.files[0]) importarHistorialCSV(e.target.files[0]);
  e.target.value='';
});
document.getElementById('btn-import-historial').addEventListener('click', function(){
  document.getElementById('inp-historial-import').click();
});

// Ejemplos compartidos entre "Ver ejemplo" y la plantilla CSV — 2 escenarios
// negativos (Ecommerce, App: van por detrás del ritmo) y 2 positivos
// (WhatsApp, Llamadas: van adelante), para ver ambos casos del mensaje de pacing.
var EJEMPLOS_CANALES = [
  {
    canal:'ecommerce', meta:9200000, dias_transcurridos:31, dias_totales:31, venta_actual:7900000,
    venta_yoy:8346000, venta_mom:8490700, sesiones_actual:1830000, sesiones_base:1780000,
    cr_actual:0.22, cr_base:0.242, aov_actual:1965, aov_base:1970,
    pedidos_nuevos_actual:2900, pedidos_nuevos_base:3000, pedidos_recurrentes_actual:1120, pedidos_recurrentes_base:1310,
    frecuencia_actual:1.35, frecuencia_base:1.42, pedidos_totales_actual:4020, pedidos_totales_base:4310,
    meta_pedidos:4300, meta_sesiones:1950000,
    variacion_cr_desktop:-8, variacion_cr_mobile:-23,
    funnel_sesiones_desktop:95000, funnel_pdp_desktop:61000, funnel_addtocart_desktop:39000, funnel_checkout_desktop:31000, funnel_compra_desktop:27000,
    funnel_sesiones_mobile:140000, funnel_pdp_mobile:82000, funnel_addtocart_mobile:46000, funnel_checkout_mobile:13000, funnel_compra_mobile:11000,
    categorias:'AETOPS:-21:120000;GLP1:-8:45000',
    skus:'SKU-AETOP-500:15:-32:agotado;SKU-GLP1-2MG:9:-18:bajo',
    canales_adquisicion:'Google Ads:210000:165000:3465:1950;Meta:150000:148000:2812:1820;SEO:120000:125000:3250:2100'
  },
  {
    canal:'app', meta:3100000, dias_transcurridos:31, dias_totales:31, venta_actual:2850000,
    venta_yoy:2760000, venta_mom:2910000, sesiones_actual:410000, sesiones_base:395000,
    cr_actual:0.31, cr_base:0.305, aov_actual:1890, aov_base:1875,
    pedidos_nuevos_actual:620, pedidos_nuevos_base:590, pedidos_recurrentes_actual:780, pedidos_recurrentes_base:870,
    frecuencia_actual:1.5, frecuencia_base:1.58, pedidos_totales_actual:1400, pedidos_totales_base:1460,
    meta_pedidos:1600, meta_sesiones:420000,
    variacion_cr_desktop:-2, variacion_cr_mobile:-11,
    funnel_sesiones_desktop:20000, funnel_pdp_desktop:14000, funnel_addtocart_desktop:9800, funnel_checkout_desktop:8200, funnel_compra_desktop:7300,
    funnel_sesiones_mobile:390000, funnel_pdp_mobile:270000, funnel_addtocart_mobile:95000, funnel_checkout_mobile:80000, funnel_compra_mobile:71000,
    categorias:'Suplementos:-12:30000',
    skus:'SKU-VIT-100:10:-15:bajo',
    canales_adquisicion:'Push notifications:50000:38000:1216:1850;App Store search:60000:61000:1769:1900'
  },
  {
    canal:'whatsapp', meta:820000, dias_transcurridos:31, dias_totales:31, venta_actual:915000,
    venta_yoy:860000, venta_mom:880000, sesiones_actual:1150, sesiones_base:1050,
    cr_actual:41, cr_base:38, aov_actual:2230, aov_base:2185,
    pedidos_nuevos_actual:165, pedidos_nuevos_base:150, pedidos_recurrentes_actual:285, pedidos_recurrentes_base:260,
    frecuencia_actual:1.95, frecuencia_base:1.85, pedidos_totales_actual:450, pedidos_totales_base:410,
    meta_pedidos:430, meta_sesiones:1100
  },
  {
    canal:'llamadas', meta:480000, dias_transcurridos:31, dias_totales:31, venta_actual:545000,
    venta_yoy:500000, venta_mom:520000, sesiones_actual:1020, sesiones_base:900,
    cr_actual:27, cr_base:24, aov_actual:2510, aov_base:2460,
    pedidos_nuevos_actual:82, pedidos_nuevos_base:75, pedidos_recurrentes_actual:178, pedidos_recurrentes_base:165,
    frecuencia_actual:1.5, frecuencia_base:1.45, pedidos_totales_actual:260, pedidos_totales_base:240,
    meta_pedidos:245, meta_sesiones:980
  }
];

function descargarPlantillaCSV(){
  var headers = ['canal'].concat(Object.keys(CSV_FIELD_MAP)).concat(Object.keys(CSV_PACKED_FIELDS));
  var filas = EJEMPLOS_CANALES.map(function(ejemplo){
    return headers.map(function(h){ return ejemplo[h]!==undefined ? ejemplo[h] : ''; }).join(',');
  });
  var csv = headers.join(',')+'\n'+filas.join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'plantilla_diagnostico_ventas.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
document.getElementById('link-plantilla-csv').addEventListener('click', function(e){
  e.preventDefault();
  descargarPlantillaCSV();
});

function mostrarEstadoImport(msg){
  var el = document.getElementById('import-status');
  el.textContent = msg;
  el.style.display='block';
}
function importarCSV(file){
  var reader = new FileReader();
  reader.onload = function(e){
    try {
      var lineas = String(e.target.result).split(/\r?\n/).filter(function(l){ return l.trim()!==''; });
      if(lineas.length<2){ mostrarEstadoImport('El CSV no tiene ninguna fila de datos.'); return; }
      var headers = lineas[0].split(',').map(function(h){ return h.trim().toLowerCase(); });

      var periodoDatos = {};       // campos compartidos del período (días/umbral), de cualquier fila que los traiga
      var porCanal = {};           // canalKey -> {targetId: valor}
      var canalesCargados = [];    // orden de aparición
      var filasOmitidas = 0;

      for(var f=1; f<lineas.length; f++){
        var valores = lineas[f].split(',').map(function(v){ return v.trim(); });
        var filaCanalRaw = null;
        headers.forEach(function(h, i){ if(h==='canal') filaCanalRaw = valores[i]; });

        var canalKey = filaCanalRaw ? Object.keys(CANAL_NAMES).filter(function(k){
          return k===filaCanalRaw.toLowerCase() || CANAL_NAMES[k].toLowerCase()===filaCanalRaw.toLowerCase();
        })[0] : null;

        if(!canalKey){ filasOmitidas++; continue; }

        if(canalesCargados.indexOf(canalKey)===-1) canalesCargados.push(canalKey);
        if(!porCanal[canalKey]) porCanal[canalKey] = {};

        headers.forEach(function(h, i){
          if(h==='canal') return;
          var val = valores[i];
          if(val===undefined || val==='') return;
          if(CSV_PACKED_FIELDS[h]){
            var spec = CSV_PACKED_FIELDS[h];
            var filas = val.split(';').map(function(entry){
              var campos = entry.split(':');
              while(campos.length < spec.campos) campos.push('');
              return campos.slice(0, spec.campos);
            }).filter(function(fila){ return fila[0]!==''; });
            if(filas.length) porCanal[canalKey][spec.key] = filas;
            return;
          }
          var targetId = CSV_FIELD_MAP[h];
          if(!targetId) return;
          if(CAMPOS_PERIODO.indexOf(targetId)!==-1){ periodoDatos[targetId] = val; }
          else { porCanal[canalKey][targetId] = val; }
        });
      }

      if(canalesCargados.length===0){
        mostrarEstadoImport('Ninguna fila tenía un canal reconocible (revisá la columna "canal").');
        return;
      }

      // Período compartido: se aplica una sola vez, a los campos visibles.
      Object.keys(periodoDatos).forEach(function(id){ document.getElementById(id).value = periodoDatos[id]; });
      if(Object.keys(periodoDatos).length) guardarPeriodoCompartido();

      // Cada canal presente en el CSV se combina (no reemplaza) con lo que ya tenía guardado,
      // así que los campos que esa fila no traía no se pierden. Los canales que no
      // aparecen en el CSV quedan totalmente intactos.
      canalesCargados.forEach(function(canalKey){
        var previo = datosPorCanal[canalKey] || {};
        var combinado = {};
        Object.keys(previo).forEach(function(k){ combinado[k]=previo[k]; });
        Object.keys(porCanal[canalKey]).forEach(function(k){ combinado[k]=porCanal[canalKey][k]; });
        datosPorCanal[canalKey] = combinado;
      });
      guardarDatosPorCanalFull(datosPorCanal);

      document.getElementById('form-canal').style.display='';
      document.getElementById('vista-global').style.display='none';

      // Si el canal actualmente seleccionado es uno de los cargados, refrescamos lo que se ve.
      // Si no, dejamos el canal actual como está (el resto se cargó igual, en segundo plano).
      if(canalesCargados.indexOf(canalActual)!==-1){
        restaurarFormulario(datosPorCanal[canalActual]);
      }
      actualizarLabelsCanal();
      recalc();
      if(canalActual!=='global') aplicarEstadoColapsoInicial();
      cargarHistorial();

      var nombresCargados = canalesCargados.map(function(k){ return CANAL_NAMES[k]||k; }).join(', ');
      var msg = 'Cargado: ' + nombresCargados + '.';
      if(filasOmitidas) msg += ' ' + filasOmitidas + ' fila' + (filasOmitidas!==1?'s':'') + ' omitida' + (filasOmitidas!==1?'s':'') + ' sin canal reconocible.';
      mostrarEstadoImport(msg);

    } catch(err){ mostrarEstadoImport('No se pudo leer el archivo CSV.'); }
  };
  reader.readAsText(file);
}
document.getElementById('inp-csv-import').addEventListener('change', function(e){
  if(e.target.files && e.target.files[0]) importarCSV(e.target.files[0]);
  e.target.value='';
});
document.getElementById('btn-import-csv').addEventListener('click', function(){
  document.getElementById('inp-csv-import').click();
});

// Secciones colapsables: envuelve el contenido de cada sección numerada principal
// (01-06, ↺) en un wrapper propio que se puede ocultar sin tocar el display que
// recalc() ya maneja en los elementos internos (04a-e, notas, etc.) — así no hay
// conflicto entre "colapsado por el usuario" y "oculto porque no aplica todavía".
var SECCIONES_COLAPSABLES = []; // solo 01-06 (no Historial) — para el colapso inicial
function esCabezalPrincipal(el){
  if(!el.classList || !el.classList.contains('section-head')) return false;
  var numEl = el.querySelector('.section-num');
  var num = numEl ? numEl.textContent.trim() : '';
  return /^\d{2}$/.test(num) || num==='↺';
}
function envolverSecciones(){
  var heads = Array.prototype.slice.call(document.querySelectorAll('.section-head')).filter(esCabezalPrincipal);
  heads.forEach(function(head){
    var wrapper = document.createElement('div');
    var next = head.nextElementSibling;
    var toMove = [];
    // Para hasta el próximo cabezal PRINCIPAL (01-06/↺), no en cualquier .section-head:
    // 04a-e (Dispositivo, Categoría, SKUs, Canales, Funnel) usan la misma clase para su
    // estilo visual, pero son subsecciones de "04" — tienen que quedar adentro de su wrapper.
    while(next && !esCabezalPrincipal(next)){
      toMove.push(next);
      next = next.nextElementSibling;
    }
    toMove.forEach(function(el){ wrapper.appendChild(el); });
    head.parentNode.insertBefore(wrapper, head.nextSibling);
    var icon = document.createElement('span');
    icon.className='section-toggle';
    icon.textContent='▾ ocultar';
    head.appendChild(icon);
    head.addEventListener('click', function(){
      var oculto = wrapper.style.display==='none';
      wrapper.style.display = oculto ? '' : 'none';
      icon.textContent = oculto ? '▾ ocultar' : '▸ mostrar';
    });
    var num = head.querySelector('.section-num').textContent.trim();
    if(/^\d{2}$/.test(num)) SECCIONES_COLAPSABLES.push({num:num, wrapper:wrapper, icon:icon});
  });
}
envolverSecciones();

// Canal recién abierto y sin datos: arranca solo con 01 (Pacing) visible, el resto
// colapsado — para no abrumar. Apenas el canal tiene algún dato real (manual,
// ejemplo o CSV), todo queda expandido — nada se auto-expande mientras se escribe.
function aplicarEstadoColapsoInicial(){
  var canalConDatos = tieneDatosReales(datosPorCanal[canalActual]);
  SECCIONES_COLAPSABLES.forEach(function(s){
    var mostrar = s.num==='01' || canalConDatos;
    s.wrapper.style.display = mostrar ? '' : 'none';
    s.icon.textContent = mostrar ? '▾ ocultar' : '▸ mostrar';
  });
}

restaurarPeriodoCompartido();
var canalGuardado = null;
try { canalGuardado = localStorage.getItem('canal-actual'); } catch(e){}
if(canalGuardado==='global'){
  canalActual='global';
  document.getElementById('sel-canal').value='global';
  document.getElementById('form-canal').style.display='none';
  document.getElementById('vista-global').style.display='block';
} else {
  var canalInicial = (canalGuardado && CANAL_NAMES[canalGuardado]) ? canalGuardado : document.getElementById('sel-canal').value;
  document.getElementById('sel-canal').value = canalInicial;
  restaurarFormulario(datosPorCanal[canalInicial]);
  canalActual = canalInicial;
}

actualizarLabelsCanal();
aplicarModo();
if(canalActual==='global'){ renderVistaGlobal(); } else { recalc(); aplicarEstadoColapsoInicial(); }

// --- INTEGRACIÓN CON COHERE: GENERACIÓN DE HIPÓTESIS ---

// Restaurar la API key guardada localmente, si existe.
document.addEventListener("DOMContentLoaded", function() {
  var savedKey = localStorage.getItem('cohere_api_key_local');
  if (savedKey) {
    var keyInput = document.getElementById('inp-api-key');
    if (keyInput) keyInput.value = savedKey;
  }
});

function modeloCohereActual(){
  return 'command-a-plus-05-2026';
}

// ============================================================
// COHERE API
// ============================================================

// La guía del SDK de Python de Cohere muestra response_format.schema,
// pero la referencia de la API REST v2/chat describe el campo como
// json_schema — probablemente el SDK traduce el nombre antes de armar
// el HTTP real. Como acá pegamos directo al endpoint crudo, mandamos
// el schema bajo los dos nombres — Cohere ignora el que no reconozca,
// y así no dependemos de adivinar cuál de las dos fuentes es la vigente.
var HIPOTESIS_SCHEMA = {
  type: 'object',

  properties: {

    hipotesis: {
      type: 'array',

      items: {
        type: 'object',

        properties: {

          id: {
            type: 'string'
          },

          hipotesis: {
            type: 'string'
          },

          prioridad: {
            type: 'string',
            enum: ['Alta', 'Media', 'Baja']
          },

          justificacion: {
            type: 'string'
          },

          senales_relacionadas: {
            type: 'array',
            items: {
              type: 'string'
            }
          },

          mecanismo: {
            type: 'string'
          },

          investigar: {
            type: 'array',
            items: {
              type: 'string'
            }
          }

        },

        required: [
          'id',
          'hipotesis',
          'prioridad',
          'justificacion',
          'senales_relacionadas',
          'mecanismo',
          'investigar'
        ]
      }
    }

  },

  required: ['hipotesis']
};

async function intentarLlamadaCohere(apiKey, prompt, modelo, campoSchema){

  var responseFormat = { type: 'json_object' };
  responseFormat[campoSchema] = HIPOTESIS_SCHEMA;

  var response = await fetch("https://api.cohere.com/v2/chat", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({

      model: modelo || 'command-a-plus-05-2026',

      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],

      // Temperatura baja para favorecer respuestas consistentes
      // y respetar mejor la estructura solicitada.
      temperature: 0.3,

      // Forzar salida estructurada.
      response_format: responseFormat
    })
  });

  var data;

  try {
    data = await response.json();
  } catch (e) {
    throw new Error(
      'La API de Cohere devolvió una respuesta que no pudo interpretarse como JSON.'
    );
  }

  if (!response.ok) {

    var detalleError =
      (data && data.message)
        ? data.message
        : JSON.stringify(data).slice(0, 500);

    throw new Error(
      (response.status || '?') + ' — ' + detalleError
    );
  }

  // ==========================================================
  // EXTRAER TEXTO DE LA RESPUESTA DE COHERE
  // ==========================================================

  var texto = null;

  try {

    var bloques =
      data &&
      data.message &&
      data.message.content;

    if (Array.isArray(bloques)) {

      var bloqueTexto = bloques.find(function(b){
        return b &&
               b.type === 'text' &&
               b.text;
      });

      if (bloqueTexto) {
        texto = bloqueTexto.text;
      }

    }

  } catch (eExtraccion) {

    throw new Error(
      'No se pudo leer la respuesta de Cohere (' + eExtraccion.message + '). ' +
      'Forma real recibida: ' + JSON.stringify(data).slice(0, 400)
    );

  }

  if (!texto) {

    throw new Error(
      'La respuesta de Cohere no incluyó texto utilizable. ' +
      'finish_reason: ' +
      (data && data.finish_reason
        ? data.finish_reason
        : 'desconocido') +
      '. Forma real recibida: ' + JSON.stringify(data).slice(0, 400)
    );

  }

  // ==========================================================
  // PARSEAR JSON
  // ==========================================================

  var resultado;

  try {

    resultado = JSON.parse(texto);

  } catch (e) {

    // Intentar recuperar JSON si el modelo hubiera incluido
    // accidentalmente texto adicional alrededor del objeto.

    var inicio = texto.indexOf('{');
    var fin = texto.lastIndexOf('}');

    if (inicio !== -1 && fin !== -1 && fin > inicio) {

      try {

        resultado = JSON.parse(
          texto.substring(inicio, fin + 1)
        );

      } catch (e2) {

        throw new Error(
          'Cohere respondió, pero el JSON no pudo interpretarse correctamente.'
        );

      }

    } else {

      throw new Error(
        'Cohere respondió, pero no se encontró un objeto JSON válido.'
      );

    }
  }

  // ==========================================================
  // VALIDACIÓN BÁSICA DE ESTRUCTURA
  // ==========================================================

  if (
    !resultado ||
    !Array.isArray(resultado.hipotesis)
  ) {

    throw new Error(
      'La respuesta de Cohere no contiene la estructura esperada: "hipotesis".'
    );

  }

  if (resultado.hipotesis.length === 0) {

    throw new Error(
      'Cohere no generó hipótesis para el diagnóstico actual.'
    );

  }

  return resultado;
}

// La guía del SDK de Python de Cohere muestra response_format.schema,
// pero la referencia de la API REST v2/chat describe el campo como
// json_schema — probablemente el SDK traduce el nombre antes de armar
// el HTTP real, y como acá pegamos directo al endpoint crudo no podemos
// saber cuál es la vigente sin probar contra la API real. Probamos
// primero con json_schema (el nombre que usa la referencia de la API);
// si esa llamada falla por cualquier motivo, reintentamos una vez con
// schema (el nombre que usa la guía del SDK) antes de rendirnos.
async function llamarCohere(apiKey, prompt, modelo){
  try {
    return await intentarLlamadaCohere(apiKey, prompt, modelo, 'json_schema');
  } catch (primerError) {
    try {
      return await intentarLlamadaCohere(apiKey, prompt, modelo, 'schema');
    } catch (segundoError) {
      throw new Error(
        'Con "json_schema": ' + primerError.message + ' | Con "schema": ' + segundoError.message
      );
    }
  }
}


// ============================================================
// CONSTRUIR CONTEXTO REAL DEL DIAGNÓSTICO
// ============================================================
//
// Esta función NO modifica el motor de diagnóstico.
// Únicamente recopila la información existente para enviarla
// a Cohere.
//
// Mantiene:
// - buildReporte()
// - detectarSenales()
// - generarHipotesis()
// ============================================================

function construirContextoGemini(r){

  var lineas = [];

  lineas.push('=== DIAGNÓSTICO GENERAL Y NIVEL 1 ===');

  lineas.push(
    buildReporte(r)
  );

  lineas.push(
    'Sesiones/Interacciones: ' +
    num('inp-ses-a') +
    ' (actual) vs. ' +
    num('inp-ses-b') +
    ' (base) — impacto ' +
    fmtMoney(r.efSes) +
    ' (' +
    (
      r.pctSes === null ||
      r.pctSes === undefined
        ? '—'
        : fmtPct(r.pctSes)
    ) +
    ' de la variación).'
  );

  lineas.push(
    'CR/Tasa de cierre: ' +
    num('inp-cr-a') +
    '% (actual) vs. ' +
    num('inp-cr-b') +
    '% (base) — impacto ' +
    fmtMoney(r.efCR) +
    ' (' +
    (
      r.pctCR === null ||
      r.pctCR === undefined
        ? '—'
        : fmtPct(r.pctCR)
    ) +
    ' de la variación).'
  );

  lineas.push(
    'AOV: ' +
    fmtMoney(num('inp-aov-a')) +
    ' (actual) vs. ' +
    fmtMoney(num('inp-aov-b')) +
    ' (base) — impacto ' +
    fmtMoney(r.efAOV) +
    ' (' +
    (
      r.pctAOV === null ||
      r.pctAOV === undefined
        ? '—'
        : fmtPct(r.pctAOV)
    ) +
    ' de la variación).'
  );

  lineas.push(
    'Driver matemático principal: ' +
    (
      r.primary
        ? r.primary.label
        : 'sin driver dominante'
    ) +
    '.'
  );


  // ==========================================================
  // NIVEL 2
  // ==========================================================

  lineas.push('');

  lineas.push(
    '=== NIVEL 2 — SEÑALES DETECTADAS ==='
  );

  var senales = detectarSenales(r);

  if (senales.length) {

    senales.forEach(function(s){

      lineas.push(
        '- ' +
        s.label +
        ' | Revisar: ' +
        s.revisar +
        ' | Por qué es señal: ' +
        s.porQue
      );

    });

  } else {

    lineas.push(
      'No se detectaron señales de Nivel 2 más allá del driver principal.'
    );

  }


  // ==========================================================
  // HIPÓTESIS DEL MOTOR DE REGLAS EXISTENTE
  // ==========================================================

  lineas.push('');

  lineas.push(
    '=== HIPÓTESIS YA SUGERIDAS POR EL SISTEMA ' +
    '(MOTOR DE REGLAS EXISTENTE) ==='
  );

  var hipsSistema = generarHipotesis(r);

  if (hipsSistema.length) {

    hipsSistema.forEach(function(h, i){

      lineas.push(
        (i + 1) +
        '. ' +
        h
      );

    });

  } else {

    lineas.push(
      'El sistema todavía no generó hipótesis propias ' +
      '(faltan señales suficientes).'
    );

  }


  // ==========================================================
  // OPORTUNIDADES DETECTADAS (espejo positivo de las señales)
  // ==========================================================

  lineas.push('');

  lineas.push(
    '=== NIVEL 2 — OPORTUNIDADES DETECTADAS (qué está creciendo) ==='
  );

  var oportunidades = detectarOportunidades(r);

  if (oportunidades.length) {

    oportunidades.forEach(function(s){

      lineas.push(
        '- ' +
        s.label +
        ' | Empujar: ' +
        s.empujar +
        ' | Por qué es oportunidad: ' +
        s.porQue
      );

    });

  } else {

    lineas.push(
      'No se detectaron oportunidades de Nivel 2 más allá del driver principal.'
    );

  }


  // ==========================================================
  // HIPÓTESIS DE CRECIMIENTO DEL MOTOR DE REGLAS EXISTENTE
  // ==========================================================

  lineas.push('');

  lineas.push(
    '=== HIPÓTESIS DE CRECIMIENTO YA SUGERIDAS POR EL SISTEMA ' +
    '(MOTOR DE REGLAS EXISTENTE) ==='
  );

  var oportunidadesSistema = generarOportunidadesCrecimiento(r);

  if (oportunidadesSistema.length) {

    oportunidadesSistema.forEach(function(h, i){

      lineas.push(
        (i + 1) +
        '. ' +
        h
      );

    });

  } else {

    lineas.push(
      'El sistema todavía no generó hipótesis de crecimiento propias ' +
      '(falta tracción suficiente).'
    );

  }

  return lineas.join('\n');
}


// ============================================================
// ESCAPAR HTML
// ============================================================
//
// Evita que texto generado por la IA pueda interpretar HTML.
// ============================================================

function escaparHTML(valor){

  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}


// ============================================================
// RENDERIZAR HIPÓTESIS
// ============================================================

function renderizarHipotesisCohere(resultado, respuestaDiv){

  if (
    !resultado ||
    !Array.isArray(resultado.hipotesis) ||
    !resultado.hipotesis.length
  ){

    throw new Error(
      'No existen hipótesis válidas para mostrar.'
    );

  }

  var html = '';

  html +=
    '<b style="color:var(--accent);">' +
    '🤖 Hipótesis sugeridas por Cohere:' +
    '</b>';

  html += '<div style="margin-top:12px;">';


  resultado.hipotesis.forEach(function(h, index){

    var prioridad =
      ['Alta', 'Media', 'Baja'].indexOf(h.prioridad) !== -1
        ? h.prioridad
        : 'Media';

    var colores = {

      Alta: {
        bg: 'var(--danger-soft)',
        fg: 'var(--danger)'
      },

      Media: {
        bg: 'var(--warning-soft)',
        fg: 'var(--warning)'
      },

      Baja: {
        bg: 'var(--bg-page)',
        fg: 'var(--ink-muted)'
      }

    };

    var c = colores[prioridad];


    html +=
      '<div style="' +
        'padding:14px 0;' +
        (index > 0
          ? 'border-top:1px solid var(--border);'
          : '') +
      '">';


    // --------------------------------------------------------
    // ID
    // --------------------------------------------------------

    html +=
      '<div style="' +
        'font-size:11px;' +
        'font-weight:700;' +
        'letter-spacing:.04em;' +
        'color:var(--accent);' +
        'margin-bottom:5px;' +
      '">' +
      escaparHTML(h.id || ('H' + (index + 1))) +
      '</div>';


    // --------------------------------------------------------
    // HIPÓTESIS
    // --------------------------------------------------------

    html +=
      '<div style="' +
        'font-size:13px;' +
        'line-height:1.55;' +
        'font-weight:600;' +
        'color:var(--ink);' +
      '">' +
      '<span style="font-weight:700;">Hipótesis:</span> ' +
      escaparHTML(h.hipotesis) +
      '</div>';


    // --------------------------------------------------------
    // PRIORIDAD
    // --------------------------------------------------------

    html +=
      '<div style="margin-top:8px;font-size:11px;color:var(--ink-muted);">' +
        '<b>Prioridad:</b> ' +
        '<span style="' +
          'display:inline-block;' +
          'font-size:10.5px;' +
          'font-weight:600;' +
          'letter-spacing:.03em;' +
          'padding:2px 8px;' +
          'border-radius:5px;' +
          'background:' + c.bg + ';' +
          'color:' + c.fg + ';' +
          'text-transform:uppercase;' +
          'margin-left:4px;' +
        '">' +
        escaparHTML(prioridad) +
        '</span>' +
      '</div>';


    // --------------------------------------------------------
    // JUSTIFICACIÓN
    // --------------------------------------------------------

    if (h.justificacion) {

      html +=
        '<div style="' +
          'margin-top:6px;' +
          'font-size:11.5px;' +
          'line-height:1.5;' +
          'color:var(--ink-muted);' +
        '">' +
        escaparHTML(h.justificacion) +
        '</div>';

    }


    // --------------------------------------------------------
    // SEÑALES RELACIONADAS
    // --------------------------------------------------------

    if (
      Array.isArray(h.senales_relacionadas) &&
      h.senales_relacionadas.length
    ){

      html +=
        '<div style="margin-top:10px;">' +
          '<div style="' +
            'font-size:11px;' +
            'font-weight:700;' +
            'margin-bottom:4px;' +
          '">' +
          'Señales relacionadas:' +
          '</div>';

      h.senales_relacionadas.forEach(function(s){

        html +=
          '<div style="' +
            'font-size:11.5px;' +
            'line-height:1.5;' +
            'margin-left:10px;' +
            'color:var(--ink-muted);' +
          '">' +
          '• ' +
          escaparHTML(s) +
          '</div>';

      });

      html += '</div>';

    }


    // --------------------------------------------------------
    // MECANISMO
    // --------------------------------------------------------

    if (h.mecanismo) {

      html +=
        '<div style="' +
          'margin-top:10px;' +
          'padding:9px 11px;' +
          'background:var(--bg-page);' +
          'border-radius:6px;' +
          'font-size:11.5px;' +
          'line-height:1.5;' +
        '">' +

          '<div style="' +
            'font-size:11px;' +
            'font-weight:700;' +
            'margin-bottom:3px;' +
          '">' +
          'Mecanismo:' +
          '</div>' +

          escaparHTML(h.mecanismo) +

        '</div>';

    }


    // --------------------------------------------------------
    // INVESTIGAR
    // --------------------------------------------------------

    if (
      Array.isArray(h.investigar) &&
      h.investigar.length
    ){

      html +=
        '<div style="margin-top:10px;">' +

          '<div style="' +
            'font-size:11px;' +
            'font-weight:700;' +
            'margin-bottom:4px;' +
          '">' +
          'Investigar:' +
          '</div>';

      h.investigar.forEach(function(item){

        html +=
          '<div style="' +
            'font-size:11.5px;' +
            'line-height:1.5;' +
            'margin-left:10px;' +
            'color:var(--ink-muted);' +
          '">' +
          '• ' +
          escaparHTML(item) +
          '</div>';

      });

      html += '</div>';

    }


    html += '</div>';

  });


  html += '</div>';


  // ----------------------------------------------------------
  // AVISO FINAL
  // ----------------------------------------------------------

  html +=
    '<p style="' +
      'margin-top:12px;' +
      'font-size:11px;' +
      'color:var(--ink-muted);' +
    '">' +
    'Estas son hipótesis generadas a partir de las señales disponibles. ' +
    'Todas requieren validación con evidencia antes de considerarse una causa.' +
    '</p>';


  respuestaDiv.innerHTML = html;

}


// ============================================================
// GENERAR HIPÓTESIS CON COHERE
// ============================================================

document.getElementById('btn-generar-gemini').addEventListener(
  'click',
  async function(){

    var btn = this;

    var respuestaDiv =
      document.getElementById('gemini-hipotesis-respuesta');

    var apiKeyInput =
      document.getElementById('inp-api-key').value.trim();


    // ========================================================
    // VALIDAR API KEY
    // ========================================================

    if (!apiKeyInput) {

      respuestaDiv.style.display = 'block';

      respuestaDiv.innerHTML =
        '<b>No fue posible generar hipótesis con Cohere.</b><br>' +

        '<span style="color:var(--danger);">' +
        'Ingresá tu API Key de Cohere en el campo de arriba.' +
        '</span>';

      document
        .getElementById('inp-api-key')
        .focus();

      return;
    }


    localStorage.setItem(
      'cohere_api_key_local',
      apiKeyInput
    );


    // ========================================================
    // ESTADO DE CARGA
    // ========================================================

    btn.textContent =
      'Analizando diagnóstico...';

    btn.disabled = true;

    respuestaDiv.style.display = 'block';

    respuestaDiv.innerHTML =
      '<span style="color:var(--ink-muted);">' +
      'Analizando diagnóstico, señales y contexto...' +
      '</span>';


    try {

      // ======================================================
      // OBTENER DIAGNÓSTICO EXISTENTE
      // ======================================================

      var r = computeAll();

      var contexto =
        construirContextoGemini(r);


      // ======================================================
      // PROMPT DE COHERE
      // ======================================================

      var prompt =

        "Eres el asistente de investigación de un analista senior de " +
        "Ecommerce. Tu función es generar hipótesis investigables a " +
        "partir del diagnóstico general, el driver matemático de " +
        "Nivel 1, las señales de Nivel 2 y las hipótesis ya generadas " +
        "por el motor de reglas existente.\n\n" +

        "NO determines automáticamente la causa.\n" +
        "NO cierres el diagnóstico.\n" +
        "NO inventes explicaciones específicas que no estén sustentadas " +
        "por los datos disponibles.\n\n" +

        "Flujo conceptual obligatorio:\n" +
        "SEÑAL OBSERVADA → MECANISMO POSIBLE → DATO NECESARIO PARA " +
        "VALIDAR → CAUSA SOLO DESPUÉS DE VALIDACIÓN.\n" +
        "Nunca: SEÑAL OBSERVADA → CAUSA ESPECÍFICA INVENTADA.\n\n" +


        // ----------------------------------------------------
        // DEFINICIONES
        // ----------------------------------------------------

        "DEFINICIONES (distinguí estrictamente):\n" +
        "DRIVER = variable matemática que explica la brecha de ventas " +
        "en Nivel 1.\n" +
        "SEÑAL = comportamiento relevante detectado en Nivel 2.\n" +
        "MECANISMO = forma posible en que una señal podría estar " +
        "ocurriendo o relacionándose con otra métrica.\n" +
        "HIPÓTESIS = explicación posible que conecta una o más señales " +
        "con un mecanismo de negocio.\n" +
        "CAUSA = hipótesis que posteriormente fue validada mediante " +
        "evidencia.\n" +
        "Driver ≠ Señal. Señal ≠ Hipótesis. Hipótesis ≠ Causa.\n\n" +


        // ----------------------------------------------------
        // REGLA CENTRAL
        // ----------------------------------------------------

        "REGLA CENTRAL:\n" +
        "El driver principal explica matemáticamente la brecha, pero " +
        "NO elimina ni invalida las señales secundarias. Ejemplo: si " +
        "el driver principal es AOV y Nivel 2 detecta Clientes nuevos " +
        "-18%, esa caída se mantiene como señal independiente. NO " +
        "concluyas 'como el driver es AOV, la caída de clientes nuevos " +
        "no importa', ni tampoco 'la caída de clientes nuevos explica " +
        "el AOV' — investigá si existe algún mecanismo que pueda " +
        "conectar ambas cosas.\n\n" +


        // ----------------------------------------------------
        // REGLA MATEMÁTICA: RELEVANCIA POR DRIVER
        // ----------------------------------------------------

        "REGLA MATEMÁTICA — no atribuyas una señal a un driver " +
        "solamente porque ambas cosas se muevan en la misma dirección. " +
        "Que dos cosas caigan juntas no significa que una explique la " +
        "otra: necesitás un mecanismo que conecte la señal con la " +
        "métrica específica del driver, no solo con 'las ventas' en " +
        "general.\n\n" +

        "Si el driver es CR:\n" +
        "- señales de CR por dispositivo → DIRECTAMENTE relevantes.\n" +
        "- señales de funnel → potencialmente relevantes.\n" +
        "- señales de stock → potencialmente relevantes.\n" +
        "- señales de clientes nuevos/recurrentes → relevantes para " +
        "pedidos/mix, pero necesitan un mecanismo explícito de cómo " +
        "afectarían el CR, no se asumen automáticamente.\n" +
        "- señales de recompra/frecuencia → NO asumas automáticamente " +
        "que explican el CR.\n\n" +

        "Si el driver es AOV, tratá como mecanismos potenciales (no " +
        "directos por defecto): mix de categorías, piezas por pedido, " +
        "clientes nuevos/recurrentes, mix de productos, precio o " +
        "promoción — cada uno requiere el mismo cuidado: mostrar cómo " +
        "conecta con el AOV, no solo que coexiste con la caída.\n\n" +

        "Si el driver es Sesiones/Tráfico: fuente/canal, SEO, Paid " +
        "Media, dispositivo y geografía son mecanismos potenciales " +
        "SOLO si esa señal existe en el contexto o se plantea " +
        "explícitamente como algo a investigar — nunca las asumas como " +
        "mecanismo ya confirmado si no están observadas.\n\n" +

        "En resumen: no introduzcas una causa específica dentro de " +
        "'mecanismo' si esa dimensión no está observada; no conviertas " +
        "automáticamente una señal de pedidos o recompra en explicación " +
        "de CR; separá explícitamente qué explica ventas/pedidos " +
        "(volumen) de qué explica la métrica puntual del driver (CR, " +
        "AOV o Sesiones) — son cosas distintas aunque compartan el " +
        "mismo período.\n\n" +


        // ----------------------------------------------------
        // REGLA DE EVIDENCIA
        // ----------------------------------------------------

        "REGLA DE EVIDENCIA — antes de escribir cada hipótesis, " +
        "clasificá mentalmente la información en:\n" +
        "A) DATO OBSERVADO: dato, porcentaje, monto, comparación o " +
        "señal que aparece explícitamente en el contexto.\n" +
        "B) MECANISMO POSIBLE: explicación condicional que podría " +
        "conectar los datos observados.\n" +
        "C) DATO DE VALIDACIÓN: información que todavía NO conocemos y " +
        "que debe investigarse para comprobar o descartar el mecanismo.\n" +
        "La hipótesis puede usar A y proponer B. El campo 'investigar' " +
        "debe indicar C. Nunca presentes C como si fuera A.\n\n" +


        // ----------------------------------------------------
        // NO INFERIR CAUSAS ESPECÍFICAS
        // ----------------------------------------------------

        "REGLA MÁS IMPORTANTE — no saltes de una señal a una causa " +
        "específica todavía no observada. Usá SEÑAL → MECANISMO " +
        "POSIBLE → DATO PARA VALIDAR. NO uses SEÑAL → CAUSA ESPECÍFICA " +
        "NO OBSERVADA.\n\n" +

        "Ejemplo crítico: si el contexto solo contiene 'Clientes nuevos " +
        "-18%', NO escribas 'se debe a una reducción en la calidad del " +
        "tráfico pagado', ni 'las campañas de Google y Meta están " +
        "atrayendo usuarios de menor intención', ni 'el cambio en CPC o " +
        "en las pujas está provocando la caída' — esos datos no existen " +
        "en el contexto. Una formulación válida es: 'la caída de " +
        "clientes nuevos podría estar relacionada con un cambio en la " +
        "composición u origen de los usuarios que llegan al sitio, lo " +
        "que podría contribuir al comportamiento observado de la " +
        "conversión', con 'investigar': 'comparar sesiones, CR y " +
        "participación de clientes nuevos por fuente/canal entre ambos " +
        "períodos'. La fuente/canal es una dimensión de validación, no " +
        "una causa confirmada.\n\n" +


        // ----------------------------------------------------
        // DIMENSIONES NO OBSERVADAS Y EVENTOS
        // ----------------------------------------------------

        "DIMENSIONES NO OBSERVADAS: una dimensión que todavía no " +
        "aparece en el diagnóstico (fuente/canal, campañas, CPC, " +
        "segmentación, creativos, Google Ads, Meta, Paid Media, " +
        "promociones, precios, stock, UX, rediseños, problemas " +
        "técnicos, proveedores, CRM, estacionalidad, competencia) SÍ " +
        "puede proponerse dentro de 'investigar', pero NUNCA puede " +
        "usarse como evidencia ni afirmarse que cambió.\n\n" +

        "NO INVENTES eventos (campañas, cambios de precio, " +
        "promociones, cambios de proveedor, problemas técnicos, " +
        "problemas de stock, rediseños, cambios de UX, cambios de CRM, " +
        "cambios de Google Ads/Meta/pujas/creativos/segmentación, " +
        "eventos comerciales, estacionalidad, movimientos de " +
        "competencia). Tampoco inventes porcentajes, montos, métricas, " +
        "tendencias ni relaciones causales. Todo dato usado como " +
        "evidencia debe existir en el contexto enviado.\n\n" +

        "INTERPRETACIÓN DE NÚMEROS: si el contexto dice que una " +
        "métrica cayó, podés decir que cayó; si da un porcentaje o " +
        "monto, podés usarlo — pero no lo interpretes más allá de lo " +
        "que representa. Dos números que aparecen juntos NO demuestran " +
        "causalidad; no conviertas una coincidencia temporal o " +
        "matemática en una relación causal.\n\n" +


        // ----------------------------------------------------
        // DIVERSIDAD Y SEÑALES SECUNDARIAS
        // ----------------------------------------------------

        "DIVERSIDAD: las hipótesis deben representar mecanismos " +
        "diferentes cuando existan suficientes señales (mix de " +
        "clientes, mix de productos/categorías, mix de tráfico, " +
        "canales, funnel, conversión, operación, disponibilidad, " +
        "precio, promociones, dispositivo, geografía, recurrencia, " +
        "problemas técnicos, estacionalidad). No generes varias " +
        "hipótesis que sean la misma explicación con otras palabras, " +
        "pero tampoco conviertas una dimensión en hipótesis solo para " +
        "generar diversidad — debe existir una señal real que haga " +
        "razonable investigarla.\n\n" +

        "SEÑALES SECUNDARIAS: una señal secundaria se conserva aunque " +
        "no sea el driver principal. Ejemplo válido (driver AOV, señal " +
        "clientes nuevos ↓): 'la caída de clientes nuevos podría estar " +
        "modificando el mix de compradores y contribuir al " +
        "comportamiento observado del AOV', a validar con AOV nuevos " +
        "vs. recurrentes, piezas por pedido, categorías compradas y mix " +
        "de productos — pero sin afirmar 'los clientes nuevos están " +
        "causando la caída del AOV' hasta tener evidencia.\n\n" +


        // ----------------------------------------------------
        // PRIORIDAD Y LENGUAJE
        // ----------------------------------------------------

        "PRIORIDAD: usá únicamente Alta, Media o Baja. No representa " +
        "probabilidad — representa qué tan útil y directamente " +
        "conectada está la hipótesis con las señales observadas y la " +
        "brecha diagnosticada, según: 1) qué tan directamente está " +
        "respaldada por datos observados, 2) cuántas señales relevantes " +
        "conecta, 3) qué tan cerca está del mecanismo que puede " +
        "explicar la brecha, 4) qué tan concreta es la validación " +
        "necesaria. Una hipótesis basada solo en una dimensión todavía " +
        "no observada normalmente debe tener menor prioridad que una " +
        "respaldada directamente por varias señales. Ordená el array " +
        "de mayor a menor prioridad.\n\n" +

        "LENGUAJE: usá siempre condicional ('podría deberse a', " +
        "'podría estar relacionado con', 'es posible que', 'podría " +
        "contribuir a', 'podría explicar parcialmente', 'sugiere " +
        "investigar si', 'sería consistente con'). Evitá 'se debe a', " +
        "'la causa es', 'definitivamente', 'confirma que', 'demuestra " +
        "que', 'el problema fue', o nombrar una causa específica como " +
        "ya ocurrida ('las campañas hicieron', 'el stock provocó', 'el " +
        "rediseño provocó').\n\n" +


        // ----------------------------------------------------
        // CAMPOS DEL SCHEMA
        // ----------------------------------------------------

        "CAMPO 'hipotesis': relación posible entre señales observadas y " +
        "un mecanismo de negocio, con datos concretos cuando estén " +
        "disponibles, sin introducir como hechos dimensiones que no " +
        "aparecen en el diagnóstico.\n" +
        "CAMPO 'justificacion': por qué merece investigarse, usando " +
        "solo evidencia disponible en el contexto, sin inventar " +
        "evidencia.\n" +
        "CAMPO 'senales_relacionadas': únicamente señales realmente " +
        "presentes en el contexto, sin inventar señales.\n" +
        "CAMPO 'mecanismo': cómo podría funcionar la relación, en " +
        "forma condicional, sin introducir una causa específica no " +
        "observada.\n" +
        "CAMPO 'investigar': qué información falta; puede proponer " +
        "dimensiones todavía no presentes en el diagnóstico (fuente/" +
        "canal, dispositivo, geografía, categoría, producto, AOV, CR, " +
        "piezas por pedido, nuevos vs. recurrentes, funnel, stock, " +
        "precio, promociones), dejando claro que son datos a " +
        "investigar, no hechos.\n\n" +


        // ----------------------------------------------------
        // CONTROL ANTES DE RESPONDER
        // ----------------------------------------------------

        "ANTES DE GENERAR EL JSON, revisá cada hipótesis con esta " +
        "checklist: 1) ¿qué parte está realmente observada?, 2) ¿qué " +
        "parte es un mecanismo posible?, 3) ¿qué dato falta para " +
        "validarla?, 4) ¿estoy afirmando como hecho algo que no aparece " +
        "en el contexto?, 5) ¿estoy convirtiendo una dimensión de " +
        "investigación en una causa?, 6) ¿está relacionada con una " +
        "señal real?, 7) ¿estoy repitiendo otra hipótesis con palabras " +
        "diferentes? Si una afirmación no está sustentada: eliminala, " +
        "convertila en posibilidad condicional, o movela a " +
        "'investigar'.\n\n" +


        // ----------------------------------------------------
        // CONTEXTO Y TAREA
        // ----------------------------------------------------

        "=== CONTEXTO DEL DIAGNÓSTICO ===\n" +
        contexto + "\n\n" +

        "=== TAREA ===\n" +
        "Generá entre 3 y 5 hipótesis investigables, cada una con: id, " +
        "hipotesis, prioridad, justificacion, senales_relacionadas, " +
        "mecanismo, investigar. Si la información disponible no permite " +
        "sustentar 3 hipótesis, NO inventes hipótesis solo para " +
        "completar el número — generá únicamente las que tengan " +
        "sustento suficiente.\n\n" +

        "Respondé ÚNICAMENTE con un objeto JSON válido que cumpla " +
        "exactamente el schema definido — sin texto antes ni después, " +
        "sin Markdown, sin bloques de código, sin campos adicionales.";

      btn.textContent = 'Generando hipótesis...';

      var resultado = await llamarCohere(apiKeyInput, prompt, modeloCohereActual());

      renderizarHipotesisCohere(resultado, respuestaDiv);

    } catch (error) {

      var msgEscapado = String(error.message)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      respuestaDiv.innerHTML =
        '<b>No fue posible generar hipótesis con Cohere.</b><br>' +
        '<span style="color:var(--danger);word-break:break-word;"><b>Error:</b> ' + msgEscapado + '</span><br>' +
        '<span style="font-size:11px;color:var(--ink-muted);">Revisa: API key, modelo utilizado, conexión, o la respuesta de la API.</span>';

    } finally {

      btn.textContent = '🤖 Generar hipótesis con Cohere AI';
      btn.disabled = false;

    }
  }
);

// --- FIN INTEGRACIÓN CON COHERE ---

document.getElementById('btn-ajustes').addEventListener('click', function(){
  document.getElementById('modal-ajustes').style.display = 'flex';
});
document.getElementById('btn-cerrar-ajustes').addEventListener('click', function(){
  document.getElementById('modal-ajustes').style.display = 'none';
});
document.getElementById('modal-ajustes').addEventListener('click', function(e){
  if(e.target.id === 'modal-ajustes') e.target.style.display = 'none';
});

document.getElementById('link-calc-impacto').addEventListener('click', function(e){
  e.preventDefault();
  var wrap = document.getElementById('calc-impacto-wrap');
  var abrir = wrap.style.display === 'none';
  wrap.style.display = abrir ? 'block' : 'none';
  if(abrir) actualizarCalcImpacto();
});
['calc-impacto-driver','calc-impacto-atribucion','calc-impacto-recuperacion'].forEach(function(id){
  var el = document.getElementById(id);
  el.addEventListener('input', actualizarCalcImpacto);
  el.addEventListener('change', actualizarCalcImpacto);
});
function actualizarCalcImpacto(){
  var r = computeAll();
  var driver = document.getElementById('calc-impacto-driver').value;
  var base = Math.abs((driver==='ses' ? r.efSes : (driver==='cr' ? r.efCR : r.efAOV)) || 0);
  document.getElementById('calc-impacto-base').textContent = fmtMoney(base);
  var atrib = num('calc-impacto-atribucion')/100;
  var recup = num('calc-impacto-recuperacion')/100;
  document.getElementById('calc-impacto-resultado').textContent = fmtMoney(base*atrib*recup);
}
document.getElementById('btn-usar-calc-impacto').addEventListener('click', function(){
  var r = computeAll();
  var driver = document.getElementById('calc-impacto-driver').value;
  var base = Math.abs((driver==='ses' ? r.efSes : (driver==='cr' ? r.efCR : r.efAOV)) || 0);
  var atrib = num('calc-impacto-atribucion')/100;
  var recup = num('calc-impacto-recuperacion')/100;
  document.getElementById('inp-impacto').value = Math.round(base*atrib*recup);
  document.getElementById('calc-impacto-wrap').style.display = 'none';
  recalc();
});

// --- ASISTENTE DE IA FLOTANTE ---
var chatIAHistorial = [];
var chatIAMsgSeq = 0;

var CHAT_IA_ALIAS_CANAL = {
  ecommerce: ['ecommerce', 'e-commerce', 'sitio web', 'pagina web', 'página web', 'la web'],
  app: ['app', 'aplicación', 'aplicacion'],
  whatsapp: ['whatsapp', 'wsp', 'wpp'],
  llamadas: ['llamadas', 'call center', 'telefono', 'teléfono', 'telefonico', 'telefónico']
};
function detectarCanalEnPregunta(pregunta){
  var texto = pregunta.toLowerCase();
  var canales = Object.keys(CHAT_IA_ALIAS_CANAL);
  for(var i=0;i<canales.length;i++){
    var alias = CHAT_IA_ALIAS_CANAL[canales[i]];
    for(var j=0;j<alias.length;j++){
      var esc = alias[j].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var patron = new RegExp('(^|[^a-záéíóúñ])' + esc + '([^a-záéíóúñ]|$)', 'i');
      if(patron.test(texto)) return canales[i];
    }
  }
  return null;
}

// Arma el contexto de UN canal puntual, aunque no sea el que está visible ahora:
// carga temporalmente sus datos guardados, calcula, y deja todo exactamente
// como estaba antes de que esta función tocara nada.
function contextoChatIAParaCanal(canalKey){
  var canalOriginal = document.getElementById('sel-canal').value;
  var datosFormOriginal = (canalOriginal!=='global') ? serializarFormularioActual() : null;

  document.getElementById('sel-canal').value = canalKey;
  restaurarFormulario(datosPorCanal[canalKey]);
  var r = computeAll();
  var contexto = construirContextoGemini(r);

  document.getElementById('sel-canal').value = canalOriginal;
  if(datosFormOriginal) restaurarFormulario(datosFormOriginal);

  return contexto;
}

// Sin canal especificado: resumen corto de los 4, no el contexto completo de cada uno.
function contextoChatIAResumenGlobal(){
  var canalOriginal = document.getElementById('sel-canal').value;
  var datosFormOriginal = (canalOriginal!=='global') ? serializarFormularioActual() : null;

  var canales = ['ecommerce','app','whatsapp','llamadas'];
  var lineas = [];
  canales.forEach(function(c){
    var datos = datosPorCanal[c];
    if(!tieneDatosReales(datos)){ lineas.push('- '+CANAL_NAMES[c]+': sin datos cargados todavía.'); return; }
    document.getElementById('sel-canal').value = c;
    restaurarFormulario(datos);
    var r = computeAll();
    lineas.push('- '+CANAL_NAMES[c]+': brecha '+(r.brechaPct!==null&&r.brechaPct!==undefined?fmtPct(r.brechaPct):'—')+' vs. esperado a la fecha, driver principal '+(r.primary?r.primary.label:'sin driver dominante')+'.');
  });

  document.getElementById('sel-canal').value = canalOriginal;
  if(datosFormOriginal) restaurarFormulario(datosFormOriginal);

  return 'Los 4 canales, con la pregunta sin especificar ninguno en particular:\n' + lineas.join('\n') +
    '\n\nSi para responder bien hace falta el detalle de un canal en particular, decilo y pedile al analista que lo aclare, en vez de asumir cuál.';
}

var CHAT_IA_SISTEMA =
  "Sos el asistente de un analista senior de Ecommerce, dentro de una herramienta de diagnóstico de brecha de ventas que cubre 4 canales (Ecommerce, App, WhatsApp, Llamadas). Respondés preguntas sobre el diagnóstico en las dos direcciones: cuando algo va mal, qué podría explicarlo y qué investigar; cuando algo va bien o está creciendo, qué lo explica y qué palanca conviene empujar para sostenerlo o escalarlo.\n\n" +
  "Cada pregunta te llega con un bloque de CONTEXTO propio, que puede ser de un canal puntual (si el analista lo mencionó) o un resumen de los 4 (si no especificó ninguno). Usá siempre el contexto de ESE turno — no asumas que es el mismo canal del mensaje anterior salvo que el contexto lo confirme. El contexto incluye tanto señales de riesgo (qué está cayendo) como oportunidades (qué está creciendo) — mirá las dos antes de responder, incluso si la pregunta suena orientada a una sola.\n\n" +
  "REGLAS QUE NUNCA ROMPÉS:\n" +
  "- NO determinás la causa definitiva de un problema, NO cerrás el diagnóstico.\n" +
  "- NO inventás eventos, cambios, campañas, porcentajes, montos o métricas que no estén en el contexto de ese turno — esto aplica igual para explicar una caída que para explicar un crecimiento.\n" +
  "- Distinguís siempre: DRIVER (variable matemática que explica la variación) ≠ SEÑAL (comportamiento detectado en Nivel 2, en cualquier dirección) ≠ MECANISMO (cómo podría estar pasando) ≠ HIPÓTESIS (posible explicación) ≠ CAUSA (hipótesis ya validada con evidencia).\n" +
  "- No atribuyas una señal a un driver solo porque se muevan en la misma dirección — necesitás un mecanismo que conecte con la métrica específica del driver, no solo con 'las ventas' en general. Si el driver es CR: dispositivo es directamente relevante; funnel y stock son potencialmente relevantes; nuevos/recurrentes necesitan un mecanismo explícito; recompra no se asume automáticamente. Si es AOV: mix de categorías, piezas por pedido, nuevos/recurrentes y precio/promoción son mecanismos potenciales. Si es Sesiones: fuente/canal, SEO, Paid Media, dispositivo y geografía son mecanismos potenciales solo si esa señal está observada o se propone como investigación. Esto vale igual si el driver está en positivo.\n" +
  "- Si te preguntan por qué un canal va bien o creciendo, respondé con las OPORTUNIDADES DETECTADAS del contexto (qué categoría/SKU/canal/dispositivo tiene tracción real) — no inventes una explicación genérica tipo 'buena gestión' o 'mercado favorable' si no hay una señal concreta que lo respalde. Si no hay ninguna oportunidad detectada, decilo — puede pasar que la meta simplemente era conservadora, sin que nada haya mejorado vs. la base.\n" +
  "- Cuando sugieras empujar algo que ya está funcionando, usá lenguaje condicional igual que para un riesgo ('podría convenir', 'valdría la pena escalar'), y aclará que es una apuesta sobre algo que ya mostró tracción, no una garantía.\n" +
  "- Si te piden una acción concreta ('hacé esto', 'probá esto'), formulala como algo a probar, investigar o empujar, e indicá qué dato confirmaría si funcionó — no como algo ya comprobado.\n" +
  "- Si la pregunta pide algo que no está sustentado en el contexto, decilo en vez de inventar una respuesta.\n\n" +
  "Respondé en español, de forma breve y directa — esto es un chat, no un informe. 3 a 6 líneas salvo que te pidan más detalle.";

function chatIALoadingUI(cargando){
  document.getElementById('btn-enviar-chat-ia').disabled = cargando;
  document.getElementById('inp-chat-ia').disabled = cargando;
}

function pintarMensajeChatIA(role, texto){
  var id = 'chat-ia-msg-' + (chatIAMsgSeq++);
  var cont = document.getElementById('chat-ia-mensajes');
  var esUser = role === 'user';
  var esSistema = role === 'sistema' || role === 'cargando';
  var wrap = document.createElement('div');
  wrap.id = id;
  wrap.style.cssText = 'margin-bottom:10px;display:flex;' + (esUser ? 'justify-content:flex-end;' : 'justify-content:flex-start;');
  var burbuja = document.createElement('div');
  burbuja.style.cssText = 'max-width:85%;padding:9px 12px;font-size:13px;line-height:1.5;white-space:pre-wrap;border-radius:' +
    (esUser ? '12px 12px 2px 12px;' : '12px 12px 12px 2px;') +
    (esUser ? 'background:var(--accent);color:#fff;' : (esSistema ? 'background:var(--bg-page);color:var(--ink-muted);font-style:italic;' : 'background:var(--bg-page);color:var(--ink);'));
  burbuja.textContent = texto;
  wrap.appendChild(burbuja);
  cont.appendChild(wrap);
  cont.scrollTop = cont.scrollHeight;
  return id;
}
function quitarMensajeChatIA(id){
  var el = document.getElementById(id);
  if(el) el.remove();
}
function agregarMensajeChatIAWelcome(){
  var cont = document.getElementById('chat-ia-mensajes');
  var div = document.createElement('div');
  div.style.cssText = 'font-size:12px;color:var(--ink-muted);text-align:center;padding:24px 10px;line-height:1.5;';
  div.textContent = 'Preguntame sobre el diagnóstico — mencioná un canal si querés que analice ese puntual (ej. "¿qué probarías primero en ecommerce?"); si no especificás ninguno, te doy un resumen de los 4.';
  cont.appendChild(div);
}
function nuevaConversacionIA(){
  chatIAHistorial = [];
  document.getElementById('chat-ia-mensajes').innerHTML = '';
  agregarMensajeChatIAWelcome();
}

async function enviarMensajeChatIA(){
  var input = document.getElementById('inp-chat-ia');
  var pregunta = input.value.trim();
  if(!pregunta) return;

  var apiKeyInput = document.getElementById('inp-api-key').value.trim();
  if(!apiKeyInput){
    pintarMensajeChatIA('sistema', 'Falta tu API Key de Cohere — configurala en ⚙️ Ajustes.');
    return;
  }

  var canalDetectado = detectarCanalEnPregunta(pregunta);
  var contextoTurno;
  if(canalDetectado){
    if(!tieneDatosReales(datosPorCanal[canalDetectado])){
      contextoTurno = 'El analista preguntó sobre '+CANAL_NAMES[canalDetectado]+', pero todavía no hay datos cargados para ese canal.';
    } else {
      contextoTurno = '=== CONTEXTO — '+CANAL_NAMES[canalDetectado]+' ===\n' + contextoChatIAParaCanal(canalDetectado);
    }
  } else {
    contextoTurno = '=== CONTEXTO — Resumen de los 4 canales ===\n' + contextoChatIAResumenGlobal();
  }
  var mensajeConContexto = contextoTurno + '\n\n=== PREGUNTA DEL ANALISTA ===\n' + pregunta;

  chatIAHistorial.push({role:'user', content: pregunta});
  pintarMensajeChatIA('user', pregunta);
  input.value = '';
  chatIALoadingUI(true);
  var idLoading = pintarMensajeChatIA('cargando', 'Pensando...');

  try {

    var mensajesParaEnviar = [{role:'system', content: CHAT_IA_SISTEMA}]
      .concat(chatIAHistorial.slice(0, -1))
      .concat([{role:'user', content: mensajeConContexto}]);

    var response = await fetch("https://api.cohere.com/v2/chat", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKeyInput },
      body: JSON.stringify({ model: modeloCohereActual(), messages: mensajesParaEnviar, temperature: 0.4 })
    });

    var data = await response.json();

    if (!response.ok) {
      var detalleError = (data && data.message) ? data.message : JSON.stringify(data).slice(0, 400);
      throw new Error((response.status || '?') + ' — ' + detalleError);
    }

    var bloques = data && data.message && data.message.content;
    var texto = null;
    if (Array.isArray(bloques)) {
      var bloqueTexto = bloques.find(function(b){ return b && b.type === 'text' && b.text; });
      if (bloqueTexto) texto = bloqueTexto.text;
    }
    if (!texto) {
      throw new Error('La respuesta no incluyó texto utilizable (finish_reason: ' + (data.finish_reason || 'desconocido') + ').');
    }

    quitarMensajeChatIA(idLoading);
    chatIAHistorial.push({role:'assistant', content:texto});
    pintarMensajeChatIA('assistant', texto);

  } catch (error) {

    quitarMensajeChatIA(idLoading);
    // sacamos la pregunta del historial que se le manda a Cohere: no fue respondida,
    // no queremos reenviarla como si ya tuviera respuesta en el próximo mensaje.
    if (chatIAHistorial.length && chatIAHistorial[chatIAHistorial.length-1].role === 'user') {
      chatIAHistorial.pop();
    }
    pintarMensajeChatIA('sistema', 'No se pudo responder. Error: ' + String(error.message));

  } finally {
    chatIALoadingUI(false);
    input.focus();
  }
}

document.getElementById('btn-chat-ia').addEventListener('click', function(){
  document.getElementById('panel-chat-ia').style.display = 'block';
  if(!document.getElementById('chat-ia-mensajes').children.length) agregarMensajeChatIAWelcome();
  document.getElementById('inp-chat-ia').focus();
});
document.getElementById('btn-cerrar-chat-ia').addEventListener('click', function(){
  document.getElementById('panel-chat-ia').style.display = 'none';
});
document.getElementById('panel-chat-ia').addEventListener('click', function(e){
  if(e.target.id === 'panel-chat-ia') e.target.style.display = 'none';
});
document.getElementById('link-nueva-conversacion-ia').addEventListener('click', function(e){
  e.preventDefault();
  nuevaConversacionIA();
});
document.getElementById('btn-enviar-chat-ia').addEventListener('click', enviarMensajeChatIA);
document.getElementById('inp-chat-ia').addEventListener('keydown', function(e){
  if(e.key === 'Enter'){ e.preventDefault(); enviarMensajeChatIA(); }
});
// --- FIN ASISTENTE DE IA FLOTANTE ---

cargarHistorial();
