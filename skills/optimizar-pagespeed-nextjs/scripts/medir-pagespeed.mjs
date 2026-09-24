#!/usr/bin/env node
// Medicion LIMPIA de PageSpeed para cualquier sitio (skill optimizar-pagespeed-nextjs / analizador-pagespeed).
//
// Uso:
//   node medir-pagespeed.mjs https://sitio.com [--runs 3] [--local]
//   node medir-pagespeed.mjs --setup [--yes --project ID_DE_PROYECTO_GCP]
//
//   --runs N   corridas por estrategia con la API (default 3; se reporta la MEDIANA, no la mejor)
//   --local    ademas corre Lighthouse local en Chrome headless con perfil temporal limpio
//              (--incognito, sin extensiones, sin cache). Sin clave de API se activa solo.
//   --setup    asistente para conseguir la clave gratuita de PageSpeed Insights (ver abajo)
//
// MODOS (ver la tabla API vs local en SKILL.md):
//   API   (con clave)  -> corre en los servidores de Google: es la REFERENCIA OFICIAL (igual que pagespeed.web.dev).
//   LOCAL (sin clave)  -> Lighthouse en tu Chrome con TU CPU y TU red: sirve para diagnosticar; suele dar puntajes MAS ALTOS.
//
// Clave: PAGESPEED_API_KEY (variable de entorno o .env.local del directorio actual).
// Meta: movil >= 90, escritorio >= 98 (100 en la UI), Accesibilidad/Buenas practicas/SEO = 100, errores de consola = 0.
//
// Copyright (c) 2026 Alan Quezada - https://alanquezada.com - https://th3seo.com
// Licencia MIT (ver LICENSE): uso libre conservando este aviso y el credito a alanquezada.com.

import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BIENVENIDA = `
  ------------------------------------------------------------------
   Bienvenido a "Optimizar PageSpeed"
   Skill creada por Alan Quezada  -  SEO, Diseno Web e IA
   alanquezada.com  |  TH3SEO: th3seo.com
  ------------------------------------------------------------------
   Te ayuda a llevar tu sitio a PageSpeed movil >= 90 y escritorio 100,
   con el metodo que uso en mis proyectos: medir con datos reales,
   corregir lo que mas pesa y verificar que de verdad mejoro.
  ------------------------------------------------------------------`;

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("http"));
const runs = Number(args[args.indexOf("--runs") + 1]) || 5;
// Margen de variacion entre corridas (puntos). El puntaje de Google depende de la CPU del servidor que te toque:
// medido en alanquezada.com, el mismo sitio dio 86-94 en movil con el mismo codigo.
const margen = Number(args[args.indexOf("--margen") + 1]) || 5;
const wantsLocal = args.includes("--local");
const wantsSetup = args.includes("--setup");

function loadKey() {
  if (process.env.PAGESPEED_API_KEY) return process.env.PAGESPEED_API_KEY;
  const envFile = join(process.cwd(), ".env.local");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^(PAGESPEED_API_KEY)=(.*)$/);
      if (m && m[2].trim()) return m[2].replace(/^"|"$/g, "").trim();
    }
  }
  return "";
}
const key = loadKey();

const PASOS_MANUALES = `
  Pasos manuales (unos 3 minutos, gratis):
   1. Entra a https://console.cloud.google.com y crea (o elige) un proyecto.
   2. Menu "APIs y servicios" > "Biblioteca" > busca "PageSpeed Insights API" > Habilitar.
   3. "APIs y servicios" > "Credenciales" > "Crear credenciales" > "Clave de API".
      (Recomendado: restringirla a la API "PageSpeed Insights API".)
   4. Guarda la clave como PAGESPEED_API_KEY en tu entorno o en un archivo .env.local
      (y asegurate de que .env.local este en .gitignore: la clave es tuya, no se comparte).`;

const TABLA_MODOS = `
  API vs LOCAL:
   - API (con clave): corre en servidores de Google, CPU lenta simulada. Es la REFERENCIA OFICIAL: coincide con pagespeed.web.dev.
     Necesita clave gratuita. Reporta mediana de varias corridas.
   - LOCAL (sin clave): Lighthouse en tu Chrome; usa TU CPU y TU red, por eso da puntajes MAS ALTOS (p. ej. 96-97 donde Google da 88-90).
     No necesita clave (solo Node y Chrome). Util para diagnosticar y ver la traza, NO para reportar el numero final.`;

