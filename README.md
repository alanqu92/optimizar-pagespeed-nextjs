# Optimizar PageSpeed — skill para Claude Code

> **Bienvenido.** Esta skill fue creada por **Alan Quezada** — SEO, Diseño Web e IA.
> [alanquezada.com](https://alanquezada.com) · TH3SEO: [th3seo.com](https://th3seo.com)
>
> Es el método que uso en mis propios proyectos para llevar un sitio a **PageSpeed móvil ≥ 90 y escritorio 100**, con
> Accesibilidad, Buenas prácticas y SEO en 100: medir con datos reales, corregir lo que más pesa y verificar que de
> verdad mejoró. Caso de referencia: alanquezada.com pasó de 74–79 a 88–92 en móvil y 100 en escritorio.

## Instalación en un comando

**Dentro de Claude Code** (pega los dos comandos):

```
/plugin marketplace add alanqu92/optimizar-pagespeed-nextjs
/plugin install optimizar-pagespeed@alanquezada-skills
```

Luego abre una sesión nueva y pídele a Claude: *"mide el rendimiento de https://tusitio.com"*.

**Desde la terminal** (un solo comando, requiere Node.js 18+):

```bash
# Mac / Linux / Git Bash
npx degit alanqu92/optimizar-pagespeed-nextjs/skills/optimizar-pagespeed-nextjs ~/.claude/skills/optimizar-pagespeed-nextjs

# Windows PowerShell
npx degit alanqu92/optimizar-pagespeed-nextjs/skills/optimizar-pagespeed-nextjs "$HOME\.claude\skills\optimizar-pagespeed-nextjs"
```

**Pidiéndoselo a Claude:**

> Instala esta skill: `npx degit alanqu92/optimizar-pagespeed-nextjs/skills/optimizar-pagespeed-nextjs ~/.claude/skills/optimizar-pagespeed-nextjs`,
> comprueba que exista `SKILL.md` en esa carpeta y dime cuándo reiniciar la sesión.

> ⚠️ Instalar una skill de otra persona equivale a darle instrucciones y código a tu Claude. Es un proyecto pequeño y
> abierto: revisa `skills/optimizar-pagespeed-nextjs/SKILL.md` y `scripts/` antes de instalarla.

## Qué hace

1. **Primer uso:** te da la bienvenida, revisa tu entorno (Node, Chrome, clave de PageSpeed, gcloud) y te explica las
   dos formas de medir.
2. **Mide** móvil y escritorio con la API oficial de Google (5 corridas, mediana y rango) o con Lighthouse local.
3. **Diagnostica** en tu código y tu infraestructura: terceros sin diferir, peticiones de arranque en el cliente,
   datos pesados en el bundle, fuentes sin usar, CSP, caché de Cloudflare, contenedor de GTM vacío.
4. **Corrige** con un playbook de 8 pasos en orden de impacto y plantillas de código.
5. **Verifica** volviendo a medir y entrega una tabla de antes y después.

### API vs local

| | **API (con clave gratuita)** | **Local (sin clave)** |
|---|---|---|
| Dónde corre | Servidores de Google | Tu Chrome, con tu CPU y tu red |
| Resultado | **Referencia oficial** (igual que pagespeed.web.dev) | **Orientativo**: suele dar más alto |
| Corridas | 5, con mediana y rango (margen) | 1 |

La skill no usa ninguna IA ni servicio de pago. La clave de PageSpeed es gratuita y personal: `--setup` te ayuda a
crearla.

## Contenido

- [`skills/optimizar-pagespeed-nextjs/`](skills/optimizar-pagespeed-nextjs): la skill (`SKILL.md`, `scripts/`, `templates/`).
- [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json): define el marketplace para `/plugin`.

## Licencia y créditos

© 2026 **Alan Quezada** — [alanquezada.com](https://alanquezada.com) · [th3seo.com](https://th3seo.com)

Licencia **MIT** (ver [`LICENSE`](LICENSE)): uso libre, incluso comercial, conservando el aviso de copyright y el crédito a
Alan Quezada — alanquezada.com. Se ofrece "tal cual", sin garantía.
