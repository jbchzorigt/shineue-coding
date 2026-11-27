"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/*
 * The school's seven shapes, redrawn as SVG (viewBox 0–100, measured from the
 * originals) so each part can move on its own. One per division, each with a
 * slow, quiet loop; still under «reduce motion».
 */

const RED = "#c1272d";
const ORANGE = "#ffab1a";
const PURPLE = "#93278f";
const GREEN = "#8cc63f";
const BLUE = "#006ec3";
const WHITE = "#ffffff";

type Corner = [number, number];
type Animate = (svg: SVGSVGElement) => gsap.core.Animation;

const all = (svg: SVGSVGElement, selector: string) => svg.querySelectorAll<SVGElement>(selector);

/** Four quarter discs whose corners breathe in turn, so the white star pulses. */
const PETAL_CORNERS: [Corner, string][] = [
  [[0, 0], ORANGE],
  [[100, 0], RED],
  [[100, 100], ORANGE],
  [[0, 100], RED],
];
const petals = (
  <>
    {PETAL_CORNERS.map(([[x, y], fill]) => (
      <circle key={`${x}${y}`} data-part="petal" data-origin={`${x} ${y}`} cx={x} cy={y} r={50.4} fill={fill} />
    ))}
  </>
);
const animatePetals: Animate = (svg) => {
  const tl = gsap.timeline({ repeat: -1 });
  all(svg, "[data-part=petal]").forEach((el, i) => {
    tl.to(el, { scale: 0.82, svgOrigin: el.dataset.origin, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: 1 }, i * 0.7);
  });
  return tl;
};

/** Squares with white holes: the holes shrink and grow, one diagonal after the other. */
function holeGrid(cells: [Corner, string][], holes: ReactNode) {
  return (
    <>
      {cells.map(([[x, y], fill]) => (
        <rect key={`${x}${y}`} x={x} y={y} width={50} height={50} fill={fill} />
      ))}
      {holes}
    </>
  );
}
const grid = holeGrid(
  [
    [[0, 0], PURPLE],
    [[50, 0], GREEN],
    [[0, 50], GREEN],
    [[50, 50], PURPLE],
  ],
  ([[25, 25], [75, 25], [25, 75], [75, 75]] as Corner[]).map(([x, y]) => (
    <circle key={`${x}${y}`} data-part={x === y ? "hole-a" : "hole-b"} cx={x} cy={y} r={16.8} fill={WHITE} />
  ))
);
const animateGrid: Animate = (svg) => {
  const tl = gsap.timeline({ repeat: -1 });
  const pulse = { scale: 0.55, transformOrigin: "50% 50%", duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: 1 };
  tl.to(all(svg, "[data-part=hole-a]"), pulse, 0).to(all(svg, "[data-part=hole-b]"), pulse, 1.5);
  return tl;
};

/** Blue squares with white holes and green dots: dots swell as the holes close, and back. */
const checker = holeGrid(
  [
    [[50, 0], BLUE],
    [[0, 50], BLUE],
  ],
  <>
    <circle data-part="hole" cx={75} cy={25} r={16.7} fill={WHITE} />
    <circle data-part="hole" cx={25} cy={75} r={16.7} fill={WHITE} />
    <circle data-part="dot" cx={25} cy={25} r={8.3} fill={GREEN} />
    <circle data-part="dot" cx={75} cy={75} r={8.3} fill={GREEN} />
  </>
);
const animateChecker: Animate = (svg) => {
  const swing = { duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 50%" };
  return gsap
    .timeline()
    .to(all(svg, "[data-part=dot]"), { ...swing, scale: 1.7 }, 0)
    .to(all(svg, "[data-part=hole]"), { ...swing, scale: 0.65 }, 0);
};

/** Concentric quarter rings round a corner (the svg clips the rest of each circle). */
function rings(color: string, [cx, cy]: Corner, solid: number | null, radii: number[], width: number) {
  return (
    <>
      {solid !== null && <circle data-part="ring" cx={cx} cy={cy} r={solid} fill={color} />}
      {radii.map((r) => (
        <circle key={r} data-part="ring" cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={width} />
      ))}
    </>
  );
}
/** A soft wave running outward from the corner, ring by ring. */
const animateRings: Animate = (svg) =>
  gsap.to(all(svg, "[data-part=ring]"), {
    opacity: 0.3,
    duration: 1.1,
    ease: "sine.inOut",
    stagger: { each: 0.22, repeat: -1, yoyo: true },
  });

const BIG_RINGS = [39.9, 58.2, 76.25, 94.85];
const THIN_RINGS = [28.3, 45.2, 62.4, 79.3, 96.1];

const SHAPES: [ReactNode, Animate][] = [
  [petals, animatePetals],
  [grid, animateGrid],
  [rings(ORANGE, [100, 100], 26.5, BIG_RINGS, 10), animateRings],
  [rings(RED, [0, 100], 26.5, BIG_RINGS, 10), animateRings],
  [rings(GREEN, [100, 0], null, THIN_RINGS, 9.3), animateRings],
  [rings(PURPLE, [0, 0], null, THIN_RINGS, 9.3), animateRings],
  [checker, animateChecker],
];

/** Division `index`'s shape (see divisionShape), gently animated. Decorative. */
export function DivisionShape({ index, className }: { index: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [shape, animate] = SHAPES[index % SHAPES.length];
  useEffect(() => {
    const svg = ref.current;
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = animate(svg);
    return () => {
      animation.kill();
      gsap.set(svg.querySelectorAll("[data-part]"), { clearProps: "all" });
    };
  }, [animate]);
  return (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      aria-hidden
      className={cn("shrink-0 overflow-hidden", className)}
    >
      {shape}
    </svg>
  );
}
