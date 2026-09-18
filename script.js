
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
var CHECKLISTS = {
  cr:['Dispositivo','Categoría','Tráfico/fuente','Búsqueda','PDP','Checkout','Disponibilidad','Precio','Medio de pago','Problemas técnicos'],
  sesiones:['Volumen','Fuente/medio','Calidad de tráfico','Canal','Dispositivo','Landing','SEO','Paid media','Mix de usuarios'],
  aov:['Mix de productos','Categorías','Unidades por pedido','Productos complementarios','Bundles','Upsell','Precio','Composición de clientes']
};
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
  var resultado03 = primary
    ? primary.label+' explica '+fmtMoney(Math.abs(primary.val))+' de la brecha, el driver con mayor efecto entre los tres.'
    : ((sesA||crA||aovA) ? 'Ningún factor muestra un efecto negativo dominante todavía.' : null);

  var pnA=num('inp-pn-a'), pnB=num('inp-pn-b'), prA=num('inp-pr-a'), prB=num('inp-pr-b'), frA=num('inp-fr-a'), frB=num('inp-fr-b');
  var deltaN=pnA-pnB, deltaR=prA-prB;
  var maxAbs2=Math.max(Math.abs(deltaN),Math.abs(deltaR),1);
  var frecuenciaCae = frB>0 && frA<frB;

  var umbralDrill = document.getElementById('inp-umbral-drill').value===''? -5 : num('inp-umbral-drill');

  var subcausa=null, causaCorta='Completa las secciones anteriores.', palanca='—', dueno='—';
  var deviceLabel=null, categoryLabel=null, skuCount=0, showPlan=false, groups=[];
  var cats=[], anySku=false, categoryTopVar=null, resultado04a=null, resultado04b=null, resultado04c=null;
  var driverLbl = primary ? primary.label : 'Pedidos';
  var causaSecundaria = null, palancaSecundaria=null, duenoSecundaria=null, showPlanSecundario=false, groupsSecundario=[];

  var recurrentesProblema = deltaR<0 && deltaR<deltaN;
  var nuevosProblema = deltaN<0 && deltaN<=deltaR;
  var resultado04 = null;
  if(recurrentesProblema) resultado04 = 'La caída se concentra en clientes recurrentes ('+fmtNum(deltaR)+' pedidos vs. '+fmtNum(deltaN)+' en nuevos).';
  else if(nuevosProblema) resultado04 = 'La caída se concentra en clientes nuevos ('+fmtNum(deltaN)+' pedidos vs. '+fmtNum(deltaR)+' en recurrentes).';
  else if(deltaN!==0 || deltaR!==0) resultado04 = 'No hay una concentración clara entre nuevos y recurrentes.';

  subcausa = recurrentesProblema ? 'recurrentes' : (nuevosProblema ? 'nuevos' : null);

  if(subcausa==='recurrentes'){
    var deskVar=num('inp-device-desktop'), mobVar=num('inp-device-mobile');
    if(deskVar!==0 || mobVar!==0){ deviceLabel = deskVar<mobVar ? 'Desktop' : (mobVar<deskVar ? 'Mobile' : null); }
    resultado04a = deviceLabel ? ('El dispositivo más afectado es '+deviceLabel+'.') : ((deskVar!==0||mobVar!==0) ? 'Ningún dispositivo muestra una diferencia clara todavía.' : null);

    document.querySelectorAll('#cat-rows-container .cat-row').forEach(function(row){
      var cn = row.querySelector('.cat-name').value.trim();
      if(cn!==''){ var cv=parseFloat(row.querySelector('.cat-var').value); cats.push({name:cn, val:isNaN(cv)?0:cv}); }
    });
    if(cats.length){ cats.sort(function(a,b){return a.val-b.val;}); categoryTopVar=cats[0].val; if(cats[0].val<umbralDrill) categoryLabel=cats[0].name; }
    resultado04b = categoryLabel ? ('La categoría concentradora es '+categoryLabel+' (variación '+fmtPct(categoryTopVar)+').') : (cats.length ? 'Ninguna categoría supera el umbral mínimo definido.' : 'Todavía no cargaste categorías.');

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

  if(primary && primary.name==='aov'){
    var sub=document.getElementById('sel-aov-subcausa').value;
    if(sub==='mix'){ causaCorta='Ticket promedio — mix de categoría'; palanca='Revisar el peso de categorías de menor precio en el mix.'; }
    else if(sub==='promo'){ causaCorta='Ticket promedio — presión promocional'; palanca='Revisar profundidad y alcance de los descuentos activos.'; }
    else { causaCorta='Ticket promedio — falta de cross-sell'; palanca='Reforzar recomendaciones y bundles en el checkout.'; }
    dueno='Acción directa';

    if(subcausa==='recurrentes'){
      causaSecundaria = 'Además, los pedidos de clientes recurrentes cayeron ('+fmtNum(deltaR)+' vs. '+fmtNum(deltaN)+' en nuevos)'+(deviceLabel?' en '+deviceLabel.toLowerCase():'')+(categoryLabel?', dentro de '+categoryLabel:'')+' — podría ser una causa adicional de retención, independiente del ticket promedio.';
      var p2 = planRecurrentes(skuCount, deviceLabel, categoryLabel, frecuenciaCae);
      palancaSecundaria = p2.palanca; duenoSecundaria = p2.dueno; showPlanSecundario = p2.showPlan; groupsSecundario = p2.groups;
    } else if(subcausa==='nuevos'){
      causaSecundaria = 'Además, los pedidos de clientes nuevos cayeron ('+fmtNum(deltaN)+' vs. '+fmtNum(deltaR)+' en recurrentes) — podría ser una causa adicional de adquisición, independiente del ticket promedio.';
      palancaSecundaria = 'Revisar calidad e inversión de tráfico pago (Google/Meta) y SEO.';
      duenoSecundaria = 'Marketing — escalar';
    }
  } else if(subcausa==='recurrentes'){
    causaCorta = driverLbl+' — clientes recurrentes'+(deviceLabel?' — '+deviceLabel:'')+(categoryLabel?' — '+categoryLabel:'');
    var p = planRecurrentes(skuCount, deviceLabel, categoryLabel, frecuenciaCae);
    palanca=p.palanca; dueno=p.dueno; showPlan=p.showPlan; groups=p.groups;
  } else if(subcausa==='nuevos'){
    causaCorta=driverLbl+' — adquisición de clientes nuevos';
    palanca='Revisar calidad e inversión de tráfico pago (Google/Meta) y SEO.';
    dueno='Marketing — escalar';
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
    var frase1;
    if(primary){
      var othersHealthy = drivers.filter(function(d){return d.name!==primary.name;}).every(function(d){return d.val>=0;});
      frase1='La brecha de '+fmtMoney(Math.abs(brechaAbs))+' contra meta está explicada principalmente por '+driverWord(primary.name, canal)+(othersHealthy?', sin señales relevantes en los otros dos factores.':'.');
    } else {
      frase1='La brecha de '+fmtMoney(Math.abs(brechaAbs))+' contra meta se concentra en una caída de pedidos.';
    }
    var frases=[frase1];
    if(primary && primary.name==='aov'){
      if(causaSecundaria) frases.push(causaSecundaria);
    } else if(subcausa==='recurrentes'){
      var lugar='clientes recurrentes'+(deviceLabel?' en '+deviceLabel.toLowerCase():'')+(categoryLabel?', principalmente dentro de '+categoryLabel:'');
      frases.push('Los pedidos disminuyeron '+(primary?'por '+(primary.name==='cr'?driverWord('cr',canal):driverWord('sesiones',canal))+', ':'')+'concentrada en '+lugar+'.');
      if(skuCount>0){
        frases.push('Dentro de'+(categoryLabel?' '+categoryLabel:' la categoría analizada')+' se identificaron '+skuCount+' SKU'+(skuCount>1?'s':'')+' de alta demanda con disponibilidad reducida o agotada, mientras las sesiones crecían. Esto sugiere intención de compra con menor capacidad de convertirla.');
      }
    } else if(subcausa==='nuevos'){
      frases.push('El deterioro se concentra en la adquisición de clientes nuevos.');
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
      canalesList.push({name:n, delta:sa-sb, cr:cr, aov:aov});
    }
  });
  if(canalesList.length>0){
    canalesList.sort(function(a,b){ return a.delta-b.delta; });
    peorCanal = canalesList[0];
    peorCanal.perdidaEstimada = Math.abs(Math.min(peorCanal.delta,0))*(peorCanal.cr/100)*peorCanal.aov;
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
    deviceLabel:deviceLabel, categoryLabel:categoryLabel, skuCount:skuCount,
    causaCorta:causaCorta, palanca:palanca, dueno:dueno, notaValidar:notaValidar, narrativa:narrativa,
    showPlan:showPlan, groups:groups,
    resultado01:resultado01, resultado03:resultado03, resultado04:resultado04,
    resultado04a:resultado04a, resultado04b:resultado04b, resultado04c:resultado04c, causaSecundaria:causaSecundaria,
    palancaSecundaria:palancaSecundaria, duenoSecundaria:duenoSecundaria, showPlanSecundario:showPlanSecundario, groupsSecundario:groupsSecundario,
    peorCanal:peorCanal, peorPaseD:peorPaseD, peorPaseM:peorPaseM};
}

