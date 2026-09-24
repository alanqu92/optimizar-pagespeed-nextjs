// Plantilla generica de la skill optimizar-pagespeed-nextjs: verificacion de integracion de la preparacion
// para agentes contra un servidor REAL (local o produccion). Copiala al proyecto y ajusta BASE / rutas de ejemplo.
// Uso:  node verify-agent-endpoints.mjs <BASE_URL>      (o BASE=https://tusitio.com node verify-agent-endpoints.mjs)
// Replica los criterios de Ora / is-agentic: estado HTTP final, Content-Type, Vary: Accept y cuerpo (no solo el estado).
// Sale con codigo 1 si alguna comprobacion falla.
//
// La seccion 5 (listar endpoints de herramientas contra lib/agent/when-to-use.ts) es especifica de alanquezada.com:
// aqui se importa de forma opcional (si el archivo no existe en tu proyecto, esa comprobacion simplemente se omite).
let TOOL_ENDPOINTS = [];
try {
  ({ TOOL_ENDPOINTS } = await import("../lib/agent/when-to-use.ts"));
} catch {
  /* proyecto sin ese modulo: se omite la comprobacion de endpoints de herramientas */
}

const BASE = (process.argv[2] || process.env.BASE || "").replace(/\/$/, "");
if (!BASE) {
  console.error("Uso: node verify-agent-endpoints.mjs <BASE_URL>   (o BASE=https://tusitio.com node verify-agent-endpoints.mjs)");
  process.exit(1);
}
const UA = { "User-Agent": "verify-agent-endpoints/1.0" };
let fallos = 0;
let total = 0;

function check(nombre, ok, detalle = "") {
  total++;
  if (!ok) fallos++;
  console.log(`${ok ? "  OK " : " FALLA"}  ${nombre}${!ok && detalle ? `\n         -> ${detalle}` : ""}`);
}
const get = (path, accept, extra = {}) =>
  fetch(BASE + path, { redirect: "follow", headers: { ...UA, ...(accept ? { Accept: accept } : {}) }, ...extra });
const ct = (r) => (r.headers.get("content-type") || "").toLowerCase();
const vary = (r) => (r.headers.get("vary") || "").toLowerCase();

console.log(`\nVerificando ${BASE}\n`);

