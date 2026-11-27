"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { RefreshCw } from "lucide-react";
import { LIVE_REFRESH_EVENT } from "@/components/live/auto-refresh";
import { cn } from "@/lib/utils";

/*
 * GSAP motion for the live boards. Nothing here hides server-rendered content
 * on load: every effect starts from what is already on screen, and all of it
 * is skipped under «reduce motion».
 */

const MEDALS = ["🥇", "🥈", "🥉"];

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Rgb = [number, number, number];
const EMERALD: Rgb = [16, 185, 129];

let probe: CanvasRenderingContext2D | null | undefined;

/** Any CSS colour (oklch included) as RGBA 0–255, read back from a 1×1 canvas. */
function toRgba(color: string): [number, number, number, number] | null {
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const ctx = probe;
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a];
}

/** The first opaque background behind `el` (the board's card), white if none. */
function solidBackground(el: HTMLElement): Rgb {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const c = toRgba(getComputedStyle(node).backgroundColor);
    if (c && c[3] === 255) return [c[0], c[1], c[2]];
  }
  return [255, 255, 255];
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as Rgb;
const rgb = (c: Rgb) => `rgb(${c.map(Math.round).join(", ")})`;

/**
 * After a refresh, slides a ranking row from its old place to its new one and
 * makes it glow when its total went up. A row moving up passes over the
 * others, with an opaque background so the two never show through each other.
 * Rows must be keyed by participant (LiveViewRow.key) and sit in a positioned
 * list, so offsetTop (which ignores the animated transform) is measured
 * against the list itself.
 */
export function useRowMotion(ref: RefObject<HTMLElement | null>, total: number) {
  const before = useRef<{ top: number; total: number } | null>(null);
  const running = useRef<gsap.core.Timeline | null>(null);
  // No deps: measure after every render, since a neighbour moving moves this row too.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prev = before.current;
    const top = el.offsetTop;
    before.current = { top, total };
    if (!prev || reducedMotion()) return;
    const moved = prev.top !== top;
    const gained = total > prev.total;
    if (!moved && !gained) return;

    // Finish the last update's animation first, so its inline styles are cleared.
    running.current?.progress(1);
    const base = solidBackground(el);
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(el, { clearProps: "transform,position,zIndex,backgroundColor" });
      },
    });
    running.current = tl;
    if (top < prev.top) gsap.set(el, { position: "relative", zIndex: 2, backgroundColor: rgb(base) });
    if (moved) tl.fromTo(el, { y: prev.top - top }, { y: 0, duration: 0.9, ease: "power3.out" }, 0);
    if (gained) {
      tl.fromTo(
        el,
        { backgroundColor: rgb(mix(base, EMERALD, 0.3)) },
        { backgroundColor: rgb(base), duration: 2.4, ease: "power1.out" },
        0
      );
    }
  });
}

/** A number that counts up (or down) to its new value instead of jumping. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  useLayoutEffect(() => {
    const el = ref.current;
    const from = shown.current;
    if (!el || from === value) return;
    if (reducedMotion()) {
      shown.current = value;
      return;
    }
    // React already wrote `value`; count from the old one. The span's only
    // child is text, so React rewrites textContent next time either way.
    el.textContent = String(from);
    const counter = { n: from };
    const tween = gsap.to(counter, {
      n: value,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        shown.current = Math.round(counter.n);
        el.textContent = String(shown.current);
      },
    });
    return () => {
      tween.kill();
    };
  }, [value]);
  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

/** The total: counts up, and a «+N» chip floats away when it grows. */
export function LiveTotal({ value }: { value: number }) {
  const chip = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useLayoutEffect(() => {
    const gain = value - prev.current;
    prev.current = value;
    const el = chip.current;
    if (!el || gain <= 0 || reducedMotion()) return;
    gsap.killTweensOf(el);
    el.textContent = `+${gain}`;
    gsap.fromTo(
      el,
      { autoAlpha: 1, y: 0, scale: 0.6 },
      { scale: 1, duration: 0.35, ease: "back.out(3)" }
    );
    gsap.to(el, { autoAlpha: 0, y: -16, duration: 1.4, delay: 1.2, ease: "power1.in" });
  }, [value]);
  return (
    <span className="relative inline-block">
      <AnimatedNumber value={value} />
      <span
        ref={chip}
        aria-hidden
        className="pointer-events-none invisible absolute -top-2.5 right-full mr-1 rounded-full bg-emerald-500 px-1.5 text-[11px] leading-4 font-bold text-white"
      />
    </span>
  );
}

/**
 * 🥇🥈🥉 or the rank number. Pops when the rank changes; the leader's gold
 * medal breathes once anyone has points.
 */
export function LiveMedal({ rank, total, className }: { rank: number; total: number; className?: string }) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const prevRank = useRef(rank);
  useLayoutEffect(() => {
    const el = outer.current;
    const moved = prevRank.current !== rank;
    prevRank.current = rank;
    if (!el || !moved || reducedMotion()) return;
    gsap.fromTo(el, { scale: 1.6 }, { scale: 1, duration: 0.6, ease: "back.out(3)" });
  }, [rank]);
  const leading = rank === 1 && total > 0;
  useEffect(() => {
    const el = inner.current;
    if (!el || !leading || reducedMotion()) return;
    const tween = gsap.to(el, { scale: 1.2, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1 });
    return () => {
      tween.kill();
      gsap.set(el, { clearProps: "transform" });
    };
  }, [leading]);
  return (
    <span ref={outer} className="inline-block">
      <span ref={inner} className={cn("inline-block", className)}>
        {MEDALS[rank - 1] ?? <span className="text-sm text-muted-foreground">{rank}</span>}
      </span>
    </span>
  );
}

/** The ↻ next to «15 с тутам шинэчлэгдэнэ»: turns once on every refresh. */
export function LiveRefreshIcon({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const spin = () => {
      if (!ref.current || reducedMotion()) return;
      gsap.fromTo(
        ref.current,
        { rotation: 0 },
        { rotation: 360, duration: 0.9, ease: "power2.inOut", transformOrigin: "50% 50%" }
      );
    };
    window.addEventListener(LIVE_REFRESH_EVENT, spin);
    return () => window.removeEventListener(LIVE_REFRESH_EVENT, spin);
  }, []);
  return <RefreshCw ref={ref} className={className} />;
}

/** A pulsing green dot: the contest is running right now. */
export function LiveDot({ className }: { className?: string }) {
  const ring = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ring.current;
    if (!el || reducedMotion()) return;
    const tween = gsap.fromTo(
      el,
      { scale: 1, opacity: 0.7 },
      { scale: 2.8, opacity: 0, duration: 1.6, ease: "power1.out", repeat: -1 }
    );
    return () => {
      tween.kill();
    };
  }, []);
  return (
    <span aria-hidden className={cn("relative inline-flex size-2.5", className)}>
      <span ref={ring} className="absolute inset-0 rounded-full bg-emerald-500" />
      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
    </span>
  );
}
