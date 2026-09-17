<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Diagnóstico de brecha de ventas (Omnicanal)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg-page:#F2F4F5; --bg-card:#FFFFFF; --border:#DCE1E4; --border-strong:#B7C0C6;
    --ink:#14202B; --ink-secondary:#55636F; --ink-muted:#8A97A1;
    --accent:#0E7A72; --accent-soft:#E1F1EF;
    --danger:#B0362E; --danger-soft:#F8E7E5;
    --warning:#A8710E; --warning-soft:#F6EDDB;
    --success:#29875A; --success-soft:#E4F2EA;
    --mono:'JetBrains Mono', ui-monospace, monospace;
    --sans:'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg-page);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;}
  .wrap{max-width:640px;margin:0 auto;padding:28px 20px 60px;}
  .top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;}
  .top h1{font-size:19px;font-weight:600;margin:0 0 4px;letter-spacing:-0.01em;}
  .top p{font-size:13px;color:var(--ink-secondary);margin:0;}
  
  /* Botones pequeños */
  .btn-sm{background:none;border:1px solid var(--border-strong);color:var(--ink-secondary);font-family:var(--sans);font-size:12px;padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;}
  .btn-sm:hover{border-color:var(--ink-muted);color:var(--ink);}
  .top-actions{display:flex;gap:8px;}

  .row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid var(--border);}
  .row:last-child{border-bottom:none;}
  .row label{font-size:13.5px;color:var(--ink-secondary);}
  .row input[type=number], .row input[type=text]{width:118px;text-align:right;font-family:var(--mono);font-size:14px;padding:7px 9px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-card);color:var(--ink);}
  .row input[type=date]{font-family:var(--sans);font-size:13px;padding:6px 8px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-card);color:var(--ink);}
  .row select{font-family:var(--sans);font-size:13.5px;padding:7px 9px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-card);color:var(--ink);max-width:200px;}
  .row input:focus, .row select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft);}
  .canal-row{margin-bottom:14px;}

  /* Input readonly para el modo Consolidado */
  .row input.readonly, .subrow input.readonly {background:#F9FAFB; color:var(--ink-muted); border-style:dashed; pointer-events:none;}
  select.readonly {background:#F9FAFB; color:var(--ink-muted); border-style:dashed; pointer-events:none;}

  .banner{border-radius:10px;padding:16px 18px;margin-bottom:8px;border:1px solid var(--border);}
  .banner-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;}
  .banner-estado{font-size:15px;font-weight:600;}
  .banner-brecha{font-family:var(--mono);font-size:22px;font-weight:600;}
  .banner-sub{font-size:12px;color:var(--ink-secondary);margin-top:6px;}
  .estado-danger{background:var(--danger-soft);}
  .estado-danger .banner-estado, .estado-danger .banner-brecha{color:var(--danger);}
  .estado-warning{background:var(--warning-soft);}
  .estado-warning .banner-estado, .estado-warning .banner-brecha{color:var(--warning);}
  .estado-success{background:var(--success-soft);}
  .estado-success .banner-estado, .estado-success .banner-brecha{color:var(--success);}
  .estado-muted{background:var(--bg-card);}
  .estado-muted .banner-estado, .estado-muted .banner-brecha{color:var(--ink-muted);}

  .section-head{display:flex;align-items:baseline;gap:9px;margin:34px 0 4px;}
  .section-num{font-family:var(--mono);color:var(--accent);font-size:13px;}
  .section-title{font-size:16px;font-weight:600;}
  .section-hint{font-size:12.5px;color:var(--ink-muted);margin:0 0 10px;}

  .help{margin:0 0 14px;}
  .help summary{cursor:pointer;font-size:12px;color:var(--accent);list-style:none;display:inline-flex;align-items:center;gap:5px;}
  .help summary::-webkit-details-marker{display:none;}
  .help summary::before{content:'?';display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;border:1px solid var(--accent);font-size:10px;flex-shrink:0;}
  .help[open] summary{margin-bottom:8px;}
  .help-body{font-size:12.5px;color:var(--ink-secondary);line-height:1.65;background:var(--bg-page);border-radius:8px;padding:11px 13px;}
  .help-body p{margin:0 0 8px;}
  .help-body p:last-child{margin-bottom:0;}
  .help-body b{color:var(--ink);font-weight:600;}
  .help.apoyo summary{color:var(--warning);}
  .help.apoyo summary::before{border-color:var(--warning);color:var(--warning);}

  .card{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:4px 16px;}

  .out{display:flex;align-items:center;justify-content:space-between;padding:9px 0;font-size:13.5px;}
  .out .v{font-family:var(--mono);font-weight:500;}
  .out .l{color:var(--ink-secondary);}

  .bars{margin:14px 0 6px;}
  .bar-row{margin-bottom:12px;}
  .bar-label{display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-secondary);margin-bottom:5px;}
  .bar-label .v{font-family:var(--mono);color:var(--ink);}
  .bar-track{background:var(--bg-page);border-radius:4px;height:8px;overflow:hidden;}
  .bar-fill{height:100%;border-radius:4px;width:0%;transition:width .2s ease;}

  .note{font-size:12.5px;padding:9px 11px;border-radius:6px;margin-top:10px;}
  .note-warning{background:var(--warning-soft);color:var(--warning);}
  .note-resultado{background:var(--accent-soft);color:var(--ink);}
  .note-muted{background:var(--bg-page);color:var(--ink-secondary);}

  .synth{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin-top:14px;}
  .synth .k{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-muted);margin:14px 0 3px;}
  .synth .k:first-child{margin-top:0;}
  .synth .v{font-size:14px;margin:0;line-height:1.6;color:var(--ink-secondary);}
  .synth .v.owner{font-size:14.5px;font-weight:600;color:var(--accent);}
  .synth .v.warn{color:var(--warning);}

  .badge-validacion{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.03em;padding:4px 9px;border-radius:5px;margin-bottom:12px;background:var(--warning-soft);color:var(--warning);}
  .badge-validacion.confirmada{background:var(--success-soft);color:var(--success);}
  .badge-validacion.rechazada{background:var(--danger-soft);color:var(--danger);}

  .apoyo-title{font-size:12px;font-weight:600;color:var(--warning);margin:0 0 8px;}
  .copiloto-block{margin-top:10px;}
  .chk-label{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;color:var(--ink-secondary);}
  .hip-label{display:flex;gap:8px;align-items:flex-start;padding:6px 0;font-size:13px;color:var(--ink-secondary);}
  .hip-label input{margin-top:3px;}
  textarea{font-family:var(--sans);font-size:13px;color:var(--ink);width:100%;border:1px solid var(--border-strong);border-radius:6px;padding:9px 10px;resize:vertical;}

  .btn-row{display:flex;gap:10px;margin-top:18px;}
  .btn-save{flex:1;background:var(--ink);color:#fff;border:none;border-radius:8px;padding:12px;font-family:var(--sans);font-size:14px;font-weight:500;cursor:pointer;}
  .btn-save:hover{background:#26343F;}
  .btn-copy{flex:1;background:var(--bg-card);color:var(--ink);border:1px solid var(--border-strong);border-radius:8px;padding:12px;font-family:var(--sans);font-size:14px;font-weight:500;cursor:pointer;}
  .btn-copy:hover{border-color:var(--ink-muted);}

  .hist-item{padding:10px 0;border-bottom:1px solid var(--border);font-size:12.5px;}
  .hist-item:last-child{border-bottom:none;}
  .hist-item .r1{display:flex;justify-content:space-between;align-items:center;}
  .hist-date{font-family:var(--mono);color:var(--ink-secondary);}
  .hist-mid{color:var(--ink-secondary);flex:1;padding:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .hist-brecha{font-family:var(--mono);font-weight:500;}
  .hist-impacto{font-size:11.5px;color:var(--ink-muted);margin-top:3px;}
  .empty-hist{font-size:12.5px;color:var(--ink-muted);padding:10px 0;}

  .thead{display:grid;grid-template-columns:1fr 58px 58px;gap:8px;padding:8px 0 6px;font-size:11px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.03em;}
  .thead.sku{grid-template-columns:1fr 50px 50px 78px;}
  .subrow{display:grid;grid-template-columns:1fr 58px 58px;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);}
  .subrow.sku{grid-template-columns:1fr 50px 50px 78px;}
  .subrow:last-child{border-bottom:none;}
  .subrow input[type=text]{width:100%;font-family:var(--sans);font-size:12.5px;padding:6px 7px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-card);color:var(--ink);text-align:left;}
  .subrow input[type=number]{width:100%;font-family:var(--mono);font-size:12.5px;padding:6px 5px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-card);color:var(--ink);text-align:right;}
  .subrow select{width:100%;font-family:var(--sans);font-size:11.5px;padding:6px 4px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-card);color:var(--ink);}

  .btn-add{background:none; border:none; color:var(--accent); font-size:12px; font-weight:600; cursor:pointer; padding:10px 0; display:inline-block;}
  .btn-add:hover{text-decoration:underline;}
  .btn-remove{background:none; border:none; color:var(--danger); cursor:pointer; font-size:14px; font-weight:bold;}

  .plan-group h4{font-size:13px;font-weight:600;margin:12px 0 4px;color:var(--ink);}
  .plan-group h4:first-child{margin-top:0;}
  .plan-group ul{margin:0 0 4px;padding-left:18px;font-size:12.5px;color:var(--ink-secondary);line-height:1.7;}