// 1. Negociacion en la home (markdown-negotiation-vary)
console.log("Home con Accept: text/markdown");
let r = await get("/", "text/markdown");
let body = await r.text();
check("estado 200", r.status === 200, `status ${r.status}`);
check("Content-Type: text/markdown", ct(r).startsWith("text/markdown"), ct(r));
check("Vary incluye Accept", /(^|,\s*)accept(\s*,|$)/.test(vary(r)), r.headers.get("vary"));
check("cuerpo Markdown no vacio (>500 caracteres) y sin HTML", body.length > 500 && !/<(html|head|body|script)\b/i.test(body), `len ${body.length}`);
check("el primer encabezado es un H1 y hay uno solo", /^#\s+\S/m.test(body) && (body.match(/^# /gm) || []).length === 1 && body.search(/^#{1,6}\s/m) === body.search(/^# /m), body.slice(0, 120));
check("sin enlaces partidos ('[' seguido de salto de linea)", !/\[\n/.test(body));
check("enlaces absolutos y sin rutas /_next", !/\]\(\/(?!\/)/.test(body) && !body.includes("/_next/"), "quedan enlaces relativos o /_next");
check("Cache-Control impide que un cache compartido guarde la variante Markdown", /no-store|private/.test(r.headers.get("cache-control") || ""), r.headers.get("cache-control"));

console.log("\nHome con Accept: text/html (y sin Accept) sigue siendo HTML");
r = await get("/", "text/html");
let html = await r.text();
check("Accept: text/html -> text/html", ct(r).startsWith("text/html") && /<h1\b/.test(html), ct(r));
// Aviso (no fallo): Ora exige Vary: Accept en la respuesta MARKDOWN (verificada arriba, y esa variante es no-store).
// En las paginas HTML prerenderizadas Next.js sustituye el Vary del proxy/next.config por el suyo; ver README de agentes.
if (!/(^|,\s*)accept(\s*,|$)/.test(vary(r))) console.log("  AVISO  el HTML no lleva Vary: Accept (Next.js lo reemplaza en paginas prerenderizadas); no afecta a los checks de Ora");
r = await get("/", null);
check("sin Accept explicito -> HTML", ct(r).startsWith("text/html"), ct(r));
r = await get("/", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
check("cabecera de navegador -> HTML", ct(r).startsWith("text/html"), ct(r));

console.log("\nHEAD con Accept: text/markdown");
r = await fetch(BASE + "/", { method: "HEAD", headers: { ...UA, Accept: "text/markdown" } });
check("HEAD -> text/markdown + Vary: Accept", ct(r).startsWith("text/markdown") && vary(r).includes("accept"), `${ct(r)} | ${r.headers.get("vary")}`);

// 2. 404 amigable (agent-friendly-404)
console.log("\n404 (ruta inexistente) con Accept: text/markdown");
const rutaFalsa = `/__verificacion-404-${Date.now()}`;
r = await get(rutaFalsa, "text/markdown");
body = await r.text();
check("estado HTTP 404 (no 200)", r.status === 404, `status ${r.status}`);
check("Content-Type: text/markdown", ct(r).startsWith("text/markdown"), ct(r));
check("cuerpo explica el error (>=20 caracteres)", body.trim().length >= 20 && /404/.test(body), body.slice(0, 80));
check("enlaza llms.txt y sitemap", body.includes(`${"https://alanquezada.com"}/llms.txt`) && body.includes("/sitemap.xml"), body.slice(0, 300));
check("Vary incluye Accept", vary(r).includes("accept"), r.headers.get("vary"));
r = await get(rutaFalsa, "text/html");
check("404 con Accept: text/html sigue siendo HTML 404", r.status === 404 && ct(r).startsWith("text/html"), `${r.status} ${ct(r)}`);

// 3. Otras paginas, redirecciones y exclusiones
console.log("\nOtras rutas");
r = await get("/blog", "text/markdown");
body = await r.text();
check("/blog -> 200 Markdown con su H1", r.status === 200 && ct(r).startsWith("text/markdown") && /^# \S/m.test(body), `${r.status} ${ct(r)}`);
r = await get("/herramientas/semrush", "text/markdown"); // redirige (308) a /analisis/semrush
body = await r.text();
check("redireccion 308 se sigue y termina en Markdown", r.status === 200 && ct(r).startsWith("text/markdown") && r.url.includes("/analisis/semrush"), `${r.status} ${r.url} ${ct(r)}`);
for (const p of ["/robots.txt", "/sitemap.xml"]) {
  r = await get(p, "text/markdown");
  check(`${p} no se convierte (archivo)`, r.status === 200 && !ct(r).startsWith("text/markdown"), `${r.status} ${ct(r)}`);
}
r = await get("/masterpanel/login", "text/markdown", { redirect: "manual" });
check("/masterpanel no se sirve como Markdown", !ct(r).startsWith("text/markdown"), ct(r));
r = await get("/agent-markdown?path=//evil.com", "text/html");
check("endpoint interno rechaza rutas inseguras (400)", r.status === 400, `status ${r.status}`);
r = await get("/api/tools", "text/markdown");
check("/api no se reescribe (sigue JSON)", ct(r).includes("json"), ct(r));

// 4. Contenido sin JavaScript (content-no-js)
console.log("\nContenido sin JavaScript (HTML crudo de la home)");
html = await (await get("/", "text/html")).text();
const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
const mainText = mainMatch ? mainMatch[1].replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
check("<main> trae >=500 caracteres de contenido en el HTML crudo", mainText.length >= 500, `len ${mainText.length}: ${mainText.slice(0, 80)}`);
check("el contenido no viaja oculto (sin <div hidden id=\"S:\")", !/<div hidden[^>]*id="S:/.test(html));
check("sin fallback de carga ('Cargando...') en <main>", !/Cargando\.\.\./.test(mainMatch ? mainMatch[1] : ""));
const heads = [...html.slice(html.indexOf("<body")).matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
check("el primer encabezado del documento es H1", heads[0] === 1, `orden: ${heads.slice(0, 10).join(",")}`);
check("hay un unico H1", heads.filter((h) => h === 1).length === 1, `H1: ${heads.filter((h) => h === 1).length}`);
let salto = heads.findIndex((h, i) => i > 0 && h - heads[i - 1] > 1);
check("niveles de encabezado secuenciales (sin saltos hacia abajo de mas de 1)", salto === -1, `salto en posicion ${salto}: ${heads.slice(Math.max(0, salto - 2), salto + 2).join(",")}`);

// 5. llms.txt (agent-instruction)
console.log("\n/llms.txt");
r = await get("/llms.txt", null);
body = await r.text();
check("200 text/plain", r.status === 200 && ct(r).startsWith("text/plain"), `${r.status} ${ct(r)}`);
check("incluye la seccion 'When to use this site'", /^## .*When to use/im.test(body));
check("nombra casos de uso concretos y limites ('No lo uses para' u equivalente)", /No lo uses para|do not use|not for/i.test(body));
if (TOOL_ENDPOINTS.length) {
  const faltan = TOOL_ENDPOINTS.filter((t) => !body.includes(`POST ${BASE}/api/tools/${t.slug}`));
  check(`lista los ${TOOL_ENDPOINTS.length} endpoints con su metodo`, faltan.length === 0, `faltan: ${faltan.map((t) => t.slug).join(", ")}`);
} else {
  console.log("  --   (omitida: este proyecto no tiene lib/agent/when-to-use.ts con TOOL_ENDPOINTS)");
}

// 6. Datos estructurados de marca
console.log("\nMarca (JSON-LD)");
const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
  try {
    const j = JSON.parse(m[1]);
    return Array.isArray(j) ? j : [j];
  } catch {
    return [];
  }
});
const persona = ld.find((x) => x["@type"] === "Person");
const sitio = ld.find((x) => x["@type"] === "WebSite");
// Ajusta MARCA/DOMINIO al copiar esta plantilla a un proyecto (aqui se infieren del <title> y de BASE para que la
// plantilla corra tal cual contra cualquier sitio).
const DOMINIO = new URL(BASE).hostname.replace(/^www\./, "");
check("Person con @id y alternateName con el dominio", !!persona?.["@id"] && !!persona?.alternateName?.some((a) => a.includes(DOMINIO)), JSON.stringify(persona || {}).slice(0, 160));
check("WebSite con alternateName y publisher apuntando a la Person", !!sitio?.alternateName?.some((a) => a.includes(DOMINIO)) && sitio?.publisher?.["@id"] === persona?.["@id"], JSON.stringify(sitio || {}).slice(0, 160));
check("el <title> de la home no esta vacio", /<title>\s*\S+/.test(html));

console.log(`\n${total - fallos}/${total} comprobaciones correctas${fallos ? `, ${fallos} FALLAN` : ""}\n`);
process.exit(fallos ? 1 : 0);
