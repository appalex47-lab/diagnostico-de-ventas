// --- ESTADO OMNICANAL ---
var channelState = {
  ecommerce: {}, app: {}, whatsapp: {}, llamadas: {}
};
var currentChannel = 'ecommerce';

// --- UTILIDADES ---
function num(id){ var el=document.getElementById(id); var v=parseFloat(el.value); return isNaN(v)?0:v; }
function numFromStr(str){ var v=parseFloat(str); return isNaN(v)?0:v; }
function txt(id){ return document.getElementById(id).value.trim(); }
function fmtMoney(n){ var s=n<0?'-':''; return s+'$'+Math.round(Math.abs(n)).toLocaleString('es-ES'); }
function fmtPct(n){ return (n>=0?'+':'')+n.toFixed(1)+'%'; }
function fmtNum(n){ return Math.round(n).toLocaleString('es-ES'); }

var LEVERS = {
  abasto:['Identificar los SKUs con stock bajo o agotado','Confirmar fechas de resurtido','Priorizar productos con mayor demanda'],
  digital:['Mostrar alternativas mientras se resuelve el stock','Mejorar recomendaciones de sustitutos','Revisar flujo en mobile'],
  crm:['Identificar clientes afectados','Activar comunicación cuando vuelva el producto','Sugerir sustitutos relevantes']
};
var LEVER_NAMES = {abasto:'Abasto', digital:'Producto digital', crm:'CRM'};
var CANAL_NAMES = {ecommerce:'Ecommerce', app:'App', whatsapp:'WhatsApp', llamadas:'Llamadas', consolidado:'Consolidado'};
var CHECKLISTS = {
  cr:['Dispositivo','Categoría','Tráfico/fuente','Búsqueda','PDP','Checkout','Disponibilidad','Precio'],
  sesiones:['Volumen','Fuente/medio','Calidad de tráfico','Canal','Landing','SEO','Paid media'],
  aov:['Mix de productos','Unidades por pedido','Bundles','Upsell','Precio']
};

function canalEsDirecto(canal){ return canal==='llamadas' || canal==='whatsapp'; }
function driverWord(name, canal){
  var d = canalEsDirecto(canal);
  if(name==='sesiones') return d ? 'una caída de interacciones' : 'una caída de tráfico';
  if(name==='cr') return d ? 'una caída en la tasa de cierre' : 'una caída de conversión';
  return 'una caída del ticket promedio';
}

// --- FILAS DINÁMICAS ---
function addCatRow(name='', val='') {
  var id = Date.now() + Math.random().toString().slice(2,5);
  var html = `<div class="subrow cat-row" id="cat-${id}">
    <input type="text" class="cat-name canal-data-dynamic" placeholder="Categoría" value="${name}">
    <input type="number" step="0.1" class="cat-var canal-data-dynamic" placeholder="%" value="${val}">
    <button class="btn-remove" onclick="document.getElementById('cat-${id}').remove(); recalc();">×</button>
  </div>`;
  document.getElementById('cat-list').insertAdjacentHTML('beforeend', html);
  attachListeners(document.getElementById(`cat-${id}`));
}

function addSkuRow(name='', ses='', cart='', stock='ok') {
  var id = Date.now() + Math.random().toString().slice(2,5);
  var html = `<div class="subrow sku sku-row" id="sku-${id}">
    <input type="text" class="sku-name canal-data-dynamic" placeholder="SKU" value="${name}">
    <input type="number" step="1" class="sku-ses canal-data-dynamic" placeholder="%" value="${ses}">
    <input type="number" step="1" class="sku-cart canal-data-dynamic" placeholder="%" value="${cart}">
    <select class="sku-stock canal-data-dynamic">
      <option value="ok" ${stock==='ok'?'selected':''}>OK</option>
      <option value="bajo" ${stock==='bajo'?'selected':''}>Bajo</option>
      <option value="agotado" ${stock==='agotado'?'selected':''}>Agotado</option>
    </select>
    <button class="btn-remove" style="grid-column: span 4; text-align:right;" onclick="document.getElementById('sku-${id}').remove(); recalc();">Quitar</button>
  </div>`;
  document.getElementById('sku-list').insertAdjacentHTML('beforeend', html);
  attachListeners(document.getElementById(`sku-${id}`));
}

// --- GESTIÓN DE DATOS OMNICANAL ---
function saveCurrentChannelData() {
  if (currentChannel === 'consolidado') return; 
  document.querySelectorAll('.canal-data').forEach(el => {
    channelState[currentChannel][el.id] = el.value;
  });
  
  let cats = [];
  document.querySelectorAll('.cat-row').forEach(r => {
    cats.push({ name: r.querySelector('.cat-name').value, val: r.querySelector('.cat-var').value });
  });
  channelState[currentChannel]['cats'] = cats;

  let skus = [];
  document.querySelectorAll('.sku-row').forEach(r => {
    skus.push({ name: r.querySelector('.sku-name').value, ses: r.querySelector('.sku-ses').value, cart: r.querySelector('.sku-cart').value, stock: r.querySelector('.sku-stock').value });
  });
  channelState[currentChannel]['skus'] = skus;
}