</style>
</head>
<body>
<div class="wrap">

  <div class="top">
    <div>
      <h1>Diagnóstico de brecha de ventas</h1>
      <p>Pacing → contexto → causa raíz → palanca</p>
    </div>
    <div class="top-actions">
      <input type="file" id="inp-csv" accept=".csv" style="display:none;">
      <button class="btn-sm" id="btn-import-csv">Importar CSV</button>
      <button class="btn-sm" id="btn-clear">Limpiar</button>
    </div>
  </div>

  <div class="row canal-row">
    <label>Canal</label>
    <select id="sel-canal" style="font-weight:600; color:var(--accent);">
      <option value="ecommerce" selected>Ecommerce</option>
      <option value="app">App</option>
      <option value="whatsapp">WhatsApp</option>
      <option value="llamadas">Llamadas</option>
      <option value="consolidado">🌐 Consolidado (General)</option>
    </select>
  </div>

  <div class="row canal-row">
    <label>Modo de ayuda</label>
    <select id="sel-modo">
      <option value="guia">🟢 Guía</option>
      <option value="ayuda" selected>🟡 Ayuda</option>
      <option value="copiloto">🔵 Copiloto</option>
    </select>
  </div>

  <div class="banner estado-muted" id="banner">
    <div class="banner-row">
      <span class="banner-estado" id="out-estado">Completa el pacing</span>
      <span class="banner-brecha" id="out-brecha-pct">—</span>
    </div>
    <p class="banner-sub" id="out-brecha-sub">Ingresa la meta y la venta a la fecha para ver el estado.</p>
  </div>

  <div class="section-head"><span class="section-num">01</span><span class="section-title">Pacing</span></div>
  <p class="section-hint">Brecha entre la venta real y el objetivo a la fecha.</p>
  <div class="card">
    <div class="row"><label>Meta del período ($)</label><input type="number" class="canal-data" id="inp-meta" placeholder="0"></div>
    <div class="row"><label>Días transcurridos</label><input type="number" class="canal-data shared-data" id="inp-dias-t" placeholder="0"></div>
    <div class="row"><label>Días totales del período</label><input type="number" class="canal-data shared-data" id="inp-dias-total" placeholder="0"></div>
    <div class="row"><label>Venta actual acumulada ($)</label><input type="number" class="canal-data" id="inp-venta-actual" placeholder="0"></div>
    <div class="row"><label>Umbral de riesgo (%)</label><input type="number" class="shared-data" id="inp-umbral" value="-5"></div>
  </div>
  <div class="out"><span class="l">Venta esperada a la fecha</span><span class="v" id="out-venta-esperada">$0</span></div>
  <div class="out"><span class="l">Brecha ($)</span><span class="v" id="out-brecha-abs">$0</span></div>
  <div class="note note-resultado" id="out-resultado-01" style="display:none;"></div>

  <div class="section-head"><span class="section-num">02</span><span class="section-title">Contexto</span></div>
  <p class="section-hint">YoY aísla estacionalidad; MoM detecta caídas operativas recientes.</p>
  <div class="card">
    <div class="row"><label>Venta mismo corte, año anterior ($)</label><input type="number" class="canal-data" id="inp-yoy-base" placeholder="0"></div>
    <div class="row"><label>Venta mismo corte, mes anterior ($)</label><input type="number" class="canal-data" id="inp-mom-base" placeholder="0"></div>
  </div>
  <div class="out"><span class="l">YoY</span><span class="v" id="out-yoy">—</span></div>
  <div class="out"><span class="l">MoM</span><span class="v" id="out-mom">—</span></div>
  <div class="note note-resultado" id="out-contexto-lectura" style="display:none;"></div>

  <div class="section-head"><span class="section-num">03</span><span class="section-title">Diagnóstico nivel 1</span></div>
  <p class="section-hint"><span class="ses-label">Sesiones</span> × <span class="cr-label">CR</span> × AOV. Compara contra:
    <select id="sel-periodo" class="shared-data" style="font-family:var(--sans);font-size:12.5px;padding:2px 6px;border:1px solid var(--border-strong);border-radius:5px;">
      <option value="mom">mes anterior</option>
      <option value="yoy">año anterior</option>
    </select>
  </p>
  <div class="card">
    <div class="row"><label><span class="ses-label">Sesiones</span> actuales</label><input type="number" class="canal-data" id="inp-ses-a" placeholder="0"></div>
    <div class="row"><label><span class="ses-label">Sesiones</span> <span class="periodo-txt">mes anterior</span></label><input type="number" class="canal-data" id="inp-ses-b" placeholder="0"></div>
    <div class="row"><label><span class="cr-label">CR</span> actual (%)</label><input type="number" step="0.01" class="canal-data" id="inp-cr-a" placeholder="0"></div>
    <div class="row"><label><span class="cr-label">CR</span> <span class="periodo-txt">mes anterior</span> (%)</label><input type="number" step="0.01" class="canal-data" id="inp-cr-b" placeholder="0"></div>
    <div class="row"><label>AOV actual ($)</label><input type="number" class="canal-data" id="inp-aov-a" placeholder="0"></div>
    <div class="row"><label>AOV <span class="periodo-txt">mes anterior</span> ($)</label><input type="number" class="canal-data" id="inp-aov-b" placeholder="0"></div>
  </div>
  <div class="bars">
    <div class="bar-row"><div class="bar-label"><span class="ses-label">Sesiones</span><span class="v" id="bar-ses-val">$0</span></div><div class="bar-track"><div class="bar-fill" id="bar-ses"></div></div></div>
    <div class="bar-row"><div class="bar-label"><span class="cr-label">CR</span><span class="v" id="bar-cr-val">$0</span></div><div class="bar-track"><div class="bar-fill" id="bar-cr"></div></div></div>
    <div class="bar-row"><div class="bar-label"><span>AOV</span><span class="v" id="bar-aov-val">$0</span></div><div class="bar-track"><div class="bar-fill" id="bar-aov"></div></div></div>
  </div>
  <div class="out"><span class="l">Driver principal</span><span class="v" id="out-driver">—</span></div>
  <div class="note note-warning" id="out-reconciliacion" style="display:none;"></div>
  <div class="note note-resultado" id="out-resultado-03" style="display:none;"></div>

  <div class="section-head"><span class="section-num">04</span><span class="section-title">Diagnóstico nivel 2</span></div>
  <p class="section-hint">Pedidos por tipo de cliente — adquisición vs. retención.</p>
  <div class="card">
    <div class="row"><label>Pedidos nuevos, actual</label><input type="number" class="canal-data" id="inp-pn-a" placeholder="0"></div>
    <div class="row"><label>Pedidos nuevos, base</label><input type="number" class="canal-data" id="inp-pn-b" placeholder="0"></div>
    <div class="row"><label>Pedidos recurrentes, actual</label><input type="number" class="canal-data" id="inp-pr-a" placeholder="0"></div>
    <div class="row"><label>Pedidos recurrentes, base</label><input type="number" class="canal-data" id="inp-pr-b" placeholder="0"></div>
    <div class="row"><label>Frecuencia (pedidos/cliente), actual</label><input type="number" step="0.01" class="canal-data" id="inp-fr-a" placeholder="0"></div>
    <div class="row"><label>Frecuencia, base</label><input type="number" step="0.01" class="canal-data" id="inp-fr-b" placeholder="0"></div>
  </div>
  <div class="bars">
    <div class="bar-row"><div class="bar-label"><span>Nuevos</span><span class="v" id="bar-n-val">$0</span></div><div class="bar-track"><div class="bar-fill" id="bar-n"></div></div></div>
    <div class="bar-row"><div class="bar-label"><span>Recurrentes</span><span class="v" id="bar-r-val">$0</span></div><div class="bar-track"><div class="bar-fill" id="bar-r"></div></div></div>
  </div>
  <div class="note note-warning" id="out-frecuencia-nota" style="display:none;">La base recurrente se está enfriando: la frecuencia bajó vs. el período de comparación.</div>
  <div class="note note-resultado" id="out-resultado-04" style="display:none;"></div>

  <div id="sec-device" style="display:none;">
    <div class="row" style="padding:14px 0 14px;">
      <label>Umbral mínimo de concentración (%)</label>
      <input type="number" class="shared-data" id="inp-umbral-drill" value="-5">
    </div>
    <div class="section-head"><span class="section-num">04a</span><span class="section-title">Dispositivo</span></div>
    <div class="card">
      <div class="row"><label>Variación <span class="cr-label">CR</span> — Desktop (%)</label><input type="number" step="0.1" class="canal-data" id="inp-device-desktop" placeholder="0"></div>
      <div class="row"><label>Variación <span class="cr-label">CR</span> — Mobile (%)</label><input type="number" step="0.1" class="canal-data" id="inp-device-mobile" placeholder="0"></div>
    </div>
    <div class="note note-resultado" id="out-resultado-04a" style="display:none;"></div>
  </div>

  <div id="sec-category" style="display:none;">
    <div class="section-head"><span class="section-num">04b</span><span class="section-title">Categorías Dinámicas</span></div>
    <div class="card">
      <div class="thead"><span>Categoría</span><span style="text-align:right;">Var. CR</span><span></span></div>
      <div id="cat-list">
        <!-- Filas dinámicas de categorías irán aquí -->
      </div>
      <button class="btn-add" id="btn-add-cat" onclick="addCatRow()">+ Agregar categoría</button>
    </div>
    <div class="note note-resultado" id="out-resultado-04b" style="display:none;"></div>
  </div>

  <div id="sec-sku" style="display:none;">
    <div class="section-head"><span class="section-num">04c</span><span class="section-title">SKUs Dinámicos</span></div>
    <div class="card">
      <div class="thead sku"><span>SKU</span><span style="text-align:right;">Δ Ses.</span><span style="text-align:right;">Δ Cart</span><span>Stock</span></div>
      <div id="sku-list">
        <!-- Filas dinámicas de SKUs irán aquí -->
      </div>
      <button class="btn-add" id="btn-add-sku" onclick="addSkuRow()">+ Agregar SKU</button>
    </div>
    <div class="note note-resultado" id="out-resultado-04c" style="display:none;"></div>
  </div>

  <div class="section-head"><span class="section-num">05</span><span class="section-title">Hipótesis y causa</span></div>
  <div class="card" id="aov-subcausa-card" style="display:none;">
    <div class="row"><label>¿Qué explica el AOV?</label>
      <select id="sel-aov-subcausa" class="canal-data">
        <option value="mix">Mix de categoría</option>
        <option value="promo">Presión promocional</option>
        <option value="crosssell">Falta de cross-sell</option>
      </select>
    </div>
  </div>

  <div class="card copiloto-block" id="hipotesis-checklist-wrap">
    <p class="apoyo-title">💡 Para investigar esta caída, revisá:</p>
    <div id="checklist-investigacion"></div>
  </div>

  <div class="card copiloto-block" id="hipotesis-lista-wrap">
    <p class="apoyo-title">🧪 Posibles hipótesis</p>
    <div id="hipotesis-lista"></div>
  </div>

  <div id="hipotesis-builder-wrap" class="copiloto-block">
    <button class="btn-copy" id="btn-construir-hipotesis" style="width:100%;">Ayúdame a construir la hipótesis</button>
    <div class="synth" id="hipotesis-output" style="display:none;">
      <p class="k" style="color:var(--warning);margin-top:0;">Hipótesis — por validar</p>
      <p class="v" id="out-hipotesis-texto">—</p>
    </div>
  </div>

  <div class="card" style="margin-top:12px;">
    <div class="row"><label>Estado de validación</label>
      <select id="sel-validacion" class="canal-data">
        <option value="pendiente">Pendiente</option>
        <option value="confirmada">Confirmada</option>
        <option value="rechazada">Rechazada</option>
      </select>
    </div>
    <div class="row"><label>Fuente de validación</label><input type="text" class="canal-data" id="inp-fuente-validacion" placeholder="ej. GA4, Abasto, CRM"></div>
  </div>

  <div class="synth">
    <div class="badge-validacion" id="badge-validacion">HIPÓTESIS — POR VALIDAR</div>
    <p class="k" style="margin-top:0;">Diagnóstico</p>
    <p class="v" id="out-narrativa">Completa las secciones anteriores.</p>
    <p class="k">Palanca sugerida</p>
    <p class="v" id="out-palanca">—</p>
    <p class="k">Dueño de la acción</p>
    <p class="v owner" id="out-dueno">—</p>
  </div>
  <div class="card plan-group" id="plan-accion" style="display:none;margin-top:12px;"></div>
  <div class="card plan-group" id="plan-general" style="display:none;margin-top:12px;"></div>

  <div class="card" style="margin-top:12px;">
    <div class="row"><label>Impacto esperado ($)</label><input type="number" class="canal-data" id="inp-impacto" placeholder="0"></div>
    <div class="row"><label>Fecha de medición</label><input type="date" class="canal-data shared-data" id="inp-fecha-medicion"></div>
    <div class="row"><label>Impacto real ($)</label><input type="number" class="canal-data" id="inp-impacto-real" placeholder="0"></div>
  </div>

  <div class="section-head"><span class="section-num">06</span><span class="section-title">Aprendizaje</span></div>
  <div class="card">
    <textarea id="inp-aprendizaje" class="canal-data" rows="3" placeholder="Qué creíamos / qué encontramos..."></textarea>
  </div>

  <div class="btn-row">
    <button class="btn-save" id="btn-save">Guardar lectura</button>
    <button class="btn-copy" id="btn-copy">Copiar diagnóstico</button>
  </div>

  <div class="section-head"><span class="section-num">↺</span><span class="section-title">Historial</span></div>
  <div class="card" id="chart-container" style="margin-bottom:10px;padding:12px 10px;">
    <div class="empty-hist">Guardá al menos 2 lecturas para ver la tendencia.</div>
  </div>
  <div class="card" id="historial-list">
    <div class="empty-hist">Todavía no guardaste ninguna lectura.</div>
  </div>
  <button class="btn-copy" id="btn-export-historial" style="width:100%;margin-top:10px;">Exportar Historial completo (CSV)</button>

