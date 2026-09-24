---
name: optimizar-pagespeed-nextjs
description: >-
  Lleva un sitio Next.js (App Router) a la meta de PageSpeed de Alan: MOVIL minimo 90 y
  ESCRITORIO 100 (ademas de Accesibilidad, Buenas practicas y SEO en 100, errores de consola 0),
  con el metodo probado en alanquezada.com (movil 74-79 -> ~88-92, escritorio 100). Sirve para
  proyectos NUEVOS (plantillas de codigo incluidas) y para MEJORAR los ya hechos (procedimiento
  de auditoria incluido). Usala cuando el usuario diga "el rendimiento es bajo", "sube el
  PageSpeed", "optimiza la velocidad", "minimo 90 en movil", "100 en web/escritorio", "mejora los
  proyectos que ya hicimos", o cuando un sitio quede debajo de esa meta. Complementa a
  `analizador-pagespeed` (medir a fondo) y `checklist-performance-nuevo-proyecto` (buenas
  practicas de origen); esta skill es el PLAYBOOK de medicion, diagnostico y correccion.
---

# Primer uso (hazlo ANTES de medir, una sola vez por usuario)

Una skill no tiene paso de instalación que muestre mensajes: el onboarding lo haces tú al activarte.

1. Corre `node ~/.claude/skills/optimizar-pagespeed-nextjs/scripts/medir-pagespeed.mjs --doctor` (o la ruta donde
   esté la skill). Muestra: versión de Node, si hay clave de PageSpeed, si hay Chrome, si hay `gcloud`.
2. Explica al usuario en lenguaje simple las **dos formas de medir** (tabla de abajo) y **cuál le toca hoy** según lo
   que detectó el diagnóstico.
3. Si no hay clave, ofrece: (a) crearla ya (`--setup`: con `gcloud` y confirmación, o los 4 pasos manuales en la consola
   de Google, gratis), o (b) seguir en modo local ahora y configurarla después. No crees nada en su cuenta de Google sin
   su confirmación expresa, y nunca imprimas ni subas la clave a git.
4. Dile cómo pedir las cosas: "mide mi sitio", "sube el PageSpeed", "audita este proyecto". Después continúa con la tarea.

| | **API (con clave gratuita)** | **Local (sin clave)** |
|---|---|---|
| Dónde corre | Servidores de Google | Chrome + Lighthouse en la PC del usuario |
| Resultado | **Referencia oficial** (= pagespeed.web.dev) | **Orientativo**: usa su CPU y su red, suele dar más alto (96–97 vs 88–90) |
| Corridas | 5 por estrategia, mediana **y rango (margen)**, detecta caché de Google | 1 por estrategia |
| Úsalo para | Reportar el número final / verificar la meta | Diagnosticar, ver la traza, probar sin cuenta |

Si el usuario recibió esta skill de otra persona, el `README.md` de la carpeta resume lo mismo. Nunca presentes un
resultado en modo local como el puntaje oficial.

# Meta y regla de oro

**Criterio de aceptacion:** movil >= 90, escritorio 100 (98-100 cuenta como 100: oscila entre corridas por
Speed Index/LCP), Accesibilidad / Buenas practicas / SEO = 100, errores de consola = 0.
Se juzga por la **mediana de 5 corridas reales** y se reporta siempre con su **margen** (rango min–max), nunca por la mejor corrida.
Veredicto del script: **CUMPLE** (mediana ≥ meta), **EN EL MARGEN** (mediana hasta 5 pts bajo la meta pero hay corridas que la alcanzan; código de salida 3) o
**NO CUMPLE**. El margen se ajusta con `--margen N` (default 5).

**Regla de oro: no adivines, mide.** Cada cambio se despliega y se mide. Si la mediana no mejora, se revierte
(`inlineCss` empeoro FCP de 1,7 a 4,6 s y se revirtio). Un cambio "de manual" que no mueve los numeros no se queda.

## 1. Como medir (sin engañarse) — SIEMPRE con el script

```bash
node ~/.claude/skills/optimizar-pagespeed-nextjs/scripts/medir-pagespeed.mjs https://sitio.com --runs 5 --local
```

Lee la clave de `PAGESPEED_API_KEY` o `PAGESPEED_TOOL_API_KEY` (entorno o `.env.local` del directorio actual). Hace 5
corridas en movil y en escritorio, reporta la MEDIANA y el rango, detecta resultados repetidos, compara contra la meta y sale con
codigo 0 (cumple), 3 (en el margen) o 2 (no cumple). `--local` agrega Lighthouse en Chrome headless con perfil temporal limpio (`--incognito`, sin
extensiones ni cache: equivale a abrir la pagina en incognito).