// ---------------------------------------------------------------- SETUP (--setup)
function tiene(cmd) {
  try {
    execFileSync(cmd, ["--version"], { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}
function gc(argv) {
  return execFileSync("gcloud", argv, { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] });
}

if (wantsSetup) {
  console.log(BIENVENIDA);
  console.log("\n=== Configuracion de la clave de PageSpeed Insights ===");
  if (key) {
    console.log("Ya hay una clave configurada (PAGESPEED_API_KEY). No hace falta hacer nada.");
    process.exit(0);
  }
  const hayGcloud = tiene("gcloud");
  console.log(`gcloud instalado: ${hayGcloud ? "si" : "no"}`);
  if (!hayGcloud) {
    console.log("\nOpciones:");
    console.log("  A) Instalar gcloud (https://cloud.google.com/sdk/docs/install) y volver a correr --setup.");
    console.log("  B) Seguir los pasos manuales:" + PASOS_MANUALES);
    console.log("  C) No configurar nada: sin clave el script mide en modo LOCAL." + TABLA_MODOS);
    process.exit(0);
  }
  const cuenta = (() => { try { return gc(["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"]).trim(); } catch { return ""; } })();
  if (!cuenta) {
    console.log("\nNo hay sesion de gcloud. Inicia sesion tu mismo (abre el navegador, debes aceptar con tu cuenta):\n  gcloud auth login\ny vuelve a correr --setup.");
    process.exit(0);
  }
  const proyecto = args[args.indexOf("--project") + 1];
  console.log(`Cuenta activa: ${cuenta}`);
  const cmds = [
    `gcloud services enable pagespeedonline.googleapis.com --project ${proyecto || "<ID_DE_PROYECTO>"}`,
    `gcloud services api-keys create --display-name="pagespeed-skill" --api-target=service=pagespeedonline.googleapis.com --project ${proyecto || "<ID_DE_PROYECTO>"} --format=json`,
  ];
  if (!args.includes("--yes") || !proyecto || proyecto.startsWith("--")) {
    console.log("\nSe ejecutarian (en tu cuenta, creando una clave de API restringida a PageSpeed Insights):");
    cmds.forEach((c) => console.log("  " + c));
    console.log("\nPara ejecutarlo: node medir-pagespeed.mjs --setup --yes --project TU_ID_DE_PROYECTO");
    console.log("(Lista tus proyectos con: gcloud projects list). Si algo falla, usa los pasos manuales:" + PASOS_MANUALES);
    process.exit(0);
  }
  try {
    console.log("\nHabilitando la API...");
    gc(["services", "enable", "pagespeedonline.googleapis.com", "--project", proyecto]);
    console.log("Creando la clave de API...");
    const out = gc(["services", "api-keys", "create", '--display-name="pagespeed-skill"', "--api-target=service=pagespeedonline.googleapis.com", "--project", proyecto, "--format=json"]);
    const j = JSON.parse(out);
    const nueva = j?.response?.keyString || j?.keyString;
    if (!nueva) throw new Error("gcloud no devolvio keyString; revisa la salida: " + out.slice(0, 300));
    appendFileSync(join(process.cwd(), ".env.local"), `\nPAGESPEED_API_KEY=${nueva}\n`);
    console.log("Listo: clave guardada en .env.local (NO la subas a git; agrega .env.local a .gitignore).");
  } catch (e) {
    console.log("No se pudo completar automaticamente: " + String(e.stderr || e.message).slice(0, 400));
    console.log("Usa los pasos manuales:" + PASOS_MANUALES);
    process.exit(1);
  }
  process.exit(0);
}

// ---------------------------------------------------------------- DIAGNOSTICO DEL ENTORNO (--doctor)
if (args.includes("--doctor")) {
  const chromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  const chrome = chromePaths.find((p) => existsSync(p));
  console.log(BIENVENIDA);
  console.log("\n=== Estado de tu entorno para esta skill ===");
  console.log(`  Node.js ${process.version}  ${Number(process.versions.node.split(".")[0]) >= 18 ? "OK" : "-> necesitas Node 18 o superior"}`);
  console.log(`  Clave de PageSpeed (API): ${key ? "SI, configurada -> modo API disponible" : "NO -> por ahora solo modo LOCAL"}`);
  console.log(`  Chrome (para modo local): ${chrome ? "SI (" + chrome + ")" : "NO detectado -> instalalo para usar el modo local"}`);
  console.log(`  gcloud (para crear la clave automaticamente): ${tiene("gcloud") ? "SI" : "no (puedes crear la clave a mano en 3 minutos)"}`);
  console.log(TABLA_MODOS);
  console.log(`
  COMO USARLA:
   - Medir tu sitio:            node medir-pagespeed.mjs https://tusitio.com
   - Medir + comparar en local: node medir-pagespeed.mjs https://tusitio.com --local
   - Conseguir la clave gratis: node medir-pagespeed.mjs --setup
   - Ver este estado otra vez:  node medir-pagespeed.mjs --doctor
   O simplemente pidele a Claude: "sube el PageSpeed de mi sitio" o "mide el rendimiento de https://tusitio.com".

  QUE MODO TE CONVIENE:
   - Quieres el numero que Google mostrara (y reportarlo): configura la clave y usa el modo API.
   - Solo quieres probar rapido o diagnosticar sin cuenta de Google: modo local (sin clave).`);
  process.exit(0);
}

// ---------------------------------------------------------------- MEDICION
if (!url) {
  console.error("Uso: node medir-pagespeed.mjs https://sitio.com [--runs 3] [--local]\n     node medir-pagespeed.mjs --setup");
  process.exit(1);
}

const modoApi = Boolean(key);
const doLocal = wantsLocal || !modoApi;

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function psi(strategy, target) {
  const q = new URLSearchParams({ url: target, key, strategy, locale: "es", x: String(Math.random()).slice(2) });
  for (const c of ["performance", "accessibility", "best-practices", "seo"]) q.append("category", c);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal: AbortSignal.timeout(120_000) });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  const lh = j.lighthouseResult;
  const a = lh.audits;
  const m = a.metrics.details.items[0];
  const num = (id) => a[id].numericValue;
  return {
    fetchTime: lh.fetchTime,
    bench: lh.environment?.benchmarkIndex || 0, // potencia de CPU del servidor de Google en ESA corrida
    perf: Math.round(lh.categories.performance.score * 100),
    a11y: Math.round(lh.categories.accessibility.score * 100),
    bp: Math.round(lh.categories["best-practices"].score * 100),
    seo: Math.round(lh.categories.seo.score * 100),
    fcp: num("first-contentful-paint") / 1000,
    lcp: num("largest-contentful-paint") / 1000,
    lcpObs: (m.observedLargestContentfulPaint || 0) / 1000,
    tbt: num("total-blocking-time"),
    cls: num("cumulative-layout-shift"),
    consola: (a["errors-in-console"].details?.items || []).length,
    kb: Math.round(num("total-byte-weight") / 1024),
  };
}