</div>

<script>
// --- ESTADO OMNICANAL (Punto 5) ---
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

// --- FILAS DINÁMICAS (Punto 2) ---
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
  // Guardar dinámicos
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
      // Shared data (like dates, thresholds) aren't erased if empty in the new channel, unless explicitly overwritten
      if (el.classList.contains('shared-data') && !d[el.id]) return; 
      el.value = d[el.id] || '';
    });
    // Cargar dinámicos
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
    if(!d || !d['inp-meta']) return; // Skip empty channels
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

  // Promedios ponderados
  document.getElementById('inp-cr-a').value = agg.sesA > 0 ? ((agg.pedA / agg.sesA) * 100).toFixed(2) : '';
  document.getElementById('inp-cr-b').value = agg.sesB > 0 ? ((agg.pedB / agg.sesB) * 100).toFixed(2) : '';
  document.getElementById('inp-aov-a').value = agg.pedA > 0 ? (agg.venta / agg.pedA).toFixed(2) : '';
  document.getElementById('inp-aov-b').value = agg.pedB > 0 ? (agg.ventaB / agg.pedB).toFixed(2) : '';
  
  // Limpiar drill-downs específicos
  document.getElementById('cat-list').innerHTML = '';
  document.getElementById('sku-list').innerHTML = '';
}

