"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/** Buttery momentum scrolling (Lenis) — the smoothness the current site was
    missing. Disabled when the visitor prefers reduced motion. Renders nothing;
    it just drives the scroll. Lenis preserves CSS `position: sticky`, so the
    sticky story section keeps working. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
