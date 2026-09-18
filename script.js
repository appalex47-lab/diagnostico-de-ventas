function num(id){ var el=document.getElementById(id); var v=parseFloat(el.value); return isNaN(v)?0:v; }
function txt(id){ return document.getElementById(id).value.trim(); }
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
  'frecuencia_actual':'inp-fr-a', 'frecuencia_base':'inp-fr-b'
};

function canalEsDirecto(canal){ return canal==='llamadas' || canal==='whatsapp'; }
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

  var resultado01 = null;
  if(pctTiempo>0 && meta>0){
    var cierreProyectado = ventaActual/pctTiempo;
    var cierrePct = cierreProyectado/meta*100;
    resultado01 = 'Al ritmo actual, vas a cerrar el período en '+fmtMoney(cierreProyectado)+' ('+cierrePct.toFixed(0)+'% de la meta).';
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

  var drivers=[{name:'sesiones',label:sesLabel,val:efSes},{name:'cr',label:crLabel,val:efCR},{name:'aov',label:'AOV',val:efAOV}];
  var sorted=drivers.slice().sort(function(a,b){return a.val-b.val;});
  var primary = sorted[0].val<0 ? sorted[0] : null;
  var maxAbs1=Math.max(Math.abs(efSes),Math.abs(efCR),Math.abs(efAOV),1);
  var variacionTotal = efSes+efCR+efAOV;
  var sumAbsEfectos = Math.abs(efSes)+Math.abs(efCR)+Math.abs(efAOV) || 1;
  var pctSes = efSes/sumAbsEfectos*100, pctCR = efCR/sumAbsEfectos*100, pctAOV = efAOV/sumAbsEfectos*100;
  var resultado03 = primary
    ? primary.label+' explica '+fmtMoney(Math.abs(primary.val))+' de la variación vs. período de comparación (no de la brecha contra meta), el driver con mayor efecto entre los tres.'
    : ((sesA||crA||aovA) ? 'Ningún factor muestra un efecto negativo dominante todavía.' : null);

  var pnA=num('inp-pn-a'), pnB=num('inp-pn-b'), prA=num('inp-pr-a'), prB=num('inp-pr-b'), frA=num('inp-fr-a'), frB=num('inp-fr-b');
  var deltaN=pnA-pnB, deltaR=prA-prB;
  var maxAbs2=Math.max(Math.abs(deltaN),Math.abs(deltaR),1);
  var frecuenciaCae = frB>0 && frA<frB;

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

  function textoSenalSegmento(seg){
    if(seg==='nuevos') return 'clientes nuevos cayeron ('+fmtNum(deltaN)+' vs. '+fmtNum(deltaR)+' en recurrentes)';
    return 'clientes recurrentes cayeron ('+fmtNum(deltaR)+' vs. '+fmtNum(deltaN)+' en nuevos)'+(deviceLabel?' en '+deviceLabel.toLowerCase():'')+(categoryLabel?', dentro de '+categoryLabel:'');
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

  var peorCanal = null, canalesList = [];
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
      canalesList.push({name:n, delta:delta, cr:cr, aov:aov, impacto:impacto});
    }
  });
  if(canalesList.length>0){
    // Prioriza por impacto económico estimado (sesiones perdidas × CR × AOV propios del canal)
    // cuando hay AOV cargado en al menos un canal; si no, cae a la caída de sesiones cruda —
    // una caída % chica con mucho volumen puede pesar más que una caída % grande con poco volumen.
    var algunAov = canalesList.some(function(c){return c.aov>0;});
    if(algunAov){ canalesList.sort(function(a,b){ return a.impacto-b.impacto; }); }
    else { canalesList.sort(function(a,b){ return a.delta-b.delta; }); }
    peorCanal = canalesList[0];
    peorCanal.perdidaEstimada = Math.abs(peorCanal.impacto);
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
    categoryTopImpacto:categoryTopImpacto};
}