function loadChannelData(channel) {
  if (channel === 'consolidado') {
    aggregateConsolidatedData();
    toggleReadOnly(true);
  } else {
    toggleReadOnly(false);
    let d = channelState[channel];
    document.querySelectorAll('.canal-data').forEach(el => {
      if (el.classList.contains('shared-data') && !d[el.id]) return; 
      el.value = d[el.id] || '';
    });
    document.getElementById('cat-list').innerHTML = '';
    (d['cats'] || []).forEach(c => addCatRow(c.name, c.val));
    document.getElementById('sku-list').innerHTML = '';
    (d['skus'] || []).forEach(s => addSkuRow(s.name, s.ses, s.cart, s.stock));
  }
}

function aggregateConsolidatedData() {
  let agg = { meta:0, venta:0, yoy:0, mom:0, sesA:0, sesB:0, pedA:0, pedB:0, ventaB:0, pnA:0, pnB:0, prA:0, prB:0 };
  ['ecommerce','app','whatsapp','llamadas'].forEach(ch => {
    let d = channelState[ch];
    if(!d || !d['inp-meta']) return;
    agg.meta += numFromStr(d['inp-meta']);
    agg.venta += numFromStr(d['inp-venta-actual']);
    agg.yoy += numFromStr(d['inp-yoy-base']);
    agg.mom += numFromStr(d['inp-mom-base']);
    agg.sesA += numFromStr(d['inp-ses-a']);
    agg.sesB += numFromStr(d['inp-ses-b']);
    agg.pnA += numFromStr(d['inp-pn-a']);
    agg.pnB += numFromStr(d['inp-pn-b']);
    agg.prA += numFromStr(d['inp-pr-a']);
    agg.prB += numFromStr(d['inp-pr-b']);
    
    let crA = numFromStr(d['inp-cr-a'])/100;
    let crB = numFromStr(d['inp-cr-b'])/100;
    let pedA = numFromStr(d['inp-ses-a']) * crA;
    let pedB = numFromStr(d['inp-ses-b']) * crB;
    agg.pedA += pedA;
    agg.pedB += pedB;
    agg.ventaB += (pedB * numFromStr(d['inp-aov-b']));
  });

  document.getElementById('inp-meta').value = agg.meta || '';
  document.getElementById('inp-venta-actual').value = agg.venta || '';
  document.getElementById('inp-yoy-base').value = agg.yoy || '';
  document.getElementById('inp-mom-base').value = agg.mom || '';
  document.getElementById('inp-ses-a').value = agg.sesA || '';
  document.getElementById('inp-ses-b').value = agg.sesB || '';
  document.getElementById('inp-pn-a').value = agg.pnA || '';
  document.getElementById('inp-pn-b').value = agg.pnB || '';
  document.getElementById('inp-pr-a').value = agg.prA || '';
  document.getElementById('inp-pr-b').value = agg.prB || '';

  document.getElementById('inp-cr-a').value = agg.sesA > 0 ? ((agg.pedA / agg.sesA) * 100).toFixed(2) : '';
  document.getElementById('inp-cr-b').value = agg.sesB > 0 ? ((agg.pedB / agg.sesB) * 100).toFixed(2) : '';
  document.getElementById('inp-aov-a').value = agg.pedA > 0 ? (agg.venta / agg.pedA).toFixed(2) : '';
  document.getElementById('inp-aov-b').value = agg.pedB > 0 ? (agg.ventaB / agg.pedB).toFixed(2) : '';
  
  document.getElementById('cat-list').innerHTML = '';
  document.getElementById('sku-list').innerHTML = '';
}

function toggleReadOnly(isReadOnly) {
  document.querySelectorAll('.canal-data, .canal-data-dynamic').forEach(el => {
    if(el.id === 'inp-aprendizaje') return;
    el.readOnly = isReadOnly;
    el.disabled = isReadOnly && el.tagName === 'SELECT';
    if(isReadOnly) el.classList.add('readonly');
    else el.classList.remove('readonly');
  });
  document.getElementById('btn-add-cat').style.display = isReadOnly ? 'none' : 'inline-block';
  document.getElementById('btn-add-sku').style.display = isReadOnly ? 'none' : 'inline-block';
  document.getElementById('btn-import-csv').style.display = isReadOnly ? 'none' : 'inline-block';
}

