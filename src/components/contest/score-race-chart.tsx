"use client";

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ScorePoint } from "@/lib/contest-timeline";

export interface RaceSeries {
  name: string;
  data: ScorePoint[];
  /** The viewer's own line — drawn thicker. */
  mine: boolean;
}

const CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ulaanbaatar",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const CLOCK_SECONDS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ulaanbaatar",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

interface ChartProps {
  series: RaceSeries[];
  start: number;
  end: number;
  maxTotal: number;
}

/** Built in the browser only (reads the dark-mode class). */
function chartOptions({ series, start, end, maxTotal }: ChartProps): ApexCharts.ApexOptions {
  const dark = document.documentElement.classList.contains("dark");
  return {
    chart: {
      type: "line",
      height: 340,
      fontFamily: "inherit",
      background: "transparent",
      zoom: { enabled: false },
      toolbar: { show: false },
      animations: { enabled: false },
    },
    theme: { mode: dark ? "dark" : "light" },
    series: series.map((s) => ({ name: s.name, data: s.data })),
    stroke: { curve: "stepline", width: series.map((s) => (s.mine ? 4 : 2)) },
    markers: { size: 0, hover: { size: 4 } },
    xaxis: {
      type: "datetime",
      min: start,
      max: end,
      labels: { formatter: (value) => CLOCK.format(new Date(Number(value))) },
      tooltip: { enabled: false },
    },
    yaxis: { min: 0, max: Math.max(maxTotal, 1), forceNiceScale: true, title: { text: "Оноо" } },
    tooltip: {
      shared: false,
      x: { formatter: (value) => CLOCK_SECONDS.format(new Date(value)) },
      y: { formatter: (value) => `${value} оноо` },
    },
    legend: { position: "bottom", showForSingleSeries: true },
    grid: { strokeDashArray: 4 },
  };
}

/** Each participant's total over the contest, as step lines (school time). */
export function ScoreRaceChart({ series, start, end, maxTotal }: ChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<ApexCharts | null>(null);
  const latest = useRef<ChartProps>({ series, start, end, maxTotal });

  // New props (a live board refreshes every 15 s) update the drawn chart in
  // place: rebuilding it would blank the hall screen for a moment each time.
  useEffect(() => {
    latest.current = { series, start, end, maxTotal };
    chart.current?.updateOptions(chartOptions(latest.current), false, false);
  }, [series, start, end, maxTotal]);

  // Created once. apexcharts touches `window` on import, so it loads in the browser only.
  useEffect(() => {
    let cancelled = false;
    import("apexcharts").then(({ default: Apex }) => {
      if (cancelled || !box.current) return;
      chart.current = new Apex(box.current, chartOptions(latest.current));
      chart.current.render();
    });
    return () => {
      cancelled = true;
      chart.current?.destroy();
      chart.current = null;
    };
  }, []);

  return <div ref={box} className="min-h-[340px]" />;
}