**Reglas de medicion (aprendidas por las malas):**
- **Google cachea los resultados por URL unos minutos.** Tres corridas "identicas" (mismos FCP/LCP/TBT) suelen ser LA
  MISMA respuesta repetida, no tres mediciones. El script compara `lighthouseResult.fetchTime` y, si se repite, fuerza
  una corrida real con `?_pscb=` (ojo: en un CDN con cache por query eso es MISS y mide un TTFB peor que el real).
  En alanquezada.com "90, 90, 90" eran cache; con corridas reales el movil dio mediana 88-90 (rango 86-92) y escritorio 100.
- **Referencia oficial = API de PageSpeed / pagespeed.web.dev** (corren en los mismos servidores de Google, CPU lenta).
  Lighthouse en DevTools o local da MAS (96-97 vs 88-90) porque usa tu CPU y tu red: sirve para diagnosticar (traza),
  no para reportar el numero final. Incognito solo evita extensiones del navegador; no cambia el servidor que mide.
- El score usa el LCP **simulado** (CPU 4x mas lenta, red 1,6 Mbps). El observado real es 2-3x menor. Reporta ambos.
- Lo que cuenta para el ranking de Google son los datos de campo (CrUX), no el laboratorio.
- **Margen (por que pagespeed.web.dev te puede dar mas que la API):** el mismo sitio y el mismo codigo varian entre corridas
  porque cada una cae en un servidor de Google distinto (CPU, estado, red). En alanquezada.com, 12+ corridas reales de la API dieron
  entre 86 y 92 en movil (mediana 88-90) y pagespeed.web.dev en incognito mostro 94. Una sola corrida (la que muestra la web) es UNA
  muestra dentro de ese rango, no el numero del sitio: por eso se reporta mediana y rango, y el veredicto tiene un estado "en el margen".
  La CPU del servidor (columna del script) influye pero no explica toda la variacion (correlacion medida ~0,35).
- Mide la linea base ANTES de tocar nada.

**Diagnostico profundo (cuando el score no sube):**
- Guarda el JSON de la API y analiza `network-requests`, `lcp-breakdown-insight`, `mainthread-work-breakdown`,
  `metrics` (observado vs simulado) y `screenshot-thumbnails` (decodifica los frames base64 y MIRALOS: una pantalla
  en blanco hasta 2 s dice mas que cualquier metrica).
- `npx lighthouse URL --form-factor=mobile --output=json --save-assets` da la traza (`report-0.trace.json`) para ver
  tareas largas antes del FCP. Chrome esta en `C:\Program Files\Google\Chrome\Application\chrome.exe`; el error final
  de limpieza del tmp de Chrome en Windows es benigno (el reporte se escribe igual).
- Atribuir bytes por modulo: `productionBrowserSourceMaps: true` temporal, build, y decodificar `mappings` del `.js.map`
  que indica el comentario `sourceMappingURL` de cada chunk (source-map-explorer NO entiende mapas de Turbopack).
  Revertir el flag despues.
- Si escribes comandos con Node desde bash, NO pongas texto con backticks dentro de `node -e "..."`: bash los ejecuta.
  Usa Write/Edit para archivos Markdown.

## 2. Playbook, en orden de retorno (lo que funciono)

1. **Errores de consola primero.** Un CSP que bloquea un script (AdSense, GTM...) es un error real y baja Buenas
   practicas. Agregar los dominios necesarios al CSP de `next.config.mjs`.
2. **Scripts de terceros diferidos.** GTM (~113 KB, ~75 KB sin usar) y AdSense (~1,5 s de TBT) NO van en `<head>` con
   `beforeInteractive`. Plantilla: `templates/DeferredScripts.tsx` (inyecta en la primera interaccion o a los 5 s;
   `pushDataLayerEvent` crea el dataLayer si no existe, asi que no se pierden eventos). AdSense cargado al inicio:
   TBT 20 -> 1.550 ms y rendimiento 74 -> 48.
3. **Cero `fetch` de ajustes en el cliente al cargar.** Leer `settings.json` UNA vez en el layout del servidor y
   compartirlo por contexto: `templates/SettingsProvider.tsx`. Antes eran 6 fetch identicos + 6 re-renders en la
   ventana del LCP. Igual con FAQs/cursos/etc.: leerlos en `page.tsx` (servidor) y pasarlos por props.
4. **Datos estaticos fuera del bundle del cliente.** Un componente `"use client"` que importa `lib/data/*` mete TODO
   el arreglo en el JS de cada visitante (~60 KB por 37 fichas solo para mostrar 3 tarjetas). Elegir los items en el
   servidor y pasarlos como props.
