// Conversion de paginas HTML del sitio a Markdown para agentes, y Markdown de errores (404, 5xx).
// Modulo sin dependencias internas: lo usan el route handler de app/agent-markdown y las pruebas (node --test).
import TurndownService from "turndown";

export interface MarkdownResult {
  markdown: string;
  title: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function extractTitle(html: string): string {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const t = decodeEntities(h1[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (t) return t;
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? decodeEntities(title[1].replace(/\s+/g, " ").trim()) : "";
}

function createConverter(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    linkStyle: "inlined",
  });
  // Ruido que no es contenido: scripts, estilos, iconos, formularios, navegacion, elementos ocultos.
  td.remove(["script", "style", "noscript", "template", "iframe", "form", "button", "nav", "footer", "select", "input", "textarea"]);
  td.addRule("svg", { filter: (node) => node.nodeName.toLowerCase() === "svg", replacement: () => "" });
  // Tarjetas: un enlace que envuelve bloques (encabezado + texto) se aplana a UN enlace de una linea, en vez de un
  // "[" abierto con varios encabezados dentro.
  td.addRule("tarjetas", {
    filter: (node) => {
      const el = node as unknown as { nodeName: string; querySelector?: (s: string) => unknown };
      return el.nodeName === "A" && !!el.querySelector && !!el.querySelector("h1,h2,h3,h4,h5,h6,p,div,ul,ol");
    },
    replacement: (content, node) => {
      const href = (node as unknown as { getAttribute: (n: string) => string | null }).getAttribute("href");
      const flat = content.trim().replace(/^#{1,6}\s*/gm, "").replace(/\s*\n+\s*/g, " · ").replace(/\s+/g, " ").trim();
      return href ? `[${flat}](${href})` : flat;
    },
  });
  td.addRule("ocultos", {
    filter: (node) => {
      const el = node as unknown as { getAttribute?: (n: string) => string | null };
      if (!el.getAttribute) return false;
      return el.getAttribute("hidden") !== null || el.getAttribute("aria-hidden") === "true";
    },
    replacement: () => "",
  });
  return td;
}

// Extrae el contenido principal (<main>, o <body> si no hay) y lo convierte a Markdown con enlaces e imagenes absolutos.
export function htmlToMarkdown(html: string, pageUrl: string): MarkdownResult {
  const origin = new URL(pageUrl).origin;
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const fragment = main ? main[1] : body ? body[1] : html;

  let md = createConverter().turndown(fragment);

  // Imagenes optimizadas de Next (/_next/image?url=...) -> URL original absoluta.
  md = md.replace(/\]\(\/_next\/image\?url=([^&)\s]+)[^)]*\)/g, (_m, u: string) => {
    let original = u;
    try {
      original = decodeURIComponent(u);
    } catch {
      /* se deja tal cual */
    }
    return `](${original.startsWith("/") ? origin + original : original})`;
  });
  // Enlaces relativos -> absolutos.
  md = md.replace(/\]\((\/(?!\/)[^)\s]*)/g, (_m, p: string) => `](${origin}${p}`);
  // Enlaces contiguos (botones en fila) quedarian pegados: "[a](x)[b](y)".
  md = md.replace(/(\]\([^)\s]*\))\[/g, "$1 [");
  md = md.replace(/\n{3,}/g, "\n\n").trim();

  // Solo se antepone el titulo si la pagina no trae ningun H1 propio (evita un H1 duplicado).
  const title = extractTitle(html);
  if (title && !/^#\s/m.test(md)) md = `# ${title}\n\n${md}`;
  return { markdown: `${md}\n\n---\nFuente: ${pageUrl}\n`, title };
}

const SITE_LINKS = (origin: string) => [
  `- [Inicio](${origin}/)`,
  `- [llms.txt](${origin}/llms.txt): índice del sitio en Markdown y guía de cuándo usar cada sección`,
  `- [Sitemap](${origin}/sitemap.xml)`,
  `- [Herramientas gratuitas](${origin}/herramientas)`,
  `- [Blog](${origin}/blog)`,
  `- [Servicios](${origin}/servicios)`,
];

const safePath = (p: string) => p.replace(/`/g, "'").replace(/[\r\n]+/g, " ").slice(0, 200);

// Cuerpo Markdown de un error para clientes que pidieron text/markdown (mismo status HTTP que el error real).
export function errorMarkdown(input: { status: number; path: string; origin: string }): string {
  const { status, path, origin } = input;
  const heading =
    status === 404 ? "404 — Página no encontrada" : status >= 500 ? `${status} — Error del servidor` : `${status} — No se pudo mostrar la página`;
  const explanation =
    status === 404
      ? `La ruta \`${safePath(path)}\` no existe en ${origin.replace(/^https?:\/\//, "")} o fue movida.`
      : `El servidor no pudo generar la ruta \`${safePath(path)}\` en este momento. Intenta de nuevo en unos segundos.`;
  return [
    `# ${heading}`,
    "",
    explanation,
    "",
    "Para encontrar lo que buscas, estos son buenos puntos de partida:",
    "",
    ...SITE_LINKS(origin),
    "",
  ].join("\n");
}