async function medir(strategy) {
  const filas = [];
  const vistos = new Set();
  for (let i = 0; i < runs; i++) {
    let r = await psi(strategy, url);
    // Google cachea resultados por URL unos minutos: si repite fetchTime, la corrida NO es nueva.
    // Se fuerza una corrida real con un query-string distinto (ojo: en CDN con cache por query sera MISS).
    if (vistos.has(r.fetchTime)) {
      const sep = url.includes("?") ? "&" : "?";
      r = await psi(strategy, `${url}${sep}_pscb=${Date.now()}${i}`);
      r.nota = "cb-url";
    }
    vistos.add(r.fetchTime);
    filas.push(r);
  }
  return filas;
}

const META = { mobile: { perf: 90 }, desktop: { perf: 98 } };
// Codigo de salida: 0 = cumple, 3 = en el margen (roza la meta), 2 = no cumple.
let peorEstado = 0;

if (modoApi) {
  console.log("MODO API (referencia oficial de Google)");
  for (const strategy of ["mobile", "desktop"]) {
    const f = await medir(strategy);
    const med = (k) => median(f.map((x) => x[k]));
    const res = {
      perf: med("perf"), a11y: med("a11y"), bp: med("bp"), seo: med("seo"),
      fcp: med("fcp"), lcp: med("lcp"), lcpObs: med("lcpObs"), tbt: med("tbt"), cls: med("cls"), consola: med("consola"), kb: med("kb"),
    };
    const perfs = f.map((x) => x.perf);
    const pmin = Math.min(...perfs);
    const pmax = Math.max(...perfs);
    console.log(`\n=== ${strategy.toUpperCase()} (${f.length} corridas reales) ===`);
    f.forEach((x, i) => console.log(`  #${i + 1}: perf ${x.perf} | a11y ${x.a11y} | bp ${x.bp} | seo ${x.seo} | LCP ${x.lcp.toFixed(1)}s | TBT ${Math.round(x.tbt)}ms | CPU del servidor de Google ${Math.round(x.bench)}${x.nota ? " (URL con cb)" : ""}`));
    console.log(`  MEDIANA: perf ${res.perf}  (rango ${pmin}-${pmax}, variacion ${pmax - pmin} pts) | a11y ${res.a11y} | bp ${res.bp} | seo ${res.seo}`);
    console.log(`  FCP ${res.fcp.toFixed(1)}s | LCP simulado ${res.lcp.toFixed(1)}s (real observado ${res.lcpObs.toFixed(1)}s) | TBT ${Math.round(res.tbt)}ms | CLS ${res.cls.toFixed(3)} | errores consola ${res.consola} | ${res.kb} KB`);
    const meta = META[strategy].perf;
    const otras = [];
    for (const [n, v] of [["accesibilidad", res.a11y], ["buenas practicas", res.bp], ["SEO", res.seo]]) if (v < 100) otras.push(`${n} ${v} < 100`);
    if (res.consola > 0) otras.push(`${res.consola} errores de consola`);
    let estado = 0;
    if (otras.length || res.perf < meta - margen || pmax < meta) estado = 2;
    else if (res.perf < meta) estado = 3;
    if (estado === 0) {
      console.log("  META: CUMPLE");
    } else if (estado === 3) {
      console.log(`  META: EN EL MARGEN. Mediana ${res.perf} < ${meta}, pero hay corridas de hasta ${pmax}. El puntaje de Google varia ~${margen} pts`);
      console.log(`        segun el servidor que te toque: pagespeed.web.dev puede mostrar entre ${pmin} y ${pmax + 2} con el mismo sitio y el mismo codigo.`);
    } else {
      const fallas = [...otras];
      if (res.perf < meta) fallas.unshift(`rendimiento ${res.perf} (rango ${pmin}-${pmax}) < ${meta}`);
      console.log(`  META: NO CUMPLE -> ${fallas.join("; ")}`);
    }
    if (pmax - pmin >= 3) console.log("  Nota: el mismo sitio y codigo varian entre corridas (estado y CPU del servidor de Google, red). La CPU influye pero no es la unica causa: por eso se reporta mediana y rango.");
    // Gravedad: no cumple (2) > en el margen (3) > cumple (0).
    const gravedad = (e) => (e === 2 ? 2 : e === 3 ? 1 : 0);
    if (gravedad(estado) > gravedad(peorEstado)) peorEstado = estado;
  }
} else {
  console.log("MODO LOCAL: no hay clave de API (PAGESPEED_API_KEY). Los numeros son ORIENTATIVOS: usan tu CPU y tu red y suelen salir mas altos que en Google.");
  console.log("Para la medicion oficial consigue la clave gratuita: node medir-pagespeed.mjs --setup");
}