5. **Fuentes.** Cada `woff2` precargado compite con la imagen LCP. Quitar estilos/pesos que no se usan (Playfair
   italica: -39 KB). Verificar con `grep italic` y `<em>` antes.
6. **LCP = imagen del hero:** `priority` + `fetchPriority="high"`, sin animacion de entrada, WebP, `sizes` correcto.
   Detalle en `checklist-performance-nuevo-proyecto`.
7. **Cache del HTML en Cloudflare** (dashboard, no codigo): Cache Rule con Edge TTL "Use cache-control header if
   present" y exclusiones (`/api/`, `/masterpanel`, `/cuenta`, `/carrito`, `/checkout`, `/pago`, `/mis-compras`,
   `/buscar`). Verificar `cf-cache-status: HIT` (antes `DYNAMIC`, TTFB 0,3-0,6 s). Al pegar la expresion en Cloudflare:
   vaciar el editor primero (Ctrl+A, Supr) y pegarla en UNA linea. Desactivar Web Analytics de Cloudflare si no se usa
   (`beacon.min.js`, 10 KB).
8. **Contenedor GTM vacio = 113 KB para nada.** Verificar con
   `curl "https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"` buscando `"tags":[]`. Si esta vacio, publicar la etiqueta
   GA4 (tipo Etiqueta de Google, activador *Initialization - All Pages*, **Enviar + Publicar**; guardar no basta).

## 3. Lo que NO hacer (probado: empeoro o no ayudo)

- `experimental.inlineCss: true`: metio 94 KB de CSS en cada HTML (422 KB) y FCP 1,7 -> 4,6 s.
- `next/dynamic` / `React.lazy` para "diferir hidratacion": ya hubo errores de hidratacion #422/#425 por Suspense; y
  `ssr:false` quita contenido del HTML (mata SEO).
- Quitar GTM `beforeInteractive` sin confirmar antes que el contenedor tiene etiquetas y que los eventos al dataLayer
  seguiran procesandose.
- Asumir que `legacy-javascript` / `unused-javascript` (~25 KB) son del proyecto: vienen del runtime de Next/React y de
  GTM/Cloudflare; un `browserslist` moderno ya es lo correcto.
- Reportar "90" tras una sola corrida o tras corridas repetidas (ver reglas de medicion).

## 4. Proyectos NUEVOS: arrancar asi desde el dia 1

1. Copiar `templates/DeferredScripts.tsx` y `templates/SettingsProvider.tsx` y montarlos en el layout raiz.
2. Regla de arquitectura: los Server Components leen datos (settings, listados, FAQs) y los pasan por props; ningun
   componente cliente hace `fetch` de datos "de arranque" ni importa arreglos grandes de `lib/data/*`.
3. Fuentes: solo los estilos/pesos que se usen. Terceros (GTM/AdSense/chat/pixeles): siempre diferidos.
4. Aplicar `checklist-performance-nuevo-proyecto` (sharp, LCP con fetchPriority, LazyMotion, contraste...).
5. Al primer despliegue: correr el script de medicion y guardar la linea base; no dejar deuda de rendimiento "para despues".

## 5. Mejorar proyectos YA HECHOS: procedimiento de auditoria

1. **Linea base:** `medir-pagespeed.mjs` (movil + escritorio, 5 corridas). Anotar mediana y errores de consola.
2. **Detectores rapidos en el codigo** (con Grep, sin asumir):
   - `beforeInteractive` o `<script src=...googletagmanager|googlesyndication>` en el layout -> terceros sin diferir.
   - `fetch("/api/...")` dentro de `useEffect` en Navbar/Footer/secciones -> fetches de arranque en el cliente.
   - `"use client"` + `import ... from "@/lib/data/..."` -> datos estaticos empaquetados en el cliente.
   - `next/font` con `style: ["normal","italic"]` o muchos pesos no usados.
   - `Content-Security-Policy` sin los dominios de los scripts que carga la pagina -> errores de consola.
   - `curl -sI https://sitio | grep -i cf-cache-status` -> `DYNAMIC` en HTML estatico = falta regla de cache.
   - Contenedor GTM vacio (`"tags":[]`).
3. Aplicar el playbook (seccion 2) de mayor a menor retorno, midiendo tras cada despliegue.
4. Para stacks que NO son Next.js (Express, PHP/cPanel, WordPress) valen los mismos principios: terceros diferidos,
   cero peticiones de arranque innecesarias, fuentes minimas, cache en CDN, imagen LCP priorizada; cambia la sintaxis.
5. Proyectos conocidos de Alan a auditar con esta skill (no asumir su estado, medir primero): alanquezada.com (ya hecho),
   Inventario ECN, CRM Ventas, ECN Express / Checkout Express, Astra Telecom, KonektaB2B, TH3SEO.

