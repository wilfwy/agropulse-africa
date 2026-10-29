"use client";

import { useEffect } from "react";

/**
 * Effets de défilement de la page de présentation :
 * - apparition progressive des blocs ([data-rv]) ;
 * - léger parallaxe des photos ([data-par]).
 * Désactivé si l'utilisateur préfère réduire les animations.
 */
export default function ScrollFX() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      root.classList.remove("fx");
      return;
    }

    root.classList.add("fx");

    const items = Array.from(document.querySelectorAll("[data-rv]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    items.forEach((el) => observer.observe(el));

    const layers = Array.from(document.querySelectorAll("[data-par]"));
    let frame = 0;
    const paint = () => {
      frame = 0;
      const vh = window.innerHeight;
      layers.forEach((el) => {
        const speed = parseFloat(el.dataset.par) || 0.12;
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < -240 || box.top > vh + 240) return;
        const offset = (box.top + box.height / 2 - vh / 2) * speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(1.08)`;
      });
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      root.classList.remove("fx");
    };
  }, []);

  return null;
}