if (doLocal) {
  console.log("\n=== LIGHTHOUSE LOCAL (Chrome headless, perfil temporal limpio / incognito) ===");
  for (const [nombre, flags] of [["desktop", ["--preset=desktop"]], ["mobile", ["--form-factor=mobile"]]]) {
    const out = join(tmpdir(), `lh_${nombre}_${Date.now()}.json`);
    try {
      execFileSync(
        "npx",
        ["--yes", "lighthouse", url, ...flags, "--only-categories=performance,accessibility,best-practices,seo", "--output=json", `--output-path=${out}`,
          "--chrome-flags=--headless=new --incognito --no-sandbox --disable-extensions", "--quiet"],
        { stdio: "ignore", shell: true, timeout: 240_000 },
      );
    } catch { /* en Windows falla la limpieza del tmp de Chrome pero el reporte se escribe igual */ }
    if (!existsSync(out)) { console.log(`  ${nombre}: no se pudo generar el reporte (¿Chrome instalado?)`); continue; }
    const r = JSON.parse(readFileSync(out, "utf8"));
    const c = r.categories, a = r.audits;
    console.log(`  ${nombre}: perf ${Math.round(c.performance.score * 100)} | a11y ${Math.round(c.accessibility.score * 100)} | bp ${Math.round(c["best-practices"].score * 100)} | seo ${Math.round(c.seo.score * 100)} | FCP ${a["first-contentful-paint"].displayValue} | LCP ${a["largest-contentful-paint"].displayValue} | TBT ${a["total-blocking-time"].displayValue}`);
  }
  console.log(TABLA_MODOS);
}

process.exit(peorEstado);