## 6. Cierre y reporte

Antes de dar por terminado: movil mediana >= 90, escritorio 98-100, las otras tres categorias en 100, errores de consola 0,
`cf-cache-status: HIT` (si hay Cloudflare) y GTM con etiquetas publicadas. Entregar tabla antes/despues con medianas.

**Referencia (alanquezada.com, sep/2026):** movil 74-79 -> mediana 88-90 (12+ corridas reales entre 86 y 92; pagespeed.web.dev llego a mostrar 94), LCP simulado 5,3 -> 3,3 s (real ~1,4-2,3 s),
TBT ~50 ms, peso 651 -> 466 KB; escritorio 100. Movil aun rozando la meta: lo que resta (~480 ms de JS del framework y
hidratacion) exigiria convertir secciones a Server Components y cambiar framer-motion por CSS en todo el sitio; hacerlo
solo si el usuario lo pide.

## 7. Preparacion para agentes (Is Agentic / Ora) — https://is-agentic.com/scan

Los criterios salen de https://ora.ai/docs. Escanear SIEMPRE antes y despues:

```bash
npx is-agentic <dominio>            # reporte legible (ojo: puede ser un reporte en cache; mira "Scanned")
npx is-agentic <dominio> --json     # estructurado
curl -s "https://is-agentic.com/api/v1/report?url=https%3A%2F%2F<dominio>"   # lectura, sin re-escanear
# Re-verificar SOLO los checks tocados (fresco; 10/min por IP, 30 escaneos/24 h): NO escanear en masa
curl -s -X POST https://ora.ai/api/scan/checks -H "Content-Type: application/json" \
  -d '{"url":"https://<dominio>","checkIds":["agent-friendly-404","content-no-js","markdown-negotiation-vary","brand-search-accuracy","agent-instruction","trust-anchors"]}'
```

Correcciones (orden de retorno) y como se hicieron en alanquezada.com (75 -> mas alto):
1. **404 amigable**: mantener HTTP 404; con `Accept: text/markdown` devolver `Content-Type: text/markdown` >=20 caracteres con enlaces a llms.txt/sitemap.
2. **Contenido sin JS**: quitar `app/loading.tsx` del root (Suspense mueve el contenido a `<div hidden id="S:0">` y el HTML crudo queda con "Cargando..."); un solo H1 primero y niveles secuenciales.
3. **Negociacion Markdown** (acceptmarkdown.com): `proxy.ts` reescribe `Accept: text/markdown` (q >= text/html, comodines no cuentan) a un route handler interno que pide el HTML al propio servidor y lo convierte con turndown. Respuesta: `text/markdown`, `Vary: Accept`, `Cache-Control: private, no-store`. Plantillas en `templates/agent/` (negotiate.ts, markdown.ts, agent-markdown-route.ts). Trampa: el handler ve la URL ORIGINAL tras el rewrite: pasar la ruta en un header (`x-agent-md-path`) con `NextResponse.rewrite(url,{request:{headers}})`. Sanear la ruta (anti-SSRF) y excluir /api, /admin, /_next.
4. **Marca**: JSON-LD Person/WebSite con `@id`, `alternateName`, `worksFor`, `publisher`; el resto es fuera del sitio (Search Console, Bing Webmaster, perfiles coherentes, menciones). No prometer resultados.
5. **when-to-use en llms.txt**: casos de uso concretos, "No lo uses para", como llamar (curl), endpoints con metodo y limites VERIFICADOS contra el codigo (nada inventado).

**Trampa (solo si el sitio esta detras de un CDN/proxy que cachea HTML — Cloudflare, Fastly, un edge cache propio; NO aplica si no hay CDN o si es Vercel/Netlify sin reglas de cache custom):** una regla que cachea HTML por URL suele ignorar el header `Accept`: tras cualquier peticion HTML normal, una peticion con `Accept: text/markdown` recibe el HTML guardado (HIT) y el check falla aunque el origen (el codigo) este bien. Primero descartar esto: probar con la URL exacta Y con un parametro anti-cache (`?cb=<random>`); si con el parametro pasa y sin el falla, es el CDN, no el codigo.
Solucion en Cloudflare (requiere permiso de edicion de Cache Rules, no solo de purga): anadir a la expresion de la regla que cachea HTML
`and not any(http.request.headers["accept"][*] contains "text/markdown")`. Tras cada deploy purgar cache y volver a verificar.
Verificador (funciona con o sin CDN por delante): `node scripts/verify-agent-endpoints.mjs https://<dominio>`. Si el proyecto no tiene `lib/agent/when-to-use.ts` con `TOOL_ENDPOINTS`, esa comprobacion se omite sola (no hace falta tocar el script).
