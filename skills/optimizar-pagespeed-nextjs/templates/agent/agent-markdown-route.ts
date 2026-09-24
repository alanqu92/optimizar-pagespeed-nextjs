import { sanitizeInternalPath } from "@/lib/agent/negotiate";
import { errorMarkdown, htmlToMarkdown } from "@/lib/agent/markdown";
import { siteConfig } from "@/lib/data/site";

export const dynamic = "force-dynamic";

// Endpoint INTERNO de la negociacion de contenido (https://acceptmarkdown.com): proxy.ts reescribe hacia aqui las
// peticiones con `Accept: text/markdown` a paginas publicas. Pide la version HTML de la misma pagina al propio
// servidor, la convierte a Markdown y conserva el estado HTTP real (200, 404, redirecciones, 5xx).
// La respuesta Markdown es `private, no-store`: la misma URL sirve HTML a los navegadores, asi que ningun cache
// compartido (Cloudflare) debe guardar la variante Markdown.
const MD_HEADERS: Record<string, string> = {
  "Content-Type": "text/markdown; charset=utf-8",
  Vary: "Accept",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

const ORIGIN = siteConfig.url;

function markdownError(status: number, path: string): Response {
  return new Response(errorMarkdown({ status, path, origin: ORIGIN }), { status, headers: MD_HEADERS });
}

export async function GET(request: Request) {
  // proxy.ts pasa la ruta original en `x-agent-md-path` (request.url conserva la URL sin reescribir); el query `path` es respaldo.
  let candidate = new URL(request.url).searchParams.get("path");
  const fromProxy = request.headers.get("x-agent-md-path");
  if (fromProxy) {
    try {
      candidate = decodeURIComponent(fromProxy);
    } catch {
      candidate = null;
    }
  }
  const path = sanitizeInternalPath(candidate);
  if (!path) return markdownError(400, "/");

  const port = process.env.PORT || "3000";
  let res: Response;
  try {
    res = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { Accept: "text/html", "x-agent-md-internal": "1", "User-Agent": "alanquezada-agent-markdown/1.0" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return markdownError(502, path);
  }

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (location) {
      const target = new URL(location, ORIGIN);
      if (target.hostname === "127.0.0.1" || target.hostname === "localhost") {
        target.protocol = new URL(ORIGIN).protocol;
        target.host = new URL(ORIGIN).host;
      }
      return new Response(null, { status: res.status, headers: { Location: target.toString(), Vary: "Accept", "Cache-Control": "private, no-store" } });
    }
  }

  if (res.status === 404) return markdownError(404, path);
  if (res.status >= 500) return markdownError(502, path);
  if (!res.ok) return markdownError(res.status, path);

  const html = await res.text();
  const { markdown } = htmlToMarkdown(html, `${ORIGIN}${path}`);
  return new Response(markdown, { status: 200, headers: MD_HEADERS });
}
