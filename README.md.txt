# Diagnóstico de Brecha de Ventas

Herramienta de diagnóstico de ecommerce para entender **por qué** la venta de un canal se desvía de su meta — y separar, con disciplina, lo que es un hecho matemático de lo que todavía es una hipótesis por validar.

No requiere backend, build ni dependencias: es HTML + CSS + JS puro. Se abre directo en el navegador o se despliega como sitio estático (por ejemplo, GitHub Pages).

---

## Si es tu primera vez: empezá por acá

1. Abrí `index.html` (o el link publicado).
2. Tocá **"Ver ejemplo"** para cargar un caso completo en los 4 canales de una — Ecommerce y App por detrás del ritmo, WhatsApp y Llamadas adelante — y ver cómo se ve la herramienta funcionando en ambos casos.
3. Tocá **"Limpiar ▾" → "Borrar este canal"** cuando quieras arrancar con tus propios datos.
4. O, mejor todavía: descargá la **plantilla CSV** (ver más abajo), abrila en Excel/Sheets, reemplazá los números de ejemplo por los tuyos, y volvé a importarla — carga los 4 canales de una sola vez.

El flujo completo de un diagnóstico es: elegís un canal arriba → llenás **Pacing** y **Nivel 1** con tus números → la herramienta calcula sola el resto → revisás **Nivel 2** y las **hipótesis** sugeridas → investigás → registrás lo que encontraste → guardás la lectura.

---

## Metodología

El diagnóstico va de lo más objetivo a lo más incierto, y la herramienta lo fuerza a propósito:

```
Pacing → Contexto → Diagnóstico Matemático (Nivel 1) → Señales (Nivel 2)
       → Hipótesis → Evidencia → Validación → Aprendizaje
```

Cuatro conceptos que la herramienta nunca deja mezclar:

- **Driver** — variable matemática que explica la brecha (Sesiones, CR o AOV). Sale de una fórmula, no es una opinión.
- **Señal** — comportamiento relevante detectado en Nivel 2 (dispositivo, categoría, SKU, funnel, canal de adquisición, nuevos/recurrentes). No es necesariamente una causa, es algo que llamó la atención.
- **Hipótesis** — explicación posible que conecta una o más señales con un mecanismo de negocio. Sigue siendo una teoría.
- **Causa** — una hipótesis, solo después de haber sido validada con evidencia real (un dato, un reporte, una prueba).

## Qué analiza cada parte

- **01 Pacing** — compara venta, pedidos y sesiones/interacciones acumuladas contra la meta del período, y te dice si vas en ritmo.
- **02 Contexto** — comparativos YoY y MoM, para saber si la caída es contra el mes pasado, contra el año pasado, o ambas.
- **03 Diagnóstico Matemático (Nivel 1)** — descompone la venta en Sesiones × CR × AOV y calcula cuánto de la brecha explica cada uno en pesos. Esto es el **driver**: un hecho, no una teoría.
- **04 Señales (Nivel 2)** — una vez que sabés QUÉ driver explica la brecha, acá buscás señales de POR QUÉ, **en las dos direcciones**: qué está cayendo (riesgo) y qué está creciendo (oportunidad), a partir de los mismos datos: nuevos vs. recurrentes, dispositivo (desktop/mobile), categoría, SKU y stock, funnel (Sesiones → PDP → Add to cart → Checkout → Compra) y canales de adquisición. Cuantas más de estas subsecciones llenes, más señales — de riesgo y de oportunidad — puede detectar la herramienta. Un mismo canal puede tener las dos cosas a la vez (por ejemplo, CR cayendo pero Sesiones creciendo) — la herramienta siempre muestra ambos bloques, no elige uno.
- **05 Hipótesis y causa** — con las señales detectadas, la herramienta arma hasta 3 hipótesis de riesgo por reglas ("Posibles hipótesis") y hasta 3 hipótesis de crecimiento ("Hipótesis de crecimiento") — mismo formato "si X, entonces Y, porque Z", pero la de riesgo apunta a investigar antes de actuar, y la de crecimiento apunta a empujar algo que ya mostró tracción real (más bajo riesgo, porque no declara una causa nueva, solo amplifica algo que ya está funcionando). Opcionalmente podés pedirle 3 a 5 hipótesis de riesgo más a la IA (Cohere) con las mismas reglas anti-invención (no inventa causas, no cierra el diagnóstico, prioriza Alta/Media/Baja sin fabricar porcentajes).
- **06 Aprendizaje** — qué creías, qué encontraste, qué funcionó — para el próximo diagnóstico.
- **Calculadora de impacto esperado** — parte de la brecha real ya calculada por driver y dos supuestos explícitos tuyos (% de la brecha que explica la causa, % que esperás recuperar), sin números inventados por la herramienta.
- **Asistente flotante (🤖)** — chat para repreguntar sobre el diagnóstico, en las dos direcciones: por qué algo cae y qué investigar, o por qué algo crece y qué palanca empujar. Si mencionás un canal ("¿qué probarías primero en ecommerce?"), analiza ese canal puntual; si no especificás ninguno, te da un resumen de los 4.
- **Vista Global** — pacing, pedidos, AOV ponderado, clientes nuevos/recurrentes e insights comparativos entre los 4 canales (Ecommerce, App, WhatsApp, Llamadas), sin mezclar sesiones con llamadas/mensajes. Cuando un canal va adelante de su meta sin ningún driver de Nivel 1 en negativo, el insight lo aclara: no es que "todo esté sano" sin explicación, es que la meta pedía más de lo que la tendencia actual da — o, si algo sí viene creciendo, identifica qué lo explica.
- **☰ Navegación flotante (esquina inferior izquierda)** — abre un menú para saltar directo a cualquier sección (Pacing, Contexto, Diagnóstico, Señales, Hipótesis, Aprendizaje, Historial) o volver arriba, sin scrollear a mano. El menú se adapta: muestra las secciones del canal cuando estás en uno, o las de Vista Global cuando estás ahí.
- **Historial** — lecturas guardadas por canal, con vista consolidada, patrones históricos, gráfico de evolución e import/export CSV.

