# Optimizar PageSpeed — skill para Claude Code

> **Bienvenido.** Esta skill fue creada por **Alan Quezada** — SEO, Diseño Web e IA.
> [alanquezada.com](https://alanquezada.com) · TH3SEO: [th3seo.com](https://th3seo.com)
>
> Es el método que uso en mis propios proyectos para llevar un sitio a **PageSpeed móvil ≥ 90 y escritorio 100**, con
> Accesibilidad, Buenas prácticas y SEO en 100: medir con datos reales, corregir lo que más pesa y verificar que de
> verdad mejoró. Caso de referencia: alanquezada.com pasó de 74–79 a 88–92 en móvil y 100 en escritorio.

Incluye el método de medición, el playbook de correcciones, plantillas de código y un procedimiento para auditar
proyectos ya hechos.

## Instalación

Copia esta carpeta completa a:

- **Solo para ti (todos tus proyectos):** `~/.claude/skills/optimizar-pagespeed-nextjs/`
  (en Windows: `C:\Users\TU_USUARIO\.claude\skills\optimizar-pagespeed-nextjs\`)
- **Para un proyecto/equipo:** `.claude/skills/optimizar-pagespeed-nextjs/` dentro del repositorio.

Abre una sesión nueva de Claude Code. Requisitos: **Node.js 18+**. Chrome solo si vas a usar el modo local.

## Cómo usarla (lo más fácil)

Pídeselo a Claude con tus palabras:
- "Mide el rendimiento de https://tusitio.com"
- "Sube el PageSpeed de este proyecto"
- "Audita este proyecto contra la meta de PageSpeed"

La primera vez, Claude te da la bienvenida, revisa tu entorno, te explica las dos formas de medir (abajo) y te deja elegir.

Por línea de comandos (desde la carpeta `scripts/`):

```bash
node medir-pagespeed.mjs --doctor                 # revisa tu entorno y explica todo
node medir-pagespeed.mjs https://tusitio.com      # mide (API si hay clave; si no, local)
node medir-pagespeed.mjs https://tusitio.com --local   # ademas compara con Lighthouse local
node medir-pagespeed.mjs --setup                  # ayuda a conseguir la clave gratuita
```

## Dos formas de medir: API vs local

| | **API (con clave)** | **Local (sin clave)** |
|---|---|---|
| Dónde corre | Servidores de Google | Tu computadora (Chrome + Lighthouse) |
| Necesita | Clave gratuita de PageSpeed Insights | Solo Node y Chrome |
| Resultado | **Referencia oficial**, coincide con pagespeed.web.dev | **Orientativo**: usa tu CPU y tu red, suele dar más alto (p. ej. 96–97 donde Google da 88–90) |
| Corridas | 5 por estrategia: reporta la **mediana y el rango** (margen) y detecta resultados repetidos por el caché de Google | 1 por estrategia |
| Úsalo para | Reportar el número final y verificar la meta | Diagnosticar, ver la traza, probar sin cuenta de Google |

## Conseguir la clave de API (gratis, ~3 minutos)

1. https://console.cloud.google.com → crea o elige un proyecto.
2. "APIs y servicios" → "Biblioteca" → **PageSpeed Insights API** → Habilitar.
3. "Credenciales" → "Crear credenciales" → **Clave de API** (restríngela a esa API).
4. Guárdala como `PAGESPEED_API_KEY` (variable de entorno o archivo `.env.local`; no lo subas a git).

Con `gcloud` instalado, `node medir-pagespeed.mjs --setup` te muestra (y con `--yes --project ID` ejecuta) los pasos.

## Qué contiene

- `SKILL.md`: bienvenida, playbook completo, reglas de medición y procedimiento de auditoría.
- `scripts/medir-pagespeed.mjs`: medición limpia, `--doctor` y `--setup`.
- `templates/`: `DeferredScripts.tsx` (GTM y AdSense diferidos) y `SettingsProvider.tsx` (ajustes leídos una vez en servidor).

## Nota

La skill no usa ninguna IA ni servicio de pago. La clave de API es personal: no la compartas ni la subas a un repositorio.

## Licencia y créditos

© 2026 **Alan Quezada** — [alanquezada.com](https://alanquezada.com) · [th3seo.com](https://th3seo.com)

Licencia **MIT** (ver el archivo `LICENSE`): puedes usarla libremente, incluso en proyectos comerciales, modificarla y
compartirla, con la condición de **conservar el aviso de copyright y el crédito a Alan Quezada — alanquezada.com** en las
copias. Se ofrece "tal cual", sin garantía.
