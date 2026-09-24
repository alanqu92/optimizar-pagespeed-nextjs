// Negociacion de contenido Markdown para agentes (https://acceptmarkdown.com).
//
// Regla: una peticion recibe Markdown solo si el cliente pide `text/markdown` de forma EXPLICITA en Accept con una
// preferencia (q) mayor o igual que la de `text/html`. Los navegadores mandan `text/html,...,*/*;q=0.8` y nunca
// nombran text/markdown, asi que siguen recibiendo HTML. Los comodines (`*/*`, `text/*`) NO cuentan como pedir Markdown.
//
// Modulo sin dependencias internas a proposito: lo importan proxy.ts, el route handler y las pruebas (node --test).

export interface AcceptEntry {
  type: string;
  q: number;
  order: number;
}

export function parseAccept(header: string | null | undefined): AcceptEntry[] {
  if (!header) return [];
  const out: AcceptEntry[] = [];
  header.split(",").forEach((raw, order) => {
    const [typePart, ...params] = raw.split(";");
    const type = typePart.trim().toLowerCase();
    if (!type) return;
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q\s*=\s*([0-9.]+)$/i);
      if (m) {
        const n = parseFloat(m[1]);
        q = Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : 1;
      }
    }
    out.push({ type, q, order });
  });
  return out;
}

export function prefersMarkdown(header: string | null | undefined): boolean {
  const entries = parseAccept(header);
  const md = entries.find((e) => e.type === "text/markdown");
  if (!md || md.q <= 0) return false;
  const html = entries.find((e) => e.type === "text/html");
  if (!html) return true;
  if (md.q > html.q) return true;
  if (md.q < html.q) return false;
  return md.order < html.order; // empate: gana el que el cliente listo primero
}

// Rutas que nunca se sirven como Markdown (privadas, transaccionales, API, framework o el propio endpoint interno).
const EXCLUDED_PREFIXES = [
  "/api",
  "/masterpanel",
  "/cuenta",
  "/carrito",
  "/checkout",
  "/pago",
  "/mis-compras",
  "/buscar",
  "/agent-markdown",
  "/_next",
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

// Un archivo (sitemap.xml, robots.txt, llms.txt, imagenes, .well-known/...) no es una pagina: no se negocia.
export function looksLikeFile(pathname: string): boolean {
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  return last.includes(".") || pathname.split("/").some((s) => s.startsWith("."));
}

export function shouldServeMarkdown(input: {
  method: string;
  pathname: string;
  accept: string | null | undefined;
  internalHeader?: string | null;
}): boolean {
  if (input.method !== "GET" && input.method !== "HEAD") return false;
  if (input.internalHeader) return false; // la peticion interna del propio convertidor: evita bucles
  if (isExcludedPath(input.pathname) || looksLikeFile(input.pathname)) return false;
  return prefersMarkdown(input.accept);
}

// Ruta interna (pathname + query) que el convertidor pedira al propio servidor. Devuelve null si no es segura:
// evita SSRF y que el endpoint sirva algo distinto de una pagina publica del sitio.
export function sanitizeInternalPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 2048) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f#]/.test(raw)) return null;
  const pathname = raw.split("?")[0];
  if (pathname.split("/").some((s) => s === "..")) return null;
  if (isExcludedPath(pathname) || looksLikeFile(pathname)) return null;
  return raw;
}

export function appendVary(existing: string | null | undefined, token: string): string {
  const parts = (existing ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.some((p) => p.toLowerCase() === token.toLowerCase() || p === "*")) return parts.join(", ") || token;
  return [...parts, token].join(", ");
}