## La plantilla CSV

El link **"↓ Descargar plantilla CSV"** (debajo de "Importar CSV") baja un archivo con **una fila completa por canal** (Ecommerce, App, WhatsApp, Llamadas), con datos de ejemplo que cubren Nivel 1 completo y varias señales de Nivel 2 distintas por canal (dispositivo, categoría, SKU/stock, funnel, canales de adquisición) — para que al importarla veas la herramienta generando diagnóstico, señales e hipótesis reales en los 4 canales, no solo pacing.

**Cómo usarla:**
1. Descargala y abrila en Excel o Google Sheets.
2. Reemplazá los valores de ejemplo por los tuyos. No hace falta llenar todas las columnas ni traer los 4 canales — la importación **solo carga los canales que sí vengan en el archivo** (identificados por la columna `canal`) y, dentro de cada canal, solo los campos que no dejes vacíos. Los canales que no incluyas quedan intactos.
3. Guardalo como CSV y tocá "Importar CSV" en la herramienta.

**La mayoría de las columnas son un valor por campo** (`meta`, `venta_actual`, `sesiones_actual`, `cr_actual`, etc. — los nombres son bastante descriptivos).

**Tres columnas son distintas porque representan listas** (categorías, SKUs y canales de adquisición pueden tener varias filas cada una). Van empaquetadas en una sola celda: cada fila separada por `;`, y los campos de cada fila separados por `:`.

| Columna | Formato de cada fila | Ejemplo |
|---|---|---|
| `categorias` | `nombre:variación%:impacto$` | `AETOPS:-21:120000;GLP1:-8:45000` |
| `skus` | `nombre:sesiones%:addtocart%:stock` (stock: `ok`, `bajo` o `agotado`) | `SKU-4521:15:-32:agotado;SKU-8832:9:-18:bajo` |
| `canales_adquisicion` | `canal:sesiones_base:sesiones_actual:conversiones:aov` | `Google Ads:210000:165000:3465:1950;Meta:150000:148000:2812:1820` |

No hace falta llenar las tres — si tu canal no tiene, por ejemplo, canales de adquisición desglosados, dejá esa celda vacía. El CR de cada canal (conversiones ÷ sesiones actuales) se calcula solo dentro de la app — no es una columna que cargues.

**Nota sobre Pacing:** "pedidos actual" y "sesiones actual" del pacing (sección 01) no son campos aparte — se toman automáticamente de lo que ya cargaste en Nivel 1 (sesiones) y Nivel 2 (pedidos totales, o nuevos + recurrentes si no cargaste el total). Solo cargás la meta de cada uno; el CSV tampoco tiene columnas `real_pedidos` ni `real_sesiones`.

## Cómo usarlo (instalación)

No hay instalación. Alcanza con abrir `index.html` en el navegador, o publicar la carpeta completa en cualquier hosting estático (GitHub Pages, Netlify, un servidor propio, etc.) — los tres archivos deben estar en la misma carpeta.

## Configurar el asistente de IA (Cohere)

1. Conseguí una API key en [dashboard.cohere.com](https://dashboard.cohere.com) (sección API Keys).
2. Abrí **⚙️ Ajustes** (arriba a la derecha en la app) y pegala ahí.
3. La key se guarda únicamente en el `localStorage` de tu navegador — nunca queda escrita en estos archivos ni se sube a ningún repositorio. Cada persona que use la herramienta necesita cargar la suya.

Este módulo (y el asistente flotante 🤖) es opcional: el resto de la herramienta (Nivel 1, Nivel 2, hipótesis por reglas, historial) funciona completo sin ninguna key. Ambos usan la misma key cargada en Ajustes.

**Importante si en algún momento pensás hardcodear una key real en el código:** no lo hagas. Cualquier texto en `script.js` es visible para quien abra "Ver código fuente" del sitio publicado, y si el archivo se versiona en Git, queda en el historial de commits aunque después lo borres. Si necesitás una key compartida para todo un equipo sin que cada quien cargue la suya, lo correcto es pasarla por un backend propio que llame a Cohere y nunca la exponga al navegador — no ponerla en estos archivos.

## Estructura de archivos

```
index.html    → estructura de la página
style.css     → estilos
script.js     → toda la lógica (cálculos, historial, hipótesis, integración con Cohere)
README.md     → este archivo
```

## Privacidad y datos

Todo corre en el navegador. Los datos que cargás (diagnóstico, historial, borradores por canal) se guardan en el `localStorage` del dispositivo — no hay servidor ni base de datos detrás. La única llamada de red que hace la herramienta es a la API de Cohere, y solo cuando usás explícitamente "Generar hipótesis con Cohere AI" o el asistente flotante.