// --- IMPORTACIÓN CSV ---
document.getElementById('btn-import-csv').addEventListener('click', () => document.getElementById('inp-csv').click());
document.getElementById('inp-csv').addEventListener('change', function(e) {
  let file = e.target.files[0];
  if(!file) return;
  let reader = new FileReader();
  reader.onload = function(evt) {
    let lines = evt.target.result.split('\n');
    lines.forEach(line => {
      let parts = line.split(',');
      if(parts.length >= 2) {
        let id = parts[0].trim(), val = parts[1].trim();
        let el = document.getElementById(id);
        if(el) el.value = val;
      }
    });
    if(currentChannel !== 'consolidado') saveCurrentChannelData();
    recalc();
  };
  reader.readAsText(file);
});

// --- LÓGICA CORE DE CÁLCULO ---
function computeAll(){
  var canal = currentChannel;
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

  var yoyBase=num('inp-yoy-base'), momBase=num('inp-mom-base');
  var yoyPct = yoyBase>0 ? ((ventaActual/yoyBase)-1)*100 : null;
  var momPct = momBase>0 ? ((ventaActual/momBase)-1)*100 : null;

  var sesA=num('inp-ses-a'), sesB=num('inp-ses-b'), crA=num('inp-cr-a'), crB=num('inp-cr-b'), aovA=num('inp-aov-a'), aovB=num('inp-aov-b');
  var efSes=(sesA-sesB)*(crB/100)*aovB;
  var efCR=sesA*((crA-crB)/100)*aovB;
  var efAOV=sesA*(crA/100)*(aovA-aovB);
  
  var drivers=[{name:'sesiones',label:sesLabel,val:efSes},{name:'cr',label:crLabel,val:efCR},{name:'aov',label:'AOV',val:efAOV}];
  var sorted=drivers.slice().sort((a,b)=>a.val-b.val);
  var primary = sorted[0].val<0 ? sorted[0] : null;
  var maxAbs1=Math.max(Math.abs(efSes),Math.abs(efCR),Math.abs(efAOV),1);

  var pnA=num('inp-pn-a'), pnB=num('inp-pn-b'), prA=num('inp-pr-a'), prB=num('inp-pr-b'), frA=num('inp-fr-a'), frB=num('inp-fr-b');
  var deltaN=pnA-pnB, deltaR=prA-prB;
  var maxAbs2=Math.max(Math.abs(deltaN),Math.abs(deltaR),1);
  
  var umbralDrill = document.getElementById('inp-umbral-drill').value===''? -5 : num('inp-umbral-drill');
  var subcausa=null, causaCorta='Analizando...', palanca='—', dueno='—';
  
  var recurrentesProblema = deltaR<0 && deltaR<deltaN;
  var nuevosProblema = deltaN<0 && deltaN<=deltaR;
  subcausa = recurrentesProblema ? 'recurrentes' : (nuevosProblema ? 'nuevos' : null);

  if(primary && primary.name==='aov'){
    causaCorta='Ticket promedio afectado'; palanca='Revisar mix o promociones'; dueno='Comercial';
  } else if(subcausa==='recurrentes'){
    causaCorta='Caída en retención/recurrentes'; palanca='Analizar CRM y Abasto'; dueno='CRM/Abasto';
  } else if(subcausa==='nuevos'){
    causaCorta='Caída en adquisición/nuevos'; palanca='Revisar tráfico pagado/SEO'; dueno='Marketing';
  } else {
    causaCorta='Sin driver claro'; palanca='Completar secciones para diagnóstico';
  }

  return {canal:canal, ventaEsperada:ventaEsperada, brechaAbs:brechaAbs, brechaPct:brechaPct, estado:estado, estadoClass:estadoClass, 
          efSes:efSes, efCR:efCR, efAOV:efAOV, maxAbs1:maxAbs1, deltaN:deltaN, deltaR:deltaR, maxAbs2:maxAbs2,
          causaCorta:causaCorta, palanca:palanca, dueno:dueno, primary:primary, subcausa:subcausa};
}

function setBar(fillId,valId,value,maxAbs){
  var fill=document.getElementById(fillId), val=document.getElementById(valId);
  fill.style.width=Math.min(100, Math.abs(value)/maxAbs*100)+'%';
  fill.style.background = value<0 ? 'var(--danger)' : 'var(--accent)';
  val.textContent=fmtMoney(value);
}

