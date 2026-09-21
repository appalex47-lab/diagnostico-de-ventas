# Diagnóstico de Brecha de Ventas

Herramienta de diagnóstico de ecommerce para entender **por qué** la venta de un canal se desvía de su meta — y separar, con disciplina, lo que es un hecho matemático de lo que todavía es una hipótesis por validar.

No requiere backend, build ni dependencias: es HTML + CSS + JS puro. Se abre directo en el navegador o se despliega como sitio estático (por ejemplo, GitHub Pages).

## Metodología

El flujo del diagnóstico va de lo más objetivo a lo más incierto, y la herramienta lo fuerza a propósito:

```
Pacing → Contexto → Diagnóstico Matemático (Nivel 1) → Señales (Nivel 2)
       → Hipótesis → Evidencia → Validación → Aprendizaje
```

Cuatro conceptos que la herramienta nunca deja mezclar:

- **Driver** — variable matemática que explica la brecha (Sesiones, CR o AOV).
- **Señal** — comportamiento relevante detectado en Nivel 2 (no es necesariamente una causa).
- **Hipótesis** — explicación posible que conecta una o más señales con un mecanismo de negocio.
- **Causa** — una hipótesis, solo después de haber sido validada con evidencia real.

## Funcionalidades

- **Pacing** de venta, pedidos y sesiones/interacciones contra la meta del período, con período compartido entre canales.
- **Nivel 1** — descomposición matemática Sesiones × CR × AOV, con el driver principal e impacto económico de cada uno.
- **Nivel 2** — señales de clientes nuevos/recurrentes, dispositivo, categoría, SKU/stock, funnel y canales de adquisición.
- **Hipótesis**: motor basado en reglas (a partir de las señales detectadas) + un asistente de IA opcional (Cohere) que propone hipótesis adicionales con las mismas reglas anti-invención (no determina causas, no inventa eventos no observados, prioriza Alta/Media/Baja sin fabricar porcentajes de probabilidad).
- **Asistente flotante (🤖, esquina inferior derecha)** — chat para repreguntar sobre el diagnóstico. Si mencionás un canal en la pregunta ("¿qué probarías primero en ecommerce?"), analiza los datos de ese canal puntual, sin que tengas que cambiar el selector; si no especificás ninguno, te da un resumen comparativo de los 4. Usa el mismo contexto real y las mismas reglas anti-invención que el generador de hipótesis; cada respuesta queda marcada como línea a investigar, no como conclusión.
- **Limpiar (▾)** — desplegable con "Borrar este canal" (el de siempre) y "Borrar todos los canales" (pide confirmación; borra los 4 de una sola vez sin tener que ir canal por canal — el historial de lecturas guardadas no se toca).
- **Calculadora de impacto esperado** — parte de la brecha real ya calculada por driver y dos supuestos explícitos del usuario (% de la brecha que explica la causa, % que se espera recuperar), sin números inventados por la herramienta.
- **Evidencia y validación** — registro de qué se investigó, estado de validación y fuente.
- **Impacto esperado vs. real** — se define al guardar la lectura y se actualiza más adelante, cuando hay resultados reales que registrar.
- **Historial** — lecturas guardadas por canal, con vista consolidada, patrones históricos, gráfico de evolución e import/export CSV.
- **Vista Global** — pacing, pedidos, AOV ponderado, clientes nuevos/recurrentes e insights comparativos entre los 4 canales (Ecommerce, App, WhatsApp, Llamadas), sin mezclar sesiones con llamadas/mensajes.
- **Importación CSV multi-canal** — un solo archivo puede traer una fila por canal; la herramienta identifica el canal de cada fila por la columna `canal` y carga solo los que vienen en el archivo (no hace falta traer los 4). Los canales que no aparecen en el CSV quedan intactos, y dentro de un canal, los campos vacíos de la fila tampoco pisan lo que ya había cargado.
- **Plantilla CSV** descargable con un ejemplo por canal, para saber el formato exacto de importación.

## Cómo usarlo

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

Todo corre en el navegador. Los datos que cargás (diagnóstico, historial, borradores por canal) se guardan en el `localStorage` del dispositivo — no hay servidor ni base de datos detrás. La única llamada de red que hace la herramienta es a la API de Cohere, y solo cuando usás explícitamente "Generar hipótesis con Cohere AI".
