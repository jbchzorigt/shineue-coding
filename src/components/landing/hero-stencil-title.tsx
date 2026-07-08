"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Stencil-fill headline: an outlined (stroked) copy sits underneath and a
 * solid copy on top is revealed left-to-right with a GSAP clip-path sweep.
 */
export function HeroStencilTitle({ text }: { text: string }) {
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el, { clipPath: "inset(0 0% 0 0)" });
      return;
    }

    const tween = gsap.fromTo(
      el,
      { clipPath: "inset(0 100% 0 0)" },
      {
        clipPath: "inset(0 0% 0 0)",
        duration: 1.8,
        ease: "power2.inOut",
        delay: 0.3,
      }
    );
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <h1
      className="relative text-4xl font-bold tracking-tight text-balance select-none sm:text-5xl"
      aria-label={text}
    >
      {/* Stencil outline layer */}
      <span
        aria-hidden
        className="text-transparent"
        style={{ WebkitTextStroke: "1.5px var(--foreground)" }}
      >
        {text}
      </span>
      {/* Solid fill layer revealed by GSAP */}
      <span
        ref={fillRef}
        aria-hidden
        className="absolute inset-0"
        style={{ clipPath: "inset(0 100% 0 0)" }}
      >
        {text}
      </span>
    </h1>
  );
}