function recalc(){
  var r=computeAll();
  var banner=document.getElementById('banner');
  banner.className='banner '+r.estadoClass;
  document.getElementById('out-estado').textContent=r.estado;
  document.getElementById('out-brecha-pct').textContent=r.brechaPct===null?'—':fmtPct(r.brechaPct);
  document.getElementById('out-venta-esperada').textContent=fmtMoney(r.ventaEsperada);
  document.getElementById('out-brecha-abs').textContent=fmtMoney(r.brechaAbs);

  setBar('bar-ses','bar-ses-val',r.efSes,r.maxAbs1);
  setBar('bar-cr','bar-cr-val',r.efCR,r.maxAbs1);
  setBar('bar-aov','bar-aov-val',r.efAOV,r.maxAbs1);
  document.getElementById('out-driver').textContent = r.primary ? r.primary.label : 'Sin driver negativo';

  setBar('bar-n','bar-n-val',r.deltaN,r.maxAbs2);
  setBar('bar-r','bar-r-val',r.deltaR,r.maxAbs2);

  var showDrill = r.subcausa==='recurrentes';
  ['sec-device','sec-category','sec-sku'].forEach(id => document.getElementById(id).style.display = showDrill ? 'block':'none');
  
  document.getElementById('out-narrativa').textContent = r.causaCorta;
  document.getElementById('out-palanca').textContent = r.palanca;
  document.getElementById('out-dueno').textContent = r.dueno;
}

// --- EVENTOS BASE ---
function attachListeners(container) {
  container.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', function() {
      if(currentChannel !== 'consolidado') saveCurrentChannelData();
      recalc();
    });
  });
}
attachListeners(document);

document.getElementById('sel-canal').addEventListener('change', function(){
  currentChannel = this.value;
  loadChannelData(currentChannel);
  recalc();
  cargarHistorial();
});

document.getElementById('sel-modo').addEventListener('change', function(){
  var modo = this.value;
  document.getElementById('hipotesis-checklist-wrap').style.display = modo==='guia' ? 'none' : 'block';
  document.getElementById('hipotesis-lista-wrap').style.display = modo==='guia' ? 'none' : 'block';
  document.getElementById('hipotesis-builder-wrap').style.display = modo==='copiloto' ? 'block' : 'none';
});

document.getElementById('btn-clear').addEventListener('click', function(){
  document.querySelectorAll('input').forEach(el => el.value='');
  document.getElementById('cat-list').innerHTML='';
  document.getElementById('sku-list').innerHTML='';
  if(currentChannel !== 'consolidado') saveCurrentChannelData();
  recalc();
});

// --- GUARDADO LOCAL Y EXPORTACIÓN ---
function getHistorial() {
  return JSON.parse(localStorage.getItem('historial-diagnostico') || '[]');
}

function cargarHistorial(){
  var historial = getHistorial().filter(h => h.canal === currentChannel);
  var list=document.getElementById('historial-list');
  if(!historial.length){ list.innerHTML='<div class="empty-hist">Todavía no guardaste lecturas en este canal.</div>'; return; }
  list.innerHTML = historial.map(h => `<div class="hist-item"><div class="r1"><span class="hist-date">${h.fecha}</span><span class="hist-mid">${h.causa}</span><span class="hist-brecha">${h.brechaPct!==null?fmtPct(h.brechaPct):'—'}</span></div></div>`).join('');
}

document.getElementById('btn-save').addEventListener('click', function(){
  var r=computeAll();
  var snap={fecha:new Date().toISOString().slice(0,10), canal:r.canal, brechaPct:r.brechaPct, causa:r.causaCorta, palanca:r.palanca, dueno:r.dueno, impactoEsperado:num('inp-impacto')};
  var hist = getHistorial();
  hist.unshift(snap);
  localStorage.setItem('historial-diagnostico', JSON.stringify(hist.slice(0,50)));
  cargarHistorial();
  this.textContent='Lectura guardada';
  setTimeout(()=>this.textContent='Guardar lectura', 2000);
});

document.getElementById('btn-copy').addEventListener('click', function(){
  var r=computeAll();
  navigator.clipboard.writeText(`Canal: ${CANAL_NAMES[r.canal]}\nBrecha: ${fmtPct(r.brechaPct)}\nCausa: ${r.causaCorta}\nPalanca: ${r.palanca}`);
  this.textContent='Copiado'; setTimeout(()=>this.textContent='Copiar diagnóstico', 2000);
});

document.getElementById('btn-export-historial').addEventListener('click', function(){
  let hist = getHistorial();
  if(!hist.length) return alert("No hay historial para exportar.");
  let csv = "Fecha,Canal,BrechaPct,Causa,Palanca,Dueño,ImpactoEsperado\n";
  hist.forEach(h => csv += `${h.fecha},${h.canal},${h.brechaPct||''},"${h.causa}","${h.palanca}","${h.dueno}",${h.impactoEsperado||''}\n`);
  let a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], {type: "text/csv"}));
  a.download = "historial_ventas.csv";
  a.click();
});

// Inicialización de la app
addCatRow(); addSkuRow();
saveCurrentChannelData();
recalc();
cargarHistorial();