function setNote(id, text){
  var el = document.getElementById(id);
  if(text){ el.style.display='block'; el.textContent=text; } else { el.style.display='none'; }
}

function setBar(fillId,valId,value,maxAbs,pct){
  var fill=document.getElementById(fillId), val=document.getElementById(valId);
  var pctBar=Math.min(100, Math.abs(value)/maxAbs*100);
  fill.style.width=pctBar+'%';
  fill.style.background = value<0 ? 'var(--danger)' : 'var(--accent)';
  val.textContent = fmtMoney(value) + (typeof pct==='number' ? ' ('+(pct>=0?'+':'')+pct.toFixed(0)+'%)' : '');
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
  var el = document.getElementById('senales-detectadas');
  if(!senales.length){
    el.innerHTML = '<p style="margin:0;font-size:12.5px;color:var(--ink-muted);">Todavía no hay señales — son hallazgos de Nivel 2, distintos del driver matemático de Nivel 1.</p>';
    return;
  }
  var IMPACTO_LABEL = {3:'Alto', 2:'Medio', 1:'Bajo'};
  el.innerHTML = senales.map(function(s){
    return '<div class="out"><span class="l">'+s.label+'</span><span class="v" style="font-size:11px;color:var(--ink-muted);">'+IMPACTO_LABEL[s.impacto]+'</span></div>';
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

  setBar('bar-n','bar-n-val',r.deltaN,r.maxAbs2);
  setBar('bar-r','bar-r-val',r.deltaR,r.maxAbs2);
  document.getElementById('out-frecuencia-nota').style.display = r.frecuenciaCae ? 'block':'none';
  setNote('out-resultado-04', r.resultado04);

  var showDrill = r.subcausa==='recurrentes';
  ['sec-device','sec-category','sec-sku'].forEach(function(id){ document.getElementById(id).style.display = showDrill ? 'block':'none'; });
  setNote('out-resultado-04a', r.resultado04a);
  setNote('out-resultado-04b', r.resultado04b);
  setNote('out-resultado-04c', r.resultado04c);

  var showCanales = !!(r.primary && r.primary.name==='sesiones');
  document.getElementById('sec-canales').style.display = showCanales ? 'block':'none';
  if(showCanales){
    if(r.peorCanal){
      var txtCanal = 'El canal con mayor caída es '+r.peorCanal.name+' ('+fmtNum(r.peorCanal.delta)+' sesiones). Su CR actual es '+fmtPct(r.peorCanal.cr)+'.';
      if(r.peorCanal.aov>0) txtCanal += ' Esto representa una pérdida estimada de '+fmtMoney(r.peorCanal.perdidaEstimada)+'.';
      setNote('out-resultado-04d', txtCanal);
    } else { setNote('out-resultado-04d', 'Cargá al menos un canal para identificar el responsable.'); }
  }

  var showFunnel = !!(r.primary && r.primary.name==='cr');
  document.getElementById('sec-funnel').style.display = showFunnel ? 'block':'none';
  if(showFunnel){
    var fTxt = '';
    if(r.peorPaseD) fTxt += 'Desktop: el mayor quiebre de pase es en '+r.peorPaseD.s+' ('+fmtPct(r.peorPaseD.r*100)+'). ';
    if(r.peorPaseM) fTxt += 'Mobile: el mayor quiebre de pase es en '+r.peorPaseM.s+' ('+fmtPct(r.peorPaseM.r*100)+').';
    setNote('out-resultado-04e', fTxt ? fTxt : 'Cargá los pasos del embudo para ver dónde ocurre el mayor quiebre.');
  }

  document.getElementById('aov-subcausa-card').style.display = (r.primary && r.primary.name==='aov') ? 'block':'none';

  renderSenales(r);
  renderChecklist(r);
  renderHipotesis(r);
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
  actualizarLabelsCanal();
  recalc();
  cargarHistorial();
});

document.getElementById('sel-modo').addEventListener('change', aplicarModo);
document.getElementById('sel-vista-historial').addEventListener('change', cargarHistorial);

// Delegación de eventos: cubre también los inputs/selects agregados dinámicamente
// (filas de categoría/SKU), sin necesidad de volver a atar listeners uno por uno.
document.addEventListener('input', function(e){ if(e.target.matches('input, select')) recalc(); });
document.addEventListener('change', function(e){ if(e.target.matches('input, select')) recalc(); });

var catRowsDefaultHTML = document.getElementById('cat-rows-container').innerHTML;
var skuRowsDefaultHTML = document.getElementById('sku-rows-container').innerHTML;
var canalesRowsDefaultHTML = document.getElementById('canales-rows-container').innerHTML;

document.getElementById('btn-clear').addEventListener('click', function(){
  document.querySelectorAll('input').forEach(function(el){ el.value=''; });
  document.getElementById('inp-umbral').value=-5;
  document.getElementById('inp-umbral-drill').value=-5;
  document.getElementById('sel-aov-subcausa').selectedIndex=0;
  document.getElementById('sel-validacion').selectedIndex=0;
  document.getElementById('inp-aprendizaje').value='';
  document.getElementById('cat-rows-container').innerHTML = catRowsDefaultHTML;
  document.getElementById('sku-rows-container').innerHTML = skuRowsDefaultHTML;
  document.getElementById('canales-rows-container').innerHTML = canalesRowsDefaultHTML;
  document.getElementById('hipotesis-output').style.display='none';
  document.getElementById('import-status').style.display='none';
  _lastHipKey=undefined; _lastChecklistKey=undefined;
  recalc();
});

function cargarEjemplo(){
  document.getElementById('sel-canal').value='ecommerce';
  document.getElementById('inp-meta').value=9200000;
  document.getElementById('inp-dias-t').value=31;
  document.getElementById('inp-dias-total').value=31;
  document.getElementById('inp-venta-actual').value=7900000;
  document.getElementById('inp-yoy-base').value=8346000;
  document.getElementById('inp-mom-base').value=8490700;
  document.getElementById('inp-ses-a').value=1830000;
  document.getElementById('inp-ses-b').value=1780000;
  document.getElementById('inp-cr-a').value=0.22;
  document.getElementById('inp-cr-b').value=0.242;
  document.getElementById('inp-aov-a').value=1965;
  document.getElementById('inp-aov-b').value=1970;
  document.getElementById('inp-pn-a').value=2900;
  document.getElementById('inp-pn-b').value=3000;
  document.getElementById('inp-pr-a').value=1120;
  document.getElementById('inp-pr-b').value=1310;
  document.getElementById('inp-fr-a').value=1.35;
  document.getElementById('inp-fr-b').value=1.42;
  document.getElementById('inp-device-desktop').value=-8;
  document.getElementById('inp-device-mobile').value=-23;

  var catRows = document.querySelectorAll('#cat-rows-container .cat-row');
  var cats = [['OTC',2],['Belleza',1],['Higiene',-3],['AETOPS',-21],['Vitaminas',-4]];
  cats.forEach(function(c,i){ if(catRows[i]){ catRows[i].querySelector('.cat-name').value=c[0]; catRows[i].querySelector('.cat-var').value=c[1]; } });

  var skuRows = document.querySelectorAll('#sku-rows-container .sku-row');
  var skus = [['Producto A',18,-11,'bajo'],['Producto B',13,-8,'agotado'],['Producto C',9,-15,'bajo'],['Producto D',7,-12,'agotado']];
  skus.forEach(function(sk,i){ if(skuRows[i]){ skuRows[i].querySelector('.sku-name').value=sk[0]; skuRows[i].querySelector('.sku-ses').value=sk[1]; skuRows[i].querySelector('.sku-cart').value=sk[2]; skuRows[i].querySelector('.sku-stock').value=sk[3]; } });

  document.getElementById('inp-impacto').value=650000;
  document.getElementById('inp-fecha-medicion').value='2026-04-10';

  actualizarLabelsCanal();
  recalc();
  mostrarEstadoImport('Cargamos el ejemplo de marzo (AETOPS + stock) para ver el flujo completo funcionando. Tocá "Limpiar" para volver a empezar con datos reales.');
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
  div.style.gridTemplateColumns='1fr 40px 40px 40px 48px 20px';
  div.innerHTML='<input type="text" class="acq-canal" placeholder="Canal"><input type="number" class="acq-sb" placeholder="0"><input type="number" class="acq-sa" placeholder="0"><input type="number" class="acq-c" placeholder="0"><input type="number" class="acq-aov" placeholder="$"><button type="button" class="btn-row-remove">×</button>';
  document.getElementById('canales-rows-container').appendChild(div);
}
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
    segmento = document.getElementById('sel-aov-subcausa').selectedOptions[0].text;
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
  var hipTxt = txt('out-hipotesis-texto'); if(hipTxt==='—') hipTxt='';
  lineas.push('9. Hipótesis: '+(hipTxt||'—')+'.');
  lineas.push('9b. Evidencia: '+(txt('inp-evidencia')||'—')+'.');
  lineas.push('10. Validación: '+document.getElementById('sel-validacion').selectedOptions[0].text+' ('+(txt('inp-fuente-validacion')||'sin fuente')+').');
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
  var snapshot={id:r.canal+'-'+Date.now(), fecha:new Date().toISOString().slice(0,10), canal:r.canal, estado:r.estado, brechaPct:r.brechaPct,
    ventaActual:r.ventaActual, ventaEsperada:r.ventaEsperada,
    causa:r.causaCorta, palanca:r.palanca, dueno:r.dueno,
    impactoEsperado:num('inp-impacto'), impactoReal:null, fechaMedicion:txt('inp-fecha-medicion'),
    estadoValidacion:document.getElementById('sel-validacion').value, fuenteValidacion:txt('inp-fuente-validacion'),
    hipotesis:(txt('out-hipotesis-texto')==='—'?'':txt('out-hipotesis-texto')), evidencia:txt('inp-evidencia'), aprendizaje:txt('inp-aprendizaje')};
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
      if(lineas.length<2){ mostrarEstadoImport('El CSV no tiene una fila de datos.'); return; }
      var headers = lineas[0].split(',').map(function(h){ return h.trim().toLowerCase(); });
      var valores = lineas[1].split(',').map(function(v){ return v.trim(); });
      var aplicados = 0;
      headers.forEach(function(h, i){
        var val = valores[i];
        if(val===undefined || val==='') return;
        if(h==='canal'){
          var canalKey = Object.keys(CANAL_NAMES).filter(function(k){ return k===val.toLowerCase() || CANAL_NAMES[k].toLowerCase()===val.toLowerCase(); })[0];
          if(canalKey){ document.getElementById('sel-canal').value = canalKey; aplicados++; }
          return;
        }
        var targetId = CSV_FIELD_MAP[h];
        if(targetId){ document.getElementById(targetId).value = val; aplicados++; }
      });
      actualizarLabelsCanal();
      recalc();
      cargarHistorial();
      mostrarEstadoImport(aplicados+' campo'+(aplicados!==1?'s':'')+' importado'+(aplicados!==1?'s':'')+' desde el CSV (toma la primera fila de datos).');
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
function envolverSecciones(){
  var heads = Array.prototype.slice.call(document.querySelectorAll('.section-head')).filter(function(h){
    var numEl = h.querySelector('.section-num');
    var num = numEl ? numEl.textContent.trim() : '';
    return /^\d{2}$/.test(num) || num==='↺';
  });
  heads.forEach(function(head){
    var wrapper = document.createElement('div');
    var next = head.nextElementSibling;
    var toMove = [];
    while(next && !next.classList.contains('section-head')){
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
  });
}
envolverSecciones();

actualizarLabelsCanal();
aplicarModo();
recalc();
cargarHistorial();