function setNote(id, text){
  var el = document.getElementById(id);
  if(text){ el.style.display='block'; el.textContent=text; } else { el.style.display='none'; }
}

function setBar(fillId,valId,value,maxAbs){
  var fill=document.getElementById(fillId), val=document.getElementById(valId);
  var pct=Math.min(100, Math.abs(value)/maxAbs*100);
  fill.style.width=pct+'%';
  fill.style.background = value<0 ? 'var(--danger)' : 'var(--accent)';
  val.textContent=fmtMoney(value);
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

var _lastChecklistDriver;
function renderChecklist(r){
  var driverName = r.primary ? r.primary.name : null;
  if(driverName === _lastChecklistDriver) return;
  _lastChecklistDriver = driverName;
  var el = document.getElementById('checklist-investigacion');
  if(!driverName){ el.innerHTML='<p style="margin:0;font-size:12.5px;color:var(--ink-muted);">Todavía no se detectó un driver dominante.</p>'; return; }
  var items = CHECKLISTS[driverName] || [];
  el.innerHTML = items.map(function(it){ return '<label class="chk-label"><input type="checkbox">'+it+'</label>'; }).join('');
}

function generarHipotesis(r){
  var hip=[];
  if(r.primary && r.primary.name==='cr'){
    if(r.deviceLabel) hip.push('La caída de conversión podría estar concentrada en '+r.deviceLabel.toLowerCase()+'.');
    if(r.categoryLabel) hip.push('Podría existir una categoría ('+r.categoryLabel+') con deterioro desproporcionado en conversión.');
    if(r.efSes>=0) hip.push('Podría haber un cambio en la calidad o el mix del tráfico, ya que las sesiones no cayeron.');
    if(r.skuCount>0) hip.push('La disponibilidad de stock podría explicar parte de la caída, dado que hay SKUs con más sesiones y menos add to cart.');
    if(!hip.length) hip.push('Podría existir un problema técnico o de fricción en algún paso del checkout.');
    if(r.peorPaseD || r.peorPaseM){
      var paseHip = 'El mayor quiebre del embudo de conversión ocurre en ';
      if(r.peorPaseM && (!r.peorPaseD || r.peorPaseM.r<r.peorPaseD.r)){ paseHip += 'Mobile ('+r.peorPaseM.s+').'; }
      else if(r.peorPaseD){ paseHip += 'Desktop ('+r.peorPaseD.s+').'; }
      hip.push(paseHip);
    }
  } else if(r.primary && r.primary.name==='sesiones'){
    hip.push('Podría existir una pérdida de tráfico o de adquisición.');
    if(r.subcausa==='nuevos') hip.push('Podría estar afectada la captación de clientes nuevos (fuentes, landing, SEO/paid).');
    if(r.peorCanal && r.peorCanal.delta<0){
      hip.push('La pérdida de tráfico se concentra en el canal '+r.peorCanal.name+' (caída de '+fmtNum(Math.abs(r.peorCanal.delta))+' sesiones).');
    }
  } else if(r.primary && r.primary.name==='aov'){
    if(r.subcausa==='recurrentes') hip.push('Independientemente del ticket promedio, podría haber un problema de retención: cayeron los pedidos de clientes recurrentes.');
    else if(r.subcausa==='nuevos') hip.push('Independientemente del ticket promedio, podría haber un problema de adquisición: cayeron los pedidos de clientes nuevos.');
    hip.push('Podría existir un cambio en el mix de productos o en las unidades por pedido.');
    hip.push('Podría haber más presión promocional sin una estrategia de cross-sell que la compense.');
  }
  if(r.subcausa==='recurrentes' && r.frecuenciaCae){
    hip.push('Podría existir un deterioro de recompra o del comportamiento posterior a la compra.');
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

  setBar('bar-ses','bar-ses-val',r.efSes,r.maxAbs1);
  setBar('bar-cr','bar-cr-val',r.efCR,r.maxAbs1);
  setBar('bar-aov','bar-aov-val',r.efAOV,r.maxAbs1);
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
  _lastHipKey=undefined; _lastChecklistDriver=undefined;
  recalc();
});

function crearFilaCategoria(){
  var div=document.createElement('div');
  div.className='subrow cat-row';
  div.innerHTML='<input type="text" class="cat-name" placeholder="Categoría"><input type="number" step="0.1" class="cat-var" placeholder="%"><button type="button" class="btn-row-remove">×</button>';
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
  if(r.causaSecundaria) lineas.push('4b. Hallazgo adicional: '+r.causaSecundaria);
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
  if(vista==='consolidada'){
    document.getElementById('consolidado-breakdown').style.display='block';
    renderConsolidado(historialFull);
    return;
  }
  document.getElementById('consolidado-breakdown').style.display='none';
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
  var snapshot={fecha:new Date().toISOString().slice(0,10), canal:r.canal, estado:r.estado, brechaPct:r.brechaPct,
    ventaActual:r.ventaActual, ventaEsperada:r.ventaEsperada,
    causa:r.causaCorta, palanca:r.palanca, dueno:r.dueno,
    impactoEsperado:num('inp-impacto'), impactoReal:null, fechaMedicion:txt('inp-fecha-medicion'),
    estadoValidacion:document.getElementById('sel-validacion').value, fuenteValidacion:txt('inp-fuente-validacion'),
    hipotesis:(txt('out-hipotesis-texto')==='—'?'':txt('out-hipotesis-texto')), aprendizaje:txt('inp-aprendizaje')};
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
  var idx = historial.findIndex(function(h){ return h.canal===canal; });
  if(idx===-1){
    btn.textContent='No hay lecturas en este canal';
  } else {
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
  var headers = ['fecha','canal','estado','brechaPct','ventaActual','ventaEsperada','causa','palanca','dueno','impactoEsperado','impactoReal','fechaMedicion','estadoValidacion','fuenteValidacion','hipotesis','aprendizaje'];
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

actualizarLabelsCanal();
aplicarModo();
recalc();
cargarHistorial();