function toggleReadOnly(isReadOnly) {
  document.querySelectorAll('.canal-data, .canal-data-dynamic').forEach(el => {
    if(el.id === 'inp-aprendizaje') return; // Dejar editable para escribir conclusión
    el.readOnly = isReadOnly;
    el.disabled = isReadOnly && el.tagName === 'SELECT';
    if(isReadOnly) el.classList.add('readonly');
    else el.classList.remove('readonly');
  });
  document.getElementById('btn-add-cat').style.display = isReadOnly ? 'none' : 'inline-block';
  document.getElementById('btn-add-sku').style.display = isReadOnly ? 'none' : 'inline-block';
  document.getElementById('btn-import-csv').style.display = isReadOnly ? 'none' : 'inline-block';
}

// --- IMPORTACIÓN CSV (Punto 1) ---
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

  var resultado01 = null;
  if(pctTiempo>0 && meta>0){
    var cierreProyectado = ventaActual/pctTiempo;
    var cierrePct = cierreProyectado/meta*100;
    resultado01 = 'Al ritmo actual, vas a cerrar en '+fmtMoney(cierreProyectado)+' ('+cierrePct.toFixed(0)+'% meta).';
  }

  var yoyBase=num('inp-yoy-base'), momBase=num('inp-mom-base');
  var yoyPct = yoyBase>0 ? ((ventaActual/yoyBase)-1)*100 : null;
  var momPct = momBase>0 ? ((ventaActual/momBase)-1)*100 : null;
  var lecturaContexto='';
  if(yoyPct!==null && momPct!==null){
    lecturaContexto='Con YoY '+fmtPct(yoyPct)+' y MoM '+fmtPct(momPct)+'.';
  }

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
  var frecuenciaCae = frB>0 && frA<frB;

  var umbralDrill = document.getElementById('inp-umbral-drill').value===''? -5 : num('inp-umbral-drill');
  var subcausa=null, causaCorta='Analizando...', palanca='—', dueno='—';
  var deviceLabel=null, categoryLabel=null, skuCount=0;
  
  var recurrentesProblema = deltaR<0 && deltaR<deltaN;
  var nuevosProblema = deltaN<0 && deltaN<=deltaR;
  subcausa = recurrentesProblema ? 'recurrentes' : (nuevosProblema ? 'nuevos' : null);

  if(subcausa==='recurrentes'){
    var deskVar=num('inp-device-desktop'), mobVar=num('inp-device-mobile');
    if(deskVar!==0 || mobVar!==0){ deviceLabel = deskVar<mobVar ? 'Desktop' : (mobVar<deskVar ? 'Mobile' : null); }

    let cats = [];
    document.querySelectorAll('.cat-row').forEach(r => {
      let cn=r.querySelector('.cat-name').value, cv=parseFloat(r.querySelector('.cat-var').value);
      if(cn && !isNaN(cv)) cats.push({name:cn, val:cv});
    });
    if(cats.length){ cats.sort((a,b)=>a.val-b.val); if(cats[0].val<umbralDrill) categoryLabel=cats[0].name; }

    document.querySelectorAll('.sku-row').forEach(r => {
      let sv=parseFloat(r.querySelector('.sku-ses').value), cv=parseFloat(r.querySelector('.sku-cart').value), st=r.querySelector('.sku-stock').value;
      if(!isNaN(sv) && sv>Math.abs(umbralDrill) && cv<0 && st!=='ok') skuCount++;
    });
  }

  if(primary && primary.name==='aov'){
    causaCorta='Ticket promedio afectado'; palanca='Revisar mix o promociones'; dueno='Comercial';
  } else if(subcausa==='recurrentes'){
    causaCorta='Caída en retención/recurrentes'; palanca='Analizar CRM y Abasto'; dueno='CRM/Abasto';
  } else if(subcausa==='nuevos'){
    causaCorta='Caída en adquisición/nuevos'; palanca='Revisar tráfico pagado/SEO'; dueno='Marketing';
  } else {
    causaCorta='Sin driver claro'; palanca='Completar secciones para diagnóstico';
  }

  return {canal:canal, meta:meta, ventaActual:ventaActual, ventaEsperada:ventaEsperada, brechaAbs:brechaAbs, brechaPct:brechaPct,
    estado:estado, estadoClass:estadoClass, efSes:efSes, efCR:efCR, efAOV:efAOV, maxAbs1:maxAbs1, deltaN:deltaN, deltaR:deltaR, maxAbs2:maxAbs2,
    causaCorta:causaCorta, palanca:palanca, dueno:dueno, primary:primary, subcausa:subcausa, frecuenciaCae:frecuenciaCae};
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

// --- GUARDADO LOCAL Y EXPORTACIÓN (Puntos 3 y 4) ---
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

// Init
addCatRow(); addSkuRow();
saveCurrentChannelData();
recalc();
cargarHistorial();
</script>
</body>
</html>
