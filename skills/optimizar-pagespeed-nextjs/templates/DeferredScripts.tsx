"use client";

import { useEffect } from "react";

// Copyright (c) 2026 Alan Quezada - https://alanquezada.com - Licencia MIT (ver LICENSE en la skill).
// PLANTILLA (optimizar-pagespeed-nextjs). Copiar a components/analytics/DeferredScripts.tsx y montar UNA vez en
// el layout raiz: <DeferredScripts gtmId="GTM-XXXXXXX" adsenseClient="ca-pub-XXXXXXXXXXXXXXXX" />
// (cada prop es opcional: pasa solo las que el proyecto use).
//
// Google Tag Manager (~113 KB) y AdSense (~1,5 s de JS en el hilo principal) cargados en el <head> compiten
// con la hidratacion y el LCP. Aqui se inyectan hasta la primera interaccion (scroll, toque, tecla, click) o,
// como respaldo, a los `fallbackMs`. Los eventos que el sitio empuje al dataLayer antes de eso no se pierden:
// GTM los procesa al cargar (el dataLayer se crea aqui si aun no existe).
// La verificacion de propiedad de AdSense sigue cubierta por el meta "google-adsense-account" en metadata.other.
//
// IMPORTANTE: confirmar antes que el contenedor GTM tenga etiquetas PUBLICADAS
// (curl "https://www.googletagmanager.com/gtm.js?id=GTM-XXXX" | buscar "tags":[]); si esta vacio, GTM solo
// pesa y no hace nada.
export function DeferredScripts({
  gtmId,
  adsenseClient,
  fallbackMs = 5000,
}: {
  gtmId?: string;
  adsenseClient?: string;
  fallbackMs?: number;
}) {
  useEffect(() => {
    let loaded = false;
    const events = ["scroll", "pointerdown", "keydown", "touchstart"] as const;

    const inject = (src: string, crossOrigin?: string) => {
      const s = document.createElement("script");
      s.async = true;
      if (crossOrigin) s.crossOrigin = crossOrigin;
      s.src = src;
      document.head.appendChild(s);
    };

    const load = () => {
      if (loaded) return;
      loaded = true;
      events.forEach((e) => window.removeEventListener(e, load));
      clearTimeout(timer);

      if (gtmId) {
        const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
        w.dataLayer = w.dataLayer || [];
        w.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
        inject(`https://www.googletagmanager.com/gtm.js?id=${gtmId}`);
      }
      if (adsenseClient) {
        inject(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`, "anonymous");
      }
    };

    events.forEach((e) => window.addEventListener(e, load, { passive: true, once: true }));
    const timer = setTimeout(load, fallbackMs);

    return () => {
      events.forEach((e) => window.removeEventListener(e, load));
      clearTimeout(timer);
    };
  }, [gtmId, adsenseClient, fallbackMs]);

  return null;
}
