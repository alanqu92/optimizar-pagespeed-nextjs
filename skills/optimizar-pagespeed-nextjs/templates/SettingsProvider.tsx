"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Copyright (c) 2026 Alan Quezada - https://alanquezada.com - Licencia MIT (ver LICENSE en la skill).
// PLANTILLA (optimizar-pagespeed-nextjs). Copiar a components/providers/SettingsProvider.tsx.
//
// Problema que resuelve: varios componentes cliente (Navbar, Footer, secciones...) haciendo cada uno su propio
// fetch("/api/settings") al hidratar = N peticiones identicas + N re-renders justo en la ventana del LCP.
// Solucion: leer los ajustes UNA vez en el servidor (layout raiz, async) y repartirlos por contexto.
//
// Uso en app/layout.tsx (Server Component, async):
//   const all = await readObject<SiteSettings>("settings.json", {} as SiteSettings).catch(() => ({} as SiteSettings));
//   const globalSettings = { nav: all.nav, footer: all.footer, ... };   // SOLO lo que consumen los globales
//   <SettingsProvider initial={globalSettings} endpoint="/api/settings" pick={(s) => ({ nav: s.nav, footer: s.footer, ... })}>
//     {children}
//   </SettingsProvider>
//
// Uso en un componente cliente:  const s = useSiteSettings();  const nav = s.nav?.length ? s.nav : DEFAULT_NAV;
//
// El orden de claves de `pick` debe coincidir con el de `initial` (se compara con JSON.stringify).
// Las paginas estaticas/ISR llevan los ajustes del momento en que se generaron: por eso se revalida UNA sola vez,
// cuando el navegador esta libre (ya pasado el LCP), y solo se re-renderiza si algo cambio.
// Tradeoff a comunicar al usuario: un cambio hecho en el panel puede tardar hasta el `revalidate` de la pagina.
type Settings = Record<string, unknown>;

const SettingsContext = createContext<Settings>({});

export function useSiteSettings<T extends Settings = Settings>(): T {
  return useContext(SettingsContext) as T;
}

export function SettingsProvider<T extends Settings>({
  initial,
  endpoint = "/api/settings",
  pick,
  children,
}: {
  initial: T;
  endpoint?: string;
  pick: (fresh: any) => T;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<T>(initial);

  useEffect(() => {
    let cancelled = false;
    const revalidate = () => {
      fetch(endpoint)
        .then((r) => r.json())
        .then((s) => {
          if (cancelled) return;
          const fresh = pick(s);
          if (JSON.stringify(fresh) !== JSON.stringify(initial)) setSettings(fresh);
        })
        .catch(() => {});
    };
    const idle = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => number);
    const handle = idle ? idle(revalidate, { timeout: 8000 }) : window.setTimeout(revalidate, 5000);
    return () => {
      cancelled = true;
      if (idle) (window as any).cancelIdleCallback?.(handle);
      else clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}